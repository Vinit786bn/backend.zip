import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  SafeAreaView, ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { auth } from '../firebase';
import { GoogleAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth';

let GoogleSignin: any = null;
try {
  const GS = require('@react-native-google-signin/google-signin');
  GoogleSignin = GS.GoogleSignin;
  if (GoogleSignin && typeof GoogleSignin.configure === 'function') {
    GoogleSignin.configure({
      webClientId: 'YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com',
    });
  }
} catch (e) {
  console.log('[Auth] Native GoogleSignin module optional fallback for Expo Go.');
}

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleLogin = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (e) {}
    
    setLoading(true);
    setErrorMsg('');
    
    try {
      if (GoogleSignin && typeof GoogleSignin.hasPlayServices === 'function') {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const signInResult = await GoogleSignin.signIn();
        const idToken = signInResult.data?.idToken || signInResult.idToken;
        if (!idToken) throw new Error('Failed to retrieve Google idToken');
        
        const credential = GoogleAuthProvider.credential(idToken);
        await signInWithCredential(auth, credential);
      } else {
        await signInAnonymously(auth).catch(() => {});
      }
      
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error('Google Sign-In error:', err);
      router.replace('/(tabs)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Text style={styles.badgeText}>CARBON ASSET VAULT</Text>
          <Text style={styles.title}>Landowner Portal</Text>
          <Text style={styles.subtitle}>Digital Financial Identity & Asset Banking for Farmers</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardHeader}>Welcome Back</Text>
          <Text style={styles.cardBody}>
            Sign in with your Google account to access your land verification records, wallet balance, and carbon yield certificate vault.
          </Text>

          {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

          <TouchableOpacity 
            style={styles.googleBtn} 
            onPress={handleGoogleLogin} 
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#0A0E17" />
            ) : (
              <>
                <Text style={styles.googleIcon}>G</Text>
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>🔒 256-bit Encrypted Firestore & Sovereign Land Records</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E17',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  card: {
    width: '100%',
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
    elevation: 8,
  },
  cardHeader: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  cardBody: {
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
    marginBottom: 24,
  },
  googleBtn: {
    backgroundColor: '#10B981',
    flexDirection: 'row',
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  googleIcon: {
    color: '#0A0E17',
    fontSize: 20,
    fontWeight: '900',
  },
  googleBtnText: {
    color: '#0A0E17',
    fontSize: 16,
    fontWeight: '700',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  footerText: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 32,
    textAlign: 'center',
  },
});
