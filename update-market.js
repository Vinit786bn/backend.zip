const fs = require('fs');
let html = fs.readFileSync('C:/Users/Rushikesh/.gemini/antigravity/playground/shining-asteroid/public/marketplace.html', 'utf8');

// 1. Notification Center Bell & Panel
if (!html.includes('mob-notif-panel')) {
    const notifHTML = `
    <!-- Notification Bell -->
    <button onclick="document.getElementById('mob-notif-panel').style.display='block'" style="position:fixed; top:15px; right:15px; z-index:999999; background:rgba(30,41,59,0.8); backdrop-filter:blur(5px); border:1px solid #334155; color:#F8FAFC; border-radius:50%; width:40px; height:40px; display:flex; align-items:center; justify-content:center; cursor:pointer;">
      <i class="fa-solid fa-bell"></i>
      <div style="position:absolute; top:8px; right:8px; width:8px; height:8px; background:#ef4444; border-radius:50%;"></div>
    </button>
    <!-- Notification Panel -->
    <div id="mob-notif-panel" style="display:none; position:fixed; inset:0; background:var(--bg); z-index:9999999; overflow-y:auto; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
        <h2 style="color:#f8fafc; margin:0;"><i class="fa-solid fa-bell" style="color:#00E676;"></i> Notifications</h2>
        <button onclick="document.getElementById('mob-notif-panel').style.display='none'" style="background:transparent; border:none; color:#94a3b8; font-size:1.5rem;">&times;</button>
      </div>
      <div style="background:#111827; border:1px solid #1e293b; padding:15px; border-radius:12px; margin-bottom:10px;">
        <div style="color:#00E676; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">Transaction Success</div>
        <div style="color:#f8fafc; font-size:0.9rem;">You successfully purchased 5,000 tons of AGRI-CARB credits.</div>
        <div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">2 hours ago</div>
      </div>
      <div style="background:#111827; border:1px solid #1e293b; padding:15px; border-radius:12px; margin-bottom:10px;">
        <div style="color:#38bdf8; font-size:0.8rem; font-weight:bold; margin-bottom:5px;">AI Price Alert</div>
        <div style="color:#f8fafc; font-size:0.9rem;">GUJ-GCP credits have crossed ₹2,200 per ton.</div>
        <div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">Yesterday</div>
      </div>
    </div>
    `;
    html = html.replace('<div class="mob-wrap" id="mobIndustry">', '<div class="mob-wrap" id="mobIndustry">\n' + notifHTML);
}

// 2. Change Back button routing to internal history
html = html.replace(/onclick="window.location.href='index.html'"/g, `onclick="if(document.getElementById('mob-notif-panel')?.style.display==='block'){document.getElementById('mob-notif-panel').style.display='none'}else if(document.getElementById('mob-project-detail-modal')?.style.display==='block'){document.getElementById('mob-project-detail-modal').style.display='none'}else{window.location.href='index.html'}"`);

// 3. Filter & Sort FAB
if (!html.includes('id="mob-filter-fab"')) {
    const filterFAB = `
    <button id="mob-filter-fab" onclick="document.getElementById('mob-filter-modal').style.display='flex'" style="position:absolute; bottom:80px; right:20px; background:#00C853; color:#111; border:none; width:50px; height:50px; border-radius:25px; box-shadow:0 4px 12px rgba(0,200,83,0.4); display:flex; align-items:center; justify-content:center; cursor:pointer; z-index:9000;">
      <i class="fa-solid fa-filter"></i>
    </button>
    <div id="mob-filter-modal" style="display:none; position:fixed; inset:0; background:rgba(0,0,0,0.8); z-index:99999; align-items:flex-end; justify-content:center;">
      <div style="background:#111827; width:100%; padding:20px; border-radius:20px 20px 0 0; border-top:1px solid #1e293b;">
        <div style="display:flex; justify-content:space-between; margin-bottom:20px;">
          <h3 style="color:white; margin:0;">Filter & Sort</h3>
          <button onclick="document.getElementById('mob-filter-modal').style.display='none'" style="background:transparent; border:none; color:white; font-size:1.5rem;">&times;</button>
        </div>
        <label style="color:#94a3b8; display:block; margin-bottom:5px;">Region</label>
        <select style="width:100%; padding:10px; background:#0f172a; border:1px solid #334155; color:white; border-radius:8px; margin-bottom:15px;">
          <option>All India</option><option>Maharashtra</option><option>Gujarat</option>
        </select>
        <label style="color:#94a3b8; display:block; margin-bottom:5px;">Verification Standard</label>
        <select style="width:100%; padding:10px; background:#0f172a; border:1px solid #334155; color:white; border-radius:8px; margin-bottom:15px;">
          <option>Any</option><option>Verra</option><option>Gold Standard</option><option>Custom AI</option>
        </select>
        <label style="color:#94a3b8; display:block; margin-bottom:5px;">Sort By</label>
        <select style="width:100%; padding:10px; background:#0f172a; border:1px solid #334155; color:white; border-radius:8px; margin-bottom:20px;">
          <option>Price (Low to High)</option><option>Volume Available</option>
        </select>
        <button onclick="document.getElementById('mob-filter-modal').style.display='none'" style="width:100%; background:#00C853; color:#111; border:none; padding:12px; border-radius:8px; font-weight:bold;">Apply Filters</button>
      </div>
    </div>
    `;
    html = html.replace('<div id="mob-exchange-list">', filterFAB + '\n<div id="mob-exchange-list">');
}

// 4. Project Deep Dive View
if (!html.includes('mob-project-detail-modal')) {
    const deepDiveHTML = `
    <!-- Project Deep Dive Modal -->
    <div id="mob-project-detail-modal" style="display:none; position:fixed; inset:0; background:var(--bg); z-index:999999; overflow-y:auto; padding:20px;">
      <button onclick="document.getElementById('mob-project-detail-modal').style.display='none'" style="position:fixed; top:15px; left:15px; background:rgba(30,41,59,0.8); border:1px solid #334155; color:white; width:40px; height:40px; border-radius:50%; z-index:1000;"><i class="fa-solid fa-arrow-left"></i></button>
      
      <div style="height:200px; background:url('assets/tree-bg.jpg') center/cover; margin:-20px -20px 20px -20px; position:relative;">
        <div style="position:absolute; inset:0; background:linear-gradient(transparent, var(--bg));"></div>
        <div style="position:absolute; bottom:15px; left:20px;">
          <div style="background:rgba(0,230,118,0.2); color:#00E676; padding:4px 8px; border-radius:4px; font-size:0.7rem; display:inline-block; margin-bottom:5px;">VERRA VERIFIED</div>
          <h2 id="dd-title" style="color:white; margin:0;">Project Title</h2>
        </div>
      </div>
      
      <p id="dd-desc" style="color:#94a3b8; font-size:0.9rem; line-height:1.5; margin-bottom:20px;">Project description...</p>
      
      <div style="display:flex; gap:10px; margin-bottom:20px;">
        <button style="flex:1; background:#111827; border:1px solid #1e293b; color:#38bdf8; padding:10px; border-radius:8px; font-size:0.8rem;"><i class="fa-solid fa-satellite"></i> AI Audit</button>
        <button style="flex:1; background:#111827; border:1px solid #1e293b; color:#f8fafc; padding:10px; border-radius:8px; font-size:0.8rem;"><i class="fa-solid fa-file-pdf"></i> Download PDF</button>
      </div>
      
      <div style="background:#111827; border:1px solid #1e293b; padding:15px; border-radius:12px; margin-bottom:80px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:10px; border-bottom:1px solid #1e293b; padding-bottom:10px;">
          <span style="color:#94a3b8;">Price</span>
          <span id="dd-price" style="color:#00E676; font-weight:bold;">₹0</span>
        </div>
        <div style="display:flex; justify-content:space-between;">
          <span style="color:#94a3b8;">Available Volume</span>
          <span id="dd-volume" style="color:white; font-weight:bold;">0 Tons</span>
        </div>
      </div>
      
      <div style="position:fixed; bottom:0; left:0; right:0; padding:15px; background:rgba(15,23,42,0.9); backdrop-filter:blur(10px); border-top:1px solid #1e293b;">
        <button id="dd-buy-btn" style="width:100%; background:#00C853; color:#111; padding:15px; border:none; border-radius:8px; font-weight:bold; font-size:1rem; cursor:pointer;">Proceed to Purchase</button>
      </div>
    </div>
    `;
    html = html.replace('<div id="mob-trade-modal"', deepDiveHTML + '\n<div id="mob-trade-modal"');
    
    // Wire up mobOpenTrade to open Deep Dive instead
    html = html.replace(/function mobOpenTrade\(id, ticker, price, vol, desc\) \{/g, `
    function mobOpenTrade(id, ticker, price, vol, desc) {
        document.getElementById('mob-project-detail-modal').style.display='block';
        document.getElementById('dd-title').textContent = ticker;
        document.getElementById('dd-desc').textContent = desc;
        document.getElementById('dd-price').textContent = '₹' + price.toLocaleString();
        document.getElementById('dd-volume').textContent = vol.toLocaleString() + ' Tons';
        document.getElementById('dd-buy-btn').onclick = function() {
            document.getElementById('mob-project-detail-modal').style.display='none';
            // Open standard trade modal
            document.getElementById('mob-trade-modal').style.display='flex';
            document.getElementById('mob-trade-ticker').textContent = ticker;
            document.getElementById('mob-trade-desc').textContent = desc;
            document.getElementById('mob-trade-price').textContent = '₹' + price.toLocaleString('en-IN');
            document.getElementById('mob-trade-volume').textContent = vol.toLocaleString('en-IN') + ' Tons';
            window.currentMobTradePrice = price;
            document.getElementById('mob-trade-qty').value = 1;
            mobUpdateTradeTotal();
        };
        return;
    `);
}

// 5. History / Ledger Tab in Mobile Navigation
if (!html.includes('data-view="history"')) {
    html = html.replace(
        '<div class="mob-tab active" data-view="portfolio"',
        '<div class="mob-tab" data-view="history" onclick="mobSwitchTab(\'history\', this)"><i class="fa-solid fa-file-invoice-dollar"></i> History</div>\n      <div class="mob-tab active" data-view="portfolio"'
    );
    
    const historyView = `
    <!-- VIEW: HISTORY -->
    <div class="mob-view" id="mob-view-history">
      <div class="exchange-header" style="margin-bottom:15px;">
        <h2><i class="fa-solid fa-file-invoice-dollar" style="color:#00E676; font-size:1rem;"></i> Audit Ledger</h2>
        <button style="background:transparent; color:#38bdf8; border:none; font-size:0.8rem;"><i class="fa-solid fa-download"></i> CSV</button>
      </div>
      
      <div class="mob-card" style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <div style="color:white; font-weight:bold;">AGRI-CARB-24</div>
          <div style="color:#ef4444; font-weight:bold;">-₹4,500,000</div>
        </div>
        <div style="color:#94a3b8; font-size:0.8rem;">Retired 5,000 Tons • TxID: 0x8f2...9a1</div>
        <div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">July 20, 2026</div>
      </div>
      
      <div class="mob-card" style="margin-bottom:10px;">
        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
          <div style="color:white; font-weight:bold;">GUJ-GCP-26-101</div>
          <div style="color:#ef4444; font-weight:bold;">-₹2,260,000</div>
        </div>
        <div style="color:#94a3b8; font-size:0.8rem;">Retired 1,000 Tons • TxID: 0x4a1...2b9</div>
        <div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">July 15, 2026</div>
      </div>
    </div>
    `;
    
    html = html.replace('<!-- VIEWS -->\n    <div class="mob-views">', '<!-- VIEWS -->\n    <div class="mob-views">\n' + historyView);
}

fs.writeFileSync('C:/Users/Rushikesh/.gemini/antigravity/playground/shining-asteroid/public/marketplace.html', html, 'utf8');
console.log('marketplace.html updated successfully');
