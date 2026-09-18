import { useCallback, useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import type { AttentionItem, AttentionOverview } from '../../inventory/attention';
import type { InventoryClient } from '../../inventory/client';
import { EmptyState, ErrorPanel, Field, PrimaryButton, SecondaryButton } from '../../ui/components';
import { theme } from '../../ui/theme';

interface AttentionScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onRestock: (storeProductId: string) => void;
  onReconcile: (storeProductId: string) => void;
  onRemove: (item: AttentionItem) => void;
  isFocused?: boolean;
}

type SnoozeKind = 'LATER_TODAY' | 'TOMORROW' | 'CHOOSE_DATE_TIME';

function read(client: InventoryClient): { overview: AttentionOverview | null; failure: string | null } {
  try {
    return { overview: client.getAttentionOverview(), failure: null };
  } catch (error) {
    return { overview: null, failure: error instanceof Error ? error.message : 'Needs attention could not be read.' };
  }
}

function parseLocalChoice(value: string): { date: string; minute: number } {
  const match = /^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error('Use YYYY-MM-DD HH:MM for a chosen snooze time.');
  const hour = Number(match[2]);
  const minute = Number(match[3]);
  if (!Number.isSafeInteger(hour) || hour < 0 || hour > 23 || !Number.isSafeInteger(minute) || minute < 0 || minute > 59) {
    throw new Error('Choose a valid local date and time.');
  }
  return { date: match[1], minute: hour * 60 + minute };
}

function actionTitle(item: AttentionItem): string {
  return item.primaryActionLabel;
}

export default function AttentionScreen({ client, onBack, onRestock, onReconcile, onRemove, isFocused = true }: AttentionScreenProps) {
  const initial = read(client);
  const [overview, setOverview] = useState<AttentionOverview | null>(initial.overview);
  const [failure, setFailure] = useState<string | null>(initial.failure);
  const [leadDaysText, setLeadDaysText] = useState(() => String(initial.overview?.settings.expiryLeadDays ?? 30));
  const [chooseVisible, setChooseVisible] = useState<Record<string, boolean>>({});
  const [chooseText, setChooseText] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const initialFocusHandledRef = useRef(false);

  const refresh = useCallback((): void => {
    const next = read(client);
    setOverview(next.overview);
    setFailure(next.failure);
    if (next.failure) setError(next.failure);
  }, [client]);

  useEffect(() => {
    if (!isFocused) return undefined;
    if (!initialFocusHandledRef.current) {
      initialFocusHandledRef.current = true;
      return undefined;
    }
    const frame = requestAnimationFrame(refresh);
    const interval = setInterval(refresh, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(interval);
    };
  }, [isFocused, refresh]);

  const saveSettings = (): void => {
    try {
      const expiryLeadDays = Number(leadDaysText.trim());
      if (!Number.isSafeInteger(expiryLeadDays) || expiryLeadDays < 0 || expiryLeadDays > 3650) {
        throw new Error('Expiry lead time must be a whole number from 0 to 3650 days.');
      }
      setSaving(true);
      setError(null);
      client.saveAttentionSettings({ expiryLeadDays });
      setOverview(client.getAttentionOverview());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Attention settings could not be saved. Your entry is preserved.');
    } finally {
      setSaving(false);
    }
  };

  const primaryAction = (item: AttentionItem): void => {
    if (item.primaryAction === 'RESTOCK') onRestock(item.storeProductId);
    else if (item.primaryAction === 'RECONCILE') onReconcile(item.storeProductId);
    else onRemove(item);
  };

  const snooze = (item: AttentionItem, snoozeKind: SnoozeKind): void => {
    try {
      const chosen = snoozeKind === 'CHOOSE_DATE_TIME' ? parseLocalChoice(chooseText[item.conditionKey] ?? '') : undefined;
      setSaving(true);
      setError(null);
      const result = client.snoozeAttention({
        conditionKey: item.conditionKey,
        conditionType: item.conditionType,
        storeProductId: item.storeProductId,
        groupId: item.groupId,
        severityRank: item.severityRank,
        snoozeKind,
        dueLocalDate: chosen?.date,
        dueLocalMinute: chosen?.minute,
      });
      setOverview(result.overview);
      setChooseVisible((current) => ({ ...current, [item.conditionKey]: false }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The reminder could not be snoozed. Your entry is preserved.');
    } finally {
      setSaving(false);
    }
  };

  if (failure && !overview) {
    return <View style={styles.container}><ErrorPanel title="Needs attention unavailable" message={failure} onRetry={refresh} onDismiss={onBack} /></View>;
  }
  if (!overview) return <View style={styles.container} />;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Needs attention</Text>
      <Text style={styles.subtitle}>{client.storeName} · Current reminders come from recorded stock and expiry groups. Snoozing never changes stock.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Expiry reminder window</Text>
        <Text style={styles.meta}>Use a store-local calendar lead time. Month-only dates stay month-only; no exact day is invented.</Text>
        <Field label="Days before a recorded date" value={leadDaysText} onChangeText={setLeadDaysText} keyboardType="number-pad" testID="attention-lead-days" />
        <PrimaryButton title={saving ? 'Saving…' : 'Save reminder settings'} onPress={saveSettings} disabled={saving} />
      </View>

      {overview.suppressedCount > 0 ? <Text style={styles.suppressed}>{overview.suppressedCount} current reminder{overview.suppressedCount === 1 ? '' : 's'} snoozed until due or until severity worsens.</Text> : null}

      {overview.items.length === 0 && overview.suppressedCount === 0 ? (
        <EmptyState title="Nothing needs attention" body="Recorded stock, unresolved count differences, and remaining expiry groups will appear here when a real condition needs action." actionTitle="Refresh" onAction={refresh} />
      ) : null}
      {overview.items.length === 0 && overview.suppressedCount > 0 ? (
        <View style={styles.card}><Text style={styles.cardTitle}>Reminders are snoozed</Text><Text style={styles.meta}>The underlying inventory is unchanged. Refresh when you are ready to see due reminders again.</Text><SecondaryButton title="Refresh" onPress={refresh} /></View>
      ) : null}

      {overview.items.map((item) => (
        <AttentionCard
          key={item.id}
          item={item}
          saving={saving}
          chooseVisible={chooseVisible[item.conditionKey] ?? false}
          chooseText={chooseText[item.conditionKey] ?? ''}
          onAction={() => primaryAction(item)}
          onLater={() => snooze(item, 'LATER_TODAY')}
          onTomorrow={() => snooze(item, 'TOMORROW')}
          onChoose={() => setChooseVisible((current) => ({ ...current, [item.conditionKey]: !current[item.conditionKey] }))}
          onChooseText={(value) => setChooseText((current) => ({ ...current, [item.conditionKey]: value }))}
          onSaveChoice={() => snooze(item, 'CHOOSE_DATE_TIME')}
        />
      ))}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <SecondaryButton title="Back" onPress={onBack} />
    </ScrollView>
  );
}

function AttentionCard({ item, saving, chooseVisible, chooseText, onAction, onLater, onTomorrow, onChoose, onChooseText, onSaveChoice }: {
  item: AttentionItem;
  saving: boolean;
  chooseVisible: boolean;
  chooseText: string;
  onAction: () => void;
  onLater: () => void;
  onTomorrow: () => void;
  onChoose: () => void;
  onChooseText: (value: string) => void;
  onSaveChoice: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.cardTitle}>{item.title}</Text>
      <Text style={styles.meta}>{item.detail}</Text>
      <PrimaryButton title={actionTitle(item)} onPress={onAction} disabled={saving} />
      <View style={styles.snoozeGroup}>
        <Text style={styles.sectionLabel}>Reminder</Text>
        <View style={styles.actionRow}>
          <SecondaryButton title="Later today" onPress={onLater} />
          <SecondaryButton title="Tomorrow" onPress={onTomorrow} />
          <SecondaryButton title="Choose date/time" onPress={onChoose} />
        </View>
        {chooseVisible ? <>
          <Field label="Chosen local date/time (YYYY-MM-DD HH:MM)" value={chooseText} onChangeText={onChooseText} testID={`attention-choice-${item.conditionKey}`} />
          <PrimaryButton title="Snooze at chosen time" onPress={onSaveChoice} disabled={saving} />
        </> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  subtitle: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  cardTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 22 },
  suppressed: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  sectionLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  snoozeGroup: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(2) },
  actionRow: { gap: theme.spacing(2) },
  error: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
