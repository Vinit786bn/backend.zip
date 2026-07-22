import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import SkeletonLoader from '../../components/SkeletonLoader';
import { router } from 'expo-router';
import { db, auth } from '../../firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import MapView, { Polygon } from 'react-native-maps';
import * as Haptics from 'expo-haptics';

type StatusType = 'pending' | 'review' | 'rejected' | 'registered';

interface Project {
  id: string;
  name: string;
  area: string;
  status: StatusType;
  coordinates: { lat: number; lng: number }[];
  carbonYield?: number;
}

const STATUS_CONFIG = {
  pending: { label: '⏳ AI Verification Under Process', color: '#FFAB00', bg: 'rgba(255,171,0,0.1)' },
  review: { label: '👁️ Admin Review', color: '#00E5FF', bg: 'rgba(0,229,255,0.1)' },
  rejected: { label: '🔴 Rejected - Action Required', color: '#FF3D00', bg: 'rgba(255,61,0,0.1)' },
  registered: { label: '🟢 Registered & Minting', color: '#00E676', bg: 'rgba(0,230,118,0.1)' },
};

export default function DashboardScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const email = auth.currentUser?.email || 'demo@carbonwallet.in';
    const q = query(collection(db, 'projects'), where('ownerEmail', '==', email));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const projs: Project[] = [];
      snapshot.forEach((doc) => {
        projs.push({ id: doc.id, ...doc.data() } as Project);
      });
      // Sort to show pending first, or by created date
      setProjects(projs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleCardPress = (item: Project) => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    if (item.status === 'registered') {
      router.push(/project/ + item.id);
    } else if (item.status === 'rejected') {
      // Implement bottom sheet for rejection reason in a full app
      alert('Rejection Reason: Document blurry. Please re-upload 7/12.');
    }
  };

  const renderItem = ({ item }: { item: Project }) => {
    const statusCfg = STATUS_CONFIG[item.status || 'pending'] || STATUS_CONFIG.pending;
    
    // Calculate center for MapView
    let center = { latitude: 18.5204, longitude: 73.8567 };
    if (item.coordinates && item.coordinates.length > 0) {
      center = {
        latitude: item.coordinates[0].lat,
        longitude: item.coordinates[0].lng,
      };
    }

    return (
      <TouchableOpacity 
        style={styles.card} 
        activeOpacity={0.8}
        onPress={() => handleCardPress(item)}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{item.name || 'Unnamed Project'}</Text>
          <Text style={styles.cardArea}>{item.area} Ha</Text>
        </View>

        {item.coordinates && item.coordinates.length > 0 && (
          <View pointerEvents="none" style={styles.mapContainer}>
            <MapView 
              style={styles.map}
              initialRegion={{
                ...center,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              pitchEnabled={false}
              rotateEnabled={false}
              zoomEnabled={false}
              scrollEnabled={false}
            >
              <Polygon 
                coordinates={item.coordinates.map(c => ({ latitude: c.lat, longitude: c.lng }))}
                fillColor="rgba(0, 230, 118, 0.3)"
                strokeColor="#00E676"
                strokeWidth={2}
              />
            </MapView>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg, borderColor: statusCfg.color }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
          </View>
          {item.status === 'registered' && (
            <Text style={styles.yieldText}>{item.carbonYield || Math.floor(parseFloat(item.area) * 3.2)} Tons/Yr</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#00E676" style={{ marginTop: 50 }} />
      ) : projects.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🌱</Text>
          <Text style={styles.emptyTitle}>No Land Parcels Yet</Text>
          <Text style={styles.emptySub}>Tap "Onboard" to register your first parcel.</Text>
        </View>
      ) : (
        <FlatList
          data={projects}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  listContent: {
    padding: 20,
    paddingBottom: 100, // account for tab bar
  },
  card: {
    backgroundColor: '#141920',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  cardArea: {
    fontSize: 14,
    color: '#00E676',
    fontWeight: '600',
  },
  mapContainer: {
    height: 120,
    width: '100%',
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  cardFooter: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#141920',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  yieldText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});

