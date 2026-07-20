import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, SafeAreaView, Dimensions, Alert } from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import MapView, { Polygon, Marker } from 'react-native-maps';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE = 'http://localhost:3000';

export default function LandownerPortal() {
  const [viewState, setViewState] = useState('dashboard'); // dashboard, wizard1, wizard2, wizard3, wizard4
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  
  // Form State
  const [formData, setFormData] = useState({
    name: '', framework: '', landType: '',
    state: '', district: '', taluka: '', village: '',
    soil: '', irrigation: '', crop: '', lat: '', lng: '',
    polygon: []
  });

  const updateForm = (key, val) => setFormData(p => ({ ...p, [key]: val }));

  // --- DASHBOARD VIEW ---
  if (viewState === 'dashboard') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.badge}>GOLD TIER</Text>
          <Text style={styles.welcome}>Welcome back, Gujrat FPO</Text>
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
          <View style={[styles.carouselCard, { borderColor: '#00E5FF' }]}>
            <Text style={styles.cardLabel}>TOTAL CO2 SEQUESTERED</Text>
            <Text style={[styles.cardValue, { color: '#00E5FF' }]}>14,500 TONS</Text>
          </View>
          <View style={[styles.carouselCard, { borderColor: '#ffffff' }]}>
            <Text style={styles.cardLabel}>VERIFIED HECTARES</Text>
            <Text style={[styles.cardValue, { color: '#ffffff' }]}>450 HA</Text>
          </View>
          <View style={[styles.carouselCard, { borderColor: '#00E676' }]}>
            <Text style={styles.cardLabel}>PENDING PAYOUTS</Text>
            <Text style={[styles.cardValue, { color: '#00E676' }]}>₹35,85,000</Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.btnPrimary} onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setViewState('wizard1');
          }}>
            <Text style={styles.btnPrimaryText}>+ ONBOARD NEW LAND</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // --- WIZARD HELPER ---
  const renderProgressBar = (progress) => (
    <View style={styles.progressContainer}>
      <View style={[styles.progressBar, { width: progress + '%' }]} />
    </View>
  );

  // --- WIZARD STEP 1 ---
  if (viewState === 'wizard1') {
    return (
      <SafeAreaView style={styles.safe}>
        {renderProgressBar(25)}
        <View style={styles.wizardContent}>
          <Text style={styles.stepTitle}>Project Basics</Text>
          <TextInput style={styles.input} placeholder="Project Name" placeholderTextColor="#64748b" value={formData.name} onChangeText={v => updateForm('name', v)} />
          <TextInput style={styles.input} placeholder="Credit Framework (e.g. Verra, Gold Standard)" placeholderTextColor="#64748b" value={formData.framework} onChangeText={v => updateForm('framework', v)} />
          <TextInput style={styles.input} placeholder="Land Classification (e.g. Agroforestry)" placeholderTextColor="#64748b" value={formData.landType} onChangeText={v => updateForm('landType', v)} />
        </View>
        <TouchableOpacity style={styles.stickyBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewState('wizard2'); }}>
          <Text style={styles.stickyBtnText}>Next: Location Details ➔</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- WIZARD STEP 2 ---
  if (viewState === 'wizard2') {
    return (
      <SafeAreaView style={styles.safe}>
        {renderProgressBar(50)}
        <View style={styles.wizardContent}>
          <Text style={styles.stepTitle}>Regional Details</Text>
          <TextInput style={styles.input} placeholder="State" placeholderTextColor="#64748b" value={formData.state} onChangeText={v => updateForm('state', v)} />
          <TextInput style={styles.input} placeholder="District" placeholderTextColor="#64748b" value={formData.district} onChangeText={v => updateForm('district', v)} />
          <TextInput style={styles.input} placeholder="Taluka" placeholderTextColor="#64748b" value={formData.taluka} onChangeText={v => updateForm('taluka', v)} />
          <TextInput style={styles.input} placeholder="Village" placeholderTextColor="#64748b" value={formData.village} onChangeText={v => updateForm('village', v)} />
        </View>
        <TouchableOpacity style={styles.stickyBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewState('wizard3'); }}>
          <Text style={styles.stickyBtnText}>Next: Agricultural Details ➔</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- WIZARD STEP 3 ---
  if (viewState === 'wizard3') {
    const handleGPS = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return Alert.alert('Permission to access location was denied');
      let location = await Location.getCurrentPositionAsync({});
      updateForm('lat', location.coords.latitude.toString());
      updateForm('lng', location.coords.longitude.toString());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    };

    return (
      <SafeAreaView style={styles.safe}>
        {renderProgressBar(75)}
        <ScrollView style={styles.wizardContent}>
          <Text style={styles.stepTitle}>Hardware Integration</Text>
          <TextInput style={styles.input} placeholder="Soil Type" placeholderTextColor="#64748b" />
          <TextInput style={styles.input} placeholder="Irrigation Method" placeholderTextColor="#64748b" />
          
          <View style={styles.row}>
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Lat" value={formData.lat} editable={false} />
            <TextInput style={[styles.input, { flex: 1, marginRight: 8 }]} placeholder="Long" value={formData.lng} editable={false} />
            <TouchableOpacity style={styles.gpsBtn} onPress={handleGPS}>
              <Text style={styles.gpsBtnText}>🎯 Use GPS</Text>
            </TouchableOpacity>
          </View>

          {!cameraPermission?.granted ? (
             <TouchableOpacity style={styles.scanBtn} onPress={requestCameraPermission}>
               <Text style={styles.scanBtnText}>📷 Request Camera Permission</Text>
             </TouchableOpacity>
          ) : (
             <View style={styles.cameraContainer}>
               <CameraView style={styles.camera} facing="back">
                  <View style={styles.cameraOverlay}>
                    <Text style={styles.cameraText}>Align 7/12 Document</Text>
                  </View>
               </CameraView>
             </View>
          )}

        </ScrollView>
        <TouchableOpacity style={styles.stickyBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setViewState('wizard4'); }}>
          <Text style={styles.stickyBtnText}>Next: Map Boundary ➔</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // --- WIZARD STEP 4 ---
  if (viewState === 'wizard4') {
    const handleSubmit = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      try {
        // Submit atomic payload to API
        await axios.post(${API_BASE}/api/admin/trigger-ingestion, {
            name: formData.name || 'New Project',
            type: formData.landType || 'Agroforestry',
            state: formData.state || 'Maharashtra',
            lat: parseFloat(formData.lat) || 19.0,
            lng: parseFloat(formData.lng) || 73.0,
            polygon: formData.polygon
        }, { headers: { Authorization: 'Bearer test-token' }});
        
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setViewState('dashboard');
      } catch (e) {
        Alert.alert("Submission Error", "Failed to submit project. Ensure backend is running.");
        setViewState('dashboard');
      }
    };

    const handleMapPress = (e) => {
      const coord = e.nativeEvent.coordinate;
      updateForm('polygon', [...formData.polygon, coord]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const initialRegion = {
      latitude: formData.lat ? parseFloat(formData.lat) : 19.0760,
      longitude: formData.lng ? parseFloat(formData.lng) : 72.8777,
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={styles.floatingPill}>
          <Text style={styles.floatingPillText}>Tap corners to draw farm boundary</Text>
        </View>
        <MapView 
          style={StyleSheet.absoluteFillObject} 
          mapType="satellite"
          initialRegion={initialRegion}
          onPress={handleMapPress}
        >
          {formData.polygon.length > 0 && (
            <Polygon 
              coordinates={formData.polygon} 
              strokeColor="#00E676" 
              fillColor="rgba(0, 230, 118, 0.3)" 
              strokeWidth={3} 
            />
          )}
          {formData.polygon.map((p, i) => (
             <Marker key={i} coordinate={p}>
                <View style={styles.dot} />
             </Marker>
          ))}
        </MapView>
        <TouchableOpacity style={[styles.stickyBtn, { backgroundColor: '#00E676' }]} onPress={handleSubmit}>
          <Text style={[styles.stickyBtnText, { color: '#0A0E17' }]}>Save & Submit Project</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },
  header: { padding: 20 },
  badge: { color: '#FFAB00', fontWeight: '900', letterSpacing: 2, marginBottom: 8 },
  welcome: { color: '#ffffff', fontSize: 24, fontWeight: '800' },
  carousel: { height: 250, marginTop: 20 },
  carouselCard: { width: width - 60, marginHorizontal: 20, backgroundColor: '#111827', borderWidth: 2, borderRadius: 16, padding: 24, justifyContent: 'center' },
  cardLabel: { color: '#94a3b8', fontSize: 14, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  cardValue: { fontSize: 42, fontWeight: '900' },
  footer: { padding: 20, position: 'absolute', bottom: 100, width: '100%' },
  btnPrimary: { backgroundColor: '#00E676', paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowColor: '#00E676', shadowOpacity: 0.4, shadowRadius: 10 },
  btnPrimaryText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  progressContainer: { height: 4, backgroundColor: '#1e293b', width: '100%' },
  progressBar: { height: '100%', backgroundColor: '#00E676' },
  wizardContent: { padding: 24, flex: 1 },
  stepTitle: { color: '#ffffff', fontSize: 28, fontWeight: '800', marginBottom: 24 },
  input: { backgroundColor: '#1e293b', color: '#ffffff', padding: 16, borderRadius: 8, fontSize: 16, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  stickyBtn: { position: 'absolute', bottom: 90, left: 20, right: 20, backgroundColor: '#1e293b', paddingVertical: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  stickyBtnText: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  gpsBtn: { backgroundColor: '#2962ff', padding: 16, borderRadius: 8, height: 56, justifyContent: 'center' },
  gpsBtnText: { color: '#ffffff', fontWeight: '800' },
  scanBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#94a3b8', padding: 30, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  scanBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '800' },
  cameraContainer: { height: 250, borderRadius: 12, overflow: 'hidden', marginTop: 10 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00E676', borderStyle: 'dashed', margin: 20 },
  cameraText: { color: '#00E676', fontWeight: '800', fontSize: 18 },
  floatingPill: { position: 'absolute', top: 60, alignSelf: 'center', backgroundColor: '#000000', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 30, zIndex: 10 },
  floatingPillText: { color: '#ffffff', fontWeight: '800' },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#00E676', borderWidth: 2, borderColor: '#ffffff' }
});
