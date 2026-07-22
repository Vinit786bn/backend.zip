import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';
import MapView, { Polygon, Marker } from 'react-native-maps';
import { router } from 'expo-router';
import { db, auth } from '../../firebase';
import { collection, addDoc } from 'firebase/firestore';
import * as Haptics from 'expo-haptics';

export default function OnboardScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [camPerm, reqCamPerm] = useCameraPermissions();
  const [showCamera, setShowCamera] = useState(false);
  
  // Form Data
  const [name, setName] = useState('');
  const [area, setArea] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [markers, setMarkers] = useState<{lat:number, lng:number}[]>([]);

  const handleNext = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    if (step === 1 && !name) return alert('Project Name required');
    if (step < 4) setStep(step + 1);
  };
  const handleBack = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    if (step > 1) setStep(step - 1);
  };

  const doGetLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return alert('Permission denied');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    setLoading(true);
    const loc = await Location.getCurrentPositionAsync({});
    setLat(loc.coords.latitude.toFixed(6));
    setLng(loc.coords.longitude.toFixed(6));
    setLoading(false);
    try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
  };

  const doScan = async () => {
    if (!camPerm?.granted) await reqCamPerm();
    setShowCamera(true);
  };

  const handleMapTap = (e: any) => {
    const coord = e.nativeEvent.coordinate;
    setMarkers([...markers, { lat: coord.latitude, lng: coord.longitude }]);
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
  };

  const handleSubmit = async () => {
    if (markers.length < 3) return alert('Draw a polygon with at least 3 points');
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    setLoading(true);
    
    try {
      const email = auth.currentUser?.email || 'demo@carbonwallet.in';
      await addDoc(collection(db, 'projects'), {
        name: name,
        area: area || '0',
        lat: lat,
        lng: lng,
        coordinates: markers,
        ownerEmail: email,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      
      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      // Reset form
      setStep(1); setName(''); setArea(''); setLat(''); setLng(''); setMarkers([]);
      
      // Navigate back to Dashboard (My Lands) instantly
      router.push('/(tabs)/index');
    } catch (e: any) {
      alert('Error submitting project: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  if (showCamera) {
    return (
      <View style={{flex:1}}>
        <CameraView style={{flex:1}} facing="back">
          <View style={styles.camOverlay}>
            <TouchableOpacity style={styles.camBtn} onPress={() => { setShowCamera(false); try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {} }}>
              <Text style={styles.camBtnText}>Capture Document</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        {step > 1 ? (
          <TouchableOpacity onPress={handleBack}><Text style={{color:'#FFF',fontSize:20}}>←</Text></TouchableOpacity>
        ) : <View style={{width:20}} />}
        <Text style={styles.headerTitle}>Step {step} of 4</Text>
        <View style={{width:20}} />
      </View>
      
      <View style={styles.progBar}><View style={[styles.progFill, {width: ${step * 25}%}]} /></View>

      <ScrollView style={styles.content}>
        {step === 1 && (
          <View>
            <Text style={styles.stepTitle}>Project Basics</Text>
            <Text style={styles.label}>Project Name</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Green Valley Farm" placeholderTextColor="#475569" />
          </View>
        )}

        {step === 2 && (
          <View>
            <Text style={styles.stepTitle}>Location Details</Text>
            <Text style={styles.label}>Total Area (Hectares)</Text>
            <TextInput style={styles.input} value={area} onChangeText={setArea} keyboardType="numeric" placeholder="e.g. 2.5" placeholderTextColor="#475569" />
          </View>
        )}

        {step === 3 && (
          <View>
            <Text style={styles.stepTitle}>Hardware & Documents</Text>
            
            <Text style={styles.label}>GPS Coordinates</Text>
            <View style={{flexDirection:'row', gap:10}}>
              <TextInput style={[styles.input, {flex:1}]} value={lat} placeholder="Lat" editable={false} />
              <TextInput style={[styles.input, {flex:1}]} value={lng} placeholder="Lng" editable={false} />
              <TouchableOpacity style={styles.gpsBtn} onPress={doGetLocation}>
                {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.gpsBtnText}>GPS</Text>}
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Scan 7/12 Document</Text>
            <TouchableOpacity style={styles.camBox} onPress={doScan}>
              <Text style={{fontSize: 30}}>📷</Text>
              <Text style={{color:'#FFF', marginTop:10, fontWeight:'700'}}>Tap to Scan</Text>
            </TouchableOpacity>
          </View>
        )}

        {step === 4 && (
          <View style={{height: 500}}>
            <Text style={styles.stepTitle}>Draw Boundary</Text>
            <Text style={{color:'#00E676', marginBottom:10, fontSize: 12}}>Tap the map to draw corners</Text>
            <MapView 
              style={{flex:1, borderRadius:16, overflow:'hidden'}}
              initialRegion={{ latitude: parseFloat(lat)||18.5204, longitude: parseFloat(lng)||73.8567, latitudeDelta: 0.01, longitudeDelta: 0.01 }}
              onPress={handleMapTap}
              mapType="satellite"
            >
              {markers.map((m, i) => <Marker key={i} coordinate={{latitude:m.lat, longitude:m.lng}} />)}
              {markers.length > 2 && (
                <Polygon coordinates={markers.map(m=>({latitude:m.lat, longitude:m.lng}))} fillColor="rgba(0,230,118,0.3)" strokeColor="#00E676" strokeWidth={2} />
              )}
            </MapView>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step < 4 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextBtnText}>Next Step →</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.nextBtn, {backgroundColor: '#00E5FF'}]} onPress={handleSubmit} disabled={loading}>
            {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.nextBtnText}>Submit Project</Text>}
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  headerTitle: { color: '#00E676', fontWeight: '700', fontSize: 12, textTransform: 'uppercase' },
  progBar: { height: 3, backgroundColor: 'rgba(255,255,255,0.1)' },
  progFill: { height: '100%', backgroundColor: '#00E676' },
  content: { flex: 1, padding: 20 },
  stepTitle: { fontSize: 24, fontWeight: '800', color: '#FFF', marginBottom: 24 },
  label: { color: '#94A3B8', fontSize: 12, fontWeight: '700', textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: '#141920', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, color: '#FFF', padding: 16, fontSize: 16, marginBottom: 20 },
  gpsBtn: { backgroundColor: '#00E676', borderRadius: 12, justifyContent: 'center', paddingHorizontal: 20, height: 56 },
  gpsBtnText: { color: '#000', fontWeight: '800' },
  camBox: { backgroundColor: '#141920', borderWidth: 2, borderColor: 'rgba(0,230,118,0.3)', borderStyle: 'dashed', borderRadius: 16, height: 140, justifyContent: 'center', alignItems: 'center' },
  camOverlay: { flex: 1, justifyContent: 'flex-end', padding: 40 },
  camBtn: { backgroundColor: '#00E676', padding: 20, borderRadius: 100, alignItems: 'center' },
  camBtnText: { color: '#000', fontWeight: '800', fontSize: 16 },
  footer: { padding: 20, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.05)' },
  nextBtn: { backgroundColor: '#00E676', padding: 18, borderRadius: 16, alignItems: 'center' },
  nextBtnText: { color: '#000', fontSize: 16, fontWeight: '800' },
});
