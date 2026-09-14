import { StyleSheet, Text, View } from 'react-native';

export default function MoreScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        More
      </Text>
      <Text style={styles.body}>
        Restocking, inventory, expenses, history, staff, and settings will live here. Each area
        arrives with its milestone.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 32, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28 },
});
