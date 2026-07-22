import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { getAuth, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { useStore } from '../../store';
import * as Haptics from 'expo-haptics';

GoogleSignin.configure({
  webClientId: '901953259613-nfn8th4ugl44teucnma1sn4hec2st508.apps.googleusercontent.com',
});

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const setAuth = useStore((state) => state.setAuth);

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;
      
      if (!idToken) throw new Error("No ID token found");
      
      const credential = GoogleAuthProvider.credential(idToken);
      const auth = getAuth();
      const result = await signInWithCredential(auth, credential);
      
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      
      // Update global store
      setAuth(true, {
        name: result.user.displayName || '',
        email: result.user.email || '',
        uid: result.user.uid,
      }, null); // null role forces router to role-select

    } catch (error: any) {
      console.error(error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setLoading(false); // Reset state only on error
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CarbonWallet</Text>
      <Text style={styles.subtitle}>Institutional Grade Land Management</Text>
      
      <TouchableOpacity 
        style={[styles.button, loading && styles.buttonDisabled]} 
        onPress={handleGoogleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#0f172a" />
        ) : (
          <Text style={styles.buttonText}>Continue with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0e17',
    justifyContent: 'center',
    alignItems: 'center',
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
  button: {
    backgroundColor: '#00E676',
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '700',
  },
});
