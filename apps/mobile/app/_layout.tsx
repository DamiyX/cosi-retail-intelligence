import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '../src/db/DatabaseContext';
import { initializeAppDatabase, type DatabaseInitStatus } from '../src/db/initialize';
import { PilotSyncScheduler } from '../src/sync/PilotSyncScheduler';

export default function RootLayout() {
  const [databaseStatus] = useState<DatabaseInitStatus>(() => initializeAppDatabase());

  return (
    <>
      <StatusBar style="dark" />
      {databaseStatus.state === 'failed' ? (
        <View style={styles.center}>
          <Text style={styles.title}>Local database unavailable</Text>
          <Text style={styles.body}>
            The app cannot open its on-device data yet. Close and reopen the app; your data stays
            on this device.
          </Text>
          <Text style={styles.code}>
            {databaseStatus.code}: {databaseStatus.message}
          </Text>
        </View>
      ) : (
        <DatabaseProvider adapter={databaseStatus.adapter}>
          <PilotSyncScheduler />
          <Stack screenOptions={{ headerTintColor: '#174F46', contentStyle: { backgroundColor: '#F7F8F5' } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="sell" options={{ title: 'Sell' }} />
            <Stack.Screen name="restock" options={{ title: 'Restock' }} />
            <Stack.Screen name="purchase-history" options={{ title: 'Purchase history' }} />
            <Stack.Screen name="purchases/[id]" options={{ title: 'Restock receipt' }} />
            <Stack.Screen name="batch-review" options={{ title: 'Review expiry stock' }} />
            <Stack.Screen name="adjustment" options={{ title: 'Record adjustment' }} />
            <Stack.Screen name="reconciliation" options={{ title: 'Check stock' }} />
            <Stack.Screen name="guided-checks" options={{ title: 'Guided stock checks' }} />
            <Stack.Screen name="attention" options={{ title: 'Needs attention' }} />
            <Stack.Screen name="expense" options={{ title: 'Record expense' }} />
            <Stack.Screen name="expenses" options={{ title: 'Expense history' }} />
            <Stack.Screen name="withdrawal" options={{ title: 'Record owner withdrawal' }} />
            <Stack.Screen name="withdrawals" options={{ title: 'Withdrawal history' }} />
            <Stack.Screen name="summary" options={{ title: 'Today’s summary' }} />
            <Stack.Screen name="sync" options={{ title: 'Cloud sync' }} />
          </Stack>
        </DatabaseProvider>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, padding: 24, gap: 12, backgroundColor: '#F7F8F5', justifyContent: 'center' },
  title: { color: '#17251F', fontSize: 24, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 16, lineHeight: 24 },
  code: { color: '#41534C', fontSize: 13, lineHeight: 20 },
});
