import { z } from 'zod';

export const barcodeInputSchema = z.object({
  sessionId: z.string().min(1),
  requestId: z.string().min(1),
  symbology: z.enum(['ean13', 'ean8', 'upc_a', 'qr']),
  value: z.string().min(1).max(128),
}).strict();
export type BarcodeInput = z.infer<typeof barcodeInputSchema>;

const candidateSchema = z.object({
  storeProductId: z.string().uuid(),
  productVariantId: z.string().uuid(),
  packageUnitId: z.string().uuid().nullable(),
  method: z.literal('BARCODE'),
  requiresPackageConfirmation: z.boolean(),
}).strict().refine(c => c.requiresPackageConfirmation === (c.packageUnitId === null));
export type RecognitionCandidate = z.infer<typeof candidateSchema>;

export const recognitionResultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('STRONG'), candidate: candidateSchema }).strict(),
  z.object({ status: z.literal('AMBIGUOUS'), candidates: z.array(candidateSchema).min(1),
    reason: z.enum(['MULTIPLE_MAPPINGS', 'SYNC_CONFLICT']) }).strict(),
  z.object({ status: z.literal('UNKNOWN'), reason: z.enum(['NOT_FOUND', 'INVALID_CODE', 'UNSUPPORTED']) }).strict(),
]);
export type RecognitionResult = z.infer<typeof recognitionResultSchema>;

/** Bound to a validated store. Rejected I/O is an error, never UNKNOWN. */
export interface RecognitionService {
  recognize(input: BarcodeInput): Promise<RecognitionResult>;
}

/** Only validated GTINs participate in UPC-A / leading-zero EAN-13 equivalence. */
export function barcodeIdentityKey(symbology: BarcodeInput['symbology'], value: string): string | null {
  if (symbology === 'qr') return value.length > 0 && value.length <= 128 ? `qr:${value}` : null;
  const length = symbology === 'ean13' ? 13 : symbology === 'ean8' ? 8 : 12;
  if (value.length !== length || !/^\d+$/.test(value)) return null;
  let sum = 0;
  for (let index = value.length - 2, weight = 3; index >= 0; index--, weight = weight === 3 ? 1 : 3) {
    sum += Number(value[index]) * weight;
  }
  if ((10 - sum % 10) % 10 !== Number(value[value.length - 1])) return null;
  return `gtin:${length === 12 ? `0${value}` : value}`;
}
