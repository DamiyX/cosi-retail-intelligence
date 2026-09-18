import { parseQuantityDecimal } from '@retail/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { InventoryClient, InventoryReviewProduct } from '../../inventory/client';
import type { ReconciliationDraft } from '../../inventory/reconcileInventory';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { theme } from '../../ui/theme';

interface ReconciliationScreenProps {
  client: InventoryClient;
  onBack: () => void;
  onDirtyDraftChange?: (dirty: boolean, discard: () => void) => void;
  isFocused?: boolean;
  storeProductId?: string;
}

interface ScreenState {
  products: InventoryReviewProduct[];
  failure: string | null;
}

function read(client: InventoryClient): ScreenState {
  try {
    return { products: client.listReviewProducts(), failure: null };
  } catch (error) {
    return { products: [], failure: error instanceof Error ? error.message : 'Stock checks could not be read.' };
  }
}

export default function ReconciliationScreen({ client, onBack, onDirtyDraftChange, isFocused = true, storeProductId }: ReconciliationScreenProps) {
  const [state, setState] = useState(() => read(client));
  const [selectedProductId, setSelectedProductId] = useState(storeProductId ?? '');
  const [draft, setDraft] = useState<ReconciliationDraft | null>(null);
  const [physicalText, setPhysicalText] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const initialFocusHandledRef = useRef(false);
  const draftRef = useRef<ReconciliationDraft | null>(null);

  const selectedProduct = state.products.find((product) => product.storeProductId === selectedProductId) ?? state.products[0] ?? null;
  const dirty = !saved && draft?.status === 'IN_PROGRESS' && (physicalText.trim().length > 0 || note.trim().length > 0);

  useEffect(() => {
    draftRef.current = draft;
  }, [draft]);

  const refresh = useCallback(() => {
    setState(read(client));
    const currentDraft = draftRef.current;
    if (currentDraft) {
      try {
        setDraft(client.getReconciliationDraft(currentDraft.reconciliationId));
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'The stock check could not be refreshed.');
      }
    }
  }, [client]);

  useEffect(() => {
    onDirtyDraftChange?.(dirty, () => {
      setPhysicalText('');
      setNote('');
      setError(null);
    });
  }, [dirty, onDirtyDraftChange]);

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
      setDraft(client.startReconciliation(selectedProduct.storeProductId));
      setPhysicalText('');
      setNote('');
      setSaved(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not start.');
    }
  };

  const saveCount = (): void => {
    if (!draft || draft.status !== 'IN_PROGRESS' || submitting) return;
    try {
      const physicalBaseUnits = parseQuantityDecimal(physicalText);
      if (physicalBaseUnits < 0) throw new Error('Enter zero or a positive physical quantity.');
      setSubmitting(true);
      setError(null);
      const refreshed = client.submitReconciliation({
        reconciliationId: draft.reconciliationId,
        expectedInventoryWatermark: draft.inventoryWatermark,
        expectedBatchWatermark: draft.batchWatermark,
        physicalBaseUnits,
        note,
      });
      setDraft(refreshed);
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
    try {
      setSubmitting(true);
      setError(null);
      client.finalizeReconciliation({ reconciliationId: draft.reconciliationId, note });
      setSaved(true);
      setDraft({ ...draft, status: 'COMPLETED' });
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not be finalized. Your count is preserved.');
    } finally {
      setSubmitting(false);
    }
  };

  const cancel = (): void => {
    if (!draft || submitting) return;
    try {
      client.cancelReconciliation(draft.reconciliationId);
      setDraft(null);
      setPhysicalText('');
      setNote('');
      setError(null);
      onDirtyDraftChange?.(false, () => undefined);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'The stock check could not be cancelled.');
    }
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
      {selectedProduct && !draft ? <PrimaryButton title="Start blind count" onPress={start} disabled={submitting} /> : null}
      {draft?.status === 'IN_PROGRESS' ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{draft.hasSubmission ? 'Recount or finalize' : 'First count'}</Text>
          <Text style={styles.meta}>Walk to the shelf and enter what you physically count. The expected quantity is not shown or prefilled.</Text>
          <Field label="Physical quantity counted" value={physicalText} onChangeText={setPhysicalText} keyboardType="decimal-pad" testID="reconciliation-physical-quantity" />
          <Field label="Reason or note (optional)" value={note} onChangeText={setNote} maxLength={500} testID="reconciliation-note" />
          <PrimaryButton title={submitting ? 'Saving…' : draft.hasSubmission ? 'Save recount' : 'Save first count'} onPress={saveCount} disabled={submitting} />
          {draft.hasSubmission ? <PrimaryButton title={submitting ? 'Finalizing…' : 'Finalize stock check'} onPress={finalize} disabled={submitting} /> : null}
          <SecondaryButton title="Refresh before recount" onPress={refresh} />
          <SecondaryButton title="Cancel stock check" onPress={cancel} />
        </View>
      ) : null}
      {saved ? <View style={styles.card}><Text style={styles.cardTitle}>Stock check finalized</Text><Text style={styles.meta}>The physical evidence and any stock correction were saved together.</Text><SecondaryButton title="Check another product" onPress={() => { setDraft(null); setSaved(false); setPhysicalText(''); setNote(''); refresh(); }} /></View> : null}
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
  generalError: { color: theme.color.statusDanger, fontSize: theme.fontSize.body },
});
