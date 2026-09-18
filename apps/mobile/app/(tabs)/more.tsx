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
      <Pressable accessibilityRole="button" onPress={() => router.push('/batch-review')} style={styles.action}>
        <Text style={styles.actionTitle}>Review expiry stock</Text>
        <Text style={styles.actionBody}>Classify unknown stock by the dates you can verify</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/adjustment')} style={styles.action}>
        <Text style={styles.actionTitle}>Record adjustment</Text>
        <Text style={styles.actionBody}>Remove expired, damaged, or missing stock with a reason</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/reconciliation')} style={styles.action}>
        <Text style={styles.actionTitle}>Check stock</Text>
        <Text style={styles.actionBody}>Count stock without seeing the recorded quantity first</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/guided-checks')} style={styles.action}>
        <Text style={styles.actionTitle}>Guided stock checks</Text>
        <Text style={styles.actionBody}>Set a calm owner routine and work through due shelf counts</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/attention')} style={styles.action}>
        <Text style={styles.actionTitle}>Needs attention</Text>
        <Text style={styles.actionBody}>Review real low stock, differences, and remaining expiry groups</Text>
      </Pressable>
      <Text style={styles.comingSoon}>Staff dispatch and supervisor review are intentionally deferred.</Text>
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
