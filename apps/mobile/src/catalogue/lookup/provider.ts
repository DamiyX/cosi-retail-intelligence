import { barcodeIdentityKey } from '@retail/contracts';

export interface LookupCode { value: string; type: 'EAN' | 'UPC' | 'QR' }
export function gtin(code: LookupCode): string | null {
  if (code.type !== 'EAN' && code.type !== 'UPC') return null;
  if (code.type === 'UPC' && code.value.length !== 12) return null;
  if (code.type === 'EAN' && ![8, 13].includes(code.value.length)) return null;
  return barcodeIdentityKey(code.type === 'UPC' ? 'upc_a' : code.value.length === 8 ? 'ean8' : 'ean13', code.value)?.slice(5) ?? null;
}
export interface SuggestedDetails {
  barcode: string;
  name: string;
  brand: string | null;
  size: string | null;
  source: 'Open Food Facts';
  sourceUrl: string;
  licenceUrl: string;
}
export type LookupResult = { status: 'FOUND'; details: SuggestedDetails } |
  { status: 'NO_MATCH' | 'DISABLED' | 'OFFLINE' | 'ERROR' | 'TIMEOUT' | 'RATE_LIMIT' | 'INVALID' | 'CANCELLED' | 'LOCAL_MATCH' };
export interface CatalogueLookupAdapter {
  readonly enabled: boolean;
  lookup(barcode: string, signal: AbortSignal): Promise<LookupResult>;
}
export const disabledLookup: CatalogueLookupAdapter = { enabled: false, lookup: async () => ({ status: 'DISABLED' }) };
const MAX_BYTES = 32768;
const text = (value: unknown, limit: number): string | null => typeof value === 'string' && value.trim().length > 0 && value.length <= limit && !/[\u0000-\u001f\u007f]/.test(value) ? value.trim() : null;
export function parseProviderResponse(raw: string, barcode: string): LookupResult {
  try {
    // Check encoded bytes before JSON parsing; reject malformed surrogate strings too.
    if (raw.length > MAX_BYTES || encodeURIComponent(raw).replace(/%[A-F\d]{2}/gi, 'x').length > MAX_BYTES) return { status: 'ERROR' };
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { status: 'ERROR' };
    const data = body as Record<string, unknown>;
    if (data.status === 'failure') return { status: 'NO_MATCH' };
    if (!['success', 'success_with_warnings'].includes(String(data.status))) return { status: 'ERROR' };
    if (!data.product || typeof data.product !== 'object' || Array.isArray(data.product)) return { status: 'ERROR' };
    const product = data.product as Record<string, unknown>;
    const code = text(product.code, 13);
    if (!code || gtin({ value: code, type: code.length === 12 ? 'UPC' : 'EAN' }) !== barcode) return { status: 'INVALID' };
    const name = text(product.product_name, 300);
    if (!name) return { status: 'NO_MATCH' };
    return { status: 'FOUND', details: { barcode, name, brand: text(product.brands, 120), size: text(product.quantity, 80), source: 'Open Food Facts', sourceUrl: `https://world.openfoodfacts.org/product/${barcode}`, licenceUrl: 'https://opendatacommons.org/licenses/odbl/1-0/' } };
  } catch { return { status: 'ERROR' }; }
}

/** No instance is enabled by application configuration. Activation needs a reviewed public contact and licence decision. */
export function createOpenFoodFactsAdapter(options: {
  termsApproved: boolean;
  userAgent: string;
  fetchImpl?: typeof fetch;
}): CatalogueLookupAdapter {
  if (!options.termsApproved || !/^[A-Za-z][A-Za-z0-9 ._-]{1,60}\/[0-9.]+ \([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\)$/.test(options.userAgent)) return disabledLookup;
  const request = options.fetchImpl ?? fetch;
  return { enabled: true, async lookup(barcode, signal) {
    if (gtin({ value: barcode, type: 'EAN' }) !== barcode) return { status: 'INVALID' };
    const url = `https://world.openfoodfacts.org/api/v3.6/product/${barcode}.json?fields=code,product_name,brands,quantity`;
    try {
      const response = await request(url, { method: 'GET', headers: { 'User-Agent': options.userAgent, Accept: 'application/json' }, signal, redirect: 'error', credentials: 'omit' });
      if (signal.aborted) return { status: 'CANCELLED' };
      if (response.status === 429) return { status: 'RATE_LIMIT' };
      if (response.status === 404) return { status: 'NO_MATCH' };
      if (!response.ok || response.redirected || (response.url && response.url !== url) || !response.headers.get('content-type')?.includes('application/json')) return { status: 'ERROR' };
      const declared = response.headers.get('content-length');
      if (declared !== null && (!/^\d+$/.test(declared) || Number(declared) > MAX_BYTES)) return { status: 'ERROR' };
      const raw = await response.text();
      return signal.aborted ? { status: 'CANCELLED' } : parseProviderResponse(raw, barcode);
    } catch { return { status: signal.aborted ? 'CANCELLED' : 'OFFLINE' }; }
  } };
}
