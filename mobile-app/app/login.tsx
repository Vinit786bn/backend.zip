import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, Alert, Image, ActivityIndicator, KeyboardAvoidingView, Platform
} from 'react-native';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Haptics from 'expo-haptics';
import axios from 'axios';

const API_BASE = 'http://10.0.2.2:3000';

export default function LoginScreen() {
  const [email, setEmail] = useState('industry@carbonwallet.in');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    checkBiometric();
  }, []);

  const checkBiometric = async () => {
    const has = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    setBiometricAvailable(has && enrolled);
  };

  const handleBiometricLogin = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Verify your identity',
      fallbackLabel: 'Use Password',
    });
    if (result.success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)');
    }
  };

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Please enter email and password');
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/auth/login`, { email, password }, { timeout: 5000 });
      if (res.data.token) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace('/(tabs)');
      }
    } catch {
      // For demo: skip auth if backend unreachable and use demo login
      Alert.alert('', 'Connecting to demo mode...', [], { cancelable: false });
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 800);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.appName}>CarbonWallet</Text>
          <Text style={styles.tagline}>Institutional Carbon Credit Exchange</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <Text style={styles.formTitle}>Welcome Back</Text>
          <Text style={styles.formSubtitle}>Sign in to your account</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor="#4a5568"
            placeholder="your@email.com"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#4a5568"
            placeholder="••••••••"
          />

          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnLoading]}
            onPress={handleLogin}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#0A0E17" />
            ) : (
              <Text style={styles.loginBtnText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {biometricAvailable && (
            <TouchableOpacity style={styles.biometricBtn} onPress={handleBiometricLogin}>
              <Text style={styles.biometricBtnText}>🔑  Use Fingerprint / Face ID</Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity style={styles.demoBtn} onPress={handleDemoLogin}>
            <Text style={styles.demoBtnText}>⚡  Continue as Demo User</Text>
          </TouchableOpacity>
        </View>

        {/* Roles */}
        <View style={styles.rolesRow}>
          {['Industry', 'Landowner', 'Verifier'].map(role => (
            <View key={role} style={styles.roleChip}>
              <Text style={styles.roleChipText}>{role}</Text>
            </View>
          ))}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0A0E17' },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#002818', borderWidth: 2, borderColor: '#00E676', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  logoEmoji: { fontSize: 36 },
  appName: { color: '#ffffff', fontSize: 28, fontWeight: '900', letterSpacing: 1 },
  tagline: { color: '#64748b', fontSize: 13, marginTop: 4, textAlign: 'center' },
  form: { backgroundColor: '#111827', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: '#1e293b' },
  formTitle: { color: '#ffffff', fontSize: 22, fontWeight: '800', marginBottom: 4 },
  formSubtitle: { color: '#64748b', fontSize: 14, marginBottom: 20 },
  label: { color: '#94a3b8', fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { backgroundColor: '#1e293b', color: '#ffffff', padding: 14, borderRadius: 10, fontSize: 15, marginBottom: 16, borderWidth: 1, borderColor: '#334155' },
  loginBtn: { backgroundColor: '#00E676', paddingVertical: 16, borderRadius: 12, alignItems: 'center', marginTop: 4, shadowColor: '#00E676', shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  loginBtnLoading: { backgroundColor: '#00b85a' },
  loginBtnText: { color: '#0A0E17', fontSize: 16, fontWeight: '900', letterSpacing: 1 },
  biometricBtn: { backgroundColor: '#1e293b', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12, borderWidth: 1, borderColor: '#334155' },
  biometricBtnText: { color: '#94a3b8', fontSize: 15, fontWeight: '700' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#1e293b' },
  dividerText: { color: '#475569', paddingHorizontal: 12, fontSize: 13 },
  demoBtn: { backgroundColor: '#0f172a', paddingVertical: 14, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#334155' },
  demoBtnText: { color: '#00E5FF', fontSize: 15, fontWeight: '700' },
  rolesRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, marginTop: 24 },
  roleChip: { backgroundColor: '#111827', paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: '#1e293b' },
  roleChipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
});
