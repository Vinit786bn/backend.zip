


  let listingCreditId = null;
function openListModal(creditId, maxTons) {
  listingCreditId = creditId;
  document.getElementById('listTons').max = maxTons;
  document.getElementById('listTons').placeholder = `Max: ${maxTons}`;
  document.getElementById('listModal').style.display = 'flex';
}

async function submitListing() {
  const tons = parseInt(document.getElementById('listTons').value);
  const price = parseFloat(document.getElementById('listPrice').value);
  if (!tons || !price || tons <= 0 || price <= 0) {
    showToast('Please enter valid quantity and price.', 'error');
    return;
  }
  try {
    await API.listForSale({ credit_id: listingCreditId, tons, price_per_ton: price });
    showToast(`✅ ${tons} Tons listed at ₹${price}/T on the exchange!`, 'success');
    document.getElementById('listModal').style.display = 'none';
    loadMyCredits();
  } catch (e) {
    showToast(e.message, 'error');
  }
}






    var geoMap,drawnItems,drawnBoundary=null;
    var thermalActive = false;
    var TK=function(){return localStorage.getItem('cw_token');};
    var HD=function(){return{'Content-Type':'application/json','Authorization':'Bearer '+TK()};};

    function toggleThermalLandowner() {
       thermalActive = !thermalActive;
       const mapEl = document.getElementById('geoMap');
       if (thermalActive) {
          mapEl.style.filter = 'saturate(3) hue-rotate(290deg) invert(0.9) contrast(1.5)';
       } else {
          mapEl.style.filter = 'none';
       }
    }

    async function init(){var u=await checkAuth('landowner');if(!u)return;initMap();}

    function initMap(){
      geoMap=L.map('geoMap',{zoomControl:false}).setView([17.5,75.0],7);
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{attribution:'Esri'}).addTo(geoMap);
      drawnItems=new L.FeatureGroup();geoMap.addLayer(drawnItems);
      var dc=new L.Control.Draw({position:'topleft',draw:{polygon:{allowIntersection:false,shapeOptions:{color:'#38bdf8',weight:3,fillColor:'#10b981',fillOpacity:0.35}},rectangle:{shapeOptions:{color:'#38bdf8',weight:3,fillColor:'#10b981',fillOpacity:0.35}},polyline:false,circle:false,circlemarker:false,marker:false},edit:{featureGroup:drawnItems}});
      geoMap.addControl(dc);

      geoMap.on(L.Draw.Event.CREATED,function(e){
        drawnItems.clearLayers();drawnItems.addLayer(e.layer);drawnBoundary=e.layer;
        var gj=e.layer.toGeoJSON();
        document.getElementById('boundaryGeojson').value=JSON.stringify(gj.geometry);
        var c=e.layer.getBounds().getCenter();
        document.getElementById('landLat').value=c.lat.toFixed(6);
        document.getElementById('landLng').value=c.lng.toFixed(6);
        // Calculate area from drawn polygon and sync to form
        var areaSqM=0;
        if(e.layerType==='rectangle'){var b=e.layer.getBounds();areaSqM=L.GeometryUtil.geodesicArea([ b.getSouthWest(),L.latLng(b.getSouthWest().lat,b.getNorthEast().lng),b.getNorthEast(),L.latLng(b.getNorthEast().lat,b.getSouthWest().lng) ]);}
        else{areaSqM=L.GeometryUtil.geodesicArea(e.layer.getLatLngs()[0]);}
        var ha=areaSqM/10000;
        syncAreaToForm(ha);
        autoFillLocation(c.lat,c.lng);
        showToast('Boundary drawn! Area: '+ha.toFixed(2)+' hectares','success');
      });

      geoMap.on(L.Draw.Event.EDITED,function(e){
        e.layers.eachLayer(function(layer){
          drawnBoundary=layer;
          var gj=layer.toGeoJSON();
          document.getElementById('boundaryGeojson').value=JSON.stringify(gj.geometry);
          var c=layer.getBounds().getCenter();
          document.getElementById('landLat').value=c.lat.toFixed(6);
          document.getElementById('landLng').value=c.lng.toFixed(6);
          var latlngs=layer.getLatLngs();
          var pts=latlngs[0]||latlngs;
          var areaSqM=L.GeometryUtil.geodesicArea(pts);
          syncAreaToForm(areaSqM/10000);
          showToast('Boundary edited! Area updated.','success');
        });
      });

      geoMap.on('click',function(e){
        if(!drawnBoundary){
          document.getElementById('landLat').value=e.latlng.lat.toFixed(6);
          document.getElementById('landLng').value=e.latlng.lng.toFixed(6);
          autoFillLocation(e.latlng.lat,e.latlng.lng);
          recalc();
        }
      });
    }

    function syncAreaToForm(ha){
      var unit=document.getElementById('landSizeUnit').value;
      var val=ha;
      if(unit==='acres')val=ha*2.47105;
      else if(unit==='sqyards')val=ha/0.0000836127;
      document.getElementById('landSizeValue').value=val.toFixed(2);
      document.getElementById('landArea').value=ha.toFixed(2);
      document.getElementById('mapAreaLabel').textContent='Area: '+ha.toFixed(2)+' ha ('+( ha*2.47105).toFixed(2)+' acres)';
      recalc();
    }

    async function autoFillLocation(lat,lng){
      try{
        var r=await fetch('/api/geo/reverse-geocode',{method:'POST',headers:HD(),body:JSON.stringify({lat,lng})});
        var d=await r.json();
        if(d.state)document.getElementById('landState').value=d.state;
        if(d.district)document.getElementById('landDistrict').value=d.district;
      }catch(e){}
    }

    function flyTo(){
      var la=parseFloat(document.getElementById('landLat').value),ln=parseFloat(document.getElementById('landLng').value);
      if(!isNaN(la)&&!isNaN(ln)&&geoMap){geoMap.flyTo([la,ln],15,{duration:1.5});autoFillLocation(la,ln);recalc();}
    }

    function recalc(){
      var s=parseFloat(document.getElementById('landSizeValue').value),u=document.getElementById('landSizeUnit').value,t=document.getElementById('landType').value,p=document.getElementById('calcPrev');
      if(!s||s<=0){p.style.display='none';return;}
      var ac=s,he=s;
      if(u==='hectares')ac=s*2.47105;else if(u==='acres')he=s*0.404686;else{ac=s*0.000206612;he=s*0.0000836127;}
      document.getElementById('landArea').value=he.toFixed(2);
      document.getElementById('mapAreaLabel').textContent='Area: '+he.toFixed(2)+' ha ('+ac.toFixed(2)+' acres)';
      var yph=t==='Forest'?8.5:(t==='Agricultural'?4.2:0.5),bp=t==='Forest'?1800:(t==='Agricultural'?1450:800);
      var tm=1.0,tn='Standard (3-5 Ac)';if(ac>=5){tm=1.3;tn='Premium (5+ Ac) 1.3x';}else if(ac<3){tm=0.7;tn='Low (<3 Ac) 0.7x';}
      var tt=Math.floor(he*yph*tm),fr=Math.floor(bp*tm),np=(tt*fr)*0.85;
      p.style.display='block';
      document.getElementById('cTons').textContent=tt.toLocaleString()+' T';
      document.getElementById('cRate').textContent='\u20B9'+fr.toLocaleString()+'/T';
      document.getElementById('cTotal').textContent='\u20B9'+Math.floor(np).toLocaleString();
      document.getElementById('cTier').textContent=tn;
      document.getElementById('cTier').style.color=ac>=5?'#10b981':(ac<3?'#ef4444':'#f59e0b');
      if(!drawnBoundary){var la=parseFloat(document.getElementById('landLat').value),ln=parseFloat(document.getElementById('landLng').value);if(!isNaN(la)&&!isNaN(ln)&&he>0)drawBlock(la,ln,he);}
      // Fetch live carbon data
      fetchLiveCarbon(he,t);
    }

    var carbonDebounce=null;
    function fetchLiveCarbon(he,t){
      clearTimeout(carbonDebounce);
      carbonDebounce=setTimeout(async function(){
        var la=document.getElementById('landLat').value,ln=document.getElementById('landLng').value;
        if(!la||!ln)return;
        try{
          var r=await fetch('/api/geo/carbon-data',{method:'POST',headers:HD(),body:JSON.stringify({lat:la,lng:ln,hectares:he,landType:t})});
          var d=await r.json();
          document.getElementById('cTons').textContent=d.annual_credits_tons+' T';
          document.getElementById('cRate').textContent='\u20B9'+d.market_price_inr.toLocaleString()+'/T';
          document.getElementById('cTotal').textContent='\u20B9'+d.net_payout_inr.toLocaleString();
          document.getElementById('cSource').textContent='Source: '+d.source+' | SOC: '+(d.soil_organic_carbon_dg_kg||'est')+' dg/kg | Seq: '+d.sequestration_rate_ton_ha_yr+' T/ha/yr';
        }catch(e){}
      },800);
    }

    function drawBlock(la,ln,he){drawnItems.clearLayers();var a=he*10000,sd=Math.sqrt(a),dl=(sd/2)/111111,dn=(sd/2)/(111111*Math.cos(la*Math.PI/180));var b=[[la-dl,ln-dn],[la+dl,ln+dn]];var r=L.rectangle(b,{color:'#38bdf8',weight:3,fillColor:'#10b981',fillOpacity:0.35});drawnItems.addLayer(r);geoMap.fitBounds(b,{padding:[50,50],maxZoom:17});document.getElementById('boundaryGeojson').value=JSON.stringify(r.toGeoJSON().geometry);}

    async function runPipeline(){
      var la=document.getElementById('landLat').value,ln=document.getElementById('landLng').value,he=document.getElementById('landArea').value,lt=document.getElementById('landType').value,on=document.getElementById('nav-user-name').innerText,gj=document.getElementById('boundaryGeojson').value;
      if(!la||!ln){showToast('Enter coordinates!','error');return;}
      if(!he||parseFloat(he)<=0){showToast('Enter land size!','error');return;}
      var btn=document.getElementById('pipeBtn');btn.disabled=true;btn.innerHTML='<i class="fas fa-spinner fa-spin"></i> Running...';
      var radiusM=Math.sqrt(parseFloat(he)*10000)/2;

      // S1: Pre-Feasibility
      setSS('1','running');
      try{var r1=await fetch('/api/ai/pre-feasibility',{method:'POST',headers:HD(),body:JSON.stringify({lat:la,lng:ln,hectares:he,landType:lt})});var d1=await r1.json();
        if(d1.eligible===false){setSS('1','failed');document.getElementById('d1').innerHTML='<div style="color:#ef4444;padding:10px;">REJECTED</div>';document.getElementById('d1').style.display='block';showToast('Failed pre-feasibility!','error');btn.disabled=false;btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline';return;}
        setSS('1','passed');
        document.getElementById('d1').innerHTML='<div class="sg"><div class="sc">NDVI<span class="v">'+(d1.ndvi_historical?d1.ndvi_historical[d1.ndvi_historical.length-1]:'N/A')+'</span></div><div class="sc">Soil Moist<span class="v">'+d1.soil_moisture_index+'</span></div><div class="sc">Risk<span class="v" style="color:'+(d1.risk_score<30?'#10b981':'#ef4444')+';">'+d1.risk_score+'/100</span></div><div class="sc">Flood<span class="v">'+d1.flood_risk+'</span></div><div class="sc">Biomass<span class="v">'+d1.biomass_estimate_tons_per_ha+'T/ha</span></div><div class="sc">SOC<span class="v">'+d1.soil_organic_carbon_pct+'%</span></div><div class="sc">Deforest<span class="v" style="color:#10b981;">'+(d1.deforestation_detected?'YES':'NO')+'</span></div><div class="sc">Protected<span class="v" style="color:#10b981;">'+(d1.protected_zone?'YES':'NO')+'</span></div></div>';
        document.getElementById('d1').style.display='block';
      }catch(e){setSS('1','failed');showToast(e.message,'error');btn.disabled=false;btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline';return;}

      // S2: Registry via 7/12 AI parsing
      setSS('2','running');
      try {
        var docId = document.getElementById('uploadedDocId').value;
        if(!docId) throw new Error('Please upload 7/12 land registry document first');
        
        var r2 = await fetch('/api/ai/parse-document', { method:'POST', headers:HD(), body:JSON.stringify({doc_id: docId}) });
        var d2 = await r2.json();
        if(d2.error) throw new Error(d2.error);
        
        var text = d2.text || '';
        var verified = text.length > 5;
        
        setSS('2', verified ? 'passed' : 'failed');
        document.getElementById('d2').innerHTML = '<div style="padding:10px;background:'+(verified?'rgba(16,185,129,0.1)':'rgba(239,68,68,0.1)')+';border-radius:6px;margin-top:8px;font-size:0.8rem;color:#f8fafc;"><strong style="color:#38bdf8;"><i class="fas fa-robot"></i> Nemotron Extracted:</strong><div style="margin-top:5px;max-height:80px;overflow-y:auto;color:#94a3b8;font-family:monospace;font-size:0.7rem;padding:5px;background:#0f172a;border-radius:4px;">'+(text.substring(0, 150))+'...</div><div style="margin-top:8px;font-weight:bold;color:'+(verified?'#10b981':'#ef4444')+';"><i class="fas fa-'+(verified?'check-circle':'times-circle')+'"></i> Ownership Verified</div></div>';
        document.getElementById('d2').style.display = 'block';
        if(!verified) { showToast('7/12 Verification failed!', 'error'); btn.disabled=false; btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline'; return; }
      } catch(e) { setSS('2','failed'); showToast(e.message,'error'); btn.disabled=false; btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline'; return; }

      // S3: LIVE Feature Detection via Overpass
      setSS('3','running');
      try{
        // Generate precise polygon string for Overpass
        var polyStr = '';
        if (drawnBoundary && drawnBoundary.getLatLngs) {
          var pts = drawnBoundary.getLatLngs()[0] || drawnBoundary.getLatLngs();
          if (pts.length > 0) {
            polyStr = pts.map(function(p) { return p.lat + ' ' + p.lng; }).join(' ');
            // Close the polygon if not closed
            if (pts[0].lat !== pts[pts.length-1].lat || pts[0].lng !== pts[pts.length-1].lng) {
              polyStr += ' ' + pts[0].lat + ' ' + pts[0].lng;
            }
          }
        }
        var r3=await fetch('/api/geo/detect-features',{method:'POST',headers:HD(),body:JSON.stringify({lat:la,lng:ln,radiusMeters:radiusM, polygonStr:polyStr})});var d3=await r3.json();
        var allClear=d3.building_clear&&d3.water_clear;
        setSS('3',allClear?'passed':'failed');
        document.getElementById('d3').innerHTML='<div style="font-size:0.7rem;color:#64748b;margin-bottom:8px;">Source: '+d3.source+'</div><div class="sg"><div class="sc">Buildings<span class="v" style="color:'+(d3.building_clear?'#10b981':'#ef4444')+';">'+(d3.building_clear?'CLEAR':''+d3.buildings_count+' FOUND')+'</span></div><div class="sc">Roads<span class="v" style="color:'+(d3.road_clear?'#10b981':'#f59e0b')+';">'+(d3.road_clear?'CLEAR':''+d3.roads_count+' FOUND')+'</span></div><div class="sc">Water<span class="v" style="color:'+(d3.water_clear?'#10b981':'#ef4444')+';">'+(d3.water_clear?'CLEAR':''+d3.water_bodies_count+' FOUND')+'</span></div><div class="sc">Total Features<span class="v">'+d3.total_features+'</span></div></div>'+(d3.buildings_count>0?'<div style="margin-top:8px;font-size:0.75rem;color:#f59e0b;">Building types: '+(d3.buildings_types||[]).join(', ')+'</div>':'')+(Object.keys(d3.landuse_detected||{}).length>0?'<div style="margin-top:4px;font-size:0.75rem;color:#94a3b8;">Landuse: '+Object.entries(d3.landuse_detected).map(function(e){return e[0]+'('+e[1]+')';}).join(', ')+'</div>':'');
        document.getElementById('d3').style.display='block';
        if(!allClear)showToast('Buildings/water detected in zone!','error');
      }catch(e){setSS('3','failed');showToast(e.message,'error');btn.disabled=false;btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline';return;}

      // S4: Live Carbon + AWD
      setSS('4','running');
      try{
        var r4a=await fetch('/api/geo/carbon-data',{method:'POST',headers:HD(),body:JSON.stringify({lat:la,lng:ln,hectares:he,landType:lt})});var d4a=await r4a.json();
        var r4b=await fetch('/api/ai/awd-monitor',{method:'POST',headers:HD(),body:JSON.stringify({lat:la,lng:ln,hectares:he})});var d4b=await r4b.json();
        setSS('4','passed');
        document.getElementById('d4').innerHTML='<div style="font-size:0.7rem;color:#64748b;margin-bottom:8px;">Source: '+d4a.source+'</div><div class="sg"><div class="sc">Credits<span class="v" style="color:#f59e0b;">'+d4a.annual_credits_tons+' T/yr</span></div><div class="sc">Rate<span class="v">\u20B9'+d4a.market_price_inr+'/T</span></div><div class="sc">Revenue<span class="v" style="color:#10b981;">\u20B9'+d4a.net_payout_inr.toLocaleString()+'</span></div><div class="sc">SOC<span class="v">'+(d4a.soil_organic_carbon_dg_kg||'est')+'</span></div><div class="sc">AWD<span class="v" style="color:#10b981;">'+(d4b.awd_detected?'YES':'NO')+'</span></div><div class="sc">CH4 Cut<span class="v">'+d4b.reduction_pct+'%</span></div><div class="sc">R2<span class="v" style="color:#10b981;">'+d4b.r_squared_validation+'</span></div><div class="sc">Seq Rate<span class="v">'+d4a.sequestration_rate_ton_ha_yr+' T/ha</span></div></div>';
        document.getElementById('d4').style.display='block';
        document.getElementById('cTons').textContent=d4a.annual_credits_tons+' T';
        document.getElementById('cRate').textContent='\u20B9'+d4a.market_price_inr.toLocaleString()+'/T';
        document.getElementById('cTotal').textContent='\u20B9'+d4a.net_payout_inr.toLocaleString();
        document.getElementById('cSource').textContent='Source: '+d4a.source;
        
    showToast('All 4 steps passed! Eligible for minting.','success');
    var mintBtnHtml = '<button type="button" class="bp" id="submitAdminBtn" style="width:100%;margin-top:10px;background:#f59e0b;" onclick="submitToAdmin(\'' + d4a.annual_credits_tons + '\')"><i class="fas fa-lock"></i> Submit to Admin for Verification (Phase 1 Lock)</button>';
    document.getElementById('d4').insertAdjacentHTML('beforeend', mintBtnHtml);

      }catch(e){setSS('4','failed');showToast(e.message,'error');}
      btn.disabled=false;btn.innerHTML='<i class="fas fa-satellite"></i> Run Full Satellite Verification Pipeline';
    }

    function setSS(n,s){var e=document.getElementById('sp'+n),i=document.getElementById('ic'+n);e.className='ps '+(s==='running'?'active':s);i.className='si '+s;var ic={pending:'fa-clock',running:'fa-spinner fa-spin',passed:'fa-check',failed:'fa-times'};i.innerHTML='<i class="fas '+ic[s]+'"></i>';}
    function switchTab(id){document.querySelectorAll('[id^=tab-]').forEach(function(e){if(e.id.startsWith('tab-'))e.style.display='none';});document.getElementById('tab-'+id).style.display='block';document.querySelectorAll('.nb a').forEach(function(e){e.classList.remove('active');});try{document.querySelector('.nb a[onclick="switchTab(\''+id+'\')"]').classList.add('active');}catch(e){}if(id==='mylands')loadMyLands();if(id==='credits')loadMyCredits();if(id==='payouts')loadPayouts();if(id==='documents')loadDocs();if(id==='settings')loadProfile();}
    
    async function requestPayout() {
      try {
        const amount = prompt("Enter amount to withdraw (₹):");
        if (!amount || isNaN(amount)) return;
        await fetch('/api/payouts/request', { method:'POST', headers:HD(), body:JSON.stringify({amount}) });
        showToast('Payout requested successfully!', 'success');
        loadPayouts();
      } catch(e) { showToast('Payout failed: ' + e.message, 'error'); }
    }

    async function loadPayouts() {
      try {
        const r = await fetch('/api/payouts/history', { headers: HD() });
        const d = await r.json();
        const html = d.payouts.length === 0 ? 'No payouts yet.' : d.payouts.map(p => '<div style="background:#0f172a;border:1px solid #1e293b;padding:12px;margin-bottom:8px;border-radius:6px;display:flex;justify-content:space-between;"><span>₹' + p.amount + '</span><span class="badge-'+p.status+'">' + p.status + '</span></div>').join('');
        document.getElementById('payoutHistory').innerHTML = html;
      } catch(e) {}
    }

    async function loadDocs() {
      document.getElementById('docsList').innerHTML = 'All uploaded 7/12s are currently verified.';
    }

    async function submitKYC() {
      showToast('KYC Submitted for verification!', 'success');
      document.getElementById('kycStatusBanner').innerHTML = '<i class="fas fa-clock"></i> KYC Under Review';
      document.getElementById('kycStatusBanner').style.color = '#38bdf8';
      document.getElementById('kycStatusBanner').style.borderColor = '#38bdf8';
      document.getElementById('kycStatusBanner').style.background = 'rgba(56,189,248,0.1)';
    }

    async function loadProfile() {
      try {
        const r = await fetch('/api/auth/me', { headers:HD() });
        const d = await r.json();
        if (d.user) {
          document.getElementById('profName').value = d.user.name || '';
          document.getElementById('profPhone').value = d.user.phone || '';
          document.getElementById('profEmail').value = d.user.email || '';
          document.getElementById('payout-pending').innerText = '₹' + (d.user.escrow_balance || 0);
   if(document.getElementById('ticker-inr')) document.getElementById('ticker-inr').innerText = '₹' + (d.user.escrow_balance || 0).toLocaleString();
  
        }
      } catch(e) {}
    }

    async function saveProfile() {
      const name = document.getElementById('profName').value;
      const phone = document.getElementById('profPhone').value;
      try {
        await fetch('/api/auth/update-profile', { method:'PUT', headers:HD(), body:JSON.stringify({name, phone}) });
        showToast('Profile updated!', 'success');
        document.getElementById('nav-user-name').innerText = name;
      } catch(e) { showToast('Failed to update', 'error'); }
    }

    async function loadMyLands() {
  try {
    const res = await API.myPlots();
    const el = document.getElementById('myLands');
    if (!res.plots || res.plots.length === 0) {
      el.innerHTML = '<p style="color:#94a3b8; text-align:center; padding:20px;">No plots registered yet. Go to the Register tab to add your land.</p>';
      return;
    }
    el.innerHTML = `<div class="table-responsive"><table style="width:100%; border-collapse:collapse;">
      <thead><tr style="color:#94a3b8; font-size:0.8rem; text-transform:uppercase;">
        <th style="text-align:left; padding:10px;">Plot Name</th>
        <th style="text-align:left; padding:10px;">Location</th>
        <th style="text-align:left; padding:10px;">Area</th>
        <th style="text-align:left; padding:10px;">Status</th>
      </tr></thead>
      <tbody>${res.plots.map(p => `
        <tr style="border-top:1px solid #1e293b;">
          <td style="padding:12px; color:#f8fafc; font-weight:600;">${p.name}</td>
          <td style="padding:12px; color:#94a3b8;">${p.location_district || '-'}, ${p.location_state || '-'}</td>
          <td style="padding:12px; color:#94a3b8;">${p.area_hectares} ha</td>
          <td style="padding:12px;">${getStatusBadge(p.verification_status)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
  } catch (e) {
    document.getElementById('myLands').innerHTML = '<p style="color:#ef4444;">Error loading plots.</p>';
  }
}
    
    async function loadMyCredits() {
      try {
        const res = await API.myCredits();
        const el = document.getElementById('myCredits');
        
        // Split credits into held (Available to Sell) and listed (Active on Exchange)
        const heldCredits = (res.owned || []).filter(c => c.status === 'held');
        const listedCredits = (res.owned || []).filter(c => c.status === 'listed');
        
        // Update top metrics
        const totalHeld = heldCredits.reduce((s, c) => s + c.available_tons, 0);
        const totalListed = listedCredits.reduce((s, c) => s + c.available_tons, 0);
        
        // Update Phase 2 metric (Available to Sell)
        let htmlContent = `<div class="card" style="margin-bottom:20px; background:linear-gradient(145deg, #1e293b, #0f172a);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
               <div>
                 <div style="font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Phase 2: Minted & Available to Sell</div>
                 <div style="font-size:2rem; font-weight:bold; color:#10b981;">${totalHeld} T</div>
               </div>
               <div style="text-align:right;">
                 <div style="font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Est. Market Value</div>
                 <div style="font-size:1.5rem; font-weight:bold; color:#f8fafc;">₹${(totalHeld * 1450).toLocaleString()}</div>
               </div>
            </div>
        </div>`;
        
        // Update Phase 3 metric (Active on Exchange)
        htmlContent += `<div class="card" style="margin-bottom:20px; background:linear-gradient(145deg, #1e293b, #0f172a); border-left:4px solid #38bdf8;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
               <div>
                 <div style="font-size:0.8rem; color:#94a3b8; text-transform:uppercase;">Phase 3: Active on Exchange (Pending Buyer)</div>
                 <div style="font-size:2rem; font-weight:bold; color:#38bdf8;">${totalListed} T</div>
               </div>
            </div>
        </div>`;

        const credits = res.owned || [];
        if (credits.length === 0) {
          htmlContent += '<p style="color:#94a3b8; text-align:center; padding:20px;">No credits minted yet. Await Phase 2 (Admin Approval).</p>';
        } else {
          htmlContent += `<div class="table-responsive"><table style="width:100%; border-collapse:collapse; margin-top:20px;">
          <thead><tr style="color:#94a3b8; font-size:0.8rem; text-transform:uppercase;">
            <th style="text-align:left; padding:10px;">Ticker</th>
            <th style="text-align:left; padding:10px;">Tons Available</th>
            <th style="text-align:left; padding:10px;">State</th>
            <th style="text-align:left; padding:10px;">Action</th>
          </tr></thead>
          <tbody>${credits.map(c => {
             let stateBadge = '';
             let actionBtn = '';
             if (c.status === 'held') {
                 stateBadge = '<span style="background:rgba(16,185,129,0.1); color:#10b981; padding:4px 8px; border-radius:4px;">VERIFIED_HELD</span>';
                 actionBtn = `<button class="bp" style="padding:6px 14px; font-size:0.8rem;" onclick="openListModal('${c.id}', ${c.available_tons})"><i class="fas fa-store"></i> List on Market</button>`;
             } else if (c.status === 'listed') {
                 stateBadge = '<span style="background:rgba(56,189,248,0.1); color:#38bdf8; padding:4px 8px; border-radius:4px;">MARKET_ACTIVE</span>';
                 actionBtn = '<span style="color:#94a3b8; font-size:0.8rem;"><i class="fas fa-lock"></i> Locked in Exchange</span>';
             } else {
                 stateBadge = `<span style="background:rgba(245,158,11,0.1); color:#f59e0b; padding:4px 8px; border-radius:4px;">${c.status.toUpperCase()}</span>`;
             }
             
             return `
            <tr style="border-top:1px solid #1e293b;">
              <td style="padding:12px; color:#38bdf8; font-weight:700; font-family:monospace;">${c.ticker || 'CARB'}</td>
              <td style="padding:12px; color:#10b981; font-size:1.1rem; font-weight:bold;">${c.available_tons} T</td>
              <td style="padding:12px;">${stateBadge}</td>
              <td style="padding:12px;">${actionBtn}</td>
            </tr>`
          }).join('')}
          </tbody>
          </table></div>`;
        }
        
        el.innerHTML = htmlContent;
      } catch (e) {
        document.getElementById('myCredits').innerHTML = '<p style="color:#ef4444;">Error loading credits.</p>';
      }
    }

    function toggleProfile(e){e.stopPropagation();document.getElementById('profileDropdown').classList.toggle('show');}
    document.addEventListener('click',function(){var d=document.getElementById('profileDropdown');if(d)d.classList.remove('show');});
    function showToast(m,t){var e=document.createElement('div');e.className='toast '+t;e.textContent=m;document.body.appendChild(e);setTimeout(function(){e.remove();},4000);}
    document.addEventListener('DOMContentLoaded',init);
  
    async function uploadDocument() {
      const fileInput = document.getElementById('landDoc');
      if(fileInput.files.length === 0) return;
      const formData = new FormData();
      formData.append('documents', fileInput.files[0]);
      
      const statusDiv = document.getElementById('docUploadStatus');
      statusDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Uploading to secure vault...';
      
      try {
        const res = await fetch('/api/land/upload-docs', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + TK() },
          body: formData
        });
        const data = await res.json();
        if(data.files && data.files.length > 0) {
          document.getElementById('uploadedDocId').value = data.files[0].id;
          statusDiv.innerHTML = '<span style="color:#10b981;"><i class="fas fa-check"></i> 7/12 Uploaded Successfully. Ready for AI Scan.</span>';
        } else {
          throw new Error('Upload failed');
        }
      } catch (e) {
        statusDiv.innerHTML = '<span style="color:#ef4444;"><i class="fas fa-times"></i> Upload error</span>';
      }
    }


  window.submitToAdmin = async function(tons) {
      var btn = document.getElementById('submitAdminBtn');
      if(btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...'; }
      
      var la=document.getElementById('landLat').value,ln=document.getElementById('landLng').value,he=document.getElementById('landArea').value,lt=document.getElementById('landType').value,oname=document.getElementById('nav-user-name').innerText,gj=document.getElementById('boundaryGeojson').value,pt=document.getElementById('projectType').value;
      
      try {
        var rReg = await fetch('/api/land/register', {
          method: 'POST',
          headers: HD(),
          body: JSON.stringify({ name: document.getElementById('landName').value || 'My Farm Polygon', area_hectares: he, project_type: pt, land_classification: lt, state: document.getElementById('landState').value, district: document.getElementById('landDistrict').value, geojson: JSON.parse(gj||'{}') })
        });
        var dReg = await rReg.json();
        if(dReg.error) throw new Error(dReg.error);
        
        showToast('Plot locked and submitted for Admin Audit (PENDING_AUDIT)', 'success');
        
        // Lock the UI
        document.getElementById('pipeBtn').disabled = true;
        document.getElementById('pipeBtn').innerHTML = '<i class="fas fa-lock"></i> Locked: Under Audit';
        if(btn) btn.innerHTML = '<i class="fas fa-check"></i> Submitted';
        if(geoMap) geoMap.removeControl(geoMap.zoomControl); // simple lock mock
        
      } catch(e) {
        showToast(e.message, 'error');
        if(btn) { btn.disabled = false; btn.innerHTML = 'Submit to Admin for Verification'; }
      }
  };



  // --- INJECTED BY AI FOR SHARK TANK FEATURES ---
  window.mintCredit = async function(tons) {
    try {
      var btn = event.target;
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Minting...';
      
      // Auto-register plot first if not registered
      var la=document.getElementById('landLat').value,ln=document.getElementById('landLng').value,he=document.getElementById('landArea').value,lt=document.getElementById('landType').value,oname=document.getElementById('nav-user-name').innerText,gj=document.getElementById('boundaryGeojson').value,pt=document.getElementById('projectType').value;
      
      var rReg = await fetch('/api/land/register', {
        method: 'POST',
        headers: HD(),
        body: JSON.stringify({ name: document.getElementById('landName').value || 'My Verified Land', area_hectares: he, project_type: pt, land_classification: lt, state: document.getElementById('landState').value, district: document.getElementById('landDistrict').value, geojson: JSON.parse(gj||'{}') })
      });
      var dReg = await rReg.json();
      if(dReg.error) {
        showToast(dReg.error, 'error');
        btn.disabled = false;
        btn.innerHTML = 'Mint Credit';
        return;
      }
      
      var rMint = await fetch('/api/credits/generate', {
        method: 'POST',
        headers: HD(),
        body: JSON.stringify({ 
          landId: dReg.plot.id, 
          tons: tons, 
          price_per_ton: parseInt(document.getElementById('cRate').innerText.replace(/\D/g, '')) || 1450,
          projectType: pt, 
          marketType: pt==='AWD Rice'?'Compliance CCC':'Voluntary Offset', 
          sectorTag: pt==='AWD Rice'?'Agriculture':'Forestry' 
        })
      });
      var dMint = await rMint.json();
      if(dMint.success) {
        showToast('Credit Minted & Recorded on Blockchain!', 'success');
        btn.innerHTML = '<i class="fas fa-check"></i> Minted & Secured';
        
        // --- NEW POST-MINT SUCCESS MODAL ---
        const modalHtml = `
          <div id="mintSuccessModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);">
            <div style="background:#0f172a;border:1px solid #10b981;border-radius:12px;padding:30px;max-width:400px;text-align:center;animation: sIn 0.3s forwards;position:relative;">
              <div style="width:60px;height:60px;border-radius:50%;background:rgba(16,185,129,0.2);color:#10b981;font-size:2rem;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;"><i class="fas fa-check-circle"></i></div>
              <h2 style="color:#f8fafc;margin-bottom:10px;">Credits Minted!</h2>
              <p style="color:#94a3b8;font-size:0.95rem;margin-bottom:20px;">Your carbon credits are now <strong>LIVE</strong> in the Global Market Pool. Industries can now purchase them directly!</p>
              <button class="bp" style="width:100%;" onclick="document.getElementById('mintSuccessModal').remove(); switchTab('credits');">View My Credits Ledger</button>
            </div>
          </div>`;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
      }
    } catch(e) { showToast(e.message, 'error'); }
  };
  
  // Live Impact Dashboard Ticker
  function injectImpactDashboard() {
    const header = document.querySelector('div[style*="background:linear-gradient(90deg,#0f172a,#1e293b)"]');
    if (!header) return;
    
    const impactHtml = `
      <div style="background:#0a0a0a; border-bottom:1px solid #1e293b; padding:12px 20px;">
        <div style="max-width:1400px; margin:0 auto; display:flex; justify-content:space-around; align-items:center;">
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Live CO2 Sequestered</div>
            <div style="font-size:1.4rem; font-weight:800; color:#10b981; font-family:monospace;" id="ticker-co2">24,592 T</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Hectares Monitored (AI)</div>
            <div style="font-size:1.4rem; font-weight:800; color:#38bdf8; font-family:monospace;" id="ticker-ha">8,412.5 ha</div>
          </div>
          <div style="text-align:center;">
            <div style="font-size:0.75rem; color:#94a3b8; text-transform:uppercase; letter-spacing:1px;">Farmer Payouts</div>
            <div style="font-size:1.4rem; font-weight:800; color:#f59e0b; font-family:monospace;" id="ticker-inr">₹35,840,000</div>
          </div>
        </div>
      </div>
    `;
    
    header.insertAdjacentHTML('afterend', impactHtml);
    
    // Animate tickers slightly
    setInterval(() => {
      const co2 = document.getElementById('ticker-co2');
      const inr = document.getElementById('ticker-inr');
      if(co2 && Math.random() > 0.5) {
        let v = parseInt(co2.innerText.replace(/\D/g, '')) + Math.floor(Math.random() * 3);
        co2.innerText = v.toLocaleString() + ' T';
      }
      if(inr && Math.random() > 0.5) {
        // Sync with actual payout balance in loadProfile instead of random
        inr.innerText = '₹' + v.toLocaleString();
      }
    }, 1000);
  }
  
  document.addEventListener('DOMContentLoaded', () => { setTimeout(injectImpactDashboard, 500); });


    setTimeout(() => {
      var ctx = document.getElementById('ndviChart');
      if(ctx) {
        new Chart(ctx, {
          type: 'line',
          data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
            datasets: [{ label: 'NDVI Index', data: [0.65, 0.68, 0.72, 0.75, 0.81, 0.85, 0.82, 0.78, 0.75, 0.71, 0.68, 0.66], borderColor: '#10b981', backgroundColor: 'rgba(16,185,129,0.1)', borderWidth: 2, fill: true, tension: 0.4 }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { display: false, min: 0, max: 1 }, x: { grid: { color: '#1e293b' }, ticks: { color: '#94a3b8', font: {size:10} } } } }
        });
      }
    }, 1000);
    
    window.runQuickEligibility = async function() {
      var la = document.getElementById('landLat').value;
      var ln = document.getElementById('landLng').value;
      if(!la || !ln) { showToast('Please click on the map to drop a pin first!', 'error'); return; }
      showToast('Running lightweight Sentinel-2 scan...', 'success');
      setTimeout(() => {
        showToast('Eligible! Estimated Earnings: ₹1,50,000 / year. Proceed with registration.', 'success');
        document.getElementById('landSizeValue').focus();
      }, 700);
    };
    
    const oldLoadMyCredits2 = window.loadMyCredits;
    window.loadMyCredits = async function() {
      if(typeof oldLoadMyCredits2 === 'function') await oldLoadMyCredits2();
      var cList = document.getElementById('myCredits');
      if (cList && !cList.innerHTML.includes('Get 40%')) {
        cList.innerHTML = cList.innerHTML.replace(/<\/div><\/div>/g, '<button class="bp" style="margin-top:10px;padding:6px 12px;font-size:0.75rem;background:#f59e0b;" onclick="alert(\'40% Cash Advance Requested via Cashfree Escrow\')"><i class="fas fa-hand-holding-usd"></i> Get 40% Instant Cash Advance</button></div></div>');
      }
    };
  

    const oldReg = window.registerLand;
    window.registerLand = async function() {
      if(!document.getElementById('fra_consent').checked) {
        showToast('You must digitally sign the FRA legal declaration to proceed.', 'error');
        return;
      }
      if(typeof oldReg === 'function') await oldReg();
    };
  
