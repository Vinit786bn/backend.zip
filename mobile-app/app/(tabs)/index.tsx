import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, SafeAreaView, RefreshControl, ActivityIndicator
} from 'react-native';
import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';

const API_BASE = 'http://10.0.2.2:3000';
const WS_URL = 'ws://10.0.2.2:3000';

const DEMO_LISTINGS = [
  { id: '1', ticker: 'CCTS-MH-001', project_name: 'Maharashtra Agroforestry Block', available_tons: 1200, price_per_ton: 850, vintage: '2024', verifier: 'VERRA', project_type: 'Agroforestry' },
  { id: '2', ticker: 'CCTS-GJ-007', project_name: 'Gujarat Solar Biomass Offset', available_tons: 890, price_per_ton: 1100, vintage: '2023', verifier: 'Gold Standard', project_type: 'Biomass' },
  { id: '3', ticker: 'CCTS-KA-003', project_name: 'Karnataka Soil Carbon Initiative', available_tons: 3400, price_per_ton: 650, vintage: '2024', verifier: 'CCTS', project_type: 'Soil Carbon' },
  { id: '4', ticker: 'CCTS-RJ-011', project_name: 'Rajasthan Reforestation Drive', available_tons: 560, price_per_ton: 920, vintage: '2023', verifier: 'VERRA', project_type: 'Reforestation' },
];

export default function MarketplaceTab() {
  const [listings, setListings] = useState(DEMO_LISTINGS);
  const [escrow, setEscrow] = useState(1250000);
  const [purchasedIds, setPurchasedIds] = useState<Record<string, 'buy' | 'retire' | null>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('ALL');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetchData();
    connectWS();
    return () => wsRef.current?.close();
  }, []);

  const connectWS = () => {
    try {
      const ws = new WebSocket(WS_URL);
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'TRADE_EXEC') {
            setListings(prev => prev.map(l =>
              l.id === msg.credit_id
                ? { ...l, available_tons: Math.max(0, l.available_tons - (msg.tons_deducted || 0)) }
                : l
            ));
          }
        } catch {}
      };
      wsRef.current = ws;
    } catch {}
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/credits/marketplace`, {
        headers: { Authorization: 'Bearer test-token' },
        timeout: 4000,
      });
      if (res.data?.credits?.length > 0) setListings(res.data.credits);
    } catch {
      // use demo data if backend unreachable
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const handleTrade = async (item: typeof DEMO_LISTINGS[0], action: 'buy' | 'retire') => {
    const tons = 100;
    const totalCost = tons * item.price_per_ton;

    if (escrow < totalCost) {
      return Alert.alert('Insufficient Escrow', `You need ₹${totalCost.toLocaleString()} but only have ₹${escrow.toLocaleString()} in The Vault.`);
    }

    const label = action === 'buy' ? 'Purchase' : 'Retire';
    Alert.alert(
      `Confirm ${label}`,
      `${label} 100 tons of ${item.ticker}\n\nTotal Cost: ₹${totalCost.toLocaleString()}\nPlatform Fee (5%): ₹${(totalCost * 0.05).toLocaleString()}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Confirm ${label}`,
          style: action === 'retire' ? 'destructive' : 'default',
          onPress: async () => {
            const hasHW = await LocalAuthentication.hasHardwareAsync();
            const enrolled = await LocalAuthentication.isEnrolledAsync();
            if (hasHW && enrolled) {
              const auth = await LocalAuthentication.authenticateAsync({
                promptMessage: `Authenticate to ${label}`,
              });
              if (!auth.success) return;
            }

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            setPurchasedIds(prev => ({ ...prev, [item.id]: action }));
            setEscrow(prev => prev - totalCost);

            try {
              await axios.post(`${API_BASE}/api/credits/purchase`, {
                credit_id: item.id, tons, action,
              }, { headers: { Authorization: 'Bearer test-token' }, timeout: 6000 });
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert('✅ Success', `Trade executed! Certificate generated.`);
            } catch {
              // optimistic UI — keep as purchased even if backend is offline
              Alert.alert('✅ Executed (Demo)', `${label} recorded locally.`);
            }
          }
        }
      ]
    );
  };

  const FILTERS = ['ALL', 'Agroforestry', 'Soil Carbon', 'Biomass', 'Reforestation'];
  const filtered = filter === 'ALL' ? listings : listings.filter(l => l.project_type === filter);

  const renderHeader = () => (
    <View>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🌍  Carbon Exchange</Text>
        <Text style={styles.headerSub}>Live Market · CCTS Regulated</Text>
      </View>

      {/* Vault Card */}
      <View style={styles.vaultCard}>
        <Text style={styles.vaultLabel}>💰  THE VAULT (ESCROW BALANCE)</Text>
        <Text style={styles.vaultValue}>₹{escrow.toLocaleString()}</Text>
        <Text style={styles.vaultSub}>Available for trading · Segregated Account</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{listings.length}</Text>
          <Text style={styles.statLabel}>Live Listings</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#00E5FF' }]}>
          <Text style={[styles.statValue, { color: '#00E5FF' }]}>{listings.reduce((a, l) => a + l.available_tons, 0).toLocaleString()}</Text>
          <Text style={styles.statLabel}>Total Tons</Text>
        </View>
        <View style={[styles.statBox, { borderColor: '#FFAB00' }]}>
          <Text style={[styles.statValue, { color: '#FFAB00' }]}>{Object.keys(purchasedIds).length}</Text>
          <Text style={styles.statLabel}>My Trades</Text>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => { setFilter(f); Haptics.selectionAsync(); }}>
            <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.sectionTitle}>LIVE EXCHANGE</Text>
    </View>
  );

  const renderItem = ({ item }: { item: typeof DEMO_LISTINGS[0] }) => {
    const state = purchasedIds[item.id];
    return (
      <View style={[styles.card, state && styles.cardDone]}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.ticker}>{item.ticker}</Text>
            <Text style={styles.desc}>{item.project_name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: item.verifier === 'VERRA' ? '#1a237e' : item.verifier === 'Gold Standard' ? '#4a2800' : '#002818' }]}>
            <Text style={styles.badgeText}>{item.verifier}</Text>
          </View>
        </View>

        <View style={styles.metricsRow}>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.available_tons.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Tons Avail.</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: '#00E676' }]}>₹{item.price_per_ton}</Text>
            <Text style={styles.metricLabel}>Per Ton</Text>
          </View>
          <View style={styles.metric}>
            <Text style={styles.metricValue}>{item.vintage}</Text>
            <Text style={styles.metricLabel}>Vintage</Text>
          </View>
          <View style={styles.metric}>
            <Text style={[styles.metricValue, { color: '#94a3b8', fontSize: 13 }]}>{item.project_type}</Text>
            <Text style={styles.metricLabel}>Type</Text>
          </View>
        </View>

        {state ? (
          <View style={styles.doneRow}>
            <Text style={styles.doneText}>✅  {state === 'buy' ? 'Purchased' : 'Retired'} · 100 Tons · Certificate Issued</Text>
          </View>
        ) : (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#1e3a5f' }]}
              onPress={() => handleTrade(item, 'buy')}>
              <Text style={[styles.actionBtnText, { color: '#00E5FF' }]}>🛒  BUY 100T</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#002818' }]}
              onPress={() => handleTrade(item, 'retire')}>
              <Text style={[styles.actionBtnText, { color: '#00E676' }]}>♻️  RETIRE 100T</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      {loading && listings.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#00E676" />
          <Text style={styles.loadingText}>Loading Market Data...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          ListHeaderComponent={renderHeader}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#00E676" />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },
  list: { padding: 16, paddingBottom: 80 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#64748b', marginTop: 12, fontSize: 14 },

  header: { marginBottom: 16 },
  headerTitle: { color: '#ffffff', fontSize: 24, fontWeight: '900' },
  headerSub: { color: '#64748b', fontSize: 13, marginTop: 2 },

  vaultCard: { backgroundColor: '#002818', padding: 20, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: '#00E676' },
  vaultLabel: { color: '#00E676', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  vaultValue: { color: '#ffffff', fontSize: 34, fontWeight: '900' },
  vaultSub: { color: '#4a7c59', fontSize: 12, marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#111827', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#00E676' },
  statValue: { color: '#00E676', fontSize: 22, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 11, marginTop: 2, fontWeight: '600' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  filterChip: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 16, backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155' },
  filterChipActive: { backgroundColor: '#002818', borderColor: '#00E676' },
  filterChipText: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  filterChipTextActive: { color: '#00E676', fontWeight: '700' },

  sectionTitle: { color: '#94a3b8', fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },

  card: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#1e293b' },
  cardDone: { borderColor: '#00E676', borderWidth: 1.5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
  ticker: { color: '#00E5FF', fontSize: 16, fontWeight: '900', fontFamily: 'monospace' },
  desc: { color: '#94a3b8', fontSize: 13, marginTop: 3, maxWidth: 200 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { color: '#94a3b8', fontSize: 11, fontWeight: '700' },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, backgroundColor: '#0f172a', borderRadius: 10, padding: 12 },
  metric: { alignItems: 'center' },
  metricValue: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  metricLabel: { color: '#475569', fontSize: 10, marginTop: 2, fontWeight: '600' },

  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 10, alignItems: 'center' },
  actionBtnText: { fontSize: 13, fontWeight: '800' },

  doneRow: { backgroundColor: '#002818', padding: 12, borderRadius: 10 },
  doneText: { color: '#00E676', fontSize: 13, fontWeight: '700', textAlign: 'center' },
});
