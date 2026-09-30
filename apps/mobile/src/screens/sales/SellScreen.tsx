import {
  calculateSaleLine,
  calculateSaleTotals,
  type CalculatedSaleLine,
  DomainError,
  parseQuantityDecimal,
} from '@retail/domain';
import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import {
  Alert,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { CatalogueClient, TemporaryProductGraph } from '../../catalogue/client';
import type { BarcodeInput, RecognitionCandidate } from '@retail/contracts';
import ScannerPanel from '../../features/scanning/ScannerPanel';
import { ScanSession } from '../../features/scanning/session';
import { useScanFeedback } from '../../features/scanning/useScanFeedback';
import { generateMobileId } from '../../crypto/mobileIds';
import type { CustomerAccountRow, PaymentMethod } from '../../db/repositories';
import type {
  CompletedSaleGraph,
  SalesClient,
  SellablePackageOption,
  SellableProductHit,
} from '../../sales/client';
import type { SaleDraftExit } from '../../sales/draftExit';
import { EmptyState, ErrorPanel, Field, PrimaryButton, SecondaryButton, StatusNote } from '../../ui/components';
import { displayMoney, formatMinorForEdit, parseMajorUnitsToMinor } from '../../ui/money';
import { theme } from '../../ui/theme';
import QuickAddProductScreen from '../products/QuickAddProductScreen';
import SaleDetailScreen from './SaleDetailScreen';
import SaleHistoryScreen from './SaleHistoryScreen';

export interface CartLine {
  id: string;
  storeProductId: string;
  productVariantId: string;
  packageUnitId: string;
  productName: string;
  packageName: string;
  conversionToBaseMicros: number;
  quantityPackagesMicros: number;
  quantityText: string;
  unitPriceMinor: number;
  unitPriceText: string;
  discountAmountMinor: number;
  discountText: string;
  lineTotalMinor: number;
  calculated: CalculatedSaleLine;
}

interface SellScreenProps {
  client: SalesClient;
  catalogueClient?: CatalogueClient;
  /** Optional route-level hook used to guard tab and navigation exits. */
  onDirtyDraftChange?: (draft: SaleDraftExit | null) => void;
  /** Provided by the route so global Back never belongs to a blurred Sell tab. */
  isFocused?: boolean;
  initialScan?: boolean;
  scannerEnabled?: boolean;
  /** Inject only in verification until the physical fast-add gate is accepted. */
  automaticScanAdditionVerified?: boolean;
  scanAssociationsVerified?: boolean;
}

type ViewMode = 'cart' | 'quick_add' | 'history' | 'detail' | 'confirmation';

const PAYMENT_METHODS: readonly { method: PaymentMethod; label: string }[] = [
  { method: 'CASH', label: 'Cash' },
  { method: 'BANK_TRANSFER', label: 'Transfer' },
  { method: 'POS_CARD', label: 'POS/card' },
  { method: 'CREDIT', label: 'Credit' },
];

interface ProductSearchState {
  results: SellableProductHit[];
  failure: string | null;
}

interface PackageReadFailure {
  hit: SellableProductHit;
  existingLine?: CartLine;
}

function readProducts(client: SalesClient, query: string): ProductSearchState {
  try {
    return { results: client.searchProducts(query), failure: null };
  } catch {
    return {
      results: [],
      failure: 'Products could not be read from this device. Your current cart is preserved.',
    };
  }
}

export default function SellScreen({
  client,
  catalogueClient,
  onDirtyDraftChange,
  isFocused = true,
  initialScan = false,
  scannerEnabled = process.env.EXPO_PUBLIC_SCANNER_ENABLED !== 'false',
  automaticScanAdditionVerified = false,
  scanAssociationsVerified = process.env.EXPO_PUBLIC_SCANNER_ASSOCIATIONS_ENABLED === 'true',
}: SellScreenProps) {
  const [scanning, setScanning] = useState(initialScan);
  const [muted, setMuted] = useState(false);
  const playScanFeedback = useScanFeedback(scannerEnabled && !muted && isFocused);
  const [scanSession] = useState(() => new ScanSession());
  const [basketMode, setBasketMode] = useState(false);
  const [resumeScanner, setResumeScanner] = useState(false);
  const [scanLine, setScanLine] = useState(false);
  const [scanIdentifier, setScanIdentifier] = useState<{ value: string; type: 'EAN' | 'UPC' | 'QR' }>();
  const [associationOperationId, setAssociationOperationId] = useState(generateMobileId);
  const keepDetection = (detection?: Pick<BarcodeInput, 'symbology' | 'value'>) => {
    setScanLine(true);
    setAssociationOperationId(generateMobileId());
    setScanIdentifier(detection ? { value: detection.value,
      type: detection.symbology === 'qr' ? 'QR' : detection.symbology === 'upc_a' ? 'UPC' : 'EAN' } : undefined);
    setResumeScanner(basketMode);
    setScanning(false);
    setSearchQuery('');
  };
  // Navigation & Subscreen Mode
  const [viewMode, setViewMode] = useState<ViewMode>('cart');
  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<CompletedSaleGraph | null>(null);

  // Catalogue Search
  const [searchQuery, setSearchQuery] = useState('');
  const [productSearch, setProductSearch] = useState<ProductSearchState>(() => readProducts(client, ''));
  const [packageReadFailure, setPackageReadFailure] = useState<PackageReadFailure | null>(null);
  const [quickAddSavedNotice, setQuickAddSavedNotice] = useState<string | null>(null);
  const searchResults = productSearch.results;

  // Cart & Line Items
  const [lines, setLines] = useState<CartLine[]>([]);

  // Line Configuration (Modal / Sub-form state)
  const [configuringProduct, setConfiguringProduct] = useState<SellableProductHit | null>(null);
  const [availablePackages, setAvailablePackages] = useState<SellablePackageOption[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<SellablePackageOption | null>(null);
  const [quantityText, setQuantityText] = useState('1');
  const [unitPriceText, setUnitPriceText] = useState('');
  const [discountText, setDiscountText] = useState('');
  const [editingLineId, setEditingLineId] = useState<string | null>(null);
  const [lineFormDirty, setLineFormDirty] = useState(false);
  const [lineErrors, setLineErrors] = useState<{
    quantity?: string;
    price?: string;
    discount?: string;
    general?: string;
  }>({});

  // Payment
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [customerName, setCustomerName] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerMatches, setCustomerMatches] = useState<CustomerAccountRow[]>([]);
  const [customerReadFailure, setCustomerReadFailure] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Quick Add owns its fields, but exposes a raw discard callback so a tab
  // transition cannot bypass its own local dirty-form confirmation.
  const [quickAddDiscard, setQuickAddDiscard] = useState<(() => void) | null>(null);

  // Cancel/discard ends the unresolved scan intent, not the existing basket.
  // Search -> selection and saved Quick Add deliberately do not use this exit.
  const endScanIntent = useCallback(() => {
    scanSession.cancel();
    setScanning(false);
    setScanIdentifier(undefined);
    setScanLine(false);
    setResumeScanner(false);
  }, [scanSession]);

  const closeLineConfiguration = useCallback((): void => {
    endScanIntent();
    setConfiguringProduct(null);
    setEditingLineId(null);
    setLineFormDirty(false);
  }, [endScanIntent]);

  const closeQuickAdd = useCallback((): void => {
    endScanIntent();
    setQuickAddDiscard(null);
    setViewMode('cart');
  }, [endScanIntent, setViewMode]);

  const discardSaleDraft = useCallback((): void => {
    // If Quick Add is open, let it leave its local form before this screen
    // clears the parent cart. Both are in-memory-only under D-037.
    quickAddDiscard?.();
    setQuickAddDiscard(null);
    setLines([]);
    scanSession.repeatExplicitly();
    closeLineConfiguration();
    setCustomerName('');
    setSelectedCustomerId(null);
    setCustomerMatches([]);
    setPaymentMethod('CASH');
    setSubmitError(null);
  }, [closeLineConfiguration, quickAddDiscard, scanSession]);

  const draftExit = useMemo<SaleDraftExit | null>(() => {
    if (quickAddDiscard) {
      return { reason: 'quick-add', discard: discardSaleDraft };
    }
    if (lineFormDirty) {
      return { reason: 'line', discard: discardSaleDraft };
    }
    if (lines.length > 0) {
      return { reason: 'cart', discard: discardSaleDraft };
    }
    return null;
  }, [discardSaleDraft, lineFormDirty, lines.length, quickAddDiscard]);

  // Publish a changed draft before React Native can paint an interactive tab
  // bar. A normal effect leaves a small window in which a rapid tab tap can
  // leave a newly-created cart without this route-level guard seeing it.
  useLayoutEffect(() => {
    onDirtyDraftChange?.(draftExit);
    return () => onDirtyDraftChange?.(null);
  }, [draftExit, onDirtyDraftChange]);

  const loadProducts = useCallback((query: string): SellableProductHit[] | null => {
    const next = readProducts(client, query);
    setProductSearch(next);
    return next.failure === null ? next.results : null;
  }, [client]);

  // Search updater
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    setQuickAddSavedNotice(null);
    loadProducts(text);
  };

  // Guard every locally-owned draft exit. Completed sales never use these
  // paths; their durable confirmation/history state is safe to leave.
  const confirmDiscardCart = useCallback(
    (afterDiscard: () => void = () => undefined) => {
      const discard = () => {
        discardSaleDraft();
        afterDiscard();
      };
      if (lines.length === 0) {
        discard();
        return;
      }
      Alert.alert('Discard sale?', 'Your uncompleted sale will be lost.', [
        { text: 'Keep editing', style: 'cancel' },
        { text: 'Discard', style: 'destructive', onPress: discard },
      ]);
    },
    [discardSaleDraft, lines.length],
  );

  const confirmDiscardLine = useCallback(() => {
    if (!lineFormDirty) {
      closeLineConfiguration();
      return;
    }
    Alert.alert('Discard line?', 'Your uncompleted line changes will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: closeLineConfiguration },
    ]);
  }, [closeLineConfiguration, lineFormDirty]);

  const confirmDiscardQuickAdd = useCallback(() => {
    if (!quickAddDiscard) {
      closeQuickAdd();
      return;
    }
    Alert.alert('Discard product?', 'Your product entries will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => {
          quickAddDiscard();
          closeQuickAdd();
        },
      },
    ]);
  }, [closeQuickAdd, quickAddDiscard]);

  useEffect(() => {
    if (!isFocused) {
      return;
    }
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (scanning) { endScanIntent(); return true; }
      if (viewMode === 'detail') {
        setViewMode('history');
        return true;
      }
      if (viewMode === 'history') {
        setViewMode('cart');
        return true;
      }
      if (viewMode === 'quick_add') {
        confirmDiscardQuickAdd();
        return true;
      }
      if (configuringProduct !== null) {
        confirmDiscardLine();
        return true;
      }
      if (lines.length > 0) {
        confirmDiscardCart();
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [
    configuringProduct,
    confirmDiscardCart,
    confirmDiscardLine,
    confirmDiscardQuickAdd,
    isFocused,
    lines.length,
    viewMode,
    scanning,
    endScanIntent,
  ]);

  // Open line configuration for a product
  const startConfiguringLine = useCallback((
    hit: SellableProductHit,
    existingLine?: CartLine,
  ) => {
    let pkgs: SellablePackageOption[];
    try {
      pkgs = client.getProductPackages(hit.storeProductId);
    } catch {
      setPackageReadFailure({ hit, existingLine });
      return;
    }
    setPackageReadFailure(null);
    setAvailablePackages(pkgs);

    const initialPkg = existingLine
      ? pkgs.find((p) => p.id === existingLine.packageUnitId) ?? pkgs[0]
      : hit.preferredPackage ?? pkgs[0];

    setSelectedPackage(initialPkg ?? null);
    setQuantityText(
      existingLine ? existingLine.quantityText : '1',
    );

    if (existingLine) {
      setUnitPriceText(existingLine.unitPriceText);
      setDiscountText(existingLine.discountText);
      setEditingLineId(existingLine.id);
    } else {
      const defaultPrice = initialPkg?.sellingPriceMinor ?? null;
      setUnitPriceText(defaultPrice !== null ? formatMinorForEdit(defaultPrice) : '');
      setDiscountText('');
      setEditingLineId(null);
    }

    setLineErrors({});
    setLineFormDirty(false);
    setConfiguringProduct(hit);
  }, [client]);

  // Change selected package in line configuration
  const configureScannedCandidate = (candidate: RecognitionCandidate) => {
    try {
      const hit = client.getProductById?.(candidate.storeProductId);
      if (!hit || hit.variantId !== candidate.productVariantId) throw new Error('Product unavailable');
      const packages = client.getProductPackages(hit.storeProductId);
      const exact = candidate.packageUnitId === null ? null : packages.find(p => p.id === candidate.packageUnitId);
      if (candidate.packageUnitId !== null && !exact) throw new Error('Package unavailable');
      if (basketMode && automaticScanAdditionVerified && exact && exact.sellingPriceMinor !== null) {
        const calculated = calculateSaleLine({ quantityPackagesMicros: 1000000,
          conversionToBaseMicros: exact.conversionToBaseMicros, unitPriceMinor: exact.sellingPriceMinor, discountAmountMinor: 0 });
        const line: CartLine = { id: `scan-${Date.now()}-${Math.random()}`, storeProductId: hit.storeProductId,
          productVariantId: hit.variantId, packageUnitId: exact.id, productName: hit.productName,
          packageName: exact.name, conversionToBaseMicros: exact.conversionToBaseMicros,
          quantityPackagesMicros: 1000000, quantityText: '1', unitPriceMinor: exact.sellingPriceMinor,
          unitPriceText: formatMinorForEdit(exact.sellingPriceMinor), discountAmountMinor: 0, discountText: '',
          lineTotalMinor: calculated.netTotalMinor, calculated };
        calculateSaleTotals([...lines, line].map(item => item.calculated));
        setLines(current => [...current, line]);
        playScanFeedback();
        return true;
      }
      startConfiguringLine(hit);
      setScanLine(true);
      setScanIdentifier(undefined);
      setResumeScanner(basketMode);
      setSelectedPackage(exact ?? null);
      setUnitPriceText(exact?.sellingPriceMinor === null || exact?.sellingPriceMinor === undefined ? '' : formatMinorForEdit(exact.sellingPriceMinor));
      setScanning(false);
      return false;
    } catch {
      setQuickAddSavedNotice('This scanned product could not be loaded safely. Search products or retry. Your basket is preserved.');
      setScanning(false);
      return false;
    }
  };

  const handleSelectPackage = (pkg: SellablePackageOption) => {
    if (pkg.id !== selectedPackage?.id) {
      setLineFormDirty(true);
    }
    setSelectedPackage(pkg);
    if (!editingLineId) {
      const price = pkg.sellingPriceMinor ?? null;
      setUnitPriceText(price !== null ? formatMinorForEdit(price) : '');
    }
  };

  // Calculate live preview for current line configuration
  const calculateCurrentLine = (): {
    quantityMicros: number;
    priceMinor: number;
    discountMinor: number;
    lineTotalMinor: number;
    calculated: CalculatedSaleLine | null;
    error: string | null;
  } | null => {
    if (!selectedPackage) return null;
    if (!quantityText.trim() || !unitPriceText.trim()) return null;

    let quantityMicros: number;
    try {
      quantityMicros = parseQuantityDecimal(quantityText.trim());
      if (quantityMicros <= 0) return null;
    } catch {
      return null;
    }

    let priceMinor: number;
    try {
      priceMinor = parseMajorUnitsToMinor(unitPriceText.trim(), client.storeCurrencyCode);
      if (priceMinor < 0) return null;
    } catch {
      return null;
    }

    let discountMinor = 0;
    if (discountText.trim().length > 0) {
      try {
        discountMinor = parseMajorUnitsToMinor(discountText.trim(), client.storeCurrencyCode);
        if (discountMinor < 0) return null;
      } catch {
        return null;
      }
    }

    try {
      const calc = calculateSaleLine({
        quantityPackagesMicros: quantityMicros,
        conversionToBaseMicros: selectedPackage.conversionToBaseMicros,
        unitPriceMinor: priceMinor,
        discountAmountMinor: discountMinor,
      });
      return {
        quantityMicros,
        priceMinor,
        discountMinor,
        lineTotalMinor: calc.netTotalMinor,
        calculated: calc,
        error: null,
      };
    } catch {
      return null;
    }
  };

  // Commit line to cart
  const commitLine = () => {
    if (!configuringProduct) return;

    if (!selectedPackage || availablePackages.length === 0) {
      setLineErrors({ general: 'No sellable package unit is available for this product.' });
      return;
    }

    const errors: Record<string, string> = {};

    let quantityMicros = 0;
    if (quantityText.trim().length === 0) {
      errors.quantity = 'Enter a quantity.';
    } else {
      try {
        quantityMicros = parseQuantityDecimal(quantityText.trim());
        if (quantityMicros <= 0) {
          errors.quantity = 'Enter a positive quantity.';
        }
      } catch {
        errors.quantity = 'Enter a positive quantity with up to 6 decimal places.';
      }
    }

    let priceMinor = 0;
    if (unitPriceText.trim().length === 0) {
      errors.price = 'Enter a selling price.';
    } else {
      try {
        priceMinor = parseMajorUnitsToMinor(unitPriceText.trim(), client.storeCurrencyCode);
        if (priceMinor < 0) {
          errors.price = 'Price cannot be negative.';
        }
      } catch {
        errors.price = 'Enter a valid price with up to 2 decimal places.';
      }
    }

    let discountMinor = 0;
    if (discountText.trim().length > 0) {
      try {
        discountMinor = parseMajorUnitsToMinor(discountText.trim(), client.storeCurrencyCode);
        if (discountMinor < 0) {
          errors.discount = 'Discount cannot be negative.';
        }
      } catch {
        errors.discount = 'Enter a valid discount with up to 2 decimal places.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setLineErrors(errors);
      return;
    }

    let calc: CalculatedSaleLine;
    try {
      calc = calculateSaleLine({
        quantityPackagesMicros: quantityMicros,
        conversionToBaseMicros: selectedPackage.conversionToBaseMicros,
        unitPriceMinor: priceMinor,
        discountAmountMinor: discountMinor,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid line values.';
      if (message.toLowerCase().includes('discount')) {
        setLineErrors({ discount: message });
      } else {
        setLineErrors({ general: message });
      }
      return;
    }

    const newLine: CartLine = {
      id: editingLineId ?? `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      storeProductId: configuringProduct.storeProductId,
      productVariantId: configuringProduct.variantId,
      packageUnitId: selectedPackage.id,
      productName: configuringProduct.productName,
      packageName: selectedPackage.name,
      conversionToBaseMicros: selectedPackage.conversionToBaseMicros,
      quantityPackagesMicros: quantityMicros,
      quantityText: quantityText.trim(),
      unitPriceMinor: priceMinor,
      unitPriceText: unitPriceText.trim(),
      discountAmountMinor: discountMinor,
      discountText: discountText.trim(),
      lineTotalMinor: calc.netTotalMinor,
      calculated: calc,
    };

    const candidateLines = editingLineId
      ? lines.map((line) => (line.id === editingLineId ? newLine : line))
      : [...lines, newLine];
    try {
      calculateSaleTotals(candidateLines.map((line) => line.calculated));
    } catch (error) {
      setLineErrors({
        general: error instanceof Error ? error.message : 'This line would make the sale total unsafe.',
      });
      return;
    }

    setLines(candidateLines);
    if (scanLine || resumeScanner) playScanFeedback();
    setScanLine(false);
    setScanIdentifier(undefined);
    if (resumeScanner) { setScanning(true); setResumeScanner(false); }

    setConfiguringProduct(null);
    setEditingLineId(null);
    setLineFormDirty(false);
    setSearchQuery('');
    loadProducts('');
  };

  const removeLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Cart totals calculation. Candidate mutations are checked before state
  // changes; this defensive boundary also keeps a corrupt/incomplete draft
  // from crashing render or being recorded.
  const cartTotals = useMemo(() => {
    if (lines.length === 0) {
      return { subtotalMinor: 0, discountTotalMinor: 0, totalMinor: 0, lineCount: 0 };
    }
    try {
      return calculateSaleTotals(lines.map((line) => line.calculated));
    } catch {
      return null;
    }
  }, [lines]);
  const totals = cartTotals ?? { subtotalMinor: 0, discountTotalMinor: 0, totalMinor: 0, lineCount: 0 };

  const loadCustomerMatches = useCallback((query: string): void => {
    if (query.length === 0) {
      setCustomerMatches([]);
      setCustomerReadFailure(null);
      return;
    }
    try {
      setCustomerMatches(client.searchCustomers(query));
      setCustomerReadFailure(null);
    } catch {
      setCustomerMatches([]);
      setCustomerReadFailure(
        'Existing customers could not be searched on this device. Retry before choosing to create a new customer account.',
      );
    }
  }, [client]);

  // Customer search for credit
  const handleCustomerNameChange = (text: string) => {
    setCustomerName(text);
    setSelectedCustomerId(null);
    loadCustomerMatches(text.trim());
  };

  const handleSelectCustomer = (customer: CustomerAccountRow) => {
    setSelectedCustomerId(customer.id);
    setCustomerName(customer.name);
    setCustomerMatches([]);
    setCustomerReadFailure(null);
  };

  // Complete Sale
  const handleCompleteSale = () => {
    if (submitting || lines.length === 0) return;
    if (cartTotals === null) {
      setSubmitError('This cart has an unsafe total. Review the affected line before recording the sale.');
      return;
    }

    if (paymentMethod === 'CREDIT') {
      if (totals.totalMinor <= 0) {
        setSubmitError('Credit sales must have a positive total amount owed.');
        return;
      }
      if (customerName.trim().length === 0) {
        setSubmitError('Enter a customer name for credit sales.');
        return;
      }
      if (customerName.trim().length > 200) {
        setSubmitError('Customer name cannot exceed 200 characters.');
        return;
      }
      if (customerReadFailure && !selectedCustomerId) {
        setSubmitError('Retry the customer search before creating a new credit customer account.');
        return;
      }
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      const graph = client.completeSale({
        lines: lines.map((l) => ({
          storeProductId: l.storeProductId,
          packageUnitId: l.packageUnitId,
          quantityPackagesMicros: l.quantityPackagesMicros,
          unitPriceMinor: l.unitPriceMinor,
          discountAmountMinor: l.discountAmountMinor > 0 ? l.discountAmountMinor : undefined,
        })),
        payment: {
          method: paymentMethod,
          customerName: paymentMethod === 'CREDIT' ? customerName.trim() : undefined,
          customerAccountId: selectedCustomerId ?? undefined,
        },
      });

      setCompletedSale(graph);
      endScanIntent();
      setLines([]);
      setCustomerName('');
      setSelectedCustomerId(null);
      setPaymentMethod('CASH');
      setViewMode('confirmation');
    } catch (error) {
      if (error instanceof DomainError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('The sale could not be saved on this device. Your cart is preserved.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickAddDraftChange = useCallback((discard: (() => void) | null) => {
    setQuickAddDiscard((current) => (current === discard ? current : discard));
  }, []);

  const handleQuickAddSaved = useCallback((newProductId: string) => {
    setQuickAddDiscard(null);
    setViewMode('cart');
    setSearchQuery('');
    const allHits = loadProducts('');
    if (!allHits) {
      setQuickAddSavedNotice(
        'Product saved on this device. Its catalogue listing could not be refreshed; retry before adding it to this sale.',
      );
      return;
    }
    const createdHit = client.getProductById?.(newProductId) ?? allHits.find((hit) => hit.storeProductId === newProductId);
    if (createdHit) {
      startConfiguringLine(createdHit);
      return;
    }
    setQuickAddSavedNotice(
      'Product saved on this device. It is not currently available to add to this sale; refresh the catalogue and try again.',
    );
  }, [client, loadProducts, startConfiguringLine]);

  const addQuickSale = (graph: TemporaryProductGraph, quantityMicros: number) => {
    const price = graph.storeProduct.defaultSellingPriceMinor!;
    const calculated = calculateSaleLine({ quantityPackagesMicros: quantityMicros,
      conversionToBaseMicros: graph.basePackage.conversionToBaseMicros, unitPriceMinor: price, discountAmountMinor: 0 });
    const line: CartLine = { id: graph.outbox.operationId, storeProductId: graph.storeProduct.id,
      productVariantId: graph.variant.id, packageUnitId: graph.basePackage.id, productName: graph.variant.name,
      packageName: graph.basePackage.name, conversionToBaseMicros: graph.basePackage.conversionToBaseMicros,
      quantityPackagesMicros: quantityMicros, quantityText: String(quantityMicros / 1000000),
      unitPriceMinor: price, unitPriceText: formatMinorForEdit(price), discountAmountMinor: 0, discountText: '',
      lineTotalMinor: calculated.netTotalMinor, calculated };
    calculateSaleTotals([...lines.filter(item => item.id !== line.id), line].map(item => item.calculated));
    setLines(current => current.some(item => item.id === line.id) ? current : [...current, line]);
    if (scanLine) playScanFeedback();
    setQuickAddDiscard(null);
    setViewMode('cart');
    setSearchQuery('');
    setScanIdentifier(undefined);
    setScanLine(false);
    setScanning(resumeScanner);
    setResumeScanner(false);
    loadProducts('');
  };

  // Quick Add proxy client if needed
  const effectiveCatalogueClient: CatalogueClient = catalogueClient ?? {
    photos: client.photos,
    storeId: client.storeId,
    storeName: client.storeName,
    storeCurrencyCode: client.storeCurrencyCode,
    listProducts: () => [],
    createTemporaryProduct: (input) => client.createTemporaryProduct(input),
    getProductDetail: () => null,
    getPurchasePriceHistory: () => [],
    updateProductIdentity: () => {
      throw new Error('Not implemented');
    },
    addProductIdentifier: () => {
      throw new Error('Not implemented');
    },
    createPackage: () => {
      throw new Error('Not implemented');
    },
    updatePackage: () => {
      throw new Error('Not implemented');
    },
    deactivatePackage: () => {
      throw new Error('Not implemented');
    },
    markProductEnriched: () => {
      throw new Error('Not implemented');
    },
    setProductActive: () => {
      throw new Error('Not implemented');
    },
    updateReorderLevel: () => {
      throw new Error('Not implemented');
    },
  };

  // Subscreen: Quick Add
  if (scannerEnabled && scanning && client.recognition) {
    return <ScannerPanel service={client.recognition} session={scanSession} active={isFocused}
      muted={muted} onToggleSound={() => setMuted(value => !value)}
      basketMode={basketMode} onModeChange={setBasketMode}
      summary={`${lines.length} lines · ${displayMoney(totals.totalMinor, client.storeCurrencyCode)}${lines.length ? ` · Last added: ${lines[lines.length - 1]!.productName}` : ''}`}
      onUndo={() => setLines(current => current.slice(0, -1))}
      onCandidate={configureScannedCandidate} onSearch={keepDetection}
      onCreate={detection => { keepDetection(detection); setViewMode('quick_add'); }}
      onCancel={endScanIntent} />;
  }
  if (viewMode === 'quick_add') {
    return (
      <QuickAddProductScreen
        client={effectiveCatalogueClient}
        initialName={searchQuery.trim()}
        initialIdentifier={scanIdentifier}
        allowScannedAssociation={scanAssociationsVerified}
        saleShortcut
        onSaleReady={addQuickSale}
        onSaved={handleQuickAddSaved}
        onCancel={closeQuickAdd}
        onDirtyDraftChange={handleQuickAddDraftChange}
        isFocused={isFocused}
      />
    );
  }

  // Subscreen: History
  if (viewMode === 'history') {
    return (
      <SaleHistoryScreen
        client={client}
        onOpenSale={(saleId) => {
          setSelectedSaleId(saleId);
          setViewMode('detail');
        }}
        onBack={() => setViewMode('cart')}
      />
    );
  }

  // Subscreen: Detail
  if (viewMode === 'detail' && selectedSaleId) {
    return (
      <SaleDetailScreen
        client={client}
        saleId={selectedSaleId}
        onBack={() => setViewMode('history')}
      />
    );
  }

  // Subscreen: Confirmation
  if (viewMode === 'confirmation' && completedSale) {
    const totalDisplay = displayMoney(
      completedSale.sale.totalMinor,
      client.storeCurrencyCode,
    );
    const method = completedSale.payment.method;
    const methodText =
      method === 'CASH'
        ? 'Paid with Cash'
        : method === 'BANK_TRANSFER'
          ? 'Paid with Bank Transfer'
          : method === 'POS_CARD'
            ? 'Paid with POS / Card'
            : `Recorded as Credit (owed by ${completedSale.customerAccount?.name ?? 'customer'})`;

    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.confirmationCard}>
          <Text accessibilityRole="header" style={styles.confirmationTitle}>
            Sale complete
          </Text>
          <Text accessibilityLabel={`Total ${totalDisplay}`} style={styles.confirmationTotal}>
            {totalDisplay}
          </Text>
          <Text style={styles.confirmationMethod}>{methodText}</Text>
          <Text style={styles.confirmationItems}>{completedSale.items.length} items</Text>
          <View style={styles.savedBadge}>
            <Text style={styles.savedBadgeText}>Saved on this device</Text>
          </View>
        </View>

        <View style={styles.confirmationActions}>
          <PrimaryButton
            title="New sale"
            onPress={() => {
              endScanIntent();
              scanSession.repeatExplicitly();
              setCompletedSale(null);
              setViewMode('cart');
            }}
          />
          <SecondaryButton
            title="View sale"
            onPress={() => {
              setSelectedSaleId(completedSale.sale.id);
              setViewMode('detail');
            }}
          />
        </View>
      </ScrollView>
    );
  }

  // Subscreen / Sub-form: Line Configuration
  if (configuringProduct !== null) {
    const liveCalc = calculateCurrentLine();
    const liveLineTotal = liveCalc && !liveCalc.error ? displayMoney(liveCalc.lineTotalMinor, client.storeCurrencyCode) : null;

    return (
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text accessibilityRole="header" style={styles.title}>
          {editingLineId ? 'Edit line' : 'Add to sale'}
        </Text>
        <Text style={styles.productNameHeading}>{configuringProduct.productName}</Text>
        {scanIdentifier ? <View>
          <Text>Scanned {scanIdentifier.type}: {scanIdentifier.value}</Text>
          {scanAssociationsVerified && catalogueClient ? <SecondaryButton title="Save barcode for this product and selected package" onPress={() => {
            try {
              catalogueClient.addProductIdentifier({ storeProductId: configuringProduct.storeProductId,
                type: scanIdentifier.type, value: scanIdentifier.value,
                packageUnitId: selectedPackage?.id ?? null, operationId: associationOperationId });
              setScanIdentifier(undefined);
              setQuickAddSavedNotice('Barcode saved on this device. The sale is not completed yet.');
            } catch (error) {
              setLineErrors({ general: error instanceof Error ? error.message : 'Barcode could not be saved. Your sale is preserved.' });
            }
          }} /> : <Text>Barcode saving is awaiting sync verification. Manual selling remains available.</Text>}
        </View> : null}
        {configuringProduct.recordedBaseMicros !== undefined ? <Text>Recorded stock: {configuringProduct.recordedBaseMicros / 1000000} base units</Text> : null}

        {availablePackages.length > 1 || (availablePackages.length === 1 && selectedPackage === null) ? (
          <View>
            <Text style={styles.fieldLabel}>Package</Text>
            <View accessibilityRole="radiogroup" style={styles.packageChoices}>
              {availablePackages.map((pkg) => {
                const selected = selectedPackage?.id === pkg.id;
                return (
                  <Pressable
                    key={pkg.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={pkg.name}
                    onPress={() => handleSelectPackage(pkg)}
                    style={[styles.choiceChip, selected && styles.choiceChipSelected]}
                  >
                    <Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>
                      {pkg.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : selectedPackage ? (
          <Text style={styles.metaLabel}>Selling as: {selectedPackage.name}</Text>
        ) : (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            This product has no sellable package units configured.
          </Text>
        )}

        <Field
          label="Quantity"
          value={quantityText}
          onChangeText={(val) => {
            setQuantityText(val);
            setLineFormDirty(true);
            setLineErrors((prev) => ({ ...prev, quantity: undefined, general: undefined }));
          }}
          error={lineErrors.quantity}
          keyboardType="decimal-pad"
          testID="line-quantity-input"
        />

        <Field
          label={`Selling price per ${selectedPackage?.name ?? 'item'}`}
          value={unitPriceText}
          onChangeText={(val) => {
            setUnitPriceText(val);
            setLineFormDirty(true);
            setLineErrors((prev) => ({ ...prev, price: undefined, general: undefined }));
          }}
          error={lineErrors.price}
          keyboardType="decimal-pad"
          testID="line-price-input"
        />

        <Field
          label="Line discount (optional)"
          value={discountText}
          onChangeText={(val) => {
            setDiscountText(val);
            setLineFormDirty(true);
            setLineErrors((prev) => ({ ...prev, discount: undefined, general: undefined }));
          }}
          error={lineErrors.discount}
          keyboardType="decimal-pad"
          placeholder="0.00"
          testID="line-discount-input"
        />

        {liveLineTotal ? (
          <View style={styles.livePreviewCard}>
            <Text style={styles.livePreviewLabel}>Line total</Text>
            <Text style={styles.livePreviewTotal}>{liveLineTotal}</Text>
          </View>
        ) : null}

        {lineErrors.general ? (
          <Text accessibilityRole="alert" style={styles.fieldError}>
            {lineErrors.general}
          </Text>
        ) : null}

        <View style={styles.formActions}>
          <PrimaryButton
            title={editingLineId ? 'Update line' : 'Add to cart'}
            onPress={commitLine}
            disabled={!selectedPackage || availablePackages.length === 0}
          />
          <SecondaryButton
            title="Cancel"
            onPress={confirmDiscardLine}
          />
        </View>
      </ScrollView>
    );
  }

  // Main Screen: Cart + Catalogue Search + Payment
  const totalDisplay = displayMoney(totals.totalMinor, client.storeCurrencyCode) ?? '0.00';
  const subtotalDisplay = displayMoney(totals.subtotalMinor, client.storeCurrencyCode) ?? '0.00';
  const discountTotalDisplay =
    totals.discountTotalMinor > 0
      ? displayMoney(totals.discountTotalMinor, client.storeCurrencyCode)
      : null;
  const creditCompletionBlocked =
    paymentMethod === 'CREDIT' &&
    customerName.trim().length > 0 &&
    customerReadFailure !== null &&
    selectedCustomerId === null;

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      {/* Top Header */}
      <View style={styles.topHeader}>
        {scannerEnabled && client.recognition ? <SecondaryButton title="Scan next item" onPress={() => { endScanIntent(); setScanning(true); }} /> : null}
        <View style={styles.titleArea}>
          <Text accessibilityRole="header" style={styles.title}>
            Sell
          </Text>
          <Text style={styles.storeLine}>
            {client.storeName} · <StatusNote>Works offline, saved on this device</StatusNote>
          </Text>
        </View>
        <SecondaryButton title="Recent sales" onPress={() => setViewMode('history')} />
      </View>

      {/* Cart Review Section (if lines present) */}
      {lines.length > 0 ? (
        <View style={styles.cartSection}>
          <View style={styles.cartSectionHeader}>
            <Text style={styles.sectionTitle}>Cart ({lines.length})</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Discard sale"
              onPress={() => confirmDiscardCart()}
              style={styles.discardButton}
            >
              <Text style={styles.discardButtonText}>Discard</Text>
            </Pressable>
          </View>

          {lines.map((line) => {
            const lineTotalFormatted = displayMoney(line.lineTotalMinor, client.storeCurrencyCode);
            const unitPriceFormatted = displayMoney(line.unitPriceMinor, client.storeCurrencyCode);
            const discountFormatted =
              line.discountAmountMinor > 0
                ? displayMoney(line.discountAmountMinor, client.storeCurrencyCode)
                : null;

            return (
              <View key={line.id} style={styles.cartLineCard}>
                <View style={styles.cartLineMain}>
                  <Text style={styles.cartLineName}>{line.productName}</Text>
                  <Text style={styles.cartLineMeta}>
                    {line.quantityText} {line.packageName} @ {unitPriceFormatted}
                  </Text>
                  {discountFormatted ? (
                    <Text style={styles.discountValue}>- {discountFormatted} discount</Text>
                  ) : null}
                </View>
                <View style={styles.cartLineRight}>
                  <Text style={styles.cartLineTotal}>{lineTotalFormatted}</Text>
                  <View style={styles.cartLineActions}>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Edit ${line.productName}`}
                      onPress={() => {
                        const hit: SellableProductHit = {
                          storeProductId: line.storeProductId,
                          variantId: line.productVariantId,
                          productName: line.productName,
                          localSku: null,
                          preferredPackage: null,
                          isTemporary: false,
                        };
                        startConfiguringLine(hit, line);
                      }}
                      style={styles.lineActionLink}
                    >
                      <Text style={styles.actionLinkText}>Edit</Text>
                    </Pressable>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${line.productName}`}
                      onPress={() => removeLine(line.id)}
                      style={styles.lineActionLink}
                    >
                      <Text style={styles.removeLinkText}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}

          {/* Totals Box */}
          {cartTotals === null ? (
            <ErrorPanel
              title="Cart total unavailable"
              message="One or more cart lines have an unsafe total. Edit or remove the affected line before recording this sale."
            />
          ) : (
            <View style={styles.totalsBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.metaLabel}>Subtotal</Text>
                <Text style={styles.metaValue}>{subtotalDisplay}</Text>
              </View>
              {discountTotalDisplay ? (
                <View style={styles.summaryRow}>
                  <Text style={styles.metaLabel}>Total discounts</Text>
                  <Text style={styles.discountValue}>- {discountTotalDisplay}</Text>
                </View>
              ) : null}
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text accessibilityLabel={`Total: ${totalDisplay}`} style={styles.totalAmountText}>
                  {totalDisplay}
                </Text>
              </View>
            </View>
          )}
        </View>
      ) : null}

      {/* Catalogue Search / Add Item Section */}
      <View style={styles.searchSection}>
        <Text style={styles.sectionTitle}>
          {lines.length > 0 ? 'Add another item' : 'Find product'}
        </Text>
        <TextInput
          accessibilityLabel="Search products"
          accessibilityHint="Search by product name, local SKU, or barcode"
          placeholder="Search name, local SKU, or barcode"
          placeholderTextColor={theme.color.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          style={styles.search}
        />

        {quickAddSavedNotice ? (
          <Text accessibilityRole="alert" style={styles.savedProductNotice}>
            {quickAddSavedNotice}
          </Text>
        ) : null}

        {packageReadFailure ? (
          <ErrorPanel
            title="Product packages unavailable"
            message="Package options could not be read from this device. Your cart is preserved."
            onRetry={() => startConfiguringLine(packageReadFailure.hit, packageReadFailure.existingLine)}
            onDismiss={() => setPackageReadFailure(null)}
          />
        ) : null}

        {productSearch.failure ? (
          <ErrorPanel
            title="Products unavailable"
            message={productSearch.failure}
            onRetry={() => loadProducts(searchQuery)}
          />
        ) : searchResults.length === 0 ? (
          <EmptyState
            title={searchQuery.trim().length > 0 ? 'No matching product' : 'No products yet'}
            body={
              searchQuery.trim().length > 0
                ? `Nothing in this store matches "${searchQuery.trim()}". Add it with just a name and improve it later.`
                : 'Add your first product to start selling. You can use it right away and add details later.'
            }
            actionTitle="Add product"
            onAction={() => setViewMode('quick_add')}
          />
        ) : (
          <View style={styles.resultsList}>
            {searchResults.slice(0, 10).map((hit) => {
              const price = hit.preferredPackage?.sellingPriceMinor
                ? displayMoney(hit.preferredPackage.sellingPriceMinor, client.storeCurrencyCode)
                : null;

              return (
                <Pressable
                  key={hit.storeProductId}
                  accessibilityRole="button"
                  accessibilityLabel={`${hit.productName}${hit.isTemporary ? ', Temporary' : ''}`}
                  onPress={() => startConfiguringLine(hit)}
                  style={styles.hitRow}
                >
                  <View style={styles.hitInfo}>
                    <Text style={styles.hitName}>{hit.productName}</Text>
                    {hit.isTemporary ? (
                      <Text style={styles.temporaryBadge}>Temporary</Text>
                    ) : null}
                    {hit.preferredPackage ? (
                      <Text style={styles.hitMeta}>Sold per {hit.preferredPackage.name}</Text>
                    ) : null}
                  </View>
                  {price ? <Text style={styles.hitPrice}>{price}</Text> : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </View>

      {/* Payment & Complete Sale Section (Only visible when cart has items) */}
      {lines.length > 0 ? (
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment</Text>

          {/* Payment Method Selector */}
          <View accessibilityRole="radiogroup" style={styles.paymentMethodsRow}>
            {PAYMENT_METHODS.map((pm) => {
              const selected = paymentMethod === pm.method;
              return (
                <Pressable
                  key={pm.method}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={pm.label}
                  onPress={() => {
                    setPaymentMethod(pm.method);
                    setSubmitError(null);
                  }}
                  style={[styles.paymentChip, selected && styles.paymentChipSelected]}
                >
                  <Text
                    style={[
                      styles.paymentChipText,
                      selected && styles.paymentChipTextSelected,
                    ]}
                  >
                    {pm.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Credit Details */}
          {paymentMethod === 'CREDIT' ? (
            <View style={styles.creditForm}>
              <View style={styles.creditWarningCard}>
                <Text style={styles.creditWarningText}>
                  {totalDisplay} will be owed by the customer. This is recorded as an open receivable, not cash received.
                </Text>
              </View>

              <Field
                label="Customer name"
                value={customerName}
                onChangeText={handleCustomerNameChange}
                placeholder="Enter customer name"
                testID="credit-customer-name"
              />

              {customerReadFailure ? (
                <ErrorPanel
                  title="Customer search unavailable"
                  message={customerReadFailure}
                  onRetry={() => loadCustomerMatches(customerName.trim())}
                />
              ) : null}

              {customerName.trim().length > 0 && !selectedCustomerId && !customerReadFailure ? (
                <View style={styles.newCustomerNotice}>
                  <Text style={styles.matchesLabel}>New customer account</Text>
                  <Text style={styles.newCustomerNoticeText}>
                    Completing this sale will create a new local customer account for “{customerName.trim()}”. Existing names are never merged automatically.
                  </Text>
                </View>
              ) : null}

              {selectedCustomerId ? (
                <Text style={styles.selectedCustomerText}>Existing customer selected for this credit sale.</Text>
              ) : null}

              {customerMatches.length > 0 ? (
                <View style={styles.customerMatchesList}>
                  <Text style={styles.matchesLabel}>Existing customers:</Text>
                  {customerMatches.slice(0, 5).map((c) => (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Select existing customer ${c.name}`}
                      onPress={() => handleSelectCustomer(c)}
                      style={styles.customerMatchRow}
                    >
                      <Text style={styles.customerMatchName}>{c.name}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : null}

          {submitError ? (
            <ErrorPanel
              title="Sale not recorded"
              message={submitError}
              onDismiss={() => setSubmitError(null)}
            />
          ) : null}

          {/* Complete Button */}
          <View style={styles.completeButtonContainer}>
            <PrimaryButton
              title={submitting ? 'Recording sale...' : `Complete sale · ${totalDisplay}`}
              onPress={handleCompleteSale}
              disabled={submitting || cartTotals === null || creditCompletionBlocked}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: theme.spacing(4),
    gap: theme.spacing(4),
    backgroundColor: theme.color.canvas,
  },
  topHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing(2),
  },
  titleArea: { flex: 1, gap: theme.spacing(1) },
  title: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '600' },
  storeLine: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  sectionTitle: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.title,
    fontWeight: '600',
    marginBottom: theme.spacing(2),
  },
  search: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(3),
    fontSize: theme.fontSize.body,
    color: theme.color.textPrimary,
  },
  searchSection: { gap: theme.spacing(2) },
  resultsList: { gap: theme.spacing(2) },
  hitRow: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    paddingVertical: theme.spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hitInfo: { flex: 1, gap: theme.spacing(1) },
  hitName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  temporaryBadge: { color: theme.color.statusWarning, fontSize: theme.fontSize.small, fontWeight: '600' },
  hitMeta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  hitPrice: { color: theme.color.actionPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  savedProductNotice: {
    color: theme.color.statusWarning,
    fontSize: theme.fontSize.small,
    fontWeight: '600',
    lineHeight: 20,
  },

  // Cart
  cartSection: { gap: theme.spacing(2) },
  cartSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  discardButton: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(2),
  },
  discardButtonText: { color: theme.color.statusDanger, fontSize: theme.fontSize.small, fontWeight: '600' },
  cartLineCard: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(3),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cartLineMain: { flex: 1, gap: theme.spacing(1) },
  cartLineName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  cartLineMeta: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  cartLineRight: { alignItems: 'flex-end', gap: theme.spacing(1) },
  cartLineTotal: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '700' },
  cartLineActions: { flexDirection: 'row', gap: theme.spacing(3) },
  lineActionLink: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingHorizontal: theme.spacing(1),
  },
  actionLinkText: { color: theme.color.actionPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  removeLinkText: { color: theme.color.statusDanger, fontSize: theme.fontSize.small, fontWeight: '600' },

  // Totals
  totalsBox: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    gap: theme.spacing(2),
    marginTop: theme.spacing(1),
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.color.canvas,
    paddingTop: theme.spacing(2),
  },
  metaLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.body },
  metaValue: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  discountValue: { color: theme.color.statusDanger, fontSize: theme.fontSize.small, fontWeight: '600' },
  totalLabel: { color: theme.color.textPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },
  totalAmountText: { color: theme.color.actionPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },

  // Line configuration
  productNameHeading: {
    color: theme.color.actionPrimary,
    fontSize: theme.fontSize.title,
    fontWeight: '700',
    marginBottom: theme.spacing(2),
  },
  packageChoices: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2), marginBottom: theme.spacing(2) },
  choiceChip: {
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    justifyContent: 'center',
    backgroundColor: theme.color.raised,
  },
  choiceChipSelected: {
    backgroundColor: theme.color.actionPrimary,
    borderColor: theme.color.actionPrimary,
  },
  choiceChipText: { color: theme.color.textPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  choiceChipTextSelected: { color: theme.color.raised },
  fieldLabel: {
    color: theme.color.textPrimary,
    fontSize: theme.fontSize.body,
    fontWeight: '600',
    marginBottom: theme.spacing(1),
  },
  fieldError: {
    color: theme.color.statusDanger,
    fontSize: theme.fontSize.small,
    marginTop: theme.spacing(1),
  },
  livePreviewCard: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.actionPrimary,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(4),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing(2),
  },
  livePreviewLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.body, fontWeight: '600' },
  livePreviewTotal: { color: theme.color.actionPrimary, fontSize: theme.fontSize.title, fontWeight: '700' },
  formActions: { gap: theme.spacing(2), marginTop: theme.spacing(2) },

  // Payment
  paymentSection: {
    gap: theme.spacing(3),
    borderTopWidth: 1,
    borderTopColor: theme.color.border,
    paddingTop: theme.spacing(4),
  },
  paymentMethodsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing(2) },
  paymentChip: {
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    minHeight: theme.minTouchTarget,
    paddingHorizontal: theme.spacing(4),
    justifyContent: 'center',
    backgroundColor: theme.color.raised,
  },
  paymentChipSelected: {
    backgroundColor: theme.color.actionPrimary,
    borderColor: theme.color.actionPrimary,
  },
  paymentChipText: { color: theme.color.textPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  paymentChipTextSelected: { color: theme.color.raised },
  creditForm: { gap: theme.spacing(2) },
  creditWarningCard: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.statusWarning,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(3),
  },
  creditWarningText: { color: theme.color.statusWarning, fontSize: theme.fontSize.small, lineHeight: 20 },
  customerMatchesList: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.border,
    borderWidth: 1,
    borderRadius: theme.radius.card,
    padding: theme.spacing(3),
    gap: theme.spacing(2),
  },
  matchesLabel: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, fontWeight: '600' },
  newCustomerNotice: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.statusWarning,
    borderWidth: 1,
    borderRadius: theme.radius.field,
    padding: theme.spacing(3),
    gap: theme.spacing(1),
  },
  newCustomerNoticeText: { color: theme.color.textSecondary, fontSize: theme.fontSize.small, lineHeight: 20 },
  selectedCustomerText: { color: theme.color.actionPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  customerMatchRow: {
    minHeight: theme.minTouchTarget,
    justifyContent: 'center',
    paddingVertical: theme.spacing(1),
  },
  customerMatchName: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  completeButtonContainer: { paddingTop: theme.spacing(2) },

  // Confirmation View
  confirmationCard: {
    backgroundColor: theme.color.raised,
    borderColor: theme.color.actionPrimary,
    borderWidth: 2,
    borderRadius: theme.radius.card,
    padding: theme.spacing(6),
    alignItems: 'center',
    gap: theme.spacing(2),
    marginVertical: theme.spacing(4),
  },
  confirmationTitle: { color: theme.color.textPrimary, fontSize: theme.fontSize.header, fontWeight: '700' },
  confirmationTotal: { color: theme.color.actionPrimary, fontSize: 36, fontWeight: '700' },
  confirmationMethod: { color: theme.color.textPrimary, fontSize: theme.fontSize.body, fontWeight: '600' },
  confirmationItems: { color: theme.color.textSecondary, fontSize: theme.fontSize.small },
  savedBadge: {
    backgroundColor: theme.color.canvas,
    paddingHorizontal: theme.spacing(3),
    paddingVertical: theme.spacing(1),
    borderRadius: theme.radius.field,
    marginTop: theme.spacing(2),
  },
  savedBadgeText: { color: theme.color.actionPrimary, fontSize: theme.fontSize.small, fontWeight: '600' },
  confirmationActions: { gap: theme.spacing(2) },
});
