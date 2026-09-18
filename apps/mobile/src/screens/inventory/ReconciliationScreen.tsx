import { convertPackagesToBase, formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { generateMobileId } from '../../crypto/mobileIds';
import type { BatchProjection } from '../../inventory/batchAllocation';
import type { InventoryClient, InventoryReviewProduct } from '../../inventory/client';
import type { InventoryAdjustmentReason } from '../../db/repositories';
import type { ReconciliationDraft } from '../../inventory/reconcileInventory';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface ReconciliationScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
  isFocused?: boolean;
  storeProductId?: string;
  assignmentId?: string;
}

interface ScreenState {
  products: InventoryReviewProduct[];
  openSessions: ReturnType<InventoryClient['listOpenReconciliations']>;
  failure: string | null;
}

type QuantityMode = 'BASE' | 'PACKAGE';
type GroupCountDraft = Record<string, string>;

const REASONS: readonly { value: InventoryAdjustmentReason; label: string }[] = [
  { value: 'CORRECTION', label: 'Correction' },
  { value: 'MISSING', label: 'Missing' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'PERSONAL_USE', label: 'Personal use' },
  { value: 'CUSTOMER_RETURN', label: 'Customer return' },
  { value: 'SUPPLIER_RETURN', label: 'Supplier return' },
];

function read(client: InventoryClient): ScreenState {
  try {
    return { products: client.listReviewProducts(), openSessions: client.listOpenReconciliations(), failure: null };
  } catch (error) {
    return { products: [], openSessions: [], failure: error instanceof Error ? error.message : 'Stock checks could not be read.' };
  }
}

function quantityLabel(value: string | null): string {
  if (value === null) return '—';
  try {
    const parsed = BigInt(value);
    const magnitude = parsed < 0n ? -parsed : parsed;
    return magnitude <= BigInt(Number.MAX_SAFE_INTEGER)
      ? `${parsed < 0n ? '-' : ''}${formatQuantityMicros(Number(magnitude))}`
      : `${value} micro-units`;
  } catch {
    return value;
  }
}

function groupLabel(group: BatchProjection['groups'][number]): string {
  const date = group.datePrecision === 'UNKNOWN' ? 'unknown date' : `${group.dateValue} (${group.datePrecision.toLowerCase()})`;
  return `${date} · recorded ${quantityLabel(group.balanceBaseMicros)}`;
}

function groupCountKey(groupId: string | null): string {
  return groupId ?? '__UNKNOWN__';
}

function countsFromDraft(draft: ReconciliationDraft): GroupCountDraft {
  return draft.groupCounts.reduce<GroupCountDraft>((values, count) => {
    values[groupCountKey(count.groupId)] = quantityLabel(count.physicalBaseUnits);
    return values;
  }, {});
}

export default function ReconciliationScreen({ client, onBack, onDirtyDraftChange, isFocused = true, storeProductId, assignmentId }: ReconciliationScreenProps) {
  const [state, setState] = useState(() => read(client));
  const [selectedProductId, setSelectedProductId] = useState(storeProductId ?? '');
  const [activeAssignmentId, setActiveAssignmentId] = useState(assignmentId ?? null);
  const [draft, setDraft] = useState<ReconciliationDraft | null>(null);
  const [projection, setProjection] = useState<BatchProjection | null>(null);
  const [physicalText, setPhysicalText] = useState('');
  const [note, setNote] = useState('');
  const [reasonCode, setReasonCode] = useState<InventoryAdjustmentReason>('CORRECTION');
  const [quantityMode, setQuantityMode] = useState<QuantityMode>('BASE');
  const [completeGroupCount, setCompleteGroupCount] = useState(false);
  const [groupCounts, setGroupCounts] = useState<GroupCountDraft>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const initialFocusHandledRef = useRef(false);
  const draftRef = useRef<ReconciliationDraft | null>(null);
  const inputDirtyRef = useRef(false);
  const finalizationOperationIdRef = useRef<string | null>(null);
  const [inputDirty, setInputDirty] = useState(false);

  const selectedProduct = state.products.find((product) => product.storeProductId === selectedProductId) ?? state.products[0] ?? null;
  const hasSubmission = draft?.hasSubmission === true;
  const difference = hasSubmission ? BigInt(draft?.differenceBaseUnits ?? '0') : null;
  const hasDiscrepancy = difference !== null && difference !== 0n;
  const dirty = !saved && draft?.status === 'IN_PROGRESS' && inputDirty;

  const markDirty = (): void => {
    inputDirtyRef.current = true;
    setInputDirty(true);
  };

  const hydrateDraft = useCallback((nextDraft: ReconciliationDraft, preserveUnsaved = false): void => {
    setDraft(nextDraft);
    if (preserveUnsaved && inputDirtyRef.current) return;
    setPhysicalText(nextDraft.hasSubmission ? quantityLabel(nextDraft.physicalBaseUnits) : '');
    setNote(nextDraft.note ?? '');
    setReasonCode((nextDraft.reasonCode as InventoryAdjustmentReason | null) ?? 'CORRECTION');
    setQuantityMode('BASE');
    setCompleteGroupCount(nextDraft.completeGroupCount);
    setGroupCounts(countsFromDraft(nextDraft));
    setProjection(nextDraft.hasSubmission ? client.getBatchProjection(nextDraft.storeProductId) : null);
    inputDirtyRef.current = false;
    setInputDirty(false);
  }, [client]);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const refresh = useCallback(() => {
    const refreshed = read(client);
    setState(refreshed);
    const currentDraft = draftRef.current;
    if (currentDraft) {
      try {
        hydrateDraft(client.getReconciliationDraft(currentDraft.reconciliationId), true);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The stock check could not be refreshed.');
      }
    }
  }, [client, hydrateDraft]);

  useEffect(() => {
    if (draftRef.current || saved) return;
    const matching = state.openSessions.find((session) => {
      if (storeProductId && session.storeProductId !== storeProductId) return false;
      if (assignmentId && session.checkAssignmentId !== assignmentId) return false;
      return storeProductId !== undefined || assignmentId !== undefined;
    });
    if (!matching) return;
    const frame = requestAnimationFrame(() => {
      setSelectedProductId(matching.storeProductId);
      setActiveAssignmentId(matching.checkAssignmentId);
      hydrateDraft(matching.draft);
    });
    return () => cancelAnimationFrame(frame);
  }, [assignmentId, hydrateDraft, saved, state.openSessions, storeProductId]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, () => {
      const current = draftRef.current;
      if (current) hydrateDraft(current);
      setError(null);
    });
  }, [dirty, hydrateDraft, onDirtyDraftChange]);

  useEffect(() => {
    if (!isFocused) return undefined;
    if (!initialFocusHandledRef.current) {
      initialFocusHandledRef.current = true;
      return undefined;
    }
    const frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [isFocused, refresh]);

  const start = (): void => {
    if (!selectedProduct || submitting) {
      setError('Choose a product before starting a stock check.');
      return;
    }
    try {
      setError(null);
      hydrateDraft(client.startReconciliation(selectedProduct.storeProductId, activeAssignmentId));
      setSaved(false);
      finalizationOperationIdRef.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not start.');
    }
  };

  const resume = (reconciliationId: string): void => {
    try {
      const nextDraft = client.resumeReconciliation(reconciliationId);
      setSelectedProductId(nextDraft.storeProductId);
      setActiveAssignmentId(nextDraft.checkAssignmentId);
      setSaved(false);
      setError(null);
      finalizationOperationIdRef.current = null;
      hydrateDraft(nextDraft);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The saved stock check could not be resumed.');
    }
  };

  const saveCount = (): void => {
    if (!draft || draft.status !== 'IN_PROGRESS' || submitting || !selectedProduct) return;
    try {
      const enteredQuantity = parseQuantityDecimal(physicalText);
      const physicalBaseUnits = quantityMode === 'PACKAGE'
        ? convertPackagesToBase(enteredQuantity, selectedProduct.preferredPackage?.conversionToBaseMicros ?? 0)
        : enteredQuantity;
      if (physicalBaseUnits < 0) throw new Error('Enter zero or a positive physical quantity.');
      setSubmitting(true);
      setError(null);
      const refreshed = client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits,
        completeGroupCount: hasSubmission ? completeGroupCount : false,
        groupCounts: hasSubmission && completeGroupCount
          ? Object.entries(groupCounts).map(([key, value]) => ({ groupId: key === '__UNKNOWN__' ? null : key, physicalBaseUnits: parseQuantityDecimal(value) }))
          : [],
        reasonCode: hasSubmission ? reasonCode : null,
        note,
      });
      hydrateDraft(refreshed);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The count could not be saved. Your entry is preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const finalize = (): void => {
    if (!draft || !draft.hasSubmission || submitting) {
      setError('Save a physical count before finalizing this check.');
      return;
    }
    if (hasDiscrepancy && !reasonCode) {
      setError('Choose a reason for this discrepancy before finalizing.');
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const operationId = finalizationOperationIdRef.current ?? generateMobileId();
      finalizationOperationIdRef.current = operationId;
      client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, operationId, reasonCode, note });
      setSaved(true);
      setActiveAssignmentId(null);
      setDraft({ ...draft, status: 'COMPLETED' });
      inputDirtyRef.current = false;
      setInputDirty(false);
      finalizationOperationIdRef.current = null;
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not be finalized. Your count is preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancelConfirmed = (): void => {
    if (!draft || submitting) return;
    try {
      client.cancelReconciliation(draft.reconciliationId);
      setDraft(null);
      setProjection(null);
      setActiveAssignmentId(null);
      setPhysicalText('');
      setNote('');
      setReasonCode('CORRECTION');
      setCompleteGroupCount(false);
      setGroupCounts({});
      inputDirtyRef.current = false;
      setInputDirty(false);
      finalizationOperationIdRef.current = null;
      setError(null);
      setState(read(client));
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not be cancelled.');
    }
  };

  const cancel = (): void => {
    if (!draft || submitting) return;
    Alert.alert(
      'Cancel stock check?',
      draft.hasSubmission
        ? 'The saved count will remain as audit evidence, but this check will not adjust stock.'
        : 'No count has been saved yet. Cancel this stock check?',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Cancel stock check', style: 'destructive', onPress: cancelConfirmed },
      ],
    );
  };

  const toggleCompleteGroupCount = (enabled: boolean): void => {
    markDirty();
    setCompleteGroupCount(enabled);
    if (enabled && projection) {
      setGroupCounts((previous) => {
        const next = { ...previous };
        for (const group of projection.groups) if (!(group.id in next)) next[group.id] = '';
        if (BigInt(projection.unknownResidualBaseMicros) !== 0n && !('__UNKNOWN__' in next)) next.__UNKNOWN__ = '';
        return next;
      });
    }
  };

  const setGroupCount = (groupId: string | null, value: string): void => {
    markDirty();
    setGroupCounts((previous) => ({ ...previous, [groupCountKey(groupId)]: value }));
  };

  const changeQuantityMode = (mode: QuantityMode): void => {
    setQuantityMode(mode);
    setPhysicalText('');
    markDirty();
  };

  if (state.failure) {
    return <View style={styles.container}><ErrorPanel title="Stock checks unavailable" message={state.failure} onRetry={refresh} onDismiss={onBack} /></View>;
  }

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>Check stock</Text>
      <Text style={styles.storeLine}>{client.storeName} · <StatusNote>Count first; the recorded quantity stays hidden until you finish.</StatusNote></Text>
      {state.products.length === 0 ? <View style={styles.card}><Text style={styles.cardTitle}>No active products</Text><Text style={styles.meta}>Add a product before starting a stock check.</Text></View> : null}
      {state.products.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Product</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            {state.products.map((product) => {
              const selected = product.storeProductId === selectedProduct?.storeProductId;
              return <Pressable key={product.storeProductId} accessibilityRole="radio" accessibilityLabel={`Check ${product.productName}`} accessibilityState={{ checked: selected, disabled: draft !== null }} disabled={draft !== null} onPress={() => { setSelectedProductId(product.storeProductId); setError(null); }} style={[styles.packageChip, selected && styles.packageChipSelected, draft !== null && styles.disabledChip]}><Text style={[styles.packageText, selected && styles.packageTextSelected]}>{product.productName}</Text></Pressable>;
            })}
          </View>
        </View>
      ) : null}
      {!draft && state.openSessions.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Resume saved stock checks</Text>
          <Text style={styles.meta}>Saved counts and notes stay available after closing the app.</Text>
          {state.openSessions.map((session) => {
            const product = state.products.find((candidate) => candidate.storeProductId === session.storeProductId);
            return <SecondaryButton key={session.reconciliationId} title={`Resume ${product?.productName ?? 'saved check'}`} onPress={() => resume(session.reconciliationId)} />;
          })}
        </View>
      ) : null}
      {selectedProduct && !draft ? <PrimaryButton title="Start blind count" onPress={start} disabled={submitting} /> : null}
      {draft?.status === 'IN_PROGRESS' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{draft.hasSubmission ? 'Review count' : 'First count'}</Text>
          <Text style={styles.meta}>{draft.hasSubmission ? 'Compare the physical count with the recorded stock, then recount or confirm the result.' : 'Walk to the shelf and enter what you physically count. The expected quantity is not shown or prefilled.'}</Text>
          <Text style={styles.sectionLabel}>Count unit</Text>
          <View style={styles.packageList} accessibilityRole="radiogroup">
            <Pressable accessibilityRole="radio" accessibilityLabel="Count in base units" accessibilityState={{ checked: quantityMode === 'BASE' }} onPress={() => changeQuantityMode('BASE')} style={[styles.packageChip, quantityMode === 'BASE' && styles.packageChipSelected]}><Text style={[styles.packageText, quantityMode === 'BASE' && styles.packageTextSelected]}>Base units</Text></Pressable>
            {selectedProduct.preferredPackage ? <Pressable accessibilityRole="radio" accessibilityLabel={`Count in ${selectedProduct.preferredPackage.name}`} accessibilityState={{ checked: quantityMode === 'PACKAGE' }} onPress={() => changeQuantityMode('PACKAGE')} style={[styles.packageChip, quantityMode === 'PACKAGE' && styles.packageChipSelected]}><Text style={[styles.packageText, quantityMode === 'PACKAGE' && styles.packageTextSelected]}>{selectedProduct.preferredPackage.name}</Text></Pressable> : null}
          </View>
          <Field label={quantityMode === 'PACKAGE' && selectedProduct.preferredPackage ? `Physical quantity counted (${selectedProduct.preferredPackage.name})` : 'Physical quantity counted'} value={physicalText} onChangeText={(value) => { markDirty(); setPhysicalText(value); }} keyboardType="decimal-pad" hint={quantityMode === 'PACKAGE' && selectedProduct.preferredPackage ? `1 ${selectedProduct.preferredPackage.name} = ${quantityLabel(String(selectedProduct.preferredPackage.conversionToBaseMicros))} base units` : 'Use the base unit shown on the product.'} testID="reconciliation-physical-quantity" />
          {hasSubmission ? (
            <View style={styles.comparison}>
              <Text style={styles.sectionLabel}>Recorded stock: {quantityLabel(draft.recordedBaseUnitsSnapshot)}</Text>
              <Text style={styles.sectionLabel}>Physical count: {quantityLabel(draft.physicalBaseUnits)}</Text>
              <Text style={[styles.comparisonValue, hasDiscrepancy ? styles.discrepancy : styles.matched]}>Difference: {difference !== null && difference > 0n ? '+' : ''}{quantityLabel(draft.differenceBaseUnits)}</Text>
              <Text style={styles.meta}>{hasDiscrepancy ? 'Discrepancy found. Choose a reason and confirm, or save a recount.' : 'Count matches the recorded quantity.'}</Text>
            </View>
          ) : null}
          {hasSubmission ? (
            <>
              <Pressable accessibilityRole="checkbox" accessibilityLabel="Review stock by recorded group" accessibilityState={{ checked: completeGroupCount }} onPress={() => toggleCompleteGroupCount(!completeGroupCount)} style={styles.checkboxRow}>
                <View style={[styles.checkbox, completeGroupCount && styles.checkboxChecked]}><Text style={styles.checkboxMark}>{completeGroupCount ? '✓' : ''}</Text></View>
                <Text style={styles.meta}>Review each recorded group</Text>
              </Pressable>
              {completeGroupCount ? <View style={styles.groupList}>
                <Text style={styles.meta}>Enter the physical count for every group, including groups whose recorded balance is zero.</Text>
                {projection ? projection.groups.map((group) => <Field key={group.id} label={groupLabel(group)} value={groupCounts[groupCountKey(group.id)] ?? ''} onChangeText={(value) => setGroupCount(group.id, value)} keyboardType="decimal-pad" testID={`reconciliation-group-${group.id}`} />) : null}
                {projection && BigInt(projection.unknownResidualBaseMicros) !== 0n ? <Field label={`Unknown/unallocated · recorded ${quantityLabel(projection.unknownResidualBaseMicros)}`} value={groupCounts.__UNKNOWN__ ?? ''} onChangeText={(value) => setGroupCount(null, value)} keyboardType="decimal-pad" testID="reconciliation-group-unknown" /> : null}
              </View> : null}
              {hasDiscrepancy ? (
                <>
                  <Text style={styles.sectionLabel}>Discrepancy reason</Text>
                  <View style={styles.packageList} accessibilityRole="radiogroup">
                    {REASONS.map((reason) => <Pressable key={reason.value} accessibilityRole="radio" accessibilityLabel={`Discrepancy reason ${reason.label}`} accessibilityState={{ checked: reasonCode === reason.value }} onPress={() => { setReasonCode(reason.value); markDirty(); }} style={[styles.packageChip, reasonCode === reason.value && styles.packageChipSelected]}><Text style={[styles.packageText, reasonCode === reason.value && styles.packageTextSelected]}>{reason.label}</Text></Pressable>)}
                  </View>
                </>
              ) : null}
            </>
          ) : null}
          <Field label="Note (optional)" value={note} onChangeText={(value) => { markDirty(); setNote(value); }} maxLength={500} testID="reconciliation-note" />
          <PrimaryButton title={submitting ? 'Saving…' : draft.hasSubmission ? 'Save recount' : 'Save first count'} onPress={saveCount} disabled={submitting} />
          {draft.hasSubmission ? <PrimaryButton title={submitting ? 'Finalizing…' : hasDiscrepancy ? 'Confirm discrepancy and finalize' : 'Finalize stock check'} onPress={finalize} disabled={submitting} /> : null}
          <SecondaryButton title="Refresh before recount" onPress={refresh} />
          <SecondaryButton title="Cancel stock check" onPress={cancel} />
        </View>
      ) : null}
      {saved ? <View style={styles.card}><Text style={styles.cardTitle}>Stock check finalized</Text><Text style={styles.meta}>{hasDiscrepancy ? 'The physical evidence, discrepancy reason, stock correction, and pending sync envelope were saved together.' : 'The physical evidence was saved; no stock correction was needed.'}</Text><SecondaryButton title="Check another product" onPress={() => { setDraft(null); setProjection(null); setActiveAssignmentId(null); setSaved(false); setPhysicalText(''); setNote(''); setReasonCode('CORRECTION'); setCompleteGroupCount(false); setGroupCounts({}); inputDirtyRef.current = false; setInputDirty(false); finalizationOperationIdRef.current = null; refresh(); }} /></View> : null}
      {error ? <Text accessibilityRole="alert" style={styles.generalError}>{error}</Text> : null}
      <SecondaryButton title="Back" onPress={onBack} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  card: { backgroundColor: theme.color.raised, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.card, padding: theme.spacing(4), gap: theme.spacing(2) },
  cardTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  meta: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  sectionLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  packageList: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  packageChip: { minHeight: theme.minTouchTarget, borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, paddingHorizontal: theme.spacing(3), justifyContent: 'center', backgroundColor: theme.color.raised },
  packageChipSelected: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  disabledChip: { opacity: 0.65 },
  packageText: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
  packageTextSelected: { color: theme.color.raised, fontWeight: '600' },
  comparison: { borderColor: theme.color.border, borderWidth: 1, borderRadius: theme.radius.field, padding: theme.spacing(3), gap: theme.spacing(1) },
  comparisonValue: { fontSize: theme.fontSize.body, fontWeight: '700' },
  discrepancy: { color: theme.color.statusDanger },
  matched: { color: theme.color.actionPrimary },
  checkboxRow: { minHeight: theme.minTouchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2) },
  checkbox: { width: 24, height: 24, borderColor: theme.color.border, borderWidth: 1, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  checkboxMark: { color: theme.color.raised, fontWeight: '700' },
  groupList: { gap: theme.spacing(2) },
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
