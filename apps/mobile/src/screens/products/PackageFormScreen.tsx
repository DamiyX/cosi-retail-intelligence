import { DomainError, formatQuantityMicros, parseQuantityDecimal } from '@retail/domain';
import { useEffect, useState } from 'react';
import { Alert, BackHandler, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { CatalogueClient } from '../../catalogue/client';
import type { PackageUnitRow, StorePackageSettingRow } from '../../db/repositories';
import { ErrorPanel, Field, PrimaryButton, SecondaryButton } from '../../ui/components';
import { formatMinorForEdit } from '../../ui/money';
import { theme } from '../../ui/theme';

export interface PackageFormInitial {
  name: string;
  symbol: string;
  /** Canonical decimal conversion; empty in create mode. */
  conversionText: string;
  defaultPriceText: string;
  minimumPriceText: string;
  isPreferredForSale: boolean;
  isPreferredForPurchase: boolean;
  isSellable: boolean;
  isPurchasable: boolean;
}

export const EMPTY_PACKAGE_FORM: PackageFormInitial = {
  name: '',
  symbol: '',
  conversionText: '',
  defaultPriceText: '',
  minimumPriceText: '',
  isPreferredForSale: false,
  isPreferredForPurchase: false,
  isSellable: true,
  isPurchasable: true,
};

interface PackageFormScreenProps {
  client: CatalogueClient;
  /** Owning store product; required in create mode. */
  storeProductId: string;
  baseUnitName: string;
  /** Absent in create mode; set in edit mode. */
  packageUnit?: PackageUnitRow | null;
  setting?: StorePackageSettingRow | null;
  onSaved: () => void;
  onDeactivated?: () => void;
  onCancel: () => void;
}

function initialFrom(
  packageUnit?: PackageUnitRow | null,
  setting?: StorePackageSettingRow | null,
): PackageFormInitial {
  if (!packageUnit) {
    return { ...EMPTY_PACKAGE_FORM };
  }
  return {
    name: packageUnit.name,
    symbol: packageUnit.symbol ?? '',
    conversionText: formatQuantityMicros(packageUnit.conversionToBaseMicros),
    defaultPriceText:
      setting?.defaultSellingPriceMinor === undefined || setting?.defaultSellingPriceMinor === null
        ? ''
        : formatMinorForEdit(setting.defaultSellingPriceMinor),
    minimumPriceText:
      setting?.minimumSellingPriceMinor === undefined || setting?.minimumSellingPriceMinor === null
        ? ''
        : formatMinorForEdit(setting.minimumSellingPriceMinor),
    isPreferredForSale: setting?.isPreferredForSale ?? false,
    isPreferredForPurchase: setting?.isPreferredForPurchase ?? false,
    isSellable: packageUnit.isSellable,
    isPurchasable: packageUnit.isPurchasable,
  };
}


function conversionPreview(name: string, baseUnitName: string, conversionText: string): string | null {
  const trimmed = conversionText.trim();
  if (trimmed.length === 0) {
    return null;
  }
  try {
    const micros = parseQuantityDecimal(trimmed);
    if (micros <= 0) {
      return null;
    }
    return `1 ${name.trim().length === 0 ? 'package' : name.trim()} = ${formatQuantityMicros(micros)} ${baseUnitName}`;
  } catch {
    return null;
  }
}

/**
 * M2-03 add/edit package form. The conversion preview is computed live
 * from the exact decimal parser; in edit mode the conversion is read-only
 * because changing what a package means goes through deactivate-plus-create.
 * Dirty hardware-back and cancel presses ask for confirmation first.
 */
export default function PackageFormScreen({
  client,
  storeProductId,
  baseUnitName,
  packageUnit,
  setting,
  onSaved,
  onDeactivated,
  onCancel,
}: PackageFormScreenProps) {
  const editMode = packageUnit !== undefined && packageUnit !== null;
  const [form, setForm] = useState<PackageFormInitial>(() => initialFrom(packageUnit, setting));
  const [baseline] = useState<PackageFormInitial>(() => initialFrom(packageUnit, setting));
  const [errors, setErrors] = useState<Partial<Record<'name' | 'conversion' | 'defaultPrice' | 'minimumPrice', string>>>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmingDeactivate, setConfirmingDeactivate] = useState(false);

  const dirty = JSON.stringify(form) !== JSON.stringify(baseline);

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (!dirty) {
        return false;
      }
      Alert.alert(
        'Discard package changes?',
        'Your entries will be lost. Saved packages stay unchanged.',
        [
          { text: 'Keep editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onCancel },
        ],
      );
      return true;
    });
    return () => subscription.remove();
  }, [dirty, onCancel]);

  const set = <K extends keyof PackageFormInitial>(key: K, value: PackageFormInitial[K]): void => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, name: key === 'name' ? undefined : current.name }));
  };

  const cancel = (): void => {
    if (!dirty) {
      onCancel();
      return;
    }
    Alert.alert(
      'Discard package changes?',
      'Your entries will be lost. Saved packages stay unchanged.',
      [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: onCancel },
      ],
    );
  };

  const save = (): void => {
    if (saving) {
      return;
    }
    const nextErrors: typeof errors = {};
    if (form.name.trim().length === 0) {
      nextErrors.name = 'Enter a package name, for example carton or pack.';
    }
    if (!editMode) {
      try {
        const micros = parseQuantityDecimal(form.conversionText.trim());
        if (micros <= 0) {
          nextErrors.conversion = 'A package must contain a positive amount of the base unit.';
        }
      } catch {
        nextErrors.conversion =
          'Enter how many base units this holds, with up to 6 decimals. Extra precision is rejected, not rounded.';
      }
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }
    setSaving(true);
    setFailure(null);
    try {
      if (editMode && packageUnit) {
        client.updatePackage({
          packageUnitId: packageUnit.id,
          name: form.name.trim(),
          symbol: form.symbol.trim().length === 0 ? null : form.symbol.trim(),
          isSellable: form.isSellable,
          isPurchasable: form.isPurchasable,
          setting: {
            defaultSellingPrice: orNull(form.defaultPriceText),
            minimumSellingPrice: orNull(form.minimumPriceText),
            isPreferredForSale: form.isPreferredForSale,
            isPreferredForPurchase: form.isPreferredForPurchase,
          },
        });
      } else {
        client.createPackage({
          storeProductId,
          name: form.name.trim(),
          symbol: form.symbol.trim().length === 0 ? null : form.symbol.trim(),
          conversionText: form.conversionText.trim(),
          isSellable: form.isSellable,
          isPurchasable: form.isPurchasable,
          setting: {
            defaultSellingPrice: orNull(form.defaultPriceText),
            minimumSellingPrice: orNull(form.minimumPriceText),
            isPreferredForSale: form.isPreferredForSale,
            isPreferredForPurchase: form.isPreferredForPurchase,
          },
        });
      }
      onSaved();
    } catch (error) {
      mapFailure(error, setErrors, setFailure);
      setSaving(false);
    }
  };

  const deactivate = (): void => {
    if (saving || !packageUnit) {
      return;
    }
    if (!confirmingDeactivate) {
      setConfirmingDeactivate(true);
      return;
    }
    setSaving(true);
    try {
      client.deactivatePackage({ packageUnitId: packageUnit.id });
      onDeactivated?.();
    } catch (error) {
      setFailure(
        error instanceof DomainError
          ? error.message
          : 'This package could not be deactivated. Nothing was changed.',
      );
      setSaving(false);
    }
  };

  const preview = conversionPreview(form.name, baseUnitName, editMode ? initialFrom(packageUnit, setting).conversionText : form.conversionText);

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text accessibilityRole="header" style={styles.title}>
        {editMode ? 'Edit package' : 'Add package'}
      </Text>
      <Field
        label="Package name"
        value={form.name}
        onChangeText={(text) => set('name', text)}
        error={errors.name}
        placeholder="For example, carton"
        maxLength={100}
        testID="package-name"
      />
      {editMode ? (
        <Text style={styles.note}>
          Conversion is fixed after creation: {preview}. To change what this package holds,
          deactivate it and add a replacement.
        </Text>
      ) : (
        <Field
          label={`How many ${baseUnitName} does it hold?`}
          value={form.conversionText}
          onChangeText={(text) => {
            set('conversionText', text);
            setErrors((current) => ({ ...current, conversion: undefined }));
          }}
          error={errors.conversion}
          keyboardType="decimal-pad"
          testID="package-conversion"
        />
      )}
      {preview && !editMode ? <Text style={styles.preview}>{preview}</Text> : null}
      <Field
        label="Short label (optional)"
        value={form.symbol}
        onChangeText={(text) => set('symbol', text)}
        hint="For example, ctn. Leave empty when unsure."
        maxLength={24}
        testID="package-symbol"
      />
      <Field
        label="Selling price (optional)"
        value={form.defaultPriceText}
        onChangeText={(text) => {
          set('defaultPriceText', text);
          setErrors((current) => ({ ...current, defaultPrice: undefined }));
        }}
        error={errors.defaultPrice}
        keyboardType="decimal-pad"
        testID="package-price"
      />
      <Field
        label="Lowest acceptable price (optional)"
        value={form.minimumPriceText}
        onChangeText={(text) => {
          set('minimumPriceText', text);
          setErrors((current) => ({ ...current, minimumPrice: undefined }));
        }}
        error={errors.minimumPrice}
        keyboardType="decimal-pad"
        testID="package-min-price"
      />
      <Toggle
        label="Preferred when selling"
        value={form.isPreferredForSale}
        onChange={(value) => set('isPreferredForSale', value)}
        testID="package-preferred-sale"
      />
      <Toggle
        label="Preferred when restocking"
        value={form.isPreferredForPurchase}
        onChange={(value) => set('isPreferredForPurchase', value)}
        testID="package-preferred-purchase"
      />
      {failure !== null ? <ErrorPanel title="Not saved" message={failure} /> : null}
      <View style={styles.actions}>
        <PrimaryButton
          title={saving ? 'Saving…' : editMode ? 'Save changes' : 'Save package'}
          onPress={save}
          disabled={saving}
        />
        <SecondaryButton title="Cancel" onPress={cancel} />
        {editMode && packageUnit && !packageUnit.isBaseUnit && packageUnit.status === 'ACTIVE' ? (
          <SecondaryButton
            title={confirmingDeactivate ? 'Confirm deactivate' : 'Deactivate package'}
            onPress={deactivate}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function orNull(text: string): string | null {
  return text.trim().length === 0 ? null : text.trim();
}

function mapFailure(
  error: unknown,
  setErrors: (errors: Partial<Record<'name' | 'conversion' | 'defaultPrice' | 'minimumPrice', string>>) => void,
  setFailure: (message: string) => void,
): void {
  if (error instanceof DomainError) {
    const message = error.message.toLowerCase();
    if (message.includes('package name')) {
      setErrors({ name: 'Enter a package name, for example carton or pack.' });
      return;
    }
    if (message.includes('conversion') || message.includes('base unit')) {
      setErrors({
        conversion: 'Enter how many base units this holds, with up to 6 decimals.',
      });
      return;
    }
    if (message.includes('minimum selling price') || message.includes('default selling price')) {
      setErrors({ defaultPrice: error.message, minimumPrice: error.message });
      return;
    }
    if (message.includes('at most two decimal places')) {
      setErrors({ defaultPrice: error.message });
      return;
    }
  }
  setFailure('This package could not be saved on the device. Nothing was changed.');
}

function Toggle({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      testID={testID}
      onPress={() => onChange(!value)}
      style={styles.toggle}
    >
      <Text style={styles.toggleBox}>{value ? '☑' : '☐'}</Text>
      <Text style={styles.toggleLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: theme.spacing(4), gap: theme.spacing(3), backgroundColor: theme.color.canvas },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  note: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, lineHeight: 24 },
  preview: { color: theme.color.actionPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  actions: { gap: theme.spacing(2), paddingTop: theme.spacing(2) },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing(2), minHeight: theme.minTouchTarget },
  toggleBox: { color: theme.color.actionPrimary, fontSize: 22 },
  toggleLabel: { color: theme.color.textPrimary, fontSize: theme.fontSize.body },
});
