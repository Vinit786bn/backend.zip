const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

let db;

function getDb() {
  if (!db) {
    db = new Database('database.sqlite');
    
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE,
        password_hash TEXT,
        name TEXT,
        role TEXT,
        company_name TEXT,
        phone TEXT,
        kyc_status TEXT DEFAULT 'pending',
        balance REAL DEFAULT 0,
        escrow_balance REAL DEFAULT 0,
        google_sub TEXT,
        status TEXT DEFAULT 'active',
        created_at TEXT
      );
      
      CREATE TABLE IF NOT EXISTS land_plots (
        id TEXT PRIMARY KEY,
        owner_id TEXT,
        name TEXT,
        project_type TEXT,
        location_state TEXT,
        location_district TEXT,
        lat REAL,
        lng REAL,
        area_hectares REAL,
        land_type TEXT,\n        land_tenure TEXT,\n        boundary_geojson TEXT,
        verification_status TEXT,
        carbon_score REAL,
        biomass_estimate REAL,
        annual_yield_tons REAL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS carbon_credits (
        id TEXT PRIMARY KEY,
        land_id TEXT,
        owner_id TEXT,
        certificate_id TEXT,
        ticker TEXT,
        total_tons REAL,
        available_tons REAL,
        price_per_ton REAL,
        status TEXT,
        vintage_year INTEGER,
        is_resale INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        buyer_id TEXT,
        seller_id TEXT,
        credit_id TEXT,
        tons REAL,
        price_per_ton REAL,
        total_price REAL,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        title TEXT,
        message TEXT,
        type TEXT,
        is_read INTEGER DEFAULT 0,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS payouts (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        amount REAL,
        status TEXT,
        bank_details TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        type TEXT,
        url TEXT,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        admin_id TEXT,
        action TEXT,
        details TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS disputes (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        transaction_id TEXT,
        reason TEXT,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS kyc_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        document_url TEXT,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS limit_orders (
        id TEXT PRIMARY KEY,
        buyer_id TEXT,
        credit_id TEXT,
        tons REAL,
        target_price REAL,
        action TEXT,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS escrow (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        amount REAL,
        type TEXT,
        status TEXT,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS platform_fees (
        id TEXT PRIMARY KEY,
        tx_id TEXT,
        amount REAL,
        created_at TEXT
      );

      CREATE TABLE IF NOT EXISTS blockchain_ledger (
        idx INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        transaction_data TEXT,
        previous_hash TEXT,
        hash TEXT
      );
    `);
  }
  return db;
}

function calculateHash(index, timestamp, data, previousHash) {
  return crypto.createHash('sha256').update(index + timestamp + JSON.stringify(data) + previousHash).digest('hex');
}

function addBlock(transactionData) {
  const d = getDb();
  const lastBlock = d.prepare('SELECT idx, hash FROM blockchain_ledger ORDER BY idx DESC LIMIT 1').get();
  
  const previousHash = lastBlock ? lastBlock.hash : "0000000000000000000000000000000000000000000000000000000000000000";
  const index = lastBlock ? lastBlock.idx + 1 : 0;
  const timestamp = new Date().toISOString();
  
  const hash = calculateHash(index, timestamp, transactionData, previousHash);
  
  d.prepare('INSERT INTO blockchain_ledger (idx, timestamp, transaction_data, previous_hash, hash) VALUES (?, ?, ?, ?, ?)').run(
    index, timestamp, JSON.stringify(transactionData), previousHash, hash
  );
  
  return {
    index,
    timestamp,
    transaction: transactionData,
    previous_hash: previousHash,
    hash
  };
}

function logBlockchainEvent(type, credit_id, user_id, details) {
   return addBlock({ type, credit_id, user_id, details });
}

function seedAdmin() {
  const d = getDb();
  const existing = d.prepare("SELECT id FROM users WHERE role='employee'").get();
  if (!existing) {
    const hash = bcrypt.hashSync('admin786', 10);
    d.prepare('INSERT INTO users (id, email, password_hash, name, role, kyc_status, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
     .run(uuidv4(), 'carbonwallet@gmail.com', hash, 'Admin User', 'employee', 'verified', 0, new Date().toISOString());
    console.log('  Default admin created: carbonwallet@gmail.com / admin786');
  }
}

function seedDemoData() {
  const d = getDb();
  const count = d.prepare('SELECT COUNT(*) as c FROM land_plots').get();
  if (count.c > 0) return;
  
  seedAdmin();

  function makeTicker(state, type) {
    const st = state ? state.substring(0,3).toUpperCase() : 'IND';
    const ty = type ? type.substring(0,4).toUpperCase() : 'CRBN';
    const year = new Date().getFullYear().toString().slice(-2);
    return st + '-' + ty + '-' + year;
  }

  const insertUser = d.prepare('INSERT INTO users (id, email, password_hash, name, role, company_name, phone, kyc_status, balance, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertLand = d.prepare('INSERT INTO land_plots (id, owner_id, name, project_type, location_state, location_district, lat, lng, area_hectares, land_type, verification_status, carbon_score, biomass_estimate, annual_yield_tons, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const insertCredit = d.prepare('INSERT INTO carbon_credits (id, land_id, owner_id, certificate_id, ticker, total_tons, available_tons, price_per_ton, status, vintage_year, is_resale, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

  const doSeed = d.transaction(() => {
      const landownerId = uuidv4();
      const hash = bcrypt.hashSync('demo123', 10);
      insertUser.run(landownerId, 'ramesh@demo.com', hash, 'Ramesh Kumar', 'landowner', null, '+91 9876543210', 'verified', 0, new Date().toISOString());

      const industryId = uuidv4();
      insertUser.run(industryId, 'tata@demo.com', hash, 'Ananya Sharma', 'industry', 'Tata Steel Ltd', null, 'verified', 5000000, new Date().toISOString());

      const users = [
        { id: uuidv4(), name: 'Gujrat Farmers Co-op', role: 'landowner', email: 'gujrat@demo.com', company: 'GFC', phone:'+91 1111' },
        { id: uuidv4(), name: 'Kerala Spices FPO', role: 'landowner', email: 'kerala@demo.com', company: 'KSF', phone:'+91 2222' },
        { id: uuidv4(), name: 'Assam Tea Estates', role: 'landowner', email: 'assam@demo.com', company: 'ATE', phone:'+91 3333' },
        { id: uuidv4(), name: 'Carbon Traders India', role: 'industry', email: 'trader1@demo.com', company: 'CTI', phone:'+91 4444' },
        { id: uuidv4(), name: 'Reliance Greens', role: 'industry', email: 'reliance@demo.com', company: 'Reliance', phone:'+91 5555' }
      ];

      users.forEach(u => {
        insertUser.run(u.id, u.email, hash, u.name, u.role, u.company, u.phone, 'verified', u.role === 'industry' ? 1250000 : 0, new Date().toISOString());
      });

      const projectNames = {
        'CCTS': ['Carbon Capture Hub', 'Direct Air Capture Facility', 'Enhanced Weathering Zone', 'Biochar Production Unit'],
        'GCP Afforestation': ['Community Forest Reserve', 'Agroforestry Corridor', 'Native Species Plantation', 'Timber Restoration Belt'],
        'Water / Blue Carbon': ['Coastal Mangrove Restoration', 'Seagrass Meadow Revival', 'Wetland Conservation Park', 'Estuarine Carbon Sink'],
        'Biodiversity': ['Western Ghats Corridor', 'Nilgiri Biosphere Buffer', 'Eastern Himalaya Reserve', 'Sundarbans Tiger Preserve']
      };
      const regions = [
        { state: 'Maharashtra', districts: ['Pune', 'Nashik'], lat: 19.0, lng: 75.0 },
        { state: 'Gujarat', districts: ['Kutch', 'Surat'], lat: 22.3, lng: 71.8 }
      ];
      const categories = [
        { type: 'CCTS', count: 10, priceMin: 1500, priceMax: 3000 },
        { type: 'GCP Afforestation', count: 10, priceMin: 1000, priceMax: 2500 }
      ];

      const allSeedUsers = [landownerId, industryId, ...users.map(u => u.id)];

      categories.forEach(cat => {
        const names = projectNames[cat.type];
        for (let i = 0; i < cat.count; i++) {
          const region = regions[i % regions.length];
          const district = region.districts[i % region.districts.length];
          const nameBase = names[i % names.length];
          const ownerId = allSeedUsers[i % allSeedUsers.length];
          const lid = uuidv4();
          const crId = uuidv4();
          const area = Math.floor(Math.random() * 400) + 50;
          const tons = Math.floor(Math.random() * 9000) + 1000;
          const price = Math.floor(Math.random() * (cat.priceMax - cat.priceMin)) + cat.priceMin;
          const createdAt = new Date(Date.now() - Math.random() * 100 * 86400000).toISOString();

          insertLand.run(lid, ownerId, nameBase + ' ' + district + ' #' + (i + 1), cat.type, region.state, district, region.lat, region.lng, area, cat.type, 'verified', 80, 50, tons, createdAt);
          
          insertCredit.run(crId, lid, ownerId, 'CERT-' + Math.random().toString(36).substring(2, 10).toUpperCase(), makeTicker(region.state, cat.type) + '-' + (100 + i), tons, tons, price, 'active', 2024, 0, createdAt);
          
          addBlock({ action: 'mint', credit_id: crId, owner: ownerId, tons: tons, ticker: makeTicker(region.state, cat.type) + '-' + (100 + i) });
        }
      });
  });

  insertLand.run('land101', uuidv4(), 'Ananya - Afforestation', 'GCP Afforestation', 'Gujarat', 'Kutch', 22.3, 71.8, 400, 'GCP Afforestation', 'verified', 80, 50, 9402, new Date().toISOString()); insertCredit.run('GUJ-GCP-26-101', 'land101', uuidv4(), 'CERT-101', 'GUJ-GCP-26-101', 9402, 9402, 2260, 'active', 2025, 0, new Date().toISOString()); insertLand.run('land107', uuidv4(), 'Ramesh - Grassland', 'Biodiversity', 'Gujarat', 'Kutch', 22.3, 71.8, 300, 'Biodiversity', 'verified', 80, 50, 6699, new Date().toISOString()); insertCredit.run('GUJ-GCP-26-107', 'land107', uuidv4(), 'CERT-107', 'GUJ-GCP-26-107', 6699, 6699, 1850, 'active', 2025, 0, new Date().toISOString()); doSeed();
  console.log('  Rich Demo Data seeded to real SQLite database!');
}

module.exports = { getDb, seedDemoData, addBlock, logBlockchainEvent };
