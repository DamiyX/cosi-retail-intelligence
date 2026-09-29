import { barcodeIdentityKey, barcodeInputSchema, type RecognitionCandidate, type RecognitionService } from '@retail/contracts';

import type { DatabaseAdapter } from '../../db/adapter';

interface Mapping {
  store_product_id: string;
  product_variant_id: string;
  package_unit_id: string | null;
  type: string;
  value: string;
  disputed: number;
}

export function createRecognitionService(adapter: DatabaseAdapter, storeId: string): RecognitionService {
  return {
    async recognize(input) {
      const parsed = barcodeInputSchema.safeParse(input);
      if (!parsed.success) return { status: 'UNKNOWN', reason: 'UNSUPPORTED' };
      const key = barcodeIdentityKey(input.symbology, input.value);
      if (!key) return { status: 'UNKNOWN', reason: 'INVALID_CODE' };
      // Include all aliases before selecting. Inventory balance never filters identity.
      const rows = adapter.getAllRows<Mapping>(`
        SELECT sp.id AS store_product_id, i.product_variant_id, i.package_unit_id, i.type, i.value,
          EXISTS (SELECT 1 FROM sync_conflicts c WHERE c.store_id = sp.store_id AND c.status = 'OPEN'
            AND (c.entity_id = i.id OR c.entity_id = sp.id OR c.entity_id = i.product_variant_id)) AS disputed
        FROM product_identifiers i
        JOIN product_variants v ON v.id = i.product_variant_id
        JOIN store_products sp ON sp.product_variant_id = v.id
        LEFT JOIN package_units p ON p.id = i.package_unit_id
        WHERE sp.store_id = ? AND sp.status = 'ACTIVE' AND v.status = 'ACTIVE' AND i.status = 'ACTIVE'
          AND (v.identity_scope = 'PLATFORM' OR v.owner_store_id = ?)
          AND (i.package_unit_id IS NULL OR (p.product_variant_id = v.id AND p.status = 'ACTIVE' AND p.is_sellable = 1));
      `, [storeId, storeId]);
      const matches = rows.filter(row => {
        if (row.type === 'QR') return input.symbology === 'qr' && row.value === input.value;
        if (input.symbology === 'qr' || (row.type !== 'EAN' && row.type !== 'UPC')) return false;
        const format = row.type === 'UPC' ? 'upc_a' : row.value.length === 8 ? 'ean8' : 'ean13';
        return barcodeIdentityKey(format, row.value) === key;
      });
      const candidates = [...new Map(matches.map(row => {
        const candidate: RecognitionCandidate = {
          storeProductId: row.store_product_id, productVariantId: row.product_variant_id,
          packageUnitId: row.package_unit_id, method: 'BARCODE',
          requiresPackageConfirmation: row.package_unit_id === null,
        };
        return [`${row.store_product_id}:${row.package_unit_id}`, candidate];
      })).values()];
      if (!candidates.length) return { status: 'UNKNOWN', reason: 'NOT_FOUND' };
      if (matches.some(row => row.disputed)) return { status: 'AMBIGUOUS', candidates, reason: 'SYNC_CONFLICT' };
      if (candidates.length > 1) return { status: 'AMBIGUOUS', candidates, reason: 'MULTIPLE_MAPPINGS' };
      return { status: 'STRONG', candidate: candidates[0]! };
    },
  };
}
