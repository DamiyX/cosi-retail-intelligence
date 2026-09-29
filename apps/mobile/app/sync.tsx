import { parseSyncOperationEnvelope } from '@retail/contracts';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useDatabase } from '../src/db/DatabaseContext';
import { cloudAuthClient, cloudSyncConfiguration } from '../src/sync/auth';
import {
  forgetPilotEnrollment,
  isPilotResolvableConflict,
  isIdentifierConflict,
  recoverIdentifierConflict,
  readPilotSyncOverview,
  resolvePilotConflict,
  runPilotSync,
  type PilotSyncOverview,
} from '../src/sync/pilot';

function changeFields(payload: string): Record<string, string> {
  try {
    const operation = parseSyncOperationEnvelope(JSON.parse(payload));
    const fields: Record<string, string> = {};
    const visit = (value: unknown, path: string): void => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => visit(item, `${path} ${index + 1}`));
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) visit(item, `${path} ${key.replaceAll('_', ' ')}`.trim());
      } else {
        fields[path] = value === null || value === undefined ? 'none' : String(value);
      }
    };
    visit(operation.entities, '');
    return fields;
  } catch {
    return {};
  }
}

function differences(localPayload: string, cloudPayload: string): { field: string; local: string; cloud: string }[] {
  const local = changeFields(localPayload);
  const cloud = changeFields(cloudPayload);
  return [...new Set([...Object.keys(local), ...Object.keys(cloud)])]
    .filter((key) => local[key] !== cloud[key])
    .map((field) => ({ field, local: local[field] ?? 'not supplied', cloud: cloud[field] ?? 'not supplied' }));
}

export default function CloudSyncScreen() {
  const adapter = useDatabase();
  const [overview, setOverview] = useState<PilotSyncOverview>(() => readPilotSyncOverview(adapter));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const configured = cloudSyncConfiguration() !== null;

  const refresh = useCallback(async () => {
    setOverview(readPilotSyncOverview(adapter));
    const auth = cloudAuthClient();
    if (!auth) return;
    const { data } = await auth.auth.getSession();
    setSignedInEmail(data.session?.user.email ?? null);
  }, [adapter]);

  useFocusEffect(useCallback(() => {
    void refresh();
  }, [refresh]));

  const act = async (task: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await task();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The cloud action could not finish.');
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const signIn = () => void act(async () => {
    const auth = cloudAuthClient();
    if (!auth) return;
    const { error } = await auth.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setPassword('');
    const result = await runPilotSync(adapter, auth);
    setMessage(result ? `Sync: ${result.status.toLowerCase().replaceAll('_', ' ')}.` : 'Signed in.');
  });

  const signUp = () => void act(async () => {
    const auth = cloudAuthClient();
    if (!auth) return;
    const { data, error } = await auth.auth.signUp({ email: email.trim(), password });
    if (error) throw error;
    setPassword('');
    if (!data.session) {
      setMessage('Check your email to confirm this account, then sign in here.');
      return;
    }
    const result = await runPilotSync(adapter, auth);
    setMessage(result ? `Sync: ${result.status.toLowerCase().replaceAll('_', ' ')}.` : 'Account created.');
  });

  const syncNow = () => void act(async () => {
    const auth = cloudAuthClient();
    if (!auth) return;
    const result = await runPilotSync(adapter, auth);
    setMessage(result ? `Sync: ${result.status.toLowerCase().replaceAll('_', ' ')}.` : 'Sign in to start cloud sync.');
  });

  const signOut = () => void act(async () => {
    const auth = cloudAuthClient();
    if (!auth) return;
    const { error } = await auth.auth.signOut();
    if (error) throw error;
    forgetPilotEnrollment();
    setSignedInEmail(null);
    setMessage('Signed out of cloud sync. Local store data stays on this device.');
  });

  const decide = (conflictId: string, decision: 'USE_CLOUD' | 'RETRY_LOCAL') => {
    Alert.alert(
      decision === 'USE_CLOUD' ? 'Use cloud change?' : 'Retry your change?',
      decision === 'USE_CLOUD'
        ? 'Your rejected local edit stays in history. The cloud version will replace the current local fields.'
        : 'Your local edit will be sent as a new operation against the reviewed cloud version. It may conflict again if the cloud changed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => {
            void act(async () => {
              resolvePilotConflict(adapter, conflictId, decision);
              setMessage('Conflict decision saved. Sync again to check the latest cloud state.');
            });
          },
        },
      ],
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Cloud sync</Text>
      <Text style={styles.body}>Sales and stock changes save on this phone first. Cloud sync runs when you are signed in and online.</Text>
      {!configured ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Cloud sync is not configured in this build</Text>
          <Text style={styles.body}>Add the development Supabase project URL and publishable key to the app environment, then rebuild. Local work remains available.</Text>
        </View>
      ) : !overview.context ? (
        <View style={styles.card}>
          <Text style={styles.heading}>Set up your local store first</Text>
          <Text style={styles.body}>Create the owner and store in Products before connecting cloud sync.</Text>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.heading}>{overview.context.storeName}</Text>
            <Text style={styles.body}>Cloud account: {signedInEmail ?? 'Not signed in'}</Text>
            <Text style={styles.body}>Status: {overview.state?.status.replaceAll('_', ' ').toLowerCase() ?? 'Not started'}</Text>
            <Text style={styles.body}>Waiting to sync: {overview.unsyncedCount}</Text>
            <Text style={styles.body}>Needs review: {overview.conflicts.length}</Text>
            {overview.state?.lastSuccessAt ? <Text style={styles.body}>Last successful contact: {overview.state.lastSuccessAt}</Text> : null}
            {overview.state?.lastErrorCode ? <Text style={styles.error}>Last issue: {overview.state.lastErrorCode}</Text> : null}
          </View>
          {signedInEmail ? (
            <>
              <Pressable accessibilityRole="button" disabled={busy} onPress={syncNow} style={styles.button}>
                <Text style={styles.buttonText}>Sync now</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy} onPress={signOut} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Sign out of cloud sync</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.card}>
              <Text style={styles.heading}>Owner cloud account</Text>
              <TextInput accessibilityLabel="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} placeholder="Email" style={styles.input} />
              <TextInput accessibilityLabel="Password" secureTextEntry value={password} onChangeText={setPassword} placeholder="Password" style={styles.input} />
              <Pressable accessibilityRole="button" disabled={busy || !email.trim() || !password} onPress={signIn} style={styles.button}>
                <Text style={styles.buttonText}>Sign in and sync</Text>
              </Pressable>
              <Pressable accessibilityRole="button" disabled={busy || !email.trim() || !password} onPress={signUp} style={styles.secondaryButton}>
                <Text style={styles.secondaryText}>Create account</Text>
              </Pressable>
            </View>
          )}
          {overview.conflicts.length > 0 ? (
            <View style={styles.card}>
              <Text style={styles.heading}>Changes needing review</Text>
              {overview.conflicts.map((conflict) => (
                <View key={conflict.id} style={styles.conflict}>
                  <Text style={styles.heading}>{conflict.entityType.replaceAll('_', ' ').toLowerCase()}</Text>
                  {conflict.serverPayload ? differences(conflict.localPayload, conflict.serverPayload).map((item) => (
                    <View key={item.field}>
                      <Text style={styles.body}>{item.field}</Text>
                      <Text style={styles.body}>Yours: {item.local}</Text>
                      <Text style={styles.body}>Cloud: {item.cloud}</Text>
                    </View>
                  )) : <Text style={styles.body}>The cloud change could not be loaded.</Text>}
                  {isIdentifierConflict(adapter, conflict.id) ? <Pressable accessibilityRole="button" disabled={busy} style={styles.secondaryButton}
                    onPress={() => Alert.alert('Remove rejected barcode?', 'Keep this product and every recorded sale. Only its rejected barcode association will be removed. A rejected new product will be queued again without the barcode.', [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Keep product, remove barcode', onPress: () => { void act(async () => {
                        recoverIdentifierConflict(adapter, conflict.id);
                        setMessage('Product and sales preserved. Barcode conflict resolved locally; sync again to send pending work.');
                      }); } },
                    ])}>
                    <Text style={styles.secondaryText}>Keep product and sales; remove rejected barcode</Text>
                  </Pressable> : signedInEmail && isPilotResolvableConflict(conflict) ? (
                    <View style={styles.row}>
                      <Pressable accessibilityRole="button" disabled={busy} onPress={() => decide(conflict.id, 'USE_CLOUD')} style={styles.secondaryButton}>
                        <Text style={styles.secondaryText}>Use cloud</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" disabled={busy} onPress={() => decide(conflict.id, 'RETRY_LOCAL')} style={styles.secondaryButton}>
                        <Text style={styles.secondaryText}>Retry mine</Text>
                      </Pressable>
                    </View>
                  ) : <Text style={styles.error}>This change needs manual support before it can be resolved.</Text>}
                </View>
              ))}
            </View>
          ) : null}
        </>
      )}
      {message ? <Text accessibilityRole="alert" style={styles.body}>{message}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, paddingBottom: 48, gap: 16, backgroundColor: '#F7F8F5' },
  title: { color: '#17251F', fontSize: 30, fontWeight: '600' },
  heading: { color: '#17251F', fontSize: 18, fontWeight: '600' },
  body: { color: '#41534C', fontSize: 15, lineHeight: 23 },
  error: { color: '#A13629', fontSize: 15, lineHeight: 23 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#7F8E88', borderWidth: 1, borderRadius: 12, padding: 16, gap: 10 },
  input: { borderColor: '#7F8E88', borderWidth: 1, borderRadius: 8, minHeight: 48, padding: 12, fontSize: 16, color: '#17251F' },
  button: { backgroundColor: '#174F46', borderRadius: 8, minHeight: 48, padding: 12, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  secondaryButton: { borderColor: '#174F46', borderWidth: 1, borderRadius: 8, minHeight: 44, padding: 10, justifyContent: 'center', alignItems: 'center' },
  secondaryText: { color: '#174F46', fontSize: 15, fontWeight: '600' },
  conflict: { borderTopColor: '#7F8E88', borderTopWidth: 1, paddingTop: 12, gap: 8 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
