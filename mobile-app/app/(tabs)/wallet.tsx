import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView
} from 'react-native';
import * as Haptics from 'expo-haptics';

const PORTFOLIO = [
  { id: '1', ticker: 'CCTS-MH-001', tons: 100, status: 'active', cert: 'A3F9B2', value: 85000, date: '2024-07-15' },
  { id: '2', ticker: 'CCTS-GJ-007', tons: 100, status: 'retired', cert: 'C8D2E7', value: 110000, date: '2024-06-20' },
];

const TXN_HISTORY = [
  { id: 't1', type: 'BUY', ticker: 'CCTS-MH-001', tons: 100, amount: 85000, date: 'Jul 15, 2024' },
  { id: 't2', type: 'RETIRE', ticker: 'CCTS-GJ-007', tons: 100, amount: 110000, date: 'Jun 20, 2024' },
  { id: 't3', type: 'DEPOSIT', ticker: '—', tons: 0, amount: 500000, date: 'Jun 1, 2024' },
];

export default function WalletTab() {
  const [tab, setTab] = useState<'portfolio' | 'history'>('portfolio');

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Header */}
        <Text style={styles.title}>💳  My Wallet</Text>

        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>ESCROW BALANCE (THE VAULT)</Text>
          <Text style={styles.balanceValue}>₹12,50,000</Text>
          <View style={styles.balanceRow}>
            <View style={styles.balanceStat}>
              <Text style={styles.balanceStatVal}>₹1,95,000</Text>
              <Text style={styles.balanceStatLbl}>Deployed</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: '#FFAB00' }]}>200 T</Text>
              <Text style={styles.balanceStatLbl}>Total Credits</Text>
            </View>
            <View style={styles.balanceDivider} />
            <View style={styles.balanceStat}>
              <Text style={[styles.balanceStatVal, { color: '#00E5FF' }]}>2</Text>
              <Text style={styles.balanceStatLbl}>Certificates</Text>
            </View>
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'portfolio' && styles.tabBtnActive]}
            onPress={() => { setTab('portfolio'); Haptics.selectionAsync(); }}>
            <Text style={[styles.tabBtnText, tab === 'portfolio' && styles.tabBtnTextActive]}>Portfolio</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'history' && styles.tabBtnActive]}
            onPress={() => { setTab('history'); Haptics.selectionAsync(); }}>
            <Text style={[styles.tabBtnText, tab === 'history' && styles.tabBtnTextActive]}>Transactions</Text>
          </TouchableOpacity>
        </View>

        {tab === 'portfolio' ? (
          <>
            <Text style={styles.sectionLabel}>MY CARBON CREDITS</Text>
            {PORTFOLIO.map(item => (
              <View key={item.id} style={styles.portfolioCard}>
                <View style={styles.portfolioTop}>
                  <Text style={styles.pticker}>{item.ticker}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? '#002818' : '#1a237e' }]}>
                    <Text style={[styles.statusText, { color: item.status === 'active' ? '#00E676' : '#7986cb' }]}>
                      {item.status === 'active' ? '● ACTIVE' : '✓ RETIRED'}
                    </Text>
                  </View>
                </View>
                <View style={styles.portfolioStats}>
                  <View>
                    <Text style={styles.pstat}>{item.tons} Tons</Text>
                    <Text style={styles.pstatLabel}>Volume</Text>
                  </View>
                  <View>
                    <Text style={[styles.pstat, { color: '#00E676' }]}>₹{item.value.toLocaleString()}</Text>
                    <Text style={styles.pstatLabel}>Market Value</Text>
                  </View>
                  <View>
                    <Text style={styles.pstat}>{item.cert}</Text>
                    <Text style={styles.pstatLabel}>Cert. ID</Text>
                  </View>
                </View>
                <Text style={styles.pdate}>Issued: {item.date}</Text>
              </View>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionLabel}>TRANSACTION HISTORY</Text>
            {TXN_HISTORY.map(txn => (
              <View key={txn.id} style={styles.txnCard}>
                <View style={[styles.txnIcon, {
                  backgroundColor: txn.type === 'BUY' ? '#1e3a5f' : txn.type === 'RETIRE' ? '#002818' : '#4a2800'
                }]}>
                  <Text style={styles.txnIconText}>
                    {txn.type === 'BUY' ? '🛒' : txn.type === 'RETIRE' ? '♻️' : '💰'}
                  </Text>
                </View>
                <View style={styles.txnInfo}>
                  <Text style={styles.txnType}>{txn.type}</Text>
                  <Text style={styles.txnDesc}>{txn.ticker !== '—' ? `${txn.ticker} · ${txn.tons}T` : 'Escrow Deposit'}</Text>
                  <Text style={styles.txnDate}>{txn.date}</Text>
                </View>
                <Text style={[styles.txnAmount, { color: txn.type === 'DEPOSIT' ? '#00E676' : '#ffffff' }]}>
                  {txn.type === 'DEPOSIT' ? '+' : '-'}₹{txn.amount.toLocaleString()}
                </Text>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },
  content: { padding: 20, paddingBottom: 80 },
  title: { color: '#ffffff', fontSize: 24, fontWeight: '900', marginBottom: 20 },

  balanceCard: { backgroundColor: '#002818', borderRadius: 20, padding: 24, marginBottom: 20, borderWidth: 1, borderColor: '#00E676' },
  balanceLabel: { color: '#4a7c59', fontSize: 11, fontWeight: '800', letterSpacing: 1.5, marginBottom: 8 },
  balanceValue: { color: '#ffffff', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  balanceRow: { flexDirection: 'row', alignItems: 'center' },
  balanceStat: { flex: 1, alignItems: 'center' },
  balanceStatVal: { color: '#00E676', fontSize: 16, fontWeight: '800' },
  balanceStatLbl: { color: '#4a7c59', fontSize: 11, marginTop: 2 },
  balanceDivider: { width: 1, height: 32, backgroundColor: '#134d2f' },

  tabRow: { flexDirection: 'row', backgroundColor: '#111827', borderRadius: 12, padding: 4, marginBottom: 20 },
  tabBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabBtnActive: { backgroundColor: '#1e293b' },
  tabBtnText: { color: '#64748b', fontSize: 14, fontWeight: '600' },
  tabBtnTextActive: { color: '#00E676', fontWeight: '800' },

  sectionLabel: { color: '#475569', fontSize: 11, fontWeight: '800', letterSpacing: 2, marginBottom: 12, textTransform: 'uppercase' },

  portfolioCard: { backgroundColor: '#111827', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#1e293b' },
  portfolioTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  pticker: { color: '#00E5FF', fontSize: 15, fontWeight: '900', fontFamily: 'monospace' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '800' },
  portfolioStats: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#0f172a', borderRadius: 10, padding: 14, marginBottom: 10 },
  pstat: { color: '#ffffff', fontSize: 16, fontWeight: '800' },
  pstatLabel: { color: '#475569', fontSize: 11, marginTop: 2 },
  pdate: { color: '#475569', fontSize: 12 },

  txnCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#111827', borderRadius: 14, padding: 14, marginBottom: 10, gap: 14 },
  txnIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnIconText: { fontSize: 20 },
  txnInfo: { flex: 1 },
  txnType: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
  txnDesc: { color: '#64748b', fontSize: 12, marginTop: 2 },
  txnDate: { color: '#475569', fontSize: 11, marginTop: 2 },
  txnAmount: { fontSize: 15, fontWeight: '800' },
});
