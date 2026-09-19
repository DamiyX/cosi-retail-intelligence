import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { generateMobileId } from '../../crypto/mobileIds';
import type { ExpenseCategory } from '../../db/repositories';
import type { FinanceClient } from '../../finance/client';
import { Field, ErrorPanel, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney, parseMajorUnitsToMinor } from '../../ui/money';
import { theme } from '../../ui/theme';

interface ExpenseEntryScreenProps {
  client: FinanceClient;
  onBack: () => void;
  onOpenHistory: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
}

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  TRANSPORT: 'Transport',
  WAGES: 'Wages',
  FUEL_ELECTRICITY: 'Fuel / electricity',
  RENT: 'Rent',
  MAINTENANCE: 'Maintenance',
  LEVIES_TAX: 'Levies / tax',
  MISCELLANEOUS: 'Miscellaneous',
};

const CATEGORIES = Object.keys(CATEGORY_LABELS) as ExpenseCategory[];

function categoryLabel(category: ExpenseCategory): string {
  return CATEGORY_LABELS[category];
}

export default function ExpenseEntryScreen({
  client,
  onBack,
  onOpenHistory,
  onDirtyDraftChange,
}: ExpenseEntryScreenProps) {
  const [amountText, setAmountText] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('MISCELLANEOUS');
  const [note, setNote] = useState('');
  const [occurredAtText, setOccurredAtText] = useState(() => new Date().toISOString());
  const [reviewing, setReviewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [operationId, setOperationId] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [savedAmountMinor, setSavedAmountMinor] = useState<number | null>(null);

  const dirty = savedAmountMinor === null && (
    amountText.trim().length > 0 ||
    category !== 'MISCELLANEOUS' ||
    note.trim().length > 0 ||
    reviewing ||
    operationId !== null
  );

  const discard = (): void => {
    setAmountText('');
    setCategory('MISCELLANEOUS');
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
      client.recordExpense({
        category,
        amountMinor,
        note,
        occurredAt: occurredAtText,
        operationId: nextOperationId,
      });
      setSavedAmountMinor(amountMinor);
      setReviewing(false);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : 'The expense could not be saved. Your draft is preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  if (savedAmountMinor !== null) {
    return (
      <View style={styles.center}>
        <Text accessibilityRole="header" style={styles.title}>Expense saved</Text>
        <Text style={styles.body}>
          {displayMoney(savedAmountMinor, client.storeCurrencyCode)} was saved on this device under {categoryLabel(category).toLowerCase()}.
        </Text>
        <StatusNote>Internet is not required for this local record.</StatusNote>
        <PrimaryButton title="View expense history" onPress={onOpenHistory} />
        <SecondaryButton title="Record another expense" onPress={discard} />
        <SecondaryButton title="Back" onPress={onBack} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Record expense</Text>
      <Text style={styles.body}>Keep everyday store costs separate from owner withdrawals.</Text>
      <Field
        label={`Amount (${client.storeCurrencyCode})`}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
        placeholder="0.00"
        testID="expense-amount"
      />
      <Text style={styles.label}>Category</Text>
      <View style={styles.categoryGrid}>
        {CATEGORIES.map((item) => (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: category === item }}
            onPress={() => setCategory(item)}
            testID={`expense-category-${item}`}
            style={[styles.category, category === item && styles.categorySelected]}
          >
            <Text style={[styles.categoryText, category === item && styles.categoryTextSelected]}>{categoryLabel(item)}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Note (optional)"
        value={note}
        onChangeText={setNote}
        maxLength={500}
        placeholder="What was it for?"
        testID="expense-note"
      />
      <Field
        label="Occurred at (UTC)"
        value={occurredAtText}
        onChangeText={setOccurredAtText}
        hint="Use the time the store cost happened."
        testID="expense-occurred-at"
      />
      {failure ? <ErrorPanel title="Expense not saved" message={failure} /> : null}
      {reviewing ? (
        <View style={styles.review}>
          <Text accessibilityRole="header" style={styles.reviewTitle}>Review expense</Text>
          <Text style={styles.reviewLine}>{displayMoney(amountMinor, client.storeCurrencyCode)} · {categoryLabel(category)}</Text>
          <Text style={styles.reviewLine}>{note.trim() || 'No note'}</Text>
          <Text style={styles.reviewLine}>{occurredAtText}</Text>
          <PrimaryButton title={submitting ? 'Saving…' : 'Confirm and save'} onPress={confirm} disabled={submitting} />
          <SecondaryButton title="Edit" onPress={() => setReviewing(false)} />
        </View>
      ) : (
        <PrimaryButton title="Review expense" onPress={beginReview} />
      )}
      <SecondaryButton title="View expense history" onPress={onOpenHistory} />
      <SecondaryButton title="Back" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas },
  center: { flex: 1, padding: theme.spacing(4), gap: theme.spacing(4), backgroundColor: theme.color.canvas, justifyContent: 'center' },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  body: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  label: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  category: { borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, minHeight: theme.minTouchTarget, paddingHorizontal: theme.spacing(3), justifyContent: 'center', backgroundColor: theme.color.raised },
  categorySelected: { borderColor: theme.color.actionPrimary, backgroundColor: theme.color.actionPrimary },
  categoryText: { color: theme.color.textPrimary, fontSize: theme.fontSize.small },
  categoryTextSelected: { color: theme.color.raised, fontWeight: '600' },
  review: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(3) },
  reviewTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '600' },
  reviewLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
});
