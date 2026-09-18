import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { DatabaseProvider } from '../src/db/DatabaseContext';
import { initializeAppDatabase, type DatabaseInitStatus } from '../src/db/initialize';

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
          <Stack screenOptions={{ headerTintColor: '#174F46', contentStyle: { backgroundColor: '#F7F8F5' } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="restock" options={{ title: 'Restock' }} />
            <Stack.Screen name="purchase-history" options={{ title: 'Purchase history' }} />
            <Stack.Screen name="purchases/[id]" options={{ title: 'Restock receipt' }} />
            <Stack.Screen name="batch-review" options={{ title: 'Review expiry stock' }} />
            <Stack.Screen name="adjustment" options={{ title: 'Record adjustment' }} />
            <Stack.Screen name="reconciliation" options={{ title: 'Check stock' }} />
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
