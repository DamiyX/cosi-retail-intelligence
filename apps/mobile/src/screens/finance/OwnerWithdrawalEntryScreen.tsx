import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { generateMobileId } from '../../crypto/mobileIds';
import type { FinanceClient } from '../../finance/client';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney, parseMajorUnitsToMinor } from '../../ui/money';
import { theme } from '../../ui/theme';

interface OwnerWithdrawalEntryScreenProps {
  client: FinanceClient;
  onBack: () => void;
  onOpenHistory: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
}

export default function OwnerWithdrawalEntryScreen({
  client,
  onBack,
  onOpenHistory,
  onDirtyDraftChange,
}: OwnerWithdrawalEntryScreenProps) {
  const [amountText, setAmountText] = useState('');
  const [note, setNote] = useState('');
  const [occurredAtText, setOccurredAtText] = useState(() => new Date().toISOString());
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [savedAmountMinor, setSavedAmountMinor] = useState<number | null>(null);

  const dirty = savedAmountMinor === null && (
    amountText.trim().length > 0 ||
    note.trim().length > 0 ||
    reviewing ||
    operationId !== null
  );

  const discard = (): void => {
    setAmountText('');
    setNote('');
    setOccurredAtText(new Date().toISOString());
    setReviewing(false);
    setSubmitting(false);
    setOperationId(null);
    setFailure(null);
    setSavedAmountMinor(null);
  };

  useEffect(() => {
    onDirtyDraftChange?.(dirty, discard);
  }, [dirty, onDirtyDraftChange]);

  const amountMinor = useMemo(() => {
    try {
      return parseMajorUnitsToMinor(amountText, client.storeCurrencyCode);
    } catch {
      return null;
    }
  }, [amountText, client.storeCurrencyCode]);

  const beginReview = (): void => {
    setFailure(null);
    if (amountMinor === null || amountMinor <= 0) {
      setFailure('Enter an amount greater than zero.');
      return;
    }
    if (!occurredAtText.trim() || !Number.isFinite(Date.parse(occurredAtText))) {
      setFailure('Enter a valid date and time.');
      return;
    }
    setReviewing(true);
  };

  const confirm = (): void => {
    if (amountMinor === null || amountMinor <= 0 || submitting) return;
    const nextOperationId = operationId ?? generateMobileId();
    setOperationId(nextOperationId);
    setSubmitting(true);
    setFailure(null);
    try {
      client.recordOwnerWithdrawal({
        amountMinor,
        note,
        occurredAt: occurredAtText,
        operationId: nextOperationId,
      });
      setSavedAmountMinor(amountMinor);
      setReviewing(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'The owner withdrawal could not be saved. Your draft is preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  if (savedAmountMinor !== null) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>Owner withdrawal saved</Text>
        <Text style={styles.body}>{displayMoney(savedAmountMinor, client.storeCurrencyCode)} was saved on this device as an owner or personal withdrawal.</Text>
        <StatusNote>This is separate from store expenses and does not describe cash balance.</StatusNote>
        <PrimaryButton title="View withdrawal history" onPress={onOpenHistory} />
        <SecondaryButton title="Record another withdrawal" onPress={discard} />
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Record owner withdrawal</Text>
      <Text style={styles.body}>Use this for money taken by the owner or for personal use. It is not a store expense.</Text>
      <Field
        label={`Amount (${client.storeCurrencyCode})`}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        testID="withdrawal-amount"
      />
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={500}
        placeholder="What was it for?"
        testID="withdrawal-note"
      />
      <Field
        label="Occurred at (UTC)"
        value={occurredAtText}
        onChangeText={setOccurredAtText}
        hint="Use the time the withdrawal happened."
        testID="withdrawal-occurred-at"
      />
      {failure ? <ErrorPanel title="Withdrawal not saved" message={failure} /> : null}
      {reviewing ? (
        <View style={styles.review}>
          <Text accessibilityRole="header" style={styles.reviewTitle}>Review owner withdrawal</Text>
          <Text style={styles.reviewLine}>{displayMoney(amountMinor, client.storeCurrencyCode)}</Text>
          <Text style={styles.reviewLine}>{note.trim() || 'No note'}</Text>
          <Text style={styles.reviewLine}>{occurredAtText}</Text>
          <PrimaryButton title={submitting ? 'Saving…' : 'Confirm and save'} onPress={confirm} disabled={submitting} />
          <SecondaryButton title="Edit" onPress={() => setReviewing(false)} />
        </View>
      ) : (
        <PrimaryButton title="Review owner withdrawal" onPress={beginReview} />
      )}
      <SecondaryButton title="View withdrawal history" onPress={onOpenHistory} />
      <SecondaryButton title="Back" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas },
  center: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas, justifyContent: 'center' },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  review: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(3) },
  reviewTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  reviewLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
});
