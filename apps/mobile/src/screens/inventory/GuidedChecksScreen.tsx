import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { GuidedCheckOverview, GuidedCheckAssignmentView } from '../../inventory/guidedChecks';
import type { InventoryClient } from '../../inventory/client';
import { EmptyState, ErrorPanel, Field, PrimaryButton, SecondaryButton } from '../../ui/components';
import { theme } from '../../ui/theme';

interface GuidedChecksScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onStartCheck: (storeProductId: string, assignmentId: string) => void;
  isFocused?: boolean;
}

function formatMinute(value: number): string {
  const hour = Math.floor(value / 60).toString().padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function parseMinute(value: string, field: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error(`${field} must use HH:MM.`);
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) {
    throw new Error(`${field} must use a valid time.`);
  }
  return hour * 60 + minute;
}

function read(client: InventoryClient): { overview: GuidedCheckOverview | null; failure: string | null } {
  try {
    return { overview: client.getGuidedCheckOverview(), failure: null };
  } catch (error) {
    return { overview: null, failure: error instanceof Error ? error.message : 'Guided checks could not be read.' };
  }
}

export default function GuidedChecksScreen({ client, onBack, onStartCheck, isFocused = true }: GuidedChecksScreenProps) {
  const initial = read(client);
  const [overview, setOverview] = useState<GuidedCheckOverview | null>(initial.overview);
  const [failure, setFailure] = useState<string | null>(initial.failure);
  const [targetText, setTargetText] = useState(() => String(initial.overview?.settings.dailyTarget ?? 3));
  const [startText, setStartText] = useState(() => formatMinute(initial.overview?.settings.windowStartMinute ?? 0));
  const [endText, setEndText] = useState(() => formatMinute(initial.overview?.settings.windowEndMinute ?? 1439));
  const [paused, setPaused] = useState(() => initial.overview?.settings.paused ?? false);
  const [reasonByAssignment, setReasonByAssignment] = useState<Record<string, string>>({});
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
    if (!isFocused) return;
    if (!initialFocusHandledRef.current) {
      initialFocusHandledRef.current = true;
      return;
    }
    const frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [isFocused, refresh]);

  const saveSettings = (): void => {
    try {
      const dailyTarget = Number(targetText.trim());
      if (!Number.isSafeInteger(dailyTarget) || dailyTarget < 0 || dailyTarget > 100) throw new Error('Daily target must be a whole number from 0 to 100.');
      const windowStartMinute = parseMinute(startText, 'Start time');
      const windowEndMinute = parseMinute(endText, 'End time');
      if (windowStartMinute > windowEndMinute) throw new Error('The check window must finish after it starts.');
      setSaving(true);
      setError(null);
      client.saveGuidedCheckSettings({ dailyTarget, paused, windowStartMinute, windowEndMinute });
      setOverview(client.getGuidedCheckOverview());
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Guided check settings could not be saved. Your entries are preserved.');
    } finally {
      setSaving(false);
    }
  };

  const generate = (): void => {
    try {
      setSaving(true);
      setError(null);
      setOverview(client.generateGuidedChecks().overview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Today’s guided checks could not be generated.');
    } finally {
      setSaving(false);
    }
  };

  const replace = (assignment: GuidedCheckAssignmentView): void => {
    const reasonCode = reasonByAssignment[assignment.id]?.trim() ?? '';
    if (reasonCode.length === 0) {
      setError('Add a short reason before choosing a replacement.');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const result = client.replaceGuidedCheck({ assignmentId: assignment.id, reasonCode });
      setOverview(result.overview);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The replacement could not be saved. Your reason is preserved.');
    } finally {
      setSaving(false);
    }
  };

  if (failure && !overview) {
    return <View style={styles.container}><ErrorPanel title="Guided checks unavailable" message={failure} onRetry={refresh} onDismiss={onBack} /></View>;
  }
  if (!overview) return <View style={styles.container} />;

  const pending = overview.pending;
  const today = overview.today.filter((assignment) => assignment.status !== 'PENDING');
  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Guided stock checks</Text>
      <Text style={styles.subtitle}>{client.storeName} · Owner-only routine. A check is evidence, not an accuracy badge.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Routine settings</Text>
        <Field label="Daily target" value={targetText} onChangeText={setTargetText} keyboardType="number-pad" testID="guided-daily-target" />
        <Field label="Window starts (HH:MM)" value={startText} onChangeText={setStartText} keyboardType="numbers-and-punctuation" testID="guided-window-start" />
        <Field label="Window ends (HH:MM)" value={endText} onChangeText={setEndText} keyboardType="numbers-and-punctuation" testID="guided-window-end" />
        <Pressable accessibilityRole="checkbox" accessibilityLabel="Pause guided checks" accessibilityState={{ checked: paused }} onPress={() => setPaused((value) => !value)} style={styles.pauseRow}>
          <Text style={styles.checkbox}>{paused ? '☑' : '☐'}</Text>
          <Text style={styles.pauseText}>Pause guided checks</Text>
        </Pressable>
        <PrimaryButton title={saving ? 'Saving…' : 'Save routine settings'} onPress={saveSettings} disabled={saving} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today · {overview.completedInitialCount}/{overview.settings.dailyTarget} initial checks</Text>
        <Text style={styles.meta}>{overview.reason === 'PAUSED' ? 'Routine paused.' : overview.reason === 'OUTSIDE_WINDOW' ? 'Outside the store-local check window.' : overview.reason === 'NO_ELIGIBLE_CANDIDATE' ? 'No active product with positive recorded stock is eligible right now.' : overview.reason === 'TARGET_MET' ? 'Today’s target is complete.' : 'Use the generated list as a short shelf walk.'}</Text>
        <PrimaryButton title={saving ? 'Working…' : 'Generate today’s checks'} onPress={generate} disabled={saving || overview.reason === 'PAUSED' || overview.reason === 'OUTSIDE_WINDOW' || overview.reason === 'PENDING_WORK' || overview.reason === 'TARGET_MET'} />
      </View>

      {pending.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Due or unfinished</Text>
          <Text style={styles.meta}>These assignments remain visible across restart and day rollover.</Text>
          {pending.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} reason={reasonByAssignment[assignment.id] ?? ''} onReason={(value) => setReasonByAssignment((current) => ({ ...current, [assignment.id]: value }))} onStart={() => onStartCheck(assignment.storeProductId, assignment.id)} onReplace={() => replace(assignment)} disabled={saving} />)}
        </View>
      ) : null}

      {today.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Today’s assignment history</Text>
          {today.map((assignment) => <AssignmentCard key={assignment.id} assignment={assignment} reason={reasonByAssignment[assignment.id] ?? ''} onReason={(value) => setReasonByAssignment((current) => ({ ...current, [assignment.id]: value }))} onStart={() => onStartCheck(assignment.storeProductId, assignment.id)} onReplace={() => replace(assignment)} disabled={saving} />)}
        </View>
      ) : <EmptyState title="Nothing assigned yet" body="Generate a short list during the store-local check window. Products with no positive recorded stock are not invented into the routine." actionTitle="Refresh" onAction={refresh} />}

      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      <SecondaryButton title="Back" onPress={onBack} />
    </ScrollView>
  );
}

function AssignmentCard({ assignment, reason, onReason, onStart, onReplace, disabled }: {
  assignment: GuidedCheckAssignmentView;
  reason: string;
  onReason: (value: string) => void;
  onStart: () => void;
  onReplace: () => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.assignment}>
      <Text style={styles.assignmentTitle}>{assignment.productName}</Text>
      <Text style={styles.meta}>{assignment.status === 'PENDING' ? 'Pending shelf count' : assignment.status === 'COMPLETED' ? 'Completed' : assignment.status === 'REPLACED' ? 'Replaced; history retained' : 'No eligible replacement'}</Text>
      {assignment.status === 'PENDING' ? <>
        <PrimaryButton title="Start physical count" onPress={onStart} disabled={disabled} />
        <Field label="Why can’t this item be counted?" value={reason} onChangeText={onReason} maxLength={64} testID={`guided-reason-${assignment.id}`} />
        <SecondaryButton title="Choose replacement" onPress={onReplace} />
      </> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  subtitle: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  cardTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  pauseRow: { minHeight: theme.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  checkbox: { color: theme.color.actionPrimary, fontSize: 24 },
  pauseText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  assignment: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(3), gap: theme.spacing(2) },
  assignmentTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  error: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
