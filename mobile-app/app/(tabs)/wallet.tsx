import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, TextInput } from 'react-native';
import { db, auth } from '../../firebase';
import { doc, onSnapshot, collection, query, where, orderBy, runTransaction, addDoc } from 'firebase/firestore';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

export default function WalletScreen() {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [method, setMethod] = useState<'bank' | 'upi'>('bank');
  
  const bottomSheetRef = useRef<BottomSheet>(null);

  useEffect(() => {
    const email = auth.currentUser?.email || 'demo@carbonwallet.in';
    
    // Listen to User Balance
    const userRef = doc(db, 'users', email);
    const unsubUser = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        setBalance(docSnap.data().walletBalance || 0);
      }
    });

    // Listen to Transactions
    const q = query(
      collection(db, 'transactions'),
      where('userEmail', '==', email)
    );
    const unsubTx = onSnapshot(q, (snap) => {
      const txs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort in memory since Firestore requires composite index for multiple fields
      txs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(txs);
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, []);

  const handleWithdrawPress = () => {
    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    bottomSheetRef.current?.expand();
  };

  const handleWithdrawMax = () => {
    try { Haptics.selectionAsync(); } catch (e) {}
    setWithdrawAmount(balance.toString());
  };

  const executeWithdrawal = async () => {
    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      alert('Enter a valid amount');
      return;
    }
    if (amount > balance) {
      alert('Insufficient funds');
      return;
    }

    try { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); } catch (e) {}
    bottomSheetRef.current?.close();
    setLoading(true);

    const email = auth.currentUser?.email || 'demo@carbonwallet.in';
    const userRef = doc(db, 'users', email);

    try {
      // 1. Atomic Transaction to update balance
      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');
        
        const currentBalance = userDoc.data().walletBalance || 0;
        if (currentBalance < amount) throw new Error('Insufficient funds');

        transaction.update(userRef, { walletBalance: currentBalance - amount });
      });

      // 2. Add pending payout transaction record
      await addDoc(collection(db, 'transactions'), {
        userEmail: email,
        type: 'withdrawal',
        amount: amount,
        method: method,
        status: 'pending',
        title: Withdrawal to ,
        createdAt: new Date().toISOString()
      });

      try { Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } catch (e) {}
      setWithdrawAmount('');
    } catch (e: any) {
      alert('Withdrawal failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const renderTx = ({ item }: { item: any }) => {
    const isOut = item.type === 'withdrawal';
    return (
      <View style={styles.txCard}>
        <View style={[styles.txIcon, isOut ? styles.txIconOut : styles.txIconIn]}>
          <Text style={{ fontSize: 16 }}>{isOut ? '🏦' : '🌿'}</Text>
        </View>
        <View style={styles.txInfo}>
          <Text style={styles.txTitle}>{item.title}</Text>
          <Text style={styles.txStatus}>{item.status?.toUpperCase()}</Text>
        </View>
        <Text style={[styles.txAmt, isOut ? styles.txAmtOut : styles.txAmtIn]}>
          {isOut ? '-' : '+'} ₹{item.amount.toLocaleString('en-IN')}
        </Text>
      </View>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <View style={styles.ledger}>
          <Text style={styles.ledgerLabel}>Total Balance</Text>
          <Text style={styles.balanceText}>₹ {balance.toLocaleString('en-IN')}</Text>
          <TouchableOpacity style={styles.withdrawBtn} onPress={handleWithdrawPress}>
            <Text style={styles.withdrawBtnText}>🏦 Withdraw to Bank / UPI</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.historySec}>
          <Text style={styles.historyTitle}>Financial History</Text>
          {loading && transactions.length === 0 ? (
            <ActivityIndicator color="#00E676" style={{ marginTop: 20 }} />
          ) : (
            <FlatList
              data={transactions}
              renderItem={renderTx}
              keyExtractor={i => i.id}
              contentContainerStyle={{ paddingBottom: 100 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No transactions yet.</Text>
              }
            />
          )}
        </View>

        <BottomSheet
          ref={bottomSheetRef}
          index={-1}
          snapPoints={['55%']}
          enablePanDownToClose
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />
          )}
        >
          <BottomSheetView style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>Withdraw Funds</Text>
            
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                keyboardType="numeric"
                value={withdrawAmount}
                onChangeText={setWithdrawAmount}
                placeholder="0"
                placeholderTextColor="#475569"
              />
              <TouchableOpacity style={styles.maxBtn} onPress={handleWithdrawMax}>
                <Text style={styles.maxBtnText}>MAX</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Transfer Method</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity 
                style={[styles.methodBtn, method === 'bank' && styles.methodActive]}
                onPress={() => { setMethod('bank'); try { Haptics.selectionAsync(); } catch (e) {} }}
              >
                <Text style={[styles.methodText, method === 'bank' && styles.methodTextActive]}>🏦 Bank Account</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.methodBtn, method === 'upi' && styles.methodActive]}
                onPress={() => { setMethod('upi'); try { Haptics.selectionAsync(); } catch (e) {} }}
              >
                <Text style={[styles.methodText, method === 'upi' && styles.methodTextActive]}>📱 UPI</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.confirmBtn} onPress={executeWithdrawal}>
              <Text style={styles.confirmBtnText}>Confirm Transfer</Text>
            </TouchableOpacity>
          </BottomSheetView>
        </BottomSheet>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  ledger: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  ledgerLabel: {
    fontSize: 14,
    color: '#94A3B8',
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  balanceText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFF',
    marginVertical: 10,
    letterSpacing: -1,
  },
  withdrawBtn: {
    backgroundColor: '#00E676',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 16,
    marginTop: 10,
    shadowColor: '#00E676',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  withdrawBtnText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '800',
  },
  historySec: {
    flex: 1,
    padding: 20,
  },
  historyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 16,
  },
  txCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#141920',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.02)',
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  txIconIn: { backgroundColor: 'rgba(0,230,118,0.1)' },
  txIconOut: { backgroundColor: 'rgba(255,61,0,0.1)' },
  txInfo: { flex: 1 },
  txTitle: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  txStatus: { color: '#94A3B8', fontSize: 11, marginTop: 4, fontWeight: '600' },
  txAmt: { fontSize: 16, fontWeight: '800' },
  txAmtIn: { color: '#00E676' },
  txAmtOut: { color: '#FFF' },
  emptyText: { color: '#94A3B8', textAlign: 'center', marginTop: 20 },
  sheetBg: { backgroundColor: '#141920' },
  sheetHandle: { backgroundColor: '#475569' },
  sheetContent: { padding: 24, flex: 1 },
  sheetTitle: { fontSize: 20, fontWeight: '800', color: '#FFF', marginBottom: 24 },
  inputLabel: { color: '#94A3B8', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
  input: { flex: 1, backgroundColor: '#0A0E17', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, color: '#FFF', fontSize: 24, padding: 16, fontWeight: '700' },
  maxBtn: { backgroundColor: 'rgba(0,230,118,0.1)', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(0,230,118,0.3)' },
  maxBtnText: { color: '#00E676', fontWeight: '800' },
  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  methodBtn: { flex: 1, padding: 16, backgroundColor: '#0A0E17', borderWidth: 1, borderColor: '#1e293b', borderRadius: 12, alignItems: 'center' },
  methodActive: { borderColor: '#00E676', backgroundColor: 'rgba(0,230,118,0.05)' },
  methodText: { color: '#94A3B8', fontWeight: '700' },
  methodTextActive: { color: '#00E676' },
  confirmBtn: { backgroundColor: '#00E5FF', padding: 18, borderRadius: 16, alignItems: 'center' },
  confirmBtnText: { color: '#000', fontSize: 16, fontWeight: '800' }
});
