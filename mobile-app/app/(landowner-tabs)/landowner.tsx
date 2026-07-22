import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, SafeAreaView, Dimensions, Alert, KeyboardAvoidingView, Platform
} from 'react-native';
import * as Location from 'expo-location';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import MapView, { Polygon, Marker } from 'react-native-maps';
import axios from 'axios';

const { width } = Dimensions.get('window');
const API_BASE = 'http://10.0.2.2:3000'; // Use 10.0.2.2 for Android emulator, or your local IP

const STEPS = ['wizard1', 'wizard2', 'wizard3', 'wizard4'];

export default function LandownerPortal() {
  const [viewState, setViewState] = useState('dashboard');
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [formData, setFormData] = useState({
    name: '', framework: 'Carbon Credits CCTS', landType: 'Agroforestry', landClass: 'Agricultural',
    state: '', district: '', taluka: '', village: '',
    soil: '', irrigation: '', lat: '', lng: '',
    polygon: [] as any[]
  });

  const updateForm = (key: string, val: any) => setFormData(p => ({ ...p, [key]: val }));

  const goBack = () => {
    const idx = STEPS.indexOf(viewState);
    if (idx > 0) setViewState(STEPS[idx - 1]);
    else setViewState('dashboard');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const goNext = (next: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setViewState(next);
  };

  // ── HEADER with back button ──────────────────────────────────────────────
  const WizardHeader = ({ title, progress }: { title: string; progress: number }) => (
    <View>
      <View style={styles.progressContainer}>
        <View style={[styles.progressBar, { width: progress + '%' }]} />
      </View>
      <View style={styles.wizardHeader}>
        <TouchableOpacity onPress={goBack} style={styles.backBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.stepTitle}>{title}</Text>
      </View>
    </View>
  );

  // ── DASHBOARD ────────────────────────────────────────────────────────────
  if (viewState === 'dashboard') {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <Text style={styles.badge}>🏅 GOLD TIER</Text>
          <Text style={styles.welcome}>Welcome back,{'\n'}Gujarat FPO</Text>
        </View>

        <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={styles.carousel}>
          <View style={[styles.carouselCard, { borderColor: '#00E5FF' }]}>
            <Text style={styles.cardLabel}>TOTAL CO₂ SEQUESTERED</Text>
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

        <View style={styles.dashFooter}>
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

  // ── WIZARD STEP 1: Project Basics ─────────────────────────────────────
  if (viewState === 'wizard1') {
    return (
      <SafeAreaView style={styles.safe}>
        <WizardHeader title="Project Basics" progress={25} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.wizardScroll} contentContainerStyle={styles.wizardContent} keyboardShouldPersistTaps="handled">
            <Text style={styles.fieldLabel}>Project Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Green Valley Farm"
              placeholderTextColor="#4a5568"
              value={formData.name}
              onChangeText={v => updateForm('name', v)}
            />

            <Text style={styles.fieldLabel}>Credit Framework</Text>
            <View style={styles.pickerBox}>
              {['Carbon Credits CCTS', 'Verra VCS', 'Gold Standard', 'GCC'].map(f => (
                <TouchableOpacity
                  key={f}
                  style={[styles.chip, formData.framework === f && styles.chipActive]}
                  onPress={() => updateForm('framework', f)}>
                  <Text style={[styles.chipText, formData.framework === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Land Classification</Text>
            <View style={styles.pickerBox}>
              {['Agricultural', 'Forest', 'Wetland', 'Grassland'].map(l => (
                <TouchableOpacity
                  key={l}
                  style={[styles.chip, formData.landClass === l && styles.chipActive]}
                  onPress={() => updateForm('landClass', l)}>
                  <Text style={[styles.chipText, formData.landClass === l && styles.chipTextActive]}>{l}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Project Type</Text>
            <View style={styles.pickerBox}>
              {['Agroforestry', 'Soil Carbon', 'Biochar', 'Silvopasture'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, formData.landType === t && styles.chipActive]}
                  onPress={() => updateForm('landType', t)}>
                  <Text style={[styles.chipText, formData.landType === t && styles.chipTextActive]}>{t}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backNavBtn} onPress={goBack}>
              <Text style={styles.backNavBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !formData.name && styles.nextBtnDisabled]}
              onPress={() => formData.name ? goNext('wizard2') : Alert.alert('Required', 'Please enter a Project Name')}>
              <Text style={styles.nextBtnText}>Next: Location ➔</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── WIZARD STEP 2: Regional Details ───────────────────────────────────
  if (viewState === 'wizard2') {
    return (
      <SafeAreaView style={styles.safe}>
        <WizardHeader title="Regional Details" progress={50} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.wizardScroll} contentContainerStyle={styles.wizardContent} keyboardShouldPersistTaps="handled">
            {[
              { label: 'State', key: 'state', placeholder: 'e.g. Maharashtra' },
              { label: 'District', key: 'district', placeholder: 'e.g. Pune' },
              { label: 'Taluka', key: 'taluka', placeholder: 'e.g. Haveli' },
              { label: 'Village', key: 'village', placeholder: 'e.g. Uruli Kanchan' },
            ].map(({ label, key, placeholder }) => (
              <View key={key}>
                <Text style={styles.fieldLabel}>{label}</Text>
                <TextInput
                  style={styles.input}
                  placeholder={placeholder}
                  placeholderTextColor="#4a5568"
                  value={(formData as any)[key]}
                  onChangeText={v => updateForm(key, v)}
                />
              </View>
            ))}
            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backNavBtn} onPress={goBack}>
              <Text style={styles.backNavBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, !formData.state && styles.nextBtnDisabled]}
              onPress={() => formData.state ? goNext('wizard3') : Alert.alert('Required', 'Please enter your State')}>
              <Text style={styles.nextBtnText}>Next: Hardware ➔</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── WIZARD STEP 3: Hardware ────────────────────────────────────────────
  if (viewState === 'wizard3') {
    const handleGPS = async () => {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return Alert.alert('Permission Denied', 'Location access is needed for accurate mapping.');
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        updateForm('lat', location.coords.latitude.toFixed(6));
        updateForm('lng', location.coords.longitude.toFixed(6));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        Alert.alert('GPS Error', 'Could not get location. Please try again.');
      }
    };

    return (
      <SafeAreaView style={styles.safe}>
        <WizardHeader title="Hardware Integration" progress={75} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView style={styles.wizardScroll} contentContainerStyle={styles.wizardContent} keyboardShouldPersistTaps="handled">

            <Text style={styles.fieldLabel}>Soil Type</Text>
            <TextInput style={styles.input} placeholder="e.g. Black Cotton Soil" placeholderTextColor="#4a5568"
              value={formData.soil} onChangeText={v => updateForm('soil', v)} />

            <Text style={styles.fieldLabel}>Irrigation Method</Text>
            <TextInput style={styles.input} placeholder="e.g. Drip, Rain-fed" placeholderTextColor="#4a5568"
              value={formData.irrigation} onChangeText={v => updateForm('irrigation', v)} />

            <Text style={styles.fieldLabel}>GPS Coordinates</Text>
            <View style={styles.gpsRow}>
              <TextInput style={[styles.input, styles.gpsInput]} placeholder="Latitude" value={formData.lat} placeholderTextColor="#4a5568" editable={false} />
              <TextInput style={[styles.input, styles.gpsInput]} placeholder="Longitude" value={formData.lng} placeholderTextColor="#4a5568" editable={false} />
              <TouchableOpacity style={styles.gpsBtn} onPress={handleGPS}>
                <Text style={styles.gpsBtnText}>🎯 GPS</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.fieldLabel}>Document Scan (7/12 Registry)</Text>
            {!cameraPermission?.granted ? (
              <TouchableOpacity style={styles.scanBtn} onPress={requestCameraPermission}>
                <Text style={styles.scanBtnText}>📷  Tap to Enable Camera</Text>
                <Text style={styles.scanBtnSub}>Scan your 7/12 land record</Text>
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
            <View style={{ height: 16 }} />
          </ScrollView>

          <View style={styles.navRow}>
            <TouchableOpacity style={styles.backNavBtn} onPress={goBack}>
              <Text style={styles.backNavBtnText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.nextBtn} onPress={() => goNext('wizard4')}>
              <Text style={styles.nextBtnText}>Next: Map Boundary ➔</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── WIZARD STEP 4: Map Boundary ────────────────────────────────────────
  if (viewState === 'wizard4') {
    const handleSubmit = async () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      try {
        await axios.post(`${API_BASE}/api/admin/trigger-ingestion`, {
          name: formData.name || 'New Project',
          type: formData.landType || 'Agroforestry',
          state: formData.state || 'Maharashtra',
          lat: parseFloat(formData.lat) || 19.0,
          lng: parseFloat(formData.lng) || 73.0,
          polygon: formData.polygon
        }, { headers: { Authorization: 'Bearer test-token' }, timeout: 8000 });

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert('✅ Success!', 'Your land project has been submitted for verification.', [
          { text: 'Done', onPress: () => setViewState('dashboard') }
        ]);
      } catch {
        Alert.alert('Submission Error', 'Check if the backend server is running.');
        setViewState('dashboard');
      }
    };

    const handleMapPress = (e: any) => {
      updateForm('polygon', [...formData.polygon, e.nativeEvent.coordinate]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    return (
      <View style={{ flex: 1, backgroundColor: '#0A0E17' }}>
        {/* Back button floating over map */}
        <SafeAreaView style={styles.mapTopBar}>
          <TouchableOpacity onPress={goBack} style={styles.mapBackBtn}>
            <Text style={styles.mapBackBtnText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.floatingPill}>
            <Text style={styles.floatingPillText}>
              {formData.polygon.length === 0 ? 'Tap corners to draw boundary' : `${formData.polygon.length} points marked`}
            </Text>
          </View>
          {formData.polygon.length > 0 && (
            <TouchableOpacity onPress={() => updateForm('polygon', [])} style={styles.clearBtn}>
              <Text style={styles.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </SafeAreaView>

        <MapView
          style={StyleSheet.absoluteFillObject}
          mapType="satellite"
          initialRegion={{
            latitude: formData.lat ? parseFloat(formData.lat) : 19.0760,
            longitude: formData.lng ? parseFloat(formData.lng) : 72.8777,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }}
          onPress={handleMapPress}
        >
          {formData.polygon.length > 0 && (
            <Polygon
              coordinates={formData.polygon}
              strokeColor="#00E676"
              fillColor="rgba(0, 230, 118, 0.25)"
              strokeWidth={3}
            />
          )}
          {formData.polygon.map((p, i) => (
            <Marker key={i} coordinate={p}>
              <View style={styles.dot} />
            </Marker>
          ))}
        </MapView>

        {/* Submit Button — bottom of screen, above system gestures */}
        <SafeAreaView style={styles.mapBottomBar}>
          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Text style={styles.submitBtnText}>✅  Save & Submit Project</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },

  // Dashboard
  header: { padding: 24, paddingTop: 16 },
  badge: { color: '#FFAB00', fontWeight: '900', fontSize: 13, letterSpacing: 2, marginBottom: 8 },
  welcome: { color: '#ffffff', fontSize: 26, fontWeight: '800', lineHeight: 34 },
  carousel: { flexGrow: 0, height: 220, marginTop: 8 },
  carouselCard: { width: width - 48, marginHorizontal: 24, backgroundColor: '#111827', borderWidth: 2, borderRadius: 20, padding: 28, justifyContent: 'center' },
  cardLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 12 },
  cardValue: { fontSize: 38, fontWeight: '900' },
  dashFooter: { padding: 24, paddingTop: 32 },
  btnPrimary: { backgroundColor: '#00E676', paddingVertical: 20, borderRadius: 14, alignItems: 'center', shadowColor: '#00E676', shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  btnPrimaryText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1.5 },

  // Wizard
  progressContainer: { height: 4, backgroundColor: '#1e293b', width: '100%' },
  progressBar: { height: '100%', backgroundColor: '#00E676' },
  wizardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backBtn: { marginRight: 12 },
  backBtnText: { color: '#00E676', fontSize: 15, fontWeight: '700' },
  stepTitle: { color: '#ffffff', fontSize: 24, fontWeight: '800', flex: 1 },
  wizardScroll: { flex: 1 },
  wizardContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  fieldLabel: { color: '#94a3b8', fontSize: 12, fontWeight: '700', letterSpacing: 1, marginBottom: 8, marginTop: 8, textTransform: 'uppercase' },
  input: { backgroundColor: '#1e293b', color: '#ffffff', padding: 16, borderRadius: 10, fontSize: 15, marginBottom: 4, borderWidth: 1, borderColor: '#334155' },

  // Chip selectors
  pickerBox: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  chipActive: { backgroundColor: '#002818', borderColor: '#00E676' },
  chipText: { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: '#00E676', fontWeight: '700' },

  // Nav Row (Back + Next at bottom)
  navRow: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 16, gap: 12, backgroundColor: '#0A0E17', borderTopWidth: 1, borderTopColor: '#1e293b' },
  backNavBtn: { flex: 1, paddingVertical: 16, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155', backgroundColor: '#111827' },
  backNavBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  nextBtn: { flex: 2, backgroundColor: '#00E676', paddingVertical: 16, borderRadius: 12, alignItems: 'center', shadowColor: '#00E676', shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  nextBtnDisabled: { backgroundColor: '#1e293b', shadowOpacity: 0 },
  nextBtnText: { color: '#0A0E17', fontSize: 15, fontWeight: '900' },

  // GPS
  gpsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  gpsInput: { flex: 1, marginBottom: 0 },
  gpsBtn: { backgroundColor: '#1d4ed8', paddingHorizontal: 14, paddingVertical: 16, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  gpsBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },

  // Camera
  scanBtn: { borderStyle: 'dashed', borderWidth: 2, borderColor: '#334155', padding: 30, borderRadius: 14, alignItems: 'center', marginTop: 4 },
  scanBtnText: { color: '#94a3b8', fontSize: 16, fontWeight: '800', marginBottom: 4 },
  scanBtnSub: { color: '#64748b', fontSize: 12 },
  cameraContainer: { height: 220, borderRadius: 14, overflow: 'hidden', marginTop: 4 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#00E676', borderStyle: 'dashed', margin: 16, borderRadius: 8 },
  cameraText: { color: '#00E676', fontWeight: '800', fontSize: 16 },

  // Map Step 4
  mapTopBar: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8 },
  mapBackBtn: { backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, marginRight: 10 },
  mapBackBtnText: { color: '#00E676', fontWeight: '800', fontSize: 14 },
  floatingPill: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, alignItems: 'center' },
  floatingPillText: { color: '#ffffff', fontWeight: '700', fontSize: 13 },
  clearBtn: { backgroundColor: 'rgba(180,0,0,0.7)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, marginLeft: 10 },
  clearBtnText: { color: '#ffffff', fontWeight: '800', fontSize: 13 },
  dot: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#00E676', borderWidth: 2, borderColor: '#ffffff' },
  mapBottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 10, paddingHorizontal: 20, paddingBottom: 8 },
  submitBtn: { backgroundColor: '#00E676', paddingVertical: 20, borderRadius: 14, alignItems: 'center', shadowColor: '#00E676', shadowOpacity: 0.5, shadowRadius: 14, elevation: 8 },
  submitBtnText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
});
