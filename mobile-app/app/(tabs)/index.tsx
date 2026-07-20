import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SafeAreaView } from 'react-native';
import axios from 'axios';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import { LineChart, PieChart } from 'react-native-gifted-charts';

const API_BASE = 'http://localhost:3000'; 
const WS_URL = 'ws://localhost:3000';

export default function IndustryPortal() {
  const [escrow, setEscrow] = useState(1250000);
  const [listings, setListings] = useState([]);
  const [purchasedIds, setPurchasedIds] = useState({});

  useEffect(() => {
    fetchData();
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'TRADE_EXEC') {
          // Instantly sync the FlatList < 200ms
          setListings(prev => prev.map(l => 
            l.id === msg.credit_id ? { ...l, available_tons: l.available_tons - msg.tons_deducted } : l
          ));
        }
      } catch (err) {}
    };
    return () => ws.close();
  }, []);

  const fetchData = async () => {
    try {
      const headers = { Authorization: 'Bearer test-token' };
      const res = await axios.get(${API_BASE}/api/credits/marketplace, { headers });
      setListings(res.data.credits);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTrade = async (item) => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      
      if (hasHardware && isEnrolled) {
        const auth = await LocalAuthentication.authenticateAsync({
          promptMessage: Execute ₹ Corporate Trade,
        });
        if (!auth.success) return;
      }
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      setPurchasedIds(prev => ({...prev, [item.id]: true}));
      setEscrow(prev => prev - (item.price_per_ton * 100));

      const res = await axios.post(${API_BASE}/api/credits/purchase, {
        credit_id: item.id,
        tons: 100,
        action: 'buy'
      }, { headers: { Authorization: 'Bearer test-token' }});

      if(!res.data.success) throw new Error("API Failed");
      
    } catch (e) {
      Alert.alert('Transaction Failed', e.response?.data?.error || e.message);
      setPurchasedIds(prev => ({...prev, [item.id]: false}));
      setEscrow(prev => prev + (item.price_per_ton * 100));
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <Text style={styles.title}>EXECUTIVE FEED</Text>
      
      <View style={styles.vaultCard}>
        <Text style={styles.vaultLabel}>THE VAULT (ESCROW)</Text>
        <Text style={styles.vaultValue}>₹{escrow.toLocaleString()}</Text>
      </View>

      <Text style={styles.chartTitle}>Emissions vs Offsets</Text>
      <View style={styles.chartWrapper}>
        <LineChart 
          data={[{value: 15500}, {value: 14100}, {value: 9800}]}
          color="#FF3D00"
          data2={[{value: 0}, {value: 700}, {value: 6500}]}
          color2="#00E676"
          hideDataPoints
          thickness={3}
          rulesColor="#1e293b"
          yAxisTextStyle={{color: '#94a3b8'}}
          xAxisLabelTextStyle={{color: '#94a3b8'}}
          height={160}
          width={300}
        />
      </View>

      <Text style={styles.chartTitle}>Asset Allocation</Text>
      <View style={styles.chartWrapper}>
        <PieChart 
          data={[
            {value: 40, color: '#2962ff'}, 
            {value: 45, color: '#00E676'}, 
            {value: 15, color: '#FFAB00'}
          ]}
          donut
          innerRadius={50}
          radius={80}
        />
      </View>
      <Text style={styles.sectionTitle}>LIVE EXCHANGE</Text>
    </View>
  );

  const renderItem = ({ item }) => {
    const isPurchased = purchasedIds[item.id];
    return (
      <View style={styles.card}>
        <Text style={styles.ticker}>{item.ticker}</Text>
        <Text style={styles.desc}>{item.project_name || 'Carbon Offset'}</Text>
        <View style={styles.row}>
          <Text style={styles.metric}>Vol: {item.available_tons}T</Text>
          <Text style={styles.metric}>Price: ₹{item.price_per_ton}</Text>
        </View>
        <TouchableOpacity 
          style={[styles.btn, isPurchased && styles.btnDisabled]} 
          onPress={() => !isPurchased && handleTrade(item)}
          disabled={isPurchased}
        >
          <Text style={styles.btnText}>{isPurchased ? '✓ PURCHASED' : 'TRADE'}</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <FlatList 
        data={listings}
        keyExtractor={item => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },
  list: { padding: 16, paddingBottom: 100 },
  headerContainer: { marginBottom: 24 },
  title: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: 2, marginBottom: 16 },
  vaultCard: { backgroundColor: '#1e293b', padding: 24, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: '#334155' },
  vaultLabel: { color: '#00E676', fontSize: 12, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  vaultValue: { color: '#ffffff', fontSize: 36, fontWeight: '900' },
  chartTitle: { color: '#94a3b8', fontSize: 14, fontWeight: '700', marginBottom: 12, textTransform: 'uppercase' },
  chartWrapper: { backgroundColor: '#111827', padding: 16, borderRadius: 12, marginBottom: 24, alignItems: 'center' },
  sectionTitle: { color: '#ffffff', fontSize: 20, fontWeight: '800', letterSpacing: 1, marginTop: 12, marginBottom: 16 },
  card: { backgroundColor: '#1e293b', padding: 16, borderRadius: 12, marginBottom: 16 },
  ticker: { color: '#00E5FF', fontSize: 18, fontWeight: '800', fontFamily: 'monospace' },
  desc: { color: '#94a3b8', fontSize: 14, marginTop: 4, marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  metric: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  btn: { backgroundColor: '#00E676', paddingVertical: 14, borderRadius: 8, alignItems: 'center' },
  btnDisabled: { backgroundColor: '#334155' },
  btnText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1 }
});
