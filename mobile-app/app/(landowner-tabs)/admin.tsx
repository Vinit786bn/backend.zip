import React, { useRef, useMemo, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Polygon } from 'react-native-maps';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import axios from 'axios';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const API_BASE = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000';

export default function AdminPortal() {
  const bottomSheetRef = useRef(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);
  const [pendingQueue, setPendingQueue] = useState([]);

  useEffect(() => {
    // Listen for WebSocket ingestion events
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'NEW_LAND_INGESTED') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setPendingQueue(prev => [msg.payload, ...prev]);
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, []);

  const currentProject = pendingQueue[0];

  const handleDecision = (status) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    if (!currentProject) return;
    
    // Simulate backend decision
    setPendingQueue(prev => prev.slice(1));
    Alert.alert('Success', Project !);
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <View style={styles.mapContainer}>
        {currentProject ? (
          <MapView
            style={StyleSheet.absoluteFillObject}
            mapType="satellite"
            initialRegion={{
              latitude: currentProject.lat,
              longitude: currentProject.lng,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            }}
          >
            {currentProject.polygon && currentProject.polygon.length > 0 && (
              <Polygon
                coordinates={currentProject.polygon}
                strokeColor="#FFAB00"
                fillColor="rgba(255, 171, 0, 0.3)"
                strokeWidth={3}
              />
            )}
          </MapView>
        ) : (
          <View style={styles.emptyMap}>
            <Text style={styles.emptyText}>QUEUE EMPTY</Text>
          </View>
        )}
      </View>

      <BottomSheet
        ref={bottomSheetRef}
        index={0}
        snapPoints={snapPoints}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetIndicator}
      >
        <BottomSheetScrollView contentContainerStyle={styles.sheetContent}>
          {currentProject ? (
            <>
              <Text style={styles.projectTitle}>{currentProject.name}</Text>
              <View style={styles.tagRow}>
                <Text style={styles.tag}>{currentProject.type}</Text>
                <Text style={styles.tag}>{currentProject.state}</Text>
              </View>

              <Text style={styles.sectionHeader}>AI OCR DATA (7/12 REGISTRY)</Text>
              <View style={styles.ocrBox}>
                <Text style={styles.ocrText}>✓ Owner Verified: MATCH</Text>
                <Text style={styles.ocrText}>✓ Land Area: 4.2 Hectares</Text>
                <Text style={styles.ocrText}>✓ GPS Coords: MATCH</Text>
                <Text style={styles.ocrText}>! Discrepancy: None</Text>
              </View>

              <Text style={styles.sectionHeader}>GEOSPATIAL ANALYSIS</Text>
              <View style={styles.ocrBox}>
                <Text style={styles.ocrText}>Boundary intersects with protected forest: NO</Text>
                <Text style={styles.ocrText}>Historical Deforestation (2010-2023): 0%</Text>
              </View>
            </>
          ) : (
            <Text style={styles.emptySubText}>Waiting for FPO Submissions...</Text>
          )}
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer}>
        <TouchableOpacity 
          style={[styles.fab, styles.fabReject, !currentProject && styles.fabDisabled]}
          onPress={() => handleDecision('rejected')}
          disabled={!currentProject}
        >
          <Text style={styles.fabText}>REJECT</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.fab, styles.fabApprove, !currentProject && styles.fabDisabled]}
          onPress={() => handleDecision('approved')}
          disabled={!currentProject}
        >
          <Text style={styles.fabText}>APPROVE</Text>
        </TouchableOpacity>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0E17' },
  mapContainer: { flex: 1 },
  emptyMap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#111827' },
  emptyText: { color: '#475569', fontSize: 24, fontWeight: '900', letterSpacing: 4 },
  emptySubText: { color: '#94a3b8', fontSize: 16, textAlign: 'center', marginTop: 40 },
  sheetBackground: { backgroundColor: '#1e293b' },
  sheetIndicator: { backgroundColor: '#475569', width: 60 },
  sheetContent: { padding: 24, paddingBottom: 150 },
  projectTitle: { color: '#ffffff', fontSize: 28, fontWeight: '900', marginBottom: 12 },
  tagRow: { flexDirection: 'row', marginBottom: 24 },
  tag: { backgroundColor: '#334155', color: '#00E5FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, fontSize: 12, fontWeight: '800', marginRight: 10, overflow: 'hidden' },
  sectionHeader: { color: '#94a3b8', fontSize: 14, fontWeight: '800', marginBottom: 12, letterSpacing: 1 },
  ocrBox: { backgroundColor: '#0f172a', padding: 16, borderRadius: 8, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  ocrText: { color: '#00E676', fontFamily: 'monospace', fontSize: 14, marginBottom: 8 },
  fabContainer: { position: 'absolute', bottom: 100, left: 20, right: 20, flexDirection: 'row', justifyContent: 'space-between' },
  fab: { flex: 1, paddingVertical: 18, borderRadius: 12, alignItems: 'center', shadowOpacity: 0.3, shadowRadius: 10 },
  fabReject: { backgroundColor: '#FF3D00', marginRight: 10, shadowColor: '#FF3D00' },
  fabApprove: { backgroundColor: '#00E676', marginLeft: 10, shadowColor: '#00E676' },
  fabDisabled: { backgroundColor: '#334155', shadowOpacity: 0 },
  fabText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
