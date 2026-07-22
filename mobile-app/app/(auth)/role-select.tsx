import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useStore, UserRole } from '../../store';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import * as Haptics from 'expo-haptics';

export default function RoleSelectScreen() {
  const [loadingRole, setLoadingRole] = useState<UserRole>(null);
  const { userProfile, setUserRole } = useStore();

  const handleRoleSelect = async (role: UserRole) => {
    if (loadingRole) return;
    setLoadingRole(role);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("Not logged in");

      const db = getFirestore();
      await setDoc(doc(db, 'users', user.uid), {
        role: role,
        email: user.email,
        name: userProfile?.name || user.displayName || 'Unknown',
        kycStatus: 'pending',
        balance: 0,
        createdAt: new Date().toISOString()
      }, { merge: true });

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setUserRole(role);
    } catch (error) {
      console.error(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoadingRole(null);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome!</Text>
      <Text style={styles.subtitle}>How will you use CarbonWallet?</Text>
      
      <TouchableOpacity 
        style={[styles.card, loadingRole && styles.cardDisabled]} 
        onPress={() => handleRoleSelect('landowner')}
        disabled={!!loadingRole}
      >
        <Text style={styles.cardTitle}>I'm a Landowner</Text>
        <Text style={styles.cardDesc}>Register farms, generate credits, and manage wallet.</Text>
        {loadingRole === 'landowner' && <ActivityIndicator color="#00E676" style={styles.loader} />}
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.card, loadingRole && styles.cardDisabled]} 
        onPress={() => handleRoleSelect('company')}
        disabled={!!loadingRole}
      >
        <Text style={styles.cardTitle}>I'm a Company</Text>
        <Text style={styles.cardDesc}>Purchase carbon credits to offset emissions.</Text>
        {loadingRole === 'company' && <ActivityIndicator color="#00E676" style={styles.loader} />}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f8fafc',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginBottom: 40,
  },
  card: {
    backgroundColor: '#1e293b',
    padding: 25,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    position: 'relative',
  },
  cardDisabled: {
    opacity: 0.5,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 5,
  },
  cardDesc: {
    fontSize: 14,
    color: '#94a3b8',
  },
  loader: {
    position: 'absolute',
    right: 20,
    top: 30,
  }
});
