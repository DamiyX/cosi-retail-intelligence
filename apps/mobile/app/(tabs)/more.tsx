import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

export default function MoreScreen() {
  const router = useRouter();
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={styles.title}>
        More
      </Text>
      <Text style={styles.body}>Keep purchases and receipts available on this device, even without internet.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.navigate('/sell')} style={styles.action}>
        <Text style={styles.actionTitle}>Sell manually</Text>
        <Text style={styles.actionBody}>Search products or open sale history</Text>
      </Pressable>
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
      <Pressable accessibilityRole="button" onPress={() => router.push('/expense')} style={styles.action}>
        <Text style={styles.actionTitle}>Record expense</Text>
        <Text style={styles.actionBody}>Save a store cost in the store currency</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/expenses')} style={styles.action}>
        <Text style={styles.actionTitle}>Expense history</Text>
        <Text style={styles.actionBody}>Review owner-recorded costs saved on this device</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/withdrawal')} style={styles.action}>
        <Text style={styles.actionTitle}>Record owner withdrawal</Text>
        <Text style={styles.actionBody}>Keep owner or personal money separate from expenses</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/withdrawals')} style={styles.action}>
        <Text style={styles.actionTitle}>Withdrawal history</Text>
        <Text style={styles.actionBody}>Review owner withdrawals saved on this device</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/summary')} style={styles.action}>
        <Text style={styles.actionTitle}>Today’s summary</Text>
        <Text style={styles.actionBody}>See sales, costs, coverage, and owner withdrawals for the store-local day</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/sync')} style={styles.action}>
        <Text style={styles.actionTitle}>Cloud sync</Text>
        <Text style={styles.actionBody}>Sign in, check pending work and retry when online</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/market-prices')} style={styles.action}>
        <Text style={styles.actionTitle}>Market prices</Text>
        <Text style={styles.actionBody}>Review contribution and experimental market availability</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/staff-activity')} style={styles.action}>
        <Text style={styles.actionTitle}>Staff and activity</Text>
        <Text style={styles.actionBody}>Owner review of saved people, devices and recorded actions</Text>
      </Pressable>
      <Text style={styles.comingSoon}>Staff sign-in and different-staff assignments remain unavailable.</Text>
    </ScrollView>
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
