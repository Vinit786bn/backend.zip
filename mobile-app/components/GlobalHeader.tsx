import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { auth, db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function GlobalHeader() {
  const [kycStatus, setKycStatus] = useState('pending');
  const [userName, setUserName] = useState('Landowner');
  const [subtitle, setSubtitle] = useState('Carbon Wallet User');
  
  useEffect(() => {
    // We will listen to the users document for KYC status
    // In a real app we'd wait for auth.currentUser to be ready
    // For now we'll mock the email or use a hardcoded one for testing if not logged in
    const email = auth.currentUser?.email || 'demo@carbonwallet.in';
    
    if (!email) return;
    
    const userRef = doc(db, 'users', email);
    const unsubscribe = onSnapshot(userRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.kycStatus) setKycStatus(data.kycStatus);
        if (data.name) setUserName(data.name);
        if (data.subtitle) setSubtitle(data.subtitle);
      }
    });
    
    return () => unsubscribe();
  }, []);

  const isVerified = kycStatus === 'verified';

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.leftSide}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{userName.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={styles.name}>{userName}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </View>
        </View>
        
        <View style={[styles.kycBadge, isVerified ? styles.badgeVerified : styles.badgePending]}>
          <Text style={[styles.kycText, isVerified ? styles.textVerified : styles.textPending]}>
            {isVerified ? '✓ Verified FPO' : '! KYC Pending'}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#0A0E17',
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,230,118,0.1)',
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#00E676',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  kycBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgePending: {
    backgroundColor: 'rgba(255,171,0,0.1)',
    borderColor: '#FFAB00',
  },
  badgeVerified: {
    backgroundColor: 'rgba(0,230,118,0.1)',
    borderColor: '#00E676',
  },
  kycText: {
    fontSize: 12,
    fontWeight: '700',
  },
  textPending: {
    color: '#FFAB00',
  },
  textVerified: {
    color: '#00E676',
  },
});
