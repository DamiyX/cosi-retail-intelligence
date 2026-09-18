import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export default function MoreScreen() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        More
      </Text>
      <Text style={styles.body}>Keep purchases and receipts available on this device, even without internet.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/restock')} style={styles.action}>
        <Text style={styles.actionTitle}>Restock</Text>
        <Text style={styles.actionBody}>Record a purchase and increase stock</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/purchase-history')} style={styles.action}>
        <Text style={styles.actionTitle}>Purchase history</Text>
        <Text style={styles.actionBody}>Reopen saved receipts and original prices</Text>
      </Pressable>
      <Text style={styles.comingSoon}>Inventory reconciliation, expenses, staff, and settings will appear as their milestones are delivered.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 32, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 18, lineHeight: 28 },
  action: { backgroundColor: '#FFFFFF', borderColor: '#7F8E88', borderWidth: 1, borderRadius: 12, minHeight: 64, padding: 16, justifyContent: 'center', gap: 4 },
  actionTitle: { color: '#17251F', fontSize: 17, fontWeight: '600' },
  actionBody: { color: '#41534C', fontSize: 14 },
  comingSoon: { color: '#41534C', fontSize: 14, lineHeight: 22 },
});
