import { StyleSheet, Text, View } from 'react-native';

export default function SellScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Sell
      </Text>
      <Text style={styles.body}>
        The fastest route into a sale will live here. Sales arrive in milestone M3; build your
        catalogue under Products first.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 32, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28 },
});
