import { View, Text, StyleSheet } from 'react-native';
export default function ExchangeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Carbon Exchange</Text>
      <Text style={styles.subtitle}>Purchase credits to offset emissions</Text>
    </View>
  );
}
const styles = StyleSheet.create({ container: { flex: 1, backgroundColor: '#0a0e17', justifyContent: 'center', alignItems: 'center' }, title: { color: '#fff', fontSize: 24, fontWeight: 'bold' }, subtitle: { color: '#94a3b8', marginTop: 10 } });
