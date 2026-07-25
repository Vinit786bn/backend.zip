const fs = require('fs');
let html = fs.readFileSync('public/marketplace.html', 'utf8');

// Update Back button
html = html.replace(/top: 15px; left: 15px; z-index: 999998;/g, 'top: 35px; left: 15px; z-index: 99999999;');

// Update Profile button
html = html.replace(/top: 15px; right: 65px; z-index: 999998;/g, 'top: 35px; right: 65px; z-index: 99999999;');

// Update Notification Bell (if present at top 15px right 15px)
html = html.replace(/top:15px; right:15px; z-index:999999;/g, 'top:35px; right:15px; z-index:99999999;');

fs.writeFileSync('public/marketplace.html', html, 'utf8');
console.log('Fixed UI margins and z-index.');
