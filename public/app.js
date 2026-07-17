// ============================================
// Carbon Wallet — Shared Frontend Logic
// ============================================

const API = {
  // Auth
  register: (data) => api('POST', '/api/auth/register', data),
  login: (data) => api('POST', '/api/auth/login', data),
  employeeLogin: (data) => api('POST', '/api/auth/employee-login', data),
  logout: () => api('POST', '/api/auth/logout'),
  me: () => api('GET', '/api/auth/me'),

  // KYC
  submitKyc: (formData) => apiFile('POST', '/api/kyc/submit', formData),
  kycStatus: () => api('GET', '/api/kyc/status'),

  // Land
  registerLand: (data) => api('POST', '/api/land/register', data),
  myPlots: () => api('GET', '/api/land/my-plots'),
  getPlot: (id) => api('GET', `/api/land/plot/${id}`),
  updatePlot: (id, data) => api('PUT', `/api/land/plot/${id}`, data),
  uploadLandDocs: (formData) => apiFile('POST', '/api/land/upload-docs', formData),
  submitForAudit: (id) => api('POST', `/api/land/submit-for-audit/${id}`),

  // AI
  parseDocument: (docId) => api('POST', '/api/ai/parse-document', { doc_id: docId }),
  estimateCarbon: (landId) => api('POST', '/api/ai/estimate-carbon', { land_id: landId }),
  verifyCertificate: (formData) => apiFile('POST', '/api/ai/verify-certificate', formData),

  // Credits
  marketplace: (params) => api('GET', '/api/credits/marketplace' + buildQuery(params)),
  generateCredits: (data) => api('POST', '/api/credits/generate', data),
  purchaseCredits: (data) => api('POST', '/api/credits/purchase', data),
  listForSale: (data) => api('POST', '/api/credits/list-for-sale', data),
  myCredits: () => api('GET', '/api/credits/my-credits'),
  transactions: () => api('GET', '/api/credits/transactions'),

  // Admin
  adminDashboard: () => api('GET', '/api/admin/dashboard'),
  adminUsers: (role) => api('GET', '/api/admin/users' + (role ? `?role=${role}` : '')),
  adminLands: (status) => api('GET', '/api/admin/lands' + (status ? `?status=${status}` : '')),
  adminTransactions: () => api('GET', '/api/admin/transactions'),
  verifyKyc: (userId, data) => api('PUT', `/api/admin/verify-kyc/${userId}`, data),
  verifyLand: (landId, data) => api('PUT', `/api/admin/verify-land/${landId}`, data),

  // General
  stats: () => api('GET', '/api/stats'),
  notifications: () => api('GET', '/api/notifications'),
  readNotification: (id) => api('PUT', `/api/notifications/${id}/read`),
};


async function api(method, url, body) {
  try {
    const opts = { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include' };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    console.error(`API ${method} ${url}:`, err);
    throw err;
  }
}

async function apiFile(method, url, formData) {
  try {
    const res = await fetch(url, { method, body: formData, credentials: 'include' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  } catch (err) {
    console.error(`API ${method} ${url}:`, err);
    throw err;
  }
}

function buildQuery(params) {
  if (!params) return '';
  const q = Object.entries(params)
    .filter(([_, v]) => v !== '' && v !== null && v !== undefined)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join('&');
  return q ? `?${q}` : '';
}

// ============================================
// Toast Notification System
// ============================================
function showToast(message, type = 'info', duration = 4000) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = { success: 'fa-check-circle', error: 'fa-exclamation-circle', info: 'fa-info-circle', warning: 'fa-exclamation-triangle' };
  toast.innerHTML = `
    <i class="fas ${icons[type] || icons.info}"></i>
    <span>${message}</span>
    <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
  `;

  container.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ============================================
// Auth State Management
// ============================================
let currentUser = null;

async function checkAuth(requiredRole) {
  try {
    const data = await API.me();
    currentUser = data.user;
    if (requiredRole && currentUser.role !== requiredRole && currentUser.role !== 'employee') {
      window.location.href = '/';
      return null;
    }
    updateNavUser();
    return currentUser;
  } catch (e) {
    window.location.href = '/';
    return null;
  }
}

function updateNavUser() {
  const navUser = document.getElementById('nav-user-name');
  const navRole = document.getElementById('nav-user-role');
  const navAvatar = document.getElementById('nav-user-avatar');
  if (navUser) navUser.textContent = currentUser?.name || 'User';
  if (navRole) navRole.textContent = currentUser?.role === 'landowner' ? 'Landowner' : currentUser?.role === 'industry' ? 'Industry' : 'Admin';
  if (navAvatar) navAvatar.textContent = (currentUser?.name || 'U').charAt(0).toUpperCase();
}

async function handleLogout() { 
  try {
    localStorage.removeItem('cw_token'); 
    localStorage.removeItem('cw_role'); 
  } catch (e) {}
  window.location.href = '/';
}

// ============================================
// Modal System
// ============================================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
  document.body.style.overflow = '';
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('active');
    document.body.style.overflow = '';
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

// ============================================
// Tab System
// ============================================
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tabGroup = btn.closest('.tabs-container') || btn.parentElement.parentElement;
      const target = btn.dataset.tab;

      tabGroup.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      tabGroup.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const content = tabGroup.querySelector(`[data-tab-content="${target}"]`) || document.getElementById(target);
      if (content) content.classList.add('active');
    });
  });
}

// ============================================
// File Upload Helper
// ============================================
function initFileUploadZones() {
  document.querySelectorAll('.file-upload-zone').forEach(zone => {
    const input = zone.querySelector('input[type="file"]');
    const preview = zone.querySelector('.file-preview');

    ['dragenter', 'dragover'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });
    });

    ['dragleave', 'drop'].forEach(evt => {
      zone.addEventListener(evt, (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
      });
    });

    zone.addEventListener('drop', (e) => {
      const files = e.dataTransfer.files;
      if (input) input.files = files;
      if (preview) updateFilePreview(preview, files);
      zone.dispatchEvent(new CustomEvent('filesSelected', { detail: files }));
    });

    zone.addEventListener('click', () => input?.click());

    if (input) {
      input.addEventListener('change', () => {
        if (preview) updateFilePreview(preview, input.files);
        zone.dispatchEvent(new CustomEvent('filesSelected', { detail: input.files }));
      });
    }
  });
}

function updateFilePreview(container, files) {
  container.innerHTML = '';
  Array.from(files).forEach(file => {
    const item = document.createElement('div');
    item.className = 'file-preview-item';
    const ext = file.name.split('.').pop().toUpperCase();
    const icon = ext === 'PDF' ? 'fa-file-pdf' : ext === 'JPG' || ext === 'PNG' || ext === 'JPEG' ? 'fa-file-image' : 'fa-file';
    const color = ext === 'PDF' ? '#ef4444' : ext === 'JPG' || ext === 'PNG' ? '#3b82f6' : '#94a3b8';
    item.innerHTML = `
      <i class="fas ${icon}" style="color:${color}"></i>
      <span class="file-name">${file.name}</span>
      <span class="file-size">${formatFileSize(file.size)}</span>
    `;
    container.appendChild(item);
  });
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

// ============================================
// Map Helpers (Leaflet)
// ============================================
function initMap(containerId, lat = 20.5937, lng = 78.9629, zoom = 5) {
  if (typeof L === 'undefined') {
    console.warn('Leaflet not loaded');
    return null;
  }

  const map = L.map(containerId, {
    zoomControl: false,
  }).setView([lat, lng], zoom);

  // Base layers
  const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  });

  const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    attribution: '&copy; Esri',
    maxZoom: 18,
  });

  satelliteLayer.addTo(map);

  L.control.zoom({ position: 'topright' }).addTo(map);

  L.control.layers({
    'Satellite': satelliteLayer,
    'Street Map': osmLayer,
  }, null, { position: 'topright' }).addTo(map);

  return map;
}

function addLandPlotToMap(map, plot) {
  if (!map || !plot) return;

  const lat = parseFloat(plot.lat);
  const lng = parseFloat(plot.lng);

  if (isNaN(lat) || isNaN(lng)) return;

  // If there's a GeoJSON boundary, draw it
  if (plot.boundary_geojson) {
    try {
      const geojson = typeof plot.boundary_geojson === 'string' ? JSON.parse(plot.boundary_geojson) : plot.boundary_geojson;
      const layer = L.geoJSON(geojson, {
        style: {
          color: '#00d46a',
          weight: 3,
          fillColor: '#00d46a',
          fillOpacity: 0.2,
        },
      }).addTo(map);
      map.fitBounds(layer.getBounds(), { padding: [50, 50] });
      return layer;
    } catch (e) {
      console.warn('Invalid GeoJSON:', e);
    }
  }

  // Otherwise, draw a circle based on area
  const radiusMeters = Math.sqrt((plot.area_hectares || 10) * 10000 / Math.PI);
  const circle = L.circle([lat, lng], {
    radius: radiusMeters,
    color: '#00d46a',
    weight: 3,
    fillColor: '#00d46a',
    fillOpacity: 0.2,
  }).addTo(map);

  const marker = L.marker([lat, lng]).addTo(map);
  marker.bindPopup(`
    <div style="min-width:200px">
      <strong>${plot.name || 'Land Plot'}</strong><br>
      <small>${plot.location_state || ''}, ${plot.location_district || ''}</small><br>
      <span>Area: ${plot.area_hectares || 'N/A'} ha</span><br>
      <span>Type: ${plot.project_type || plot.land_type || 'N/A'}</span>
    </div>
  `);

  map.setView([lat, lng], 14);
  return { circle, marker };
}

// Generate a simple polygon around a center point
function generateBoundaryPolygon(lat, lng, areaHectares) {
  const side = Math.sqrt(areaHectares * 10000); // meters
  const offset = side / 2 / 111320; // rough deg conversion
  return {
    type: 'Polygon',
    coordinates: [[
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ]]
  };
}

// ============================================
// Utility Functions
// ============================================
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
}

function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function getStatusBadge(status) {
  const map = {
    verified: '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> Verified</span>',
    active: '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> Active</span>',
    pending: '<span class="badge badge-pending"><i class="fas fa-clock"></i> Pending</span>',
    submitted: '<span class="badge badge-pending"><i class="fas fa-clock"></i> Submitted</span>',
    ai_review: '<span class="badge badge-pending"><i class="fas fa-robot"></i> AI Review</span>',
    draft: '<span class="badge badge-draft"><i class="fas fa-edit"></i> Draft</span>',
    rejected: '<span class="badge badge-rejected"><i class="fas fa-times-circle"></i> Rejected</span>',
    sold: '<span class="badge badge-sold"><i class="fas fa-shopping-cart"></i> Sold</span>',
    retired: '<span class="badge badge-retired"><i class="fas fa-archive"></i> Retired</span>',
    completed: '<span class="badge badge-verified"><i class="fas fa-check"></i> Completed</span>',
    expired: '<span class="badge badge-rejected"><i class="fas fa-hourglass-end"></i> Expired</span>',
  };
  return map[status] || `<span class="badge">${status}</span>`;
}

function getCarbonScoreColor(score) {
  if (score >= 80) return '#00d46a';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#f97316';
  return '#ef4444';
}

// Debounce helper
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// Mobile menu toggle
function initMobileMenu() {
  const btn = document.getElementById('mobile-menu-btn');
  const nav = document.getElementById('mobile-nav');
  if (btn && nav) {
    btn.addEventListener('click', () => {
      nav.classList.toggle('active');
      btn.classList.toggle('active');
    });
  }
}

// Init on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initTabs();
  initFileUploadZones();
});


function showGlobalLoader() {
  // Disabled per user request
}
function hideGlobalLoader() {
}
// Show loader on navigation
// window.addEventListener('beforeunload', () => showGlobalLoader());


async function searchLocation() {
    const query = document.getElementById('mapSearchBox').value;
    if(!query) return;
    try {
        const res = await fetch('https://nominatim.openstreetmap.org/search?q='+encodeURIComponent(query)+'&format=json');
        const data = await res.json();
        if(data && data.length > 0) {
            const lat = data[0].lat;
            const lon = data[0].lon;
            map.flyTo([lat, lon], 14);
        }
    } catch(e){}
}
function useMyLocation() {
    if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            map.flyTo([pos.coords.latitude, pos.coords.longitude], 15);
        });
    }
}
async function saveBankDetails() {
    // mock save
    showToast('Bank details saved', 'success');
}


window.formatRupee = function(num) { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num); };
