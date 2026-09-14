import { StyleSheet, Text, View } from 'react-native';

export default function TodayScreen() {
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        Today
      </Text>
      <Text style={styles.body}>
        Your daily summary, shortcuts, and sync status will live here. This area arrives in a
        later milestone; start with Products.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 32, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28 },
});
