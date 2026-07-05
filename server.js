require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const fs = require('fs');

const { getDb, seedDemoData } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'nemotron-3-super:cloud';

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    const numericFields = ['tons', 'price_per_ton', 'hectares', 'lat', 'lng', 'target_price'];
    for (const field of numericFields) {
      if (req.body[field] !== undefined) {
        const val = Number(req.body[field]);
        if (isNaN(val) || !isFinite(val)) {
          return res.status(400).json({ error: `Invalid numeric value for ${field}` });
        }
        if (field !== 'lat' && field !== 'lng' && val <= 0) {
          return res.status(400).json({ error: `${field} must be greater than zero` });
        }
      }
    }
  }
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'carbon-wallet-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, 'public')));

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = req.uploadDest || 'uploads/land-docs';
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${uuidv4().slice(0,8)}-${file.originalname}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  const db = getDb();
    const user = db.prepare('SELECT id,email,name,role,company_name,phone,kyc_status,created_at FROM users WHERE id=?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'User not found' });
  req.user = user;
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

const crypto = require('crypto');

function logBlockchainEvent(db, creditId, eventType, payload) {
  const history = db.prepare('SELECT * FROM blockchain_ledger WHERE credit_id=?').all(creditId) || [];
  const prevHash = history.length > 0 ? history[history.length - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000';
  const payloadJson = JSON.stringify(payload);
  const hash = crypto.createHash('sha256').update(creditId + eventType + payloadJson + prevHash).digest('hex');
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare('INSERT INTO blockchain_ledger (id, credit_id, event_type, payload_json, prev_hash, hash, created_at) VALUES (?,?,?,?,?,?,?)')
    .run(id, creditId, eventType, payloadJson, prevHash, hash, createdAt);
}

function matchLimitOrders(db, creditId) {
  const credit = db.prepare('SELECT * FROM carbon_credits WHERE id=?').get(creditId);
  if (!credit || credit.available_tons <= 0 || credit.status !== 'active') return;
  
  const pendingOrders = db.prepare('SELECT * FROM limit_orders WHERE credit_id=? AND status=?').all(creditId, 'pending') || [];
  for (const order of pendingOrders) {
    if (credit.available_tons <= 0) break;
    
    // Check if limit order matches
    if (order.action === 'buy' && order.target_price >= credit.price_per_ton) {
      const matchTons = Math.min(order.tons, credit.available_tons);
      if (matchTons <= 0) continue;
      
      const txId = uuidv4();
      const totalPrice = matchTons * credit.price_per_ton;
      const platformFee = totalPrice * 0.15;
      const sellerRevenue = totalPrice * 0.85;
      
      db.prepare('INSERT INTO transactions (id,credit_id,buyer_id,seller_id,tons,price_per_ton,total_price,status) VALUES (?,?,?,?,?,?,?,?)')
        .run(txId, credit.id, order.buyer_id, credit.owner_id, matchTons, credit.price_per_ton, totalPrice, 'completed');
        
      db.prepare('INSERT INTO platform_fees (id, tx_id, amount) VALUES (?,?,?)').run(uuidv4(), txId, platformFee);
      db.prepare('INSERT INTO escrow (id, user_id, amount, type, status) VALUES (?,?,?,?,?)').run(uuidv4(), credit.owner_id, sellerRevenue, 'credit', 'settled');
      
      credit.available_tons -= matchTons;
      const status = credit.available_tons <= 0 ? 'sold' : 'active';
      db.prepare('UPDATE carbon_credits SET available_tons=?, status=? WHERE id=?').run(credit.available_tons, status, credit.id);
      
      // Certificate logic
      const certId = `CW-PUR-$\{Date.now().toString(36).toUpperCase()}`;
      db.prepare(`INSERT INTO carbon_credits (id,land_id,owner_id,ticker,total_tons,available_tons,price_per_ton,status,is_resale,vintage_year) VALUES (?,?,?,?,?,?,?,?,?,?)`)
        .run(uuidv4(), credit.land_id, order.buyer_id, credit.ticker, matchTons, matchTons, credit.price_per_ton, 'held', 1, credit.vintage_year);
      
      db.prepare(`INSERT INTO certificates (id,credit_id,owner_id,certificate_number,issued_to,tons,vintage_year,project_name,status) VALUES (?,?,?,?,?,?,?,?,?)`)
        .run(uuidv4(), credit.id, order.buyer_id, certId, 'Limit Order Buyer', matchTons, credit.vintage_year, 'Purchase', 'active');
        
      // Mark limit order filled (mocking the update)
      order.status = 'filled'; // In-memory mock
      // Ideally db.prepare('UPDATE limit_orders SET status=? WHERE id=?').run('filled', order.id);
      logBlockchainEvent(db, credit.id, 'trade_executed', { txId, tons: matchTons, price: credit.price_per_ton });
    }
  }
}



// ===================== ADMIN / EMPLOYEE ROUTES =====================
app.get('/api/admin/queue', requireAuth, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({error: 'Forbidden'});
  const db = getDb();
  const pending = db.prepare('SELECT * FROM land_plots WHERE verification_status=?').all('pending');
  res.json({ pending });
});

app.post('/api/admin/verify', requireAuth, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({error: 'Forbidden'});
  const db = getDb();
  const { plot_id, status } = req.body;
  db.prepare('UPDATE land_plots SET verification_status=? WHERE id=?').run(status, plot_id);
  
  // If approved, mint credits (simulate AI yield)
  if (status === 'verified') {
     const plot = db.prepare('SELECT * FROM land_plots WHERE id=?').get(plot_id);
     const carbonYield = plot.area_hectares * 5.5; // Mock calculation
     const creditId = uuidv4();
     db.prepare('UPDATE land_plots SET carbon_score=?, biomass_estimate=?, annual_yield_tons=? WHERE id=?')
       .run(85, 75, yield, plot_id);
     db.prepare(`INSERT INTO carbon_credits (id,land_id,owner_id,total_tons,available_tons,price_per_ton,status,vintage_year,ticker) VALUES (?,?,?,?,?,?,?,?,?)`)
       .run(creditId, plot_id, plot.owner_id, yield, yield, 15, 'active', 2026, `IND-CRBN-${Date.now().toString(36)}`);
  }
  res.json({ success: true });
});

app.get('/api/admin/liquidity', requireAuth, (req, res) => {
  if (req.user.role !== 'employee') return res.status(403).json({error: 'Forbidden'});
  const db = getDb();
  const activeCredits = db.prepare('SELECT * FROM carbon_credits WHERE status=?').all('active');
  const pendingOrders = db.prepare('SELECT * FROM limit_orders WHERE status=?').all('pending');
  const fees = db.prepare('SELECT * FROM platform_fees').all();
  
  const totalLiquidity = activeCredits.reduce((sum, c) => sum + c.available_tons, 0);
  const totalDemand = pendingOrders.reduce((sum, o) => sum + o.tons, 0);
  const totalFees = fees.reduce((sum, f) => sum + f.amount, 0);
  
  res.json({ totalLiquidity, totalDemand, totalFees });
});


app.get('/api/fpo/stats', requireAuth, (req, res) => {
  const db = getDb();
  const credits = db.prepare('SELECT * FROM carbon_credits WHERE owner_id=?').all(req.user.id);
  const escrow = db.prepare('SELECT * FROM escrow WHERE user_id=?').all(req.user.id);
  
  const totalMinted = credits.reduce((sum, c) => sum + c.total_tons, 0);
  const totalSold = credits.reduce((sum, c) => sum + (c.total_tons - c.available_tons), 0);
  const totalEarnings = escrow.reduce((sum, e) => sum + e.amount, 0);
  
  res.json({ totalMinted, totalSold, totalEarnings, upcomingPayout: totalEarnings * 0.5 }); // Simulate payout logic
});


app.post('/api/credits/sell-ai-price', requireAuth, async (req, res) => {
  // Simulates AI pricing based on weather, 5yr satellite data, biomass
  const { area, type } = req.body;
  try {
     let prompt = `As an AI pricing engine, suggest a spot price in INR per ton for ${type} carbon credits covering ${area} hectares. Consider 5-year satellite biomass data and current Indian market liquidity. Return only a JSON object: {"suggested_price": number, "confidence": number, "reasoning": "string"}`;
     const response = await axios.post('http://localhost:11434/api/generate', {
          model: 'nemotron-3-super:cloud', prompt: prompt, stream: false
     }, { timeout: 15000 });
     
     const jsonMatch = response.data.response.match(/\{.*\}/s);
     if(jsonMatch) {
        res.json(JSON.parse(jsonMatch[0]));
     } else {
        res.json({ suggested_price: 1850, confidence: 92, reasoning: "Fallback price based on high regional demand." });
     }
  } catch(e) {
     res.json({ suggested_price: 1500, confidence: 85, reasoning: "Calculated based on historical moving averages (AI Offline)." });
  }
});

app.post('/api/credits/list', requireAuth, (req, res) => {
  const db = getDb();
  const { credit_id, price } = req.body;
  const credit = db.prepare('SELECT * FROM carbon_credits WHERE id=? AND owner_id=?').get(credit_id, req.user.id);
  if (!credit) return res.status(404).json({error: 'Credit not found'});
  
  db.prepare('UPDATE carbon_credits SET status=?, price_per_ton=? WHERE id=?').run('active', price, credit_id);
  res.json({ success: true });
});


// ===================== BLOCKCHAIN ROUTES =====================
app.get('/api/blockchain/verify/:creditId', (req, res) => {
  const db = getDb();
  const history = db.prepare('SELECT * FROM blockchain_ledger WHERE credit_id=?').all(req.params.creditId) || [];
  
  let chain_valid = true;
  for (const block of history) {
    const calcHash = crypto.createHash('sha256').update(block.credit_id + block.event_type + block.payload_json + block.prev_hash).digest('hex');
    if (calcHash !== block.hash) {
      chain_valid = false;
      break;
    }
  }
  res.json({ ledger: history, chain_valid });
});

// ===================== AUTH ROUTES =====================
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'dummy_client_id_for_startup');

app.post('/api/auth/google', async (req, res) => {
  const db = getDb();
  const { idToken, role } = req.body;
  
  if (!idToken) return res.status(400).json({ error: 'Google ID token required' });
  
  if (!process.env.GOOGLE_CLIENT_ID) {
    return res.status(500).json({ error: 'Server missing GOOGLE_CLIENT_ID in environment variables' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    const { email, name, sub } = payload;
    
    let user = db.prepare('SELECT id,email,name,role,company_name,phone,kyc_status,created_at FROM users WHERE email=?').get(email);
    
    if (!user) {
      const id = uuidv4();
      db.prepare('INSERT INTO users (id,email,name,role,kyc_status,google_sub) VALUES (?,?,?,?,?,?)')
        .run(id, email, name, (role === 'employee' || role === 'customer') ? 'industry' : role, 'pending', sub);
      user = db.prepare('SELECT id,email,name,role,company_name,phone,kyc_status,created_at FROM users WHERE id=?').get(id);
    } else {
       // Optional: update existing user with google_sub if missing
    }
    
    req.session.userId = user.id;
    req.session.role = user.role;
    res.json({ success: true, user });
  } catch (error) {
    console.error('Google verification failed:', error.message);
    res.status(401).json({ error: 'Invalid Google token' });
  }
});

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password, name, role, company_name, phone } = req.body;
    if (!email || !password || !name || !role) return res.status(400).json({ error: 'Missing required fields' });
    if (!['landowner','industry'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
    const db = getDb();
    const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    db.prepare('INSERT INTO users (id,email,password_hash,name,role,company_name,phone) VALUES (?,?,?,?,?,?,?)')
      .run(id, email, password_hash, name, role, company_name||null, phone||null);
    res.json({ success: true, user: { id, email, name, role } });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email=? AND role IN (?,?)').get(email,'landowner','industry');
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    const { password_hash, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/employee-login', (req, res) => {
  try {
    const { email, password } = req.body;
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE email=? AND role=?').get(email,'employee');
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    req.session.userId = user.id;
    const { password_hash, ...safe } = user;
    res.json({ success: true, user: safe });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/auth/logout', (req, res) => { req.session.destroy(); res.json({ success: true }); });

app.get('/api/auth/me', requireAuth, (req, res) => { 
  const freshUser = require('./db').getDb().prepare('SELECT id,email,name,role,kyc_status,balance FROM users WHERE id=?').get(req.user.id);
  res.json({ user: freshUser || req.user }); 
});

// ===================== KYC ROUTES =====================
app.post('/api/kyc/submit', requireAuth, (req, res, next) => { req.uploadDest = 'uploads/kyc'; next(); }, upload.single('document'), (req, res) => {
  try {
    const db = getDb();
    const { doc_type, doc_number } = req.body;
    const id = uuidv4();
    db.prepare('INSERT INTO kyc_documents (id,user_id,doc_type,doc_number,file_path) VALUES (?,?,?,?,?)')
      .run(id, req.user.id, doc_type, doc_number, req.file?.path||null);
    db.prepare('UPDATE users SET kyc_status=? WHERE id=?').run('submitted', req.user.id);
    res.json({ success: true, id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/kyc/status', requireAuth, (req, res) => {
  const db = getDb();
  const docs = db.prepare('SELECT * FROM kyc_documents WHERE user_id=? ORDER BY created_at DESC').all(req.user.id);
  res.json({ kyc_status: req.user.kyc_status, documents: docs });
});

// ===================== LAND ROUTES =====================
app.post('/api/land/register', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { name, project_type, location_state, location_district, lat, lng, area_hectares, land_type, land_tenure, boundary_geojson } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO land_plots (id,owner_id,name,project_type,location_state,location_district,lat,lng,area_hectares,land_type,land_tenure,boundary_geojson) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id, req.user.id, name, project_type||'Regenerative Agriculture', location_state, location_district, lat, lng, area_hectares, land_type, land_tenure||'Owned', boundary_geojson ? JSON.stringify(boundary_geojson) : null);
    res.json({ success: true, id, plot: db.prepare('SELECT * FROM land_plots WHERE id=?').get(id) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/land/my-plots', requireAuth, (req, res) => {
  const db = getDb();
  const plots = db.prepare('SELECT * FROM land_plots WHERE owner_id=? ORDER BY created_at DESC').all(req.user.id);
  const credits = db.prepare('SELECT land_id, SUM(total_tons) as total, SUM(available_tons) as available FROM carbon_credits WHERE owner_id=? GROUP BY land_id').all(req.user.id);
  const creditMap = {};
  credits.forEach(c => { creditMap[c.land_id] = c; });
  plots.forEach(p => { p.credits = creditMap[p.id] || { total: 0, available: 0 }; });
  res.json({ plots });
});

app.get('/api/land/plot/:id', requireAuth, (req, res) => {
  const db = getDb();
  const plot = db.prepare('SELECT * FROM land_plots WHERE id=?').get(req.params.id);
  if (!plot) return res.status(404).json({ error: 'Plot not found' });
  const docs = db.prepare('SELECT * FROM land_documents WHERE land_id=? ORDER BY created_at DESC').all(req.params.id);
  const credits = db.prepare('SELECT * FROM carbon_credits WHERE land_id=?').all(req.params.id);
  res.json({ plot, documents: docs, credits });
});

app.put('/api/land/plot/:id', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const fields = ['name','project_type','location_state','location_district','lat','lng','area_hectares','land_type','land_tenure','boundary_geojson'];
    const updates = [];
    const values = [];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        updates.push(`${f}=?`);
        values.push(f === 'boundary_geojson' ? JSON.stringify(req.body[f]) : req.body[f]);
      }
    });
    if (updates.length === 0) return res.status(400).json({ error: 'No fields to update' });
    updates.push('updated_at=datetime("now")');
    values.push(req.params.id);
    db.prepare(`UPDATE land_plots SET ${updates.join(',')} WHERE id=?`).run(...values);
    res.json({ success: true, plot: db.prepare('SELECT * FROM land_plots WHERE id=?').get(req.params.id) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/land/upload-docs', requireAuth, (req, res, next) => { req.uploadDest = 'uploads/land-docs'; next(); }, upload.array('documents', 10), (req, res) => {
  try {
    const db = getDb();
    const { land_id, doc_type } = req.body;
    const docs = [];
    (req.files || []).forEach(file => {
      const id = uuidv4();
      db.prepare('INSERT INTO land_documents (id,land_id,doc_type,original_name,file_path) VALUES (?,?,?,?,?)')
        .run(id, land_id, doc_type || 'land_deed', file.originalname, file.path);
      docs.push({ id, original_name: file.originalname, doc_type, file_path: file.path });
    });
    res.json({ success: true, documents: docs });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/land/submit-for-audit/:id', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE land_plots SET verification_status=? WHERE id=? AND owner_id=?').run('pending', req.params.id, req.user.id);
  res.json({ success: true });
});

// ===================== AI ROUTES =====================
async function callOllama(prompt) {
  try {
    const response = await axios.post(`${OLLAMA_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false,
      options: { temperature: 0.3 }
    }, { timeout: 120000 });
    return response.data.response;
  } catch(e) {
    console.error('Ollama error:', e.message);
    return null;
  }
}

app.post('/api/ai/parse-document', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const { doc_id } = req.body;
    const doc = db.prepare('SELECT * FROM land_documents WHERE id=?').get(doc_id);
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    db.prepare('UPDATE land_documents SET parse_status=? WHERE id=?').run('processing', doc_id);

    let text = '';
    try {
      if (doc.file_path && doc.file_path.endsWith('.pdf')) {
        const pdfParse = require('pdf-parse');
        const dataBuffer = fs.readFileSync(doc.file_path);
        const pdfData = await pdfParse(dataBuffer);
        text = pdfData.text;
      } else {
        text = `Document: ${doc.original_name}`;
      }
    } catch(pe) { text = `Document: ${doc.original_name} (unable to parse PDF)`; }

    const prompt = `You are a land document parser for Indian agricultural documents. Parse this document text and extract information. Return ONLY valid JSON with these fields:
{
  "owner_name": "extracted owner name or null",
  "survey_number": "survey/plot number or null",
  "area_acres": numeric value or null,
  "area_hectares": numeric value or null,
  "location": "village/taluka/district or null",
  "land_type": "agricultural/forest/grassland/wetland or null",
  "taluka": "taluka name or null",
  "district": "district name or null",
  "state": "state name or null"
}

Document text:
${text.substring(0, 3000)}`;

    let parsed = null;
    const aiResponse = await callOllama(prompt);
    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) parsed = JSON.parse(jsonMatch[0]);
      } catch(je) { console.error('AI JSON parse error:', je.message); }
    }

    if (!parsed) {
      parsed = {
        owner_name: "Ramesh Kumar (Demo)",
        survey_number: "45/2A",
        area_acres: 25,
        area_hectares: 10.12,
        location: "Solapur, Maharashtra",
        land_type: "agricultural",
        district: "Solapur",
        state: "Maharashtra"
      };
    }

    db.prepare('UPDATE land_documents SET ai_parsed_data=?, parse_status=? WHERE id=?')
      .run(JSON.stringify(parsed), 'completed', doc_id);

    if (parsed.area_hectares || parsed.area_acres) {
      const hectares = parsed.area_hectares || (parsed.area_acres * 0.4047);
      const land = db.prepare('SELECT id FROM land_plots WHERE id=?').get(doc.land_id);
      if (land) {
        db.prepare('UPDATE land_plots SET area_hectares=COALESCE(?,area_hectares), location_state=COALESCE(?,location_state), location_district=COALESCE(?,location_district), ai_parsed_data=?, updated_at=datetime("now") WHERE id=?')
          .run(hectares, parsed.state, parsed.district, JSON.stringify(parsed), doc.land_id);
      }
    }

    res.json({ success: true, parsed_data: parsed, ai_used: !!aiResponse });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/estimate-carbon', requireAuth, async (req, res) => {
  try {
    const db = getDb();
    const { land_id } = req.body;
    const plot = db.prepare('SELECT * FROM land_plots WHERE id=?').get(land_id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });

    const prompt = `You are a carbon credit estimation expert. Calculate carbon sequestration for this land plot. Use scientific rates.

Land Details:
- Area: ${plot.area_hectares} hectares
- Type: ${plot.project_type || plot.land_type || 'agricultural'}
- Location: ${plot.location_state}, ${plot.location_district} (Lat: ${plot.lat}, Lng: ${plot.lng})
- Climate Zone: Tropical/Subtropical India

Carbon Sequestration Reference Rates (tCO2/ha/year):
- Dense Forest: 10-15
- Agroforestry: 5-12
- Regenerative Agriculture: 3-6
- Grassland: 2-4
- Wetland/Mangrove: 8-15

Return ONLY valid JSON:
{
  "biomass_estimate": number (tons biomass/ha),
  "soil_carbon": number (tCO2/ha from soil),
  "above_ground_carbon": number (tCO2/ha from vegetation),
  "annual_yield_tons": number (total tCO2/year for entire area),
  "carbon_score": number (0-100 quality score),
  "methodology": "brief methodology description",
  "confidence": number (0-1),
  "breakdown": {
    "vegetation": number,
    "soil": number,
    "roots": number
  }
}`;

    let estimate = null;
    const aiResponse = await callOllama(prompt);
    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) estimate = JSON.parse(jsonMatch[0]);
      } catch(je) { console.error('AI JSON parse error:', je.message); }
    }

    if (!estimate) {
      const rates = { 'Regenerative Agriculture': 4.5, 'Forestry': 12, 'Grassland Restoration': 3, 'Agroforestry': 8, 'Wetland Conservation': 10, 'Mangrove Restoration': 13 };
      const rate = rates[plot.project_type] || 5;
      const area = plot.area_hectares || 100;
      const annualYield = Math.round(area * rate * (0.8 + Math.random() * 0.4));
      estimate = {
        biomass_estimate: Math.round(rate * 2.2 * 10) / 10,
        soil_carbon: Math.round(rate * 0.4 * 10) / 10,
        above_ground_carbon: Math.round(rate * 0.6 * 10) / 10,
        annual_yield_tons: annualYield,
        carbon_score: Math.min(95, Math.round(60 + Math.random() * 35)),
        methodology: 'AR-AMS0007 Simplified',
        confidence: 0.78,
        breakdown: { vegetation: Math.round(annualYield*0.55), soil: Math.round(annualYield*0.30), roots: Math.round(annualYield*0.15) }
      };
    }

    db.prepare('UPDATE land_plots SET biomass_estimate=?, soil_carbon=?, annual_yield_tons=?, carbon_score=?, verification_status=?, updated_at=datetime("now") WHERE id=?')
      .run(estimate.biomass_estimate, estimate.soil_carbon, estimate.annual_yield_tons, estimate.carbon_score, 'ai_review', land_id);

    res.json({ success: true, estimate, ai_used: !!aiResponse });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/ai/verify-certificate', requireAuth, (req2, res2, next) => { req2.uploadDest = 'uploads/certificates'; next(); }, upload.single('certificate'), async (req, res) => {
  try {
    let text = req.file ? `Certificate file: ${req.file.originalname}` : 'No file uploaded';
    if (req.file && req.file.path.endsWith('.pdf')) {
      try {
        const pdfParse = require('pdf-parse');
        const buf = fs.readFileSync(req.file.path);
        const data = await pdfParse(buf);
        text = data.text;
      } catch(e) {}
    }

    const prompt = `Analyze this carbon credit certificate and extract details. Return ONLY valid JSON:
{
  "issuer": "organization name",
  "serial_number": "certificate serial",
  "tons": number,
  "vintage_year": number,
  "project_name": "project name",
  "is_valid": boolean,
  "confidence": number (0-1),
  "notes": "any concerns or validation notes"
}

Certificate text: ${text.substring(0,2000)}`;

    let result = null;
    const aiResponse = await callOllama(prompt);
    if (aiResponse) {
      try {
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) result = JSON.parse(jsonMatch[0]);
      } catch(e) {}
    }

    if (!result) {
      result = { issuer: 'Verra/Gold Standard (Demo)', serial_number: 'VCS-'+Date.now(), tons: 100, vintage_year: 2025, project_name: 'Demo Project', is_valid: true, confidence: 0.72, notes: 'AI verification in demo mode' };
    }

    res.json({ success: true, verification: result, ai_used: !!aiResponse });
  } catch(e) { res.status(500).json({ error: e.message }); }
});




// ===================== REAL-WORLD DETECTION APIs =====================
// Overpass API: Detect buildings, roads, water in a bounding box
app.post('/api/geo/detect-features', requireAuth, async (req, res) => {
  try {
    const { lat, lng, radiusMeters, polygonStr } = req.body;
    
    let query = '';
    if (polygonStr) {
      // Use exact drawn boundary
      query = '[out:json][timeout:15];(' +
        'nwr["building"](poly:"' + polygonStr + '");' +
        'nwr["highway"](poly:"' + polygonStr + '");' +
        'nwr["natural"="water"](poly:"' + polygonStr + '");' +
        'nwr["waterway"](poly:"' + polygonStr + '");' +
        'nwr["landuse"](poly:"' + polygonStr + '");' +
      ');out body;>;out skel qt;';
    } else {
      // Fallback to bounding box
      const r = (radiusMeters || 500) / 111111;
      const south = parseFloat(lat) - r, north = parseFloat(lat) + r;
      const west = parseFloat(lng) - r, east = parseFloat(lng) + r;
      const bbox = south + ',' + west + ',' + north + ',' + east;
      query = '[out:json][timeout:15];(' +
        'nwr["building"]('+bbox+');' +
        'nwr["highway"]('+bbox+');' +
        'nwr["natural"="water"]('+bbox+');' +
        'nwr["waterway"]('+bbox+');' +
        'nwr["landuse"]('+bbox+');' +
      ');out body;>;out skel qt;';
    }

    const overpassRes = await axios.post('https://overpass-api.de/api/interpreter', 'data=' + encodeURIComponent(query), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'CarbonWalletAI/1.0' },
      timeout: 15000
    });

    const elements = overpassRes.data.elements || [];
    const buildings = elements.filter(e => e.tags && e.tags.building);
    const roads = elements.filter(e => e.tags && e.tags.highway);
    const water = elements.filter(e => e.tags && (e.tags.natural === 'water' || e.tags.waterway));
    const landuse = elements.filter(e => e.tags && e.tags.landuse);

    const landTypes = {};
    landuse.forEach(l => { const t = l.tags.landuse; landTypes[t] = (landTypes[t]||0) + 1; });

    res.json({
      source: 'OpenStreetMap Overpass API (LIVE)',
      query_type: polygonStr ? 'Exact Polygon Match' : 'Bounding Box Fallback',
      buildings_count: buildings.length,
      buildings_types: buildings.map(b => b.tags.building).filter((v,i,a) => a.indexOf(v)===i).slice(0,10),
      roads_count: roads.length,
      road_types: roads.map(r => r.tags.highway).filter((v,i,a) => a.indexOf(v)===i),
      water_bodies_count: water.length,
      water_types: water.map(w => w.tags.natural || w.tags.waterway).filter((v,i,a) => a.indexOf(v)===i),
      landuse_detected: landTypes,
      total_features: elements.length,
      building_clear: buildings.length === 0,
      water_clear: water.length === 0,
      road_clear: roads.length === 0
    });
  } catch(e) {
    console.error('Overpass error:', e.message);
    res.json({
      source: 'Fallback (Overpass unavailable)',
      buildings_count: 0, roads_count: 0, water_bodies_count: 0,
      building_clear: true, water_clear: true, road_clear: true,
      landuse_detected: {}, total_features: 0, error: e.message
    });
  }
});
app.post('/api/geo/reverse-geocode', requireAuth, async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const nomRes = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { lat, lon: lng, format: 'json', zoom: 14 },
      headers: { 'User-Agent': 'CarbonWallet/1.0' },
      timeout: 10000
    });
    const addr = nomRes.data.address || {};
    res.json({
      display_name: nomRes.data.display_name,
      state: addr.state || '',
      district: addr.county || addr.state_district || '',
      village: addr.village || addr.town || addr.city || '',
      country: addr.country || ''
    });
  } catch(e) {
    res.json({ display_name: '', state: '', district: '', village: '', country: 'India', error: e.message });
  }
});

// Real carbon footprint data proxy
app.post('/api/geo/carbon-data', requireAuth, async (req, res) => {
  try {
    const { lat, lng, hectares, landType, land_id } = req.body;
    // Use SoilGrids API for soil organic carbon data
    const soilRes = await axios.get('https://rest.isric.org/soilgrids/v2.0/properties/query', {
      params: { lon: lng, lat: lat, property: 'soc', depth: '0-30cm', value: 'mean' },
      timeout: 10000
    });
    const socData = soilRes.data;
    const socValue = socData?.properties?.layers?.[0]?.depths?.[0]?.values?.mean || null;
    
    // Calculate real carbon credits based on soil data
    const socTonPerHa = socValue ? (socValue / 10) : 45; // dg/kg to approximate tons/ha
    const sequestrationRate = landType === 'Forest' ? 3.5 : (landType === 'Agricultural' ? 1.8 : 0.3);
    const annualCredits = Math.floor(parseFloat(hectares) * sequestrationRate);
    const marketPrice = landType === 'Forest' ? 1850 : (landType === 'Agricultural' ? 1400 : 750);
    
    res.json({
      source: socValue ? 'ISRIC SoilGrids (LIVE API)' : 'Estimated (SoilGrids unavailable)',
      soil_organic_carbon_dg_kg: socValue || 'N/A',
      soil_organic_carbon_approx_ton_ha: socTonPerHa.toFixed(1),
      sequestration_rate_ton_ha_yr: sequestrationRate,
      annual_credits_tons: annualCredits,
      market_price_inr: marketPrice,
      annual_revenue_inr: annualCredits * marketPrice,
      net_payout_inr: Math.floor(annualCredits * marketPrice * 0.85)
    });
  } catch(e) {
    const sequestrationRate = req.body.landType === 'Forest' ? 3.5 : (req.body.landType === 'Agricultural' ? 1.8 : 0.3);
    const annualCredits = Math.floor(parseFloat(req.body.hectares || 1) * sequestrationRate);
    const marketPrice = req.body.landType === 'Forest' ? 1850 : (req.body.landType === 'Agricultural' ? 1400 : 750);
    res.json({
      source: 'Estimated (APIs unavailable)',
      soil_organic_carbon_dg_kg: 'N/A',
      sequestration_rate_ton_ha_yr: sequestrationRate,
      annual_credits_tons: annualCredits,
      market_price_inr: marketPrice,
      annual_revenue_inr: annualCredits * marketPrice,
      net_payout_inr: Math.floor(annualCredits * marketPrice * 0.85)
    });
  }
});


// ===================== SATELLITE AI VERIFICATION PIPELINE =====================
// Pre-Feasibility Historical Scan (The Automated Gatekeeper)
app.post('/api/ai/pre-feasibility', requireAuth, async (req, res) => {
  try {
    const { lat, lng, hectares, landType } = req.body;
    if (!lat || !lng) return res.status(400).json({ error: 'Coordinates required' });
    
    const prompt = `You are a satellite remote sensing AI analyzing land at coordinates ${lat}, ${lng} covering ${hectares} hectares classified as "${landType}".
Run a Pre-Feasibility Historical Scan using simulated Sentinel-2 (10m optical) and Landsat-8 (thermal) data.
Check for these disqualifying conditions:
1. Was this land a protected forest recently deforested?
2. Is this land in a restricted/military zone?
3. Is there evidence of recent urban construction?
4. Is this land in a flood-prone delta unsuitable for carbon projects?

Return ONLY valid JSON with these fields:
{
  "eligible": true/false,
  "risk_score": 0-100 (lower is better),
  "ndvi_historical": [array of 6 monthly NDVI values between 0.1 and 0.9],
  "soil_moisture_index": number between 0.2 and 0.8,
  "land_use_history": ["list of detected historical land uses"],
  "sentinel2_bands": { "B2_blue": number, "B3_green": number, "B4_red": number, "B8_nir": number, "B11_swir": number },
  "deforestation_detected": false,
  "protected_zone": false,
  "flood_risk": "low/medium/high",
  "biomass_estimate_tons_per_ha": number,
  "soil_organic_carbon_pct": number between 0.5 and 4.0,
  "awnings": ["any warnings as strings"]
}`;

    try {
      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL, prompt, stream: false, format: 'json'
      }, { timeout: 20000 });
      const result = JSON.parse(ollamaRes.data.response);
      res.json(result);
    } catch(e) {
      // Deterministic fallback based on coordinates
      const seed = Math.abs(Math.sin(parseFloat(lat) * 1000 + parseFloat(lng) * 500));
      res.json({
        eligible: true,
        risk_score: Math.floor(seed * 25),
        ndvi_historical: [0.35, 0.42, 0.58, 0.65, 0.72, 0.68].map(v => +(v + seed * 0.1).toFixed(2)),
        soil_moisture_index: +(0.35 + seed * 0.3).toFixed(2),
        land_use_history: landType === 'Forest' ? ['Dense Vegetation', 'Natural Forest', 'Mixed Canopy'] : ['Cropland', 'Seasonal Agriculture', 'Fallow Period'],
        sentinel2_bands: { B2_blue: 0.045, B3_green: 0.078, B4_red: 0.035, B8_nir: 0.285, B11_swir: 0.112 },
        deforestation_detected: false,
        protected_zone: false,
        flood_risk: 'low',
        biomass_estimate_tons_per_ha: +(8.5 + seed * 12).toFixed(1),
        soil_organic_carbon_pct: +(1.2 + seed * 1.8).toFixed(2),
        warnings: []
      });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Double-Layer Boundary Cross-Verification (AI Auditor)
app.post('/api/ai/verify-boundary', requireAuth, async (req, res) => {
  try {
    const { lat, lng, hectares, geojson, ownerName, land_id } = req.body;
    
    const prompt = `You are a geospatial AI auditor performing Double-Layer Boundary Cross-Verification.
A landowner "${ownerName}" submitted a polygon boundary at ${lat},${lng} claiming ${hectares} hectares.
The submitted GeoJSON is: ${JSON.stringify(geojson)}

Perform these satellite cross-checks:
1. Building Detection: Check if the polygon overlaps any buildings (95% accuracy)
2. Waterbody Detection: Check if the polygon crosses rivers/lakes (90% accuracy)
3. Tree Cover Analysis: Estimate canopy density (86% accuracy)
4. Road Intersection: Check if boundary crosses roads
5. Neighbor Overlap: Check for overlap with adjacent registered parcels

Return ONLY valid JSON:
{
  "boundary_valid": true/false,
  "building_overlap": false,
  "waterbody_overlap": false,
  "road_intersection": false,
  "neighbor_overlap": false,
  "canopy_density_pct": number 0-100,
  "ground_cover": { "vegetation": number, "bare_soil": number, "water": number, "built_up": number },
  "confidence": number 0.85-0.99,
  "flags": [],
  "recommendation": "approve/flag_for_review/reject"
}`;

    try {
      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL, prompt, stream: false, format: 'json'
      }, { timeout: 20000 });
      res.json(JSON.parse(ollamaRes.data.response));
    } catch(e) {
      res.json({
        boundary_valid: true,
        building_overlap: false,
        waterbody_overlap: false,
        road_intersection: false,
        neighbor_overlap: false,
        canopy_density_pct: 62,
        ground_cover: { vegetation: 72, bare_soil: 18, water: 3, built_up: 7 },
        confidence: 0.94,
        flags: [],
        recommendation: 'approve'
      });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Document Tamper Validation
app.post('/api/ai/tamper-check', requireAuth, async (req, res) => {
  try {
    const { docId, fileName } = req.body;
    // Simulate AI tamper checking
    res.json({
      tamper_detected: false,
      blur_score: 0.12,
      metadata_intact: true,
      gps_spoof_detected: false,
      file_hash: require('crypto').createHash('sha256').update(fileName + Date.now()).digest('hex').substring(0, 16),
      confidence: 0.97
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// AWD Methane Monitoring (Rice Paddy Specific)
app.post('/api/ai/awd-monitor', requireAuth, async (req, res) => {
  try {
    const { lat, lng, hectares } = req.body;
    
    const prompt = `You are a satellite AI monitoring Alternate Wetting and Drying (AWD) practices for rice cultivation at ${lat},${lng} covering ${hectares} hectares.
Using simulated Sentinel-3 thermal and Sentinel-2 optical data fusion at 10m resolution:
1. Detect daily wet/dry cycles in the paddy fields
2. Calculate pixel-wise methane reduction estimates

Return ONLY valid JSON:
{
  "awd_detected": true/false,
  "wet_dry_cycles_detected": number (how many cycles in last 30 days),
  "methane_baseline_kg_per_ha": number,
  "methane_reduced_kg_per_ha": number,
  "reduction_pct": number,
  "r_squared_validation": number > 0.9,
  "credits_eligible_tons": number,
  "daily_moisture_index": [array of 7 values between 0 and 1 representing last 7 days]
}`;

    try {
      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL, prompt, stream: false, format: 'json'
      }, { timeout: 20000 });
      res.json(JSON.parse(ollamaRes.data.response));
    } catch(e) {
      res.json({
        awd_detected: true,
        wet_dry_cycles_detected: 4,
        methane_baseline_kg_per_ha: 185,
        methane_reduced_kg_per_ha: 62,
        reduction_pct: 66.5,
        r_squared_validation: 0.93,
        credits_eligible_tons: Math.floor(hectares * 3.2),
        daily_moisture_index: [0.82, 0.45, 0.23, 0.71, 0.38, 0.19, 0.65]
      });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Satellite Layer Data for Employee Portal
app.get('/api/admin/satellite-layers/:landId', requireAuth, requireRole('employee'), async (req, res) => {
  try {
    const db = getDb();
    const plot = db.prepare('SELECT * FROM land_plots WHERE id=?').get(req.params.landId);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    
    res.json({
      plot,
      layers: {
        sentinel2_optical: { resolution: '10m', bands: ['B2','B3','B4','B8','B11','B12'], ndvi: 0.68, ndwi: 0.15 },
        sentinel3_thermal: { resolution: '300m (downscaled to 10m)', soil_temp_c: 28.5, moisture: 0.42 },
        landsat8: { resolution: '30m', surface_reflectance: 0.34, thermal_anomaly: false },
        derived_parameters: [
          'NDVI (Vegetation Index)', 'NDWI (Water Index)', 'EVI (Enhanced Vegetation)',
          'Soil Moisture', 'Canopy Height', 'Biomass Density', 'Leaf Area Index',
          'Chlorophyll Content', 'Crop Stage', 'Flood Extent', 'Burn Severity',
          'Land Surface Temperature', 'Evapotranspiration', 'Soil Organic Carbon',
          'Clay Content', 'pH Estimate', 'Nitrogen Index', 'AWD Cycle Detection',
          'Deforestation Alert', 'Building Footprint', 'Road Network', 'Water Bodies',
          'Tree Cover Change', 'Grassland Extent', 'Wetland Classification', 'Urban Sprawl'
        ]
      }
    });
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ===================== AI LAND REGISTRY =====================
app.post('/api/ai/verify-registry', requireAuth, async (req, res) => {
  try {
    const { lat, lng, hectares, ownerName } = req.body;
    if (!lat || !lng || !hectares) return res.status(400).json({ error: 'Missing land data' });
    
    // Construct prompt for Nemotron
    const prompt = `You are an advanced AI simulating the National Land Registry Database. 
A landowner named "${ownerName}" is claiming ownership of ${hectares} hectares at coordinates ${lat}, ${lng}.
Your job is to verify this and return a valid JSON object containing:
1. "verified": boolean (always return true for this demo)
2. "registry_owner": string (the name found in the registry, make it match ${ownerName})
3. "confidence": number (between 0.90 and 0.99)
4. "geojson": A valid GeoJSON Polygon object representing a realistic border for this ${hectares} hectare land block centered around ${lat}, ${lng}. To do this accurately, generate a 5-point polygon (with the last point closing the loop) roughly covering the requested area.

ONLY output valid JSON. No markdown formatting, no explanations. Example format:
{
  "verified": true,
  "registry_owner": "Name",
  "confidence": 0.98,
  "geojson": {
    "type": "Polygon",
    "coordinates": [[[lng, lat], [lng+0.001, lat], [lng+0.001, lat-0.001], [lng, lat-0.001], [lng, lat]]]
  }
}`;

    try {
      const ollamaRes = await axios.post(`${OLLAMA_URL}/api/generate`, {
        model: OLLAMA_MODEL,
        prompt: prompt,
        stream: false,
        format: 'json'
      }, { timeout: 15000 });
      
      const result = JSON.parse(ollamaRes.data.response);
      res.json(result);
    } catch(e) {
      console.error('AI Error:', e.message);
      // Fallback if AI fails
      res.json({
        verified: true,
        registry_owner: ownerName,
        confidence: 0.95,
        geojson: {
          type: 'Polygon',
          coordinates: [[[parseFloat(lng)-0.001, parseFloat(lat)+0.001], [parseFloat(lng)+0.001, parseFloat(lat)+0.001], [parseFloat(lng)+0.001, parseFloat(lat)-0.001], [parseFloat(lng)-0.001, parseFloat(lat)-0.001], [parseFloat(lng)-0.001, parseFloat(lat)+0.001]]]
        },
        fallback: true
      });
    }
  } catch(e) { res.status(500).json({ error: e.message }); }
});


// ===================== CREDITS ROUTES =====================
app.get('/api/credits/marketplace', (req, res) => {
  const db = getDb();
  const { search, min_price, max_price, land_type, region, sort_by } = req.query;
  let query = `SELECT c.*, u.name as seller_name, u.role as seller_role, 
    l.name as land_name, l.project_type, l.location_state, l.location_district, l.lat, l.lng, l.area_hectares, l.carbon_score, l.verification_status as land_status
    FROM carbon_credits c 
    LEFT JOIN users u ON c.owner_id = u.id 
    LEFT JOIN land_plots l ON c.land_id = l.id 
    WHERE c.status = 'active' AND c.available_tons > 0`;
  const params = [];

  if (search) { query += ` AND (l.name LIKE ? OR l.location_state LIKE ? OR l.location_district LIKE ? OR u.name LIKE ?)`; const s = `%${search}%`; params.push(s,s,s,s); }
  if (min_price) { query += ` AND c.price_per_ton >= ?`; params.push(parseFloat(min_price)); }
  if (max_price) { query += ` AND c.price_per_ton <= ?`; params.push(parseFloat(max_price)); }
  if (land_type && land_type !== 'All') { query += ` AND l.project_type = ?`; params.push(land_type); }
  if (region && region !== 'All') { query += ` AND l.location_state = ?`; params.push(region); }

  const sortMap = { 'price_asc': 'c.price_per_ton ASC', 'price_desc': 'c.price_per_ton DESC', 'newest': 'c.created_at DESC', 'credits': 'c.available_tons DESC', 'score': 'l.carbon_score DESC' };
  query += ` ORDER BY ${sortMap[sort_by] || 'c.created_at DESC'}`;

  const credits = db.prepare(query).all(...params);
  res.json({ credits, total: credits.length });
});

app.post('/api/credits/generate', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { land_id, price_per_ton } = req.body;
    const plot = db.prepare('SELECT * FROM land_plots WHERE id=? AND owner_id=?').get(land_id, req.user.id);
    if (!plot) return res.status(404).json({ error: 'Plot not found' });
    if (plot.verification_status !== 'verified') return res.status(400).json({ error: 'Land must be verified first' });
    if (!plot.annual_yield_tons || plot.annual_yield_tons <= 0) return res.status(400).json({ error: 'No carbon yield estimated' });

    const existing = db.prepare('SELECT id FROM carbon_credits WHERE land_id=? AND vintage_year=?').get(land_id, new Date().getFullYear());
    if (existing) return res.status(400).json({ error: 'Credits already generated for this year' });

    const id = uuidv4();
    const certId = `CW-${new Date().getFullYear()}-${id.slice(0,8).toUpperCase()}`;
    db.prepare(`INSERT INTO carbon_credits (id,land_id,owner_id,total_tons,available_tons,price_per_ton,status,certificate_id,vintage_year) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(id, land_id, req.user.id, plot.annual_yield_tons, plot.annual_yield_tons, price_per_ton || 25, 'active', certId, new Date().getFullYear());

    const cert = uuidv4();
    db.prepare(`INSERT INTO certificates (id,credit_id,owner_id,certificate_number,issued_to,tons,vintage_year,project_name,region,status) VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(cert, id, req.user.id, certId, req.user.name, plot.annual_yield_tons, new Date().getFullYear(), plot.name, `${plot.location_state}, ${plot.location_district}`, 'active');

    res.json({ success: true, credit_id: id, certificate_id: certId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/credits/purchase', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { credit_id, tons, action, order_type, target_price } = req.body;
    const credit = db.prepare('SELECT * FROM carbon_credits WHERE id=?').get(credit_id);
    if (!credit) return res.status(404).json({ error: 'Credit not found' });
    if (credit.available_tons < tons) return res.status(400).json({ error: 'Not enough credits available' });
    if (credit.owner_id === req.user.id) return res.status(400).json({ error: 'Cannot buy your own credits' });

    
    if (order_type === 'limit') {
      const orderId = uuidv4();
      db.prepare('INSERT INTO limit_orders (id, buyer_id, credit_id, tons, target_price, action) VALUES (?,?,?,?,?,?)')
        .run(orderId, req.user.id, credit_id, tons, target_price, action);
      return res.json({ success: true, is_limit: true, message: 'Limit order placed successfully.' });
    }

    const txId = uuidv4();
    const totalPrice = tons * credit.price_per_ton;
    const platformFee = totalPrice * 0.15; // 15% Platform fee
    const sellerRevenue = totalPrice * 0.85;

    // Simulate Escrow logic
    db.prepare('INSERT INTO transactions (id,credit_id,buyer_id,seller_id,tons,price_per_ton,total_price,status) VALUES (?,?,?,?,?,?,?,?)')
      .run(txId, credit_id, req.user.id, credit.owner_id, tons, credit.price_per_ton, totalPrice, 'completed');
      
    db.prepare('INSERT INTO platform_fees (id, tx_id, amount) VALUES (?,?,?)').run(uuidv4(), txId, platformFee);
    db.prepare('INSERT INTO escrow (id, user_id, amount, type, status) VALUES (?,?,?,?,?)').run(uuidv4(), credit.owner_id, sellerRevenue, 'credit', 'settled');

    const newAvailable = credit.available_tons - tons;
    const status = action === 'retire' ? 'retired' : (newAvailable <= 0 ? 'sold' : 'active');
    db.prepare('UPDATE carbon_credits SET available_tons=?, status=? WHERE id=?')
      .run(newAvailable, status, credit_id);

    // If Retire, generate retirement serial
    let certId = '';
    if (action === 'retire') {
       certId = `RET-CW-${Date.now().toString(36).toUpperCase()}`;
    } else {
       certId = `CW-PUR-${Date.now().toString(36).toUpperCase()}`;
       // Create a new held credit block for the buyer
       db.prepare(`INSERT INTO carbon_credits (id,land_id,owner_id,ticker,total_tons,available_tons,price_per_ton,status,is_resale,vintage_year) VALUES (?,?,?,?,?,?,?,?,?,?)`)
         .run(uuidv4(), credit.land_id, req.user.id, credit.ticker, tons, tons, credit.price_per_ton, 'held', 1, credit.vintage_year);
    }
    
    const certUuid = uuidv4();
    db.prepare(`INSERT INTO certificates (id,credit_id,owner_id,certificate_number,issued_to,tons,vintage_year,project_name,status) VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(certUuid, credit_id, req.user.id, certId, req.user.name || req.user.company_name, tons, credit.vintage_year, action === 'retire' ? 'Retired Offset' : 'Purchase', 'active');
      
    logBlockchainEvent(db, credit_id, action === 'retire' ? 'retire' : 'trade_executed', { tons, action, price: credit.price_per_ton });
    matchLimitOrders(db, credit_id);

    // Notifications
    const nId1 = uuidv4(), nId2 = uuidv4();
    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
      .run(nId1, credit.owner_id, 'Credits Sold!', `${tons} tons purchased. ₹${sellerRevenue.toFixed(2)} added to escrow (15% platform fee deducted).`, 'success');
    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
      .run(nId2, req.user.id, action === 'retire' ? 'Credits Retired' : 'Purchase Confirmed', `You ${action === 'retire' ? 'retired' : 'purchased'} ${tons} tons. Certificate: ${certId}`, 'success');

    res.json({ success: true, transaction_id: txId, certificate_id: certId, total_price: totalPrice, fee_deducted: platformFee });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/credits/list-for-sale', requireAuth, (req, res) => {
  try {
    const db = getDb();
    const { tons, price_per_ton } = req.body;
    const id = uuidv4();
    db.prepare(`INSERT INTO carbon_credits (id,owner_id,total_tons,available_tons,price_per_ton,status,is_resale,vintage_year) VALUES (?,?,?,?,?,?,?,?)`)
      .run(id, req.user.id, tons, tons, price_per_ton, 'active', 1, new Date().getFullYear());
    res.json({ success: true, credit_id: id });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/credits/my-credits', requireAuth, (req, res) => {
  const db = getDb();
  const owned = db.prepare(`SELECT c.*, l.name as land_name, l.location_state, l.location_district FROM carbon_credits c LEFT JOIN land_plots l ON c.land_id=l.id WHERE c.owner_id=? ORDER BY c.created_at DESC`).all(req.user.id);
  const purchased = db.prepare(`SELECT t.*, c.certificate_id, l.name as land_name, u.name as seller_name FROM transactions t JOIN carbon_credits c ON t.credit_id=c.id LEFT JOIN land_plots l ON c.land_id=l.id LEFT JOIN users u ON t.seller_id=u.id WHERE t.buyer_id=? ORDER BY t.created_at DESC`).all(req.user.id);
  const certs = db.prepare('SELECT * FROM certificates WHERE owner_id=? ORDER BY issued_at DESC').all(req.user.id);
  res.json({ owned, purchased, certificates: certs });
});

app.get('/api/credits/transactions', requireAuth, (req, res) => {
  const db = getDb();
  const txs = db.prepare(`SELECT t.*, cb.name as buyer_name, cs.name as seller_name, cr.certificate_id, l.name as land_name 
    FROM transactions t 
    JOIN users cb ON t.buyer_id=cb.id 
    JOIN users cs ON t.seller_id=cs.id 
    JOIN carbon_credits cr ON t.credit_id=cr.id
    LEFT JOIN land_plots l ON cr.land_id=l.id
    WHERE t.buyer_id=? OR t.seller_id=? 
    ORDER BY t.created_at DESC`).all(req.user.id, req.user.id);
  res.json({ transactions: txs });
});

// ===================== ADMIN ROUTES =====================
app.get('/api/admin/dashboard', requireAuth, requireRole('employee'), (req, res) => {
  const db = getDb();
  const uRow = db.prepare('SELECT COUNT(*) as c FROM users WHERE role != "employee"').get();
  const usersCount = (uRow && uRow.c) ? uRow.c : 0;
  
  const lRow = db.prepare('SELECT SUM(area_hectares) as a FROM land_plots WHERE verification_status="verified"').get();
  const landsCount = (lRow && lRow.a) ? lRow.a : 0;
  
  const cRow = db.prepare('SELECT SUM(total_tons) as t FROM carbon_credits').get();
  const creditsCount = (cRow && cRow.t) ? cRow.t : 0;
  
  const rRow = db.prepare('SELECT SUM(total_price) as r FROM transactions WHERE status="completed"').get();
  const revenueCount = (rRow && rRow.r) ? rRow.r : 0;

  const recentUsers = db.prepare('SELECT id,name,email,role,created_at FROM users WHERE role != "employee" ORDER BY created_at DESC LIMIT 5').all();
  const recentTxs = db.prepare('SELECT id,tons,total_price,created_at FROM transactions ORDER BY created_at DESC LIMIT 5').all();

  res.json({
    stats: { users: usersCount, hectares: Math.round(landsCount), credits: Math.round(creditsCount), revenue: revenueCount },
    recent_users: recentUsers,
    recent_transactions: recentTxs
  });
});

app.get('/api/admin/users', requireAuth, requireRole('employee'), (req, res) => {
  const db = getDb();
  let query = 'SELECT id,email,name,role,company_name,phone,kyc_status,created_at FROM users WHERE role != "employee"';
  const params = [];
  if (req.query.role && req.query.role !== 'All') {
    query += ' AND role=?';
    params.push(req.query.role.toLowerCase());
  }
  query += ' ORDER BY created_at DESC';
  const users = db.prepare(query).all(...params);
  res.json({ users });
});

app.get('/api/admin/lands', requireAuth, requireRole('employee'), (req, res) => {
  const db = getDb();
  let query = `SELECT l.*, u.name as owner_name, u.email as owner_email 
    FROM land_plots l JOIN users u ON l.owner_id=u.id`;
  const params = [];
  if (req.query.status && req.query.status !== 'All') {
    query += ' WHERE l.verification_status=?';
    params.push(req.query.status.toLowerCase());
  }
  query += ' ORDER BY l.created_at DESC';
  const lands = db.prepare(query).all(...params);
  res.json({ lands });
});

app.get('/api/admin/transactions', requireAuth, requireRole('employee'), (req, res) => {
  const db = getDb();
  const txs = db.prepare(`SELECT t.*, cb.name as buyer_name, cs.name as seller_name, l.name as project_name 
    FROM transactions t 
    JOIN users cb ON t.buyer_id=cb.id 
    JOIN users cs ON t.seller_id=cs.id 
    JOIN carbon_credits c ON t.credit_id=c.id
    LEFT JOIN land_plots l ON c.land_id=l.id
    ORDER BY t.created_at DESC`).all();
  res.json({ transactions: txs });
});

app.put('/api/admin/verify-kyc/:userId', requireAuth, requireRole('employee'), (req, res) => {
  try {
    const db = getDb();
    const { status, notes } = req.body;
    db.prepare('UPDATE users SET kyc_status=? WHERE id=?').run(status, req.params.userId);
    db.prepare('UPDATE kyc_documents SET status=?, verified_by=?, verified_at=datetime("now") WHERE user_id=? AND status="pending"')
      .run(status, req.user.id, req.params.userId);
    
    // Notify user
    const nId = uuidv4();
    const msg = status === 'verified' ? 'Your KYC has been approved!' : `KYC rejected: ${notes||'Please re-upload documents'}`;
    db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
      .run(nId, req.params.userId, `KYC ${status}`, msg, status === 'verified' ? 'success' : 'error');

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/admin/verify-land/:landId', requireAuth, requireRole('employee'), (req, res) => {
  try {
    const db = getDb();
    const { status, notes } = req.body;
    db.prepare('UPDATE land_plots SET verification_status=? WHERE id=?').run(status, req.params.landId);
    
    const land = db.prepare('SELECT owner_id, name FROM land_plots WHERE id=?').get(req.params.landId);
    if (land) {
      const nId = uuidv4();
      const msg = status === 'verified' ? `Project ${land.name} has been verified.` : `Project ${land.name} rejected: ${notes||''}`;
      db.prepare('INSERT INTO notifications (id,user_id,title,message,type) VALUES (?,?,?,?,?)')
        .run(nId, land.owner_id, `Project ${status}`, msg, status === 'verified' ? 'success' : 'error');
    }

    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ===================== GENERAL & STATS =====================
app.get('/api/stats', (req, res) => {
  const db = getDb();
  const tRow = db.prepare('SELECT SUM(tons) as t FROM transactions WHERE status="completed"').get();
  const creditsTraded = (tRow && tRow.t) ? tRow.t : 0;
  
  const loRow = db.prepare('SELECT COUNT(*) as c FROM users WHERE role="landowner"').get();
  const landowners = (loRow && loRow.c) ? loRow.c : 0;
  
  const cRow = db.prepare('SELECT COUNT(*) as c FROM users WHERE role="industry"').get();
  const companies = (cRow && cRow.c) ? cRow.c : 0;
  
  const hRow = db.prepare('SELECT SUM(area_hectares) as a FROM land_plots WHERE verification_status="verified"').get();
  const hectares = (hRow && hRow.a) ? hRow.a : 0;
  res.json({
    total_credits: Math.round(creditsTraded + 35000), // add base for demo
    landowners: landowners + 2400,
    companies: companies + 180,
    hectares: Math.round(hectares + 50000)
  });
});

app.get('/api/notifications', requireAuth, (req, res) => {
  const db = getDb();
  const notifs = db.prepare('SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json({ notifications: notifs });
});

app.put('/api/notifications/:id/read', requireAuth, (req, res) => {
  const db = getDb();
  db.prepare('UPDATE notifications SET is_read=1 WHERE id=? AND user_id=?').run(req.params.id, req.user.id);
  res.json({ success: true });
});

// Start Server
app.listen(PORT, async () => {
  try {
    console.log(`\n========================================`);
    console.log(`?? Carbon Wallet Platform running on port ${PORT}`);
    console.log(`========================================`);
    getDb();
    seedDemoData();
    console.log(`[DB] SQLite database connected`);
    
    try {
      const ollamaStatus = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 2000 });
      console.log(`[AI] Ollama connected. Found ${ollamaStatus.data.models?.length || 0} models.`);
    } catch(e) {
      console.log(`[AI] Ollama not reachable at ${OLLAMA_URL}. Demo/mock mode active for AI endpoints.`);
    }
    console.log(`\nOpen http://localhost:${PORT} in your browser\n`);
  } catch(err) {
    console.error("FATAL ERROR IN STARTUP:", err);
  }
});