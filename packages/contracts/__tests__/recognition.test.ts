import { barcodeIdentityKey, recognitionResultSchema } from '../src';

describe('barcode boundary', () => {
  it('validates length/check digits without losing leading zeros', () => {
    expect(barcodeIdentityKey('upc_a', '036000291452')).toBe(barcodeIdentityKey('ean13', '0036000291452'));
    expect(barcodeIdentityKey('ean8', '96385074')).toBe('gtin:96385074');
    expect(barcodeIdentityKey('ean13', '0036000291453')).toBeNull();
    expect(barcodeIdentityKey('upc_a', '36000291452')).toBeNull();
    expect(barcodeIdentityKey('qr', 'https://example.com/a-B')).not.toBe(barcodeIdentityKey('qr', 'https://example.com/ab'));
    expect(barcodeIdentityKey('qr', 'x'.repeat(129))).toBeNull();
  });
  it('rejects fabricated strong results and inconsistent package confirmation', () => {
    expect(recognitionResultSchema.safeParse({ status: 'STRONG' }).success).toBe(false);
    expect(recognitionResultSchema.safeParse({ status: 'AMBIGUOUS', candidates: [], reason: 'MULTIPLE_MAPPINGS' }).success).toBe(false);
    expect(recognitionResultSchema.safeParse({ status: 'STRONG', candidate: {
      storeProductId: '00000000-0000-4000-8000-000000000001',
      productVariantId: '00000000-0000-4000-8000-000000000002',
      packageUnitId: null, method: 'BARCODE', requiresPackageConfirmation: false,
    } }).success).toBe(false);
  });
});
