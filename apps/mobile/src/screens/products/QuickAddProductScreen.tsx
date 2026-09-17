import { DomainError } from '@retail/domain';
import { useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CatalogueClient } from '../../catalogue/client';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton } from '../../ui/components';
import { theme } from '../../ui/theme';

interface QuickAddProductScreenProps {
  client: CatalogueClient;
  initialName?: string;
  onSaved: (productId: string) => void;
  onCancel: () => void;
  /** Lets a host guard tab/navigation exit without persisting a draft. */
  onDirtyDraftChange?: (discard: (() => void) | null) => void;
}

interface FieldErrors {
  name?: string;
  localSku?: string;
  barcode?: string;
}

function friendlyFieldError(error: DomainError): { field: keyof FieldErrors; message: string } | null {
  const message = error.message.toLowerCase();
  if (message.includes('product name')) {
    return { field: 'name', message: 'Enter a product name.' };
  }
  if (message.includes('sku')) {
    return { field: 'localSku', message: error.message };
  }
  if (message.includes('identifier') || message.includes('barcode') || message.includes('ean')) {
    return { field: 'barcode', message: 'That barcode cannot be used. Check it and try again.' };
  }
  return null;
}

export default function QuickAddProductScreen({
  client,
  initialName = '',
  onSaved,
  onCancel,
  onDirtyDraftChange,
}: QuickAddProductScreenProps) {
  const [name, setName] = useState(initialName);
  const [baseUnitName, setBaseUnitName] = useState('piece');
  const [showMore, setShowMore] = useState(false);
  const [localSku, setLocalSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [saving, setSaving] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const dirty =
    name !== initialName || baseUnitName !== 'piece' || localSku.length > 0 || barcode.length > 0;

  const cancel = useCallback((): void => {
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert('Discard product?', 'Your entries will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onCancel },
    ]);
  }, [dirty, onCancel]);

  // The Sell tab guard reads this callback synchronously at tab press time.
  // Publish a changed Quick Add draft before an interactive navigation control
  // can be painted, so a rapid tab exit cannot skip the confirmation.
  useLayoutEffect(() => {
    onDirtyDraftChange?.(dirty ? onCancel : null);
    return () => onDirtyDraftChange?.(null);
  }, [dirty, onCancel, onDirtyDraftChange]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) {
        return false;
      }
      cancel();
      return true;
    });
    return () => subscription.remove();
  }, [cancel, dirty]);

  const save = (): void => {
    if (saving) {
      return;
    }
    const nextErrors: FieldErrors = {};
    if (name.trim().length === 0) {
      nextErrors.name = 'Enter a product name.';
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      const graph = client.createTemporaryProduct({
        name: name.trim(),
        baseUnitName: baseUnitName.trim().length === 0 ? 'piece' : baseUnitName.trim(),
        localSku: localSku.trim().length === 0 ? null : localSku.trim(),
        barcode: barcode.trim().length === 0 ? null : barcode.trim(),
      });
      onSaved(graph.storeProduct.id);
    } catch (error) {
      if (error instanceof DomainError) {
        const mapped = friendlyFieldError(error);
        if (mapped) {
          setErrors({ [mapped.field]: mapped.message });
        } else {
          setFailure(error.message);
        }
      } else {
        setFailure(
          'This product could not be saved on the device. Nothing was saved; check the device storage and try again.',
        );
      }
      setSaving(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>
        Add product
      </Text>
      <Text style={styles.note}>Only a name is required. The product saves on this device.</Text>
      <Field
        label="Product name"
        value={name}
        onChangeText={(text) => {
          setName(text);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
        error={errors.name}
        placeholder="For example, Milo 400g"
        maxLength={500}
        testID="quick-add-name"
      />
      <Field
        label="Base unit"
        value={baseUnitName}
        onChangeText={setBaseUnitName}
        hint="The smallest unit you count, for example piece, sachet, or bottle."
        maxLength={100}
        testID="quick-add-base-unit"
      />
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: showMore }}
        onPress={() => setShowMore((current) => !current)}
        style={styles.moreToggle}
      >
        <Text style={styles.moreToggleText}>{showMore ? 'Hide more details' : 'Add more details'}</Text>
      </Pressable>
      {showMore ? (
        <View style={styles.more}>
          <Field
            label="Local SKU (optional)"
            value={localSku}
            onChangeText={(text) => {
              setLocalSku(text);
              setErrors((current) => ({ ...current, localSku: undefined }));
            }}
            error={errors.localSku}
            hint="Your own code for this product. Each code can be used once per store."
            maxLength={64}
            testID="quick-add-sku"
          />
          <Field
            label="Barcode (optional)"
            value={barcode}
            onChangeText={(text) => {
              setBarcode(text);
              setErrors((current) => ({ ...current, barcode: undefined }));
            }}
            error={errors.barcode}
            hint="The printed barcode digits. You can correct its type later."
            keyboardType="number-pad"
            maxLength={128}
            testID="quick-add-barcode"
          />
        </View>
      ) : null}
      {failure !== null ? (
        <ErrorPanel
          title="Not saved"
          message={failure}
          onRetry={save}
          onDismiss={cancel}
        />
      ) : null}
      <View style={styles.actions}>
        <PrimaryButton
          title={saving ? 'Saving…' : 'Save product'}
          onPress={save}
          disabled={saving}
          accessibilityHint="Save this product on this device"
        />
        <SecondaryButton title="Cancel" onPress={cancel} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  note: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  moreToggle: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
  },
  moreToggleText: {
    color: theme.color.actionPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  more: { gap: theme.spacing(3) },
  actions: { gap: theme.spacing(2), paddingTop: theme.spacing(2) },
});
