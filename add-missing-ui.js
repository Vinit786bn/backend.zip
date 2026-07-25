const fs = require('fs');
let html = fs.readFileSync('public/marketplace.html', 'utf8');

// 1. Add global mobile Back Button (if not already there)
if (!html.includes('id="mob-global-back"')) {
    const backBtn = `
    <!-- Global Mobile Back Button -->
    <button id="mob-global-back" onclick="if(document.getElementById('mob-notif-panel')?.style.display==='block'){document.getElementById('mob-notif-panel').style.display='none'}else if(document.getElementById('mob-project-detail-modal')?.style.display==='block'){document.getElementById('mob-project-detail-modal').style.display='none'}else{window.location.href='index.html'}" style="position: fixed; top: 15px; left: 15px; z-index: 999998; background: rgba(30,41,59,0.8); backdrop-filter: blur(5px); border: 1px solid #334155; color: #F8FAFC; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <i class="fa-solid fa-arrow-left"></i>
    </button>
    `;
    html = html.replace('<body>', '<body>\n' + backBtn);
}

// 2. Add global mobile Profile Button next to Notification Bell
if (!html.includes('id="mob-global-profile"')) {
    const profileBtn = `
    <!-- Global Mobile Profile Button -->
    <button id="mob-global-profile" onclick="toggleProfileDropdown(event)" style="position: fixed; top: 15px; right: 65px; z-index: 999998; background: rgba(30,41,59,0.8); backdrop-filter: blur(5px); border: 1px solid #334155; color: #F8FAFC; border-radius: 50%; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
        <i class="fa-solid fa-user"></i>
    </button>
    `;
    html = html.replace('<body>', '<body>\n' + profileBtn);
}

fs.writeFileSync('public/marketplace.html', html, 'utf8');
console.log('Added Profile and Back buttons back to marketplace.html');
