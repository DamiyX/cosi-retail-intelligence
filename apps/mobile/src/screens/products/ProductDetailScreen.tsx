import { DomainError, formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CatalogueClient, ProductDetail } from '../../catalogue/client';
import type { IdentifierType, PurchasePriceHistoryRow } from '../../db/repositories';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { currencyMinorUnitLabel, displayMoney, displayRationalMinorPerBaseUnit, isUsableCurrentCost } from '../../ui/money';
import { theme } from '../../ui/theme';
import ScannerPanel from '../../features/scanning/ScannerPanel';
import { ScanSession } from '../../features/scanning/session';
import { generateMobileId } from '../../crypto/mobileIds';
import ProductPhoto from '../../media/ProductPhoto';

interface ProductDetailScreenProps {
  client: CatalogueClient;
  productId: string;
  justSaved?: boolean;
  onBack: () => void;
  onAddPackage: () => void;
  onEditPackage: (packageUnitId: string) => void;
}

interface DetailState {
  detail: ProductDetail | null;
  failure: string | null;
}

interface PriceHistoryState {
  rows: PurchasePriceHistoryRow[];
  failure: string | null;
}

interface ScreenState {
  detail: DetailState;
  priceHistory: PriceHistoryState;
}

const IDENTIFIER_TYPES: readonly { type: IdentifierType; label: string }[] = [
  { type: 'EAN', label: 'EAN barcode' },
  { type: 'UPC', label: 'UPC barcode' },
  { type: 'QR', label: 'QR code' },
  { type: 'INTERNAL_CODE', label: 'Store code' },
];

function load(client: CatalogueClient, productId: string): DetailState {
  try {
    return { detail: client.getProductDetail(productId), failure: null };
  } catch (error) {
    return { detail: null, failure: error instanceof Error ? error.message : 'Unknown failure.' };
  }
}

function loadPriceHistory(client: CatalogueClient, productId: string): PriceHistoryState {
  try {
    return { rows: client.getPurchasePriceHistory(productId), failure: null };
  } catch (error) {
    return {
      rows: [],
      failure: error instanceof Error ? error.message : 'Purchase price history could not be read.',
    };
  }
}

function loadScreen(client: CatalogueClient, productId: string): ScreenState {
  const detail = load(client, productId);
  return {
    detail,
    priceHistory: detail.detail
      ? loadPriceHistory(client, detail.detail.product.id)
      : { rows: [], failure: null },
  };
}

/**
 * M2-02 product detail: identity display plus rename, local-SKU edit, and
 * identifier management. Package management lands in M2-03 and lifecycle
 * actions in M2-04.
 */
export default function ProductDetailScreen({
  client,
  productId,
  justSaved = false,
  onBack,
  onAddPackage,
  onEditPackage,
}: ProductDetailScreenProps) {
  const [screen, setScreen] = useState<ScreenState>(() => loadScreen(client, productId));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [localSku, setLocalSku] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [identifierValue, setIdentifierValue] = useState('');
  const [associating, setAssociating] = useState(false);
  const [scanSession] = useState(() => new ScanSession());
  const [identifierOperationId, setIdentifierOperationId] = useState(generateMobileId);
  const [identifierType, setIdentifierType] = useState<IdentifierType>('EAN');
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [reorderText, setReorderText] = useState('');
  const [reorderError, setReorderError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);
  const reorderProductIdRef = useRef<string | null>(null);

  const state = screen.detail;
  const detail = state.detail;
  const priceHistory = screen.priceHistory;
  useEffect(() => {
    if (!detail || reorderProductIdRef.current === detail.product.id) {
      return;
    }
    reorderProductIdRef.current = detail.product.id;
    setReorderText(
      detail.product.reorderLevelBaseMicros === null
        ? ''
        : formatQuantityMicros(detail.product.reorderLevelBaseMicros),
    );
    setReorderError(null);
  }, [detail]);
  const refresh = useCallback((): void => {
    setScreen(loadScreen(client, productId));
  }, [client, productId]);
  const retryPriceHistory = useCallback((): void => {
    if (!detail) {
      return;
    }
    setScreen((current) => ({
      ...current,
      priceHistory: loadPriceHistory(client, detail.product.id),
    }));
  }, [client, detail]);
  const identityDirty = Boolean(
    editing && detail && (name !== detail.variant.name || localSku !== (detail.product.localSku ?? '')),
  );
  const persistedReorderText =
    detail?.product.reorderLevelBaseMicros === null || detail === null
      ? ''
      : formatQuantityMicros(detail.product.reorderLevelBaseMicros);
  const reorderDirty = detail !== null && reorderText !== persistedReorderText;
  const dirty = identityDirty || identifierValue.trim().length > 0 || reorderDirty;

  const requestBack = useCallback((): void => {
    if (!dirty) {
      onBack();
      return;
    }
    Alert.alert('Discard unsaved entries?', 'Your unsaved product entries will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onBack },
    ]);
  }, [dirty, onBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) {
        return false;
      }
      requestBack();
      return true;
    });
    return () => subscription.remove();
  }, [dirty, requestBack]);

  const cancelIdentityEdit = (): void => {
    if (!identityDirty) {
      setEditing(false);
      return;
    }
    Alert.alert('Discard product changes?', 'Your name or SKU changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: () => setEditing(false) },
    ]);
  };

  const beginEdit = (): void => {
    if (!detail) {
      return;
    }
    setName(detail.variant.name);
    setLocalSku(detail.product.localSku ?? '');
    setNameError(null);
    setSkuError(null);
    setFailure(null);
    setEditing(true);
  };

  const saveIdentity = (): void => {
    if (saving || !detail) {
      return;
    }
    if (name.trim().length === 0) {
      setNameError('Enter a product name.');
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      client.updateProductIdentity({
        storeProductId: detail.product.id,
        name: name.trim(),
        localSku: localSku.trim().length === 0 ? null : localSku.trim(),
      });
      refresh();
      setEditing(false);
    } catch (error) {
      if (error instanceof DomainError && error.message.toLowerCase().includes('sku')) {
        setSkuError(error.message);
      } else if (error instanceof DomainError && error.message.toLowerCase().includes('product name')) {
        setNameError('Enter a product name.');
      } else {
        setFailure('These changes could not be saved on the device. Nothing was changed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const saveReorderLevel = (): void => {
    if (saving || !detail) {
      return;
    }
    setSaving(true);
    setFailure(null);
    setReorderError(null);
    try {
      const reorderLevelBaseMicros = parseQuantityDecimal(reorderText.trim());
      const result = client.updateReorderLevel({
        storeProductId: detail.product.id,
        reorderLevelBaseMicros,
        expectedVersion: detail.product.version,
      });
      setReorderText(formatQuantityMicros(result.storeProduct.reorderLevelBaseMicros ?? 0));
      refresh();
    } catch (error) {
      if (error instanceof DomainError) {
        setReorderError(error.message);
      } else {
        setFailure('This low-stock threshold could not be saved on the device. Nothing was changed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const clearReorderLevel = (): void => {
    if (saving || !detail) {
      return;
    }
    setSaving(true);
    setFailure(null);
    setReorderError(null);
    try {
      client.updateReorderLevel({
        storeProductId: detail.product.id,
        reorderLevelBaseMicros: null,
        expectedVersion: detail.product.version,
      });
      setReorderText('');
      refresh();
    } catch (error) {
      if (error instanceof DomainError) {
        setReorderError(error.message);
      } else {
        setFailure('This low-stock threshold could not be cleared on the device. Nothing was changed.');
      }
    } finally {
      setSaving(false);
    }
  };

  const markEnriched = (): void => {
    if (saving || !detail) {
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      client.markProductEnriched({ storeProductId: detail.product.id });
      refresh();
    } catch {
      setFailure('This product could not be marked enriched. Nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  const changeActive = (active: boolean): void => {
    if (saving || !detail) {
      return;
    }
    if (!active && !confirmingDeactivate) {
      setConfirmingDeactivate(true);
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      client.setProductActive({ storeProductId: detail.product.id }, active);
      setConfirmingDeactivate(false);
      refresh();
    } catch {
      setFailure('This product status could not be changed. Nothing was changed.');
    } finally {
      setSaving(false);
    }
  };

  const addIdentifier = (): void => {
    if (saving || !detail) {
      return;
    }
    if (identifierValue.trim().length === 0) {
      setIdentifierError('Enter the code exactly as printed.');
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      client.addProductIdentifier({
        operationId: identifierOperationId,
        storeProductId: detail.product.id,
        type: identifierType,
        value: identifierType === 'QR' ? identifierValue : identifierValue.trim(),
      });
      setIdentifierValue('');
      setIdentifierOperationId(generateMobileId());
      setIdentifierError(null);
      refresh();
    } catch (error) {
      if (error instanceof DomainError) {
        setIdentifierError(error.message);
      } else {
        setFailure('This code could not be saved on the device. Nothing was changed.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (associating && client.recognition) return <ScannerPanel service={client.recognition}
    session={scanSession} active onCandidate={() => false} onSearch={() => setAssociating(false)}
    onCancel={() => setAssociating(false)} basketMode={false} onModeChange={() => undefined}
    summary="Scan a code, then explicitly save it on this product." onUndo={() => undefined}
    onUseCode={detection => {
      setIdentifierValue(detection.value);
      setIdentifierType(detection.symbology === 'qr' ? 'QR' : detection.symbology === 'upc_a' ? 'UPC' : 'EAN');
      setIdentifierOperationId(generateMobileId());
      setAssociating(false);
    }} />;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {state.failure !== null || detail === null ? (
        <ErrorPanel
          title="Product unavailable"
          message="This product could not be read from the device."
          onRetry={refresh}
          onDismiss={requestBack}
        />
      ) : (
        <View style={styles.body}>
          {editing ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Edit product</Text>
              <Field
                label="Product name"
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  setNameError(null);
                }}
                error={nameError}
                maxLength={500}
                testID="detail-name"
              />
              <Field
                label="Local SKU"
                value={localSku}
                onChangeText={(text) => {
                  setLocalSku(text);
                  setSkuError(null);
                }}
                error={skuError}
                hint="Your own code. Each code can be used once per store; prices and packages never change here."
                maxLength={64}
                testID="detail-sku"
              />
              <View style={styles.row}>
                <PrimaryButton
                  title={saving ? 'Saving…' : 'Save changes'}
                  onPress={saveIdentity}
                  disabled={saving}
                />
                <SecondaryButton title="Cancel" onPress={cancelIdentityEdit} />
              </View>
            </View>
          ) : (
            <View style={styles.section}>
              <Text accessibilityRole="header" style={styles.title}>
                {detail.variant.name}
              </Text>
              {detail.product.isTemporary ? (
                <Text style={styles.temporary}>
                  Temporary — an incomplete record you can use now and improve later.
                </Text>
              ) : null}
              {justSaved ? (
                <Text style={styles.saved}>Saved on this device. It has not been sent anywhere.</Text>
              ) : (
                <StatusNote>Saved on this device</StatusNote>
              )}
              <Text style={styles.line}>Local SKU: {detail.product.localSku ?? 'Not set'}</Text>
              <Text style={styles.line}>
                Status: {detail.product.status === 'ACTIVE' ? 'Active' : 'Inactive'}
              </Text>
              <SecondaryButton title="Edit name or SKU" onPress={beginEdit} />
            </View>
          )}
          {failure !== null ? <ErrorPanel title="Not saved" message={failure} /> : null}
          <ProductPhoto photos={client.photos} productId={detail.product.id} />
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Codes</Text>
            {client.recognition ? <PrimaryButton title="Associate barcode" disabled={process.env.EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED !== 'true'} onPress={() => setAssociating(true)} /> : null}
            {detail.identifiers.length === 0 ? (
              <Text style={styles.line}>No barcode or store code yet.</Text>
            ) : (
              detail.identifiers.map((identifier) => (
                <Text key={identifier.id} style={styles.line}>
                  {identifier.value} ({identifier.type}
                  {identifier.status === 'ACTIVE' ? '' : ', inactive'})
                </Text>
              ))
            )}
            <Field
              label="Add a code"
              value={identifierValue}
              onChangeText={(text) => {
                setIdentifierValue(text);
                setIdentifierError(null);
              }}
              error={identifierError}
              hint="Barcode digits or your own store code."
              maxLength={128}
              testID="detail-identifier"
            />
            <View style={styles.typeRow}>
              {IDENTIFIER_TYPES.map((option) => (
                <Pressable
                  key={option.type}
                  accessibilityRole="button"
                  accessibilityState={{ selected: identifierType === option.type }}
                  onPress={() => setIdentifierType(option.type)}
                  style={[
                    styles.typeOption,
                    identifierType === option.type && styles.typeOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      identifierType === option.type && styles.typeOptionTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <PrimaryButton
              title={saving ? 'Adding…' : 'Add code'}
              onPress={addIdentifier}
              disabled={saving}
            />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Low-stock alert</Text>
            <Text style={styles.line}>
              {detail.product.reorderLevelBaseMicros === null
                ? 'No threshold is set. This product will not create a low-stock alert until you set one.'
                : `Current threshold: ${formatQuantityMicros(detail.product.reorderLevelBaseMicros)} ${detail.packages.find((packageUnit) => packageUnit.isBaseUnit)?.name ?? 'base units'}`}
            </Text>
            <Field
              label={`Low-stock threshold (${detail.packages.find((packageUnit) => packageUnit.isBaseUnit)?.name ?? 'base units'})`}
              value={reorderText}
              onChangeText={(text) => {
                setReorderText(text);
                setReorderError(null);
              }}
              error={reorderError}
              hint="Enter an exact non-negative quantity in the product's base unit. Zero is valid."
              keyboardType="decimal-pad"
              maxLength={30}
              testID="detail-reorder-threshold"
            />
            <PrimaryButton
              title={saving ? 'Saving…' : 'Save threshold'}
              onPress={saveReorderLevel}
              disabled={saving}
            />
            {detail.product.reorderLevelBaseMicros !== null || reorderText.trim().length > 0 ? (
              <SecondaryButton title="Clear threshold" onPress={clearReorderLevel} />
            ) : null}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Packages</Text>
            {detail.packages.map((packageUnit) => {
              const setting = detail.settings.find((entry) => entry.packageUnitId === packageUnit.id);
              const price = displayMoney(setting?.defaultSellingPriceMinor, client.storeCurrencyCode);
              const markers: string[] = [];
              if (packageUnit.isBaseUnit) {
                markers.push('Base unit');
              }
              if (packageUnit.status === 'INACTIVE') {
                markers.push('Inactive');
              }
              if (setting?.isPreferredForSale) {
                markers.push('Preferred for sale');
              }
              return (
                <Pressable
                  key={packageUnit.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Edit ${packageUnit.name} package`}
                  onPress={() => onEditPackage(packageUnit.id)}
                  style={styles.packageRow}
                >
                  <Text style={styles.line}>
                    {packageUnit.name}
                    {markers.length > 0 ? ` (${markers.join(' · ')})` : ''}
                  </Text>
                  {!packageUnit.isBaseUnit ? (
                    <Text style={styles.line}>
                      1 {packageUnit.name} = {formatQuantityMicros(packageUnit.conversionToBaseMicros)} base units
                    </Text>
                  ) : null}
                  {price ? <Text style={styles.line}>Selling price: {price}</Text> : null}
                </Pressable>
              );
            })}
            <SecondaryButton title="Add package" onPress={onAddPackage} />
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purchase price history</Text>
            <Text style={styles.line}>Store-private original purchase prices. Later product or package edits do not rewrite these facts.</Text>
            {priceHistory.failure !== null ? (
              <ErrorPanel
                title="Purchase price history unavailable"
                message="The saved purchase prices could not be read from this device."
                onRetry={retryPriceHistory}
              />
            ) : priceHistory.rows.length === 0 ? (
              <Text style={styles.line}>No purchase price history yet.</Text>
            ) : (
              priceHistory.rows.map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                  <Text style={styles.line}>{entry.productNameSnapshot}</Text>
                  <Text style={styles.line}>
                    {formatQuantityMicros(entry.quantityPackagesMicros)} {entry.packageNameSnapshot} · 1 package = {formatQuantityMicros(entry.conversionToBaseSnapshotMicros)} base units
                  </Text>
                  <Text style={styles.line}>Entered {entry.costBasis.toLowerCase()} cost: {displayMoney(entry.enteredCostMinor, entry.currencyCode)}</Text>
                  <Text style={styles.line}>Purchase total: {displayMoney(entry.totalPurchaseCostMinor, entry.currencyCode)}</Text>
                  <Text style={styles.line}>
                    Receipt cost estimate: {displayRationalMinorPerBaseUnit(
                      entry.baseUnitCostNumerator,
                      entry.baseUnitCostDenominator,
                      entry.currencyCode,
                    ) ?? 'Unavailable'} per base unit (display rounded to the nearest {currencyMinorUnitLabel(entry.currencyCode)})
                  </Text>
                  <Text style={styles.line}>
                    Current cost availability: {isUsableCurrentCost({
                      coverageStatus: entry.currentCostCoverageStatus,
                      quantityCostedBaseMicros: entry.currentCostQuantityCostedBaseMicros,
                      averageUnitCost: entry.currentCostAverageUnitCostNumerator && entry.currentCostAverageUnitCostDenominator
                        ? {
                            numerator: entry.currentCostAverageUnitCostNumerator,
                            denominator: entry.currentCostAverageUnitCostDenominator,
                          }
                        : null,
                    }) ? 'Estimated cost available for current stock' : 'Unavailable for current stock; do not infer profit'}
                  </Text>
                  <Text style={styles.line}>Supplier: {entry.supplierNameSnapshot ?? 'Not recorded'}</Text>
                  <Text style={styles.line}>Observed: {new Date(entry.occurredAt).toLocaleString()} · Contribution: off</Text>
                </View>
              ))
            )}
          </View>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product status</Text>
            {detail.product.isTemporary ? (
              <Text style={styles.line}>
                Temporary records can be used right away. Mark this enriched when its identity
                is complete; prices, packages, and history stay untouched.
              </Text>
            ) : null}
            {detail.product.isTemporary ? (
              <PrimaryButton
                title={saving ? 'Saving…' : 'Mark as enriched'}
                onPress={markEnriched}
                disabled={saving}
              />
            ) : null}
            {detail.product.status === 'ACTIVE' ? (
              <SecondaryButton
                title={confirmingDeactivate ? 'Confirm deactivate' : 'Deactivate product'}
                onPress={() => changeActive(false)}
              />
            ) : (
              <SecondaryButton title="Reactivate product" onPress={() => changeActive(true)} />
            )}
          </View>
          <SecondaryButton title="Back to products" onPress={requestBack} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), backgroundColor: theme.color.canvas },
  body: { gap: theme.spacing(3) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  temporary: { color: theme.color.statusWarning, fontSize: theme.fontSize.body, fontWeight: '600' },
  saved: { color: theme.color.actionPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  section: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
  },
  sectionTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  line: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 26 },
  historyRow: { borderTopColor: theme.color.border, borderTopWidth: 1, paddingTop: theme.spacing(2), gap: theme.spacing(1) },
  packageRow: {
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(2),
    justifyContent: 'center',
  },
  row: { gap: theme.spacing(2) },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  typeOption: {
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(3),
    justifyContent: 'center',
    backgroundColor: theme.color.canvas,
  },
  typeOptionSelected: { backgroundColor: theme.color.actionPrimary, borderColor: theme.color.actionPrimary },
  typeOptionText: { color: theme.color.textPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  typeOptionTextSelected: { color: theme.color.raised },
});
