import { DomainError, formatQuantityMicros } from '@retail/domain';
import { useCallback, useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CatalogueClient, ProductDetail } from '../../catalogue/client';
import type { IdentifierType } from '../../db/repositories';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney } from '../../ui/money';
import { theme } from '../../ui/theme';

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
  const [state, setState] = useState<DetailState>(() => load(client, productId));
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [localSku, setLocalSku] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [skuError, setSkuError] = useState<string | null>(null);
  const [identifierValue, setIdentifierValue] = useState('');
  const [identifierType, setIdentifierType] = useState<IdentifierType>('EAN');
  const [identifierError, setIdentifierError] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  const detail = state.detail;
  const identityDirty = Boolean(
    editing && detail && (name !== detail.variant.name || localSku !== (detail.product.localSku ?? '')),
  );
  const dirty = identityDirty || identifierValue.trim().length > 0;

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
      setState(load(client, productId));
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

  const markEnriched = (): void => {
    if (saving || !detail) {
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      client.markProductEnriched({ storeProductId: detail.product.id });
      setState(load(client, productId));
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
      setState(load(client, productId));
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
        storeProductId: detail.product.id,
        type: identifierType,
        value: identifierValue.trim(),
      });
      setIdentifierValue('');
      setIdentifierError(null);
      setState(load(client, productId));
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

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {state.failure !== null || detail === null ? (
        <ErrorPanel
          title="Product unavailable"
          message="This product could not be read from the device."
          onRetry={() => setState(load(client, productId))}
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
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Codes</Text>
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
