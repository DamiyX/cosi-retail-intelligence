import { DomainError, formatQuantityMicros } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  ATTENTION_POLICY_VERSION,
  createInventoryAttentionSnooze,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getDeviceById,
  getInventoryAttentionSettings,
  getInventoryAttentionSnoozeById,
  getStoreById,
  listInventoryEventsByStoreProductInLedgerOrder,
  listBatchInventoryEntriesByStoreProduct,
  listOutboxOperationsByStoreEntityInLedgerOrder,
  listInventoryAttentionSnoozesByStore,
  listStoreProducts,
  saveInventoryAttentionSettings,
  type AttentionConditionType,
  type AttentionSnoozeKind,
  type InventoryAttentionSettingsRow,
  type InventoryAttentionSnoozeRow,
  type OutboxOperationRow,
  type StoreRow,
} from '../db/repositories';
import { getBatchProjectionForStoreProduct, type BatchProjection } from './batchAllocation';
import { nowIso, requireId, requireText } from '../db/repositories/common';

const DEFAULT_EXPIRY_LEAD_DAYS = 30;

export type AttentionItemKind =
  | 'LOW_STOCK'
  | 'ZERO_STOCK'
  | 'NEGATIVE_STOCK'
  | 'EXPIRY'
  | 'DISCREPANCY'
  | 'UNKNOWN_COVERAGE';
export type AttentionSeverity = 'LOW' | 'ZERO' | 'NEGATIVE' | 'UPCOMING' | 'REACHED' | 'PASSED' | 'UNRESOLVED';
export type AttentionAction = 'RESTOCK' | 'RECONCILE' | 'REMOVE';

export interface AttentionSettings {
  storeId: string;
  expiryLeadDays: number;
  policyVersion: string;
  version: number;
  updatedByStoreMemberId: string | null;
  updatedByUserId: string | null;
  updatedByDeviceId: string | null;
  updatedAt: string | null;
}

export interface AttentionItem {
  id: string;
  conditionKey: string;
  conditionType: AttentionConditionType;
  kind: AttentionItemKind;
  severity: AttentionSeverity;
  severityRank: number;
  storeProductId: string;
  productName: string;
  groupId: string | null;
  balanceBaseMicros: string | null;
  title: string;
  detail: string;
  primaryAction: AttentionAction;
  primaryActionLabel: string;
}

export interface AttentionOverview {
  localDate: string;
  localMinute: number;
  settings: AttentionSettings;
  items: AttentionItem[];
  allConditionCount: number;
  suppressedCount: number;
}

export interface AttentionActor {
  storeId: string;
  deviceId: string;
  userId: string;
}

export interface SaveAttentionSettingsInput extends AttentionActor {
  operationId: string;
  expiryLeadDays: number;
}

export interface SnoozeAttentionInput extends AttentionActor {
  operationId: string;
  conditionKey: string;
  conditionType: AttentionConditionType;
  storeProductId: string;
  groupId?: string | null;
  severityRank: number;
  snoozeKind: AttentionSnoozeKind;
  dueLocalDate?: string;
  dueLocalMinute?: number;
  now?: string;
}

export interface SaveAttentionSettingsResult {
  settings: AttentionSettings;
  outbox: OutboxOperationRow;
}

export interface SnoozeAttentionResult {
  snooze: InventoryAttentionSnoozeRow;
  overview: AttentionOverview;
  outbox: OutboxOperationRow;
}

interface LocalTime {
  iso: string;
  date: string;
  minute: number;
}

interface ProductContext {
  storeId: string;
  storeProductId: string;
  productName: string;
  reorderLevelBaseMicros: number | null;
  projection: BatchProjection;
}

type ConditionCandidate = AttentionItem;

type StockConditionKind = Extract<AttentionItemKind, 'LOW_STOCK' | 'ZERO_STOCK' | 'NEGATIVE_STOCK'>;

function assertActor(adapter: DatabaseAdapter, input: AttentionActor, ownerOnly: boolean): { store: StoreRow; memberId: string } {
  const store = getStoreById(adapter, requireId(input.storeId));
  if (!store || store.status !== 'ACTIVE') throw new DomainError('INVALID_VALUE', 'Store does not exist or is not active.');
  const device = getDeviceById(adapter, requireId(input.deviceId));
  if (!device || device.storeId !== store.id || device.status !== 'ACTIVE') {
    throw new DomainError('INVALID_VALUE', 'Device does not belong to this store or is not active.');
  }
  const member = adapter.getFirstRow<{ id: string; role: string }>(
    `SELECT id, role FROM store_members WHERE store_id = ? AND user_id = ? AND status = 'ACTIVE' LIMIT 1;`,
    [store.id, requireId(input.userId)],
  );
  if (!member || (ownerOnly && member.role !== 'OWNER')) {
    throw new DomainError('INVALID_VALUE', ownerOnly ? 'Only an active store owner can manage attention settings and snoozes.' : 'User is not an active member of this store.');
  }
  return { store, memberId: member.id };
}

function localTime(storeTimezone: string, iso: string): LocalTime {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) throw new DomainError('INVALID_VALUE', 'Attention time is invalid.');
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: storeTimezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(instant).reduce<Record<string, string>>((values, part) => {
      if (part.type !== 'literal') values[part.type] = part.value;
      return values;
    }, {});
    const date = `${parts.year}-${parts.month}-${parts.day}`;
    const minute = Number(parts.hour) * 60 + Number(parts.minute);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isSafeInteger(minute)) throw new Error('invalid local time');
    return { iso, date, minute };
  } catch {
    throw new DomainError('INVALID_VALUE', 'Store timezone is invalid for attention reminders.');
  }
}

function calendarDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new DomainError('INVALID_VALUE', 'Calendar date must use YYYY-MM-DD.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1 || date.getUTCDate() !== Number(match[3])) {
    throw new DomainError('INVALID_VALUE', 'Calendar date is not valid.');
  }
  return date;
}

function addCalendarDays(value: string, days: number): string {
  const date = calendarDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function addCalendarMonths(value: string, months: number): string {
  const date = calendarDate(value);
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 10);
}

function compareLocalDateTime(leftDate: string, leftMinute: number, rightDate: string, rightMinute: number): number {
  if (leftDate !== rightDate) return leftDate < rightDate ? -1 : 1;
  return leftMinute === rightMinute ? 0 : leftMinute < rightMinute ? -1 : 1;
}

function localMonthLabel(value: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) throw new DomainError('INVALID_VALUE', 'Month date is invalid.');
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  if (date.getUTCFullYear() !== Number(match[1]) || date.getUTCMonth() !== Number(match[2]) - 1) {
    throw new DomainError('INVALID_VALUE', 'Month date is invalid.');
  }
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function quantityText(value: bigint): string {
  const magnitude = value < 0n ? -value : value;
  if (magnitude <= BigInt(Number.MAX_SAFE_INTEGER)) {
    const formatted = formatQuantityMicros(Number(magnitude));
    return value < 0n ? `-${formatted}` : formatted;
  }
  return `${value.toString()} micro-units`;
}

function mapSettings(storeId: string, row: InventoryAttentionSettingsRow | null): AttentionSettings {
  if (!row) {
    return {
      storeId,
      expiryLeadDays: DEFAULT_EXPIRY_LEAD_DAYS,
      policyVersion: ATTENTION_POLICY_VERSION,
      version: 0,
      updatedByStoreMemberId: null,
      updatedByUserId: null,
      updatedByDeviceId: null,
      updatedAt: null,
    };
  }
  return { ...row };
}

function productContexts(adapter: DatabaseAdapter, storeId: string): ProductContext[] {
  return listStoreProducts(adapter, storeId, '', 'ACTIVE').map((hit) => ({
    storeId,
    storeProductId: hit.product.id,
    productName: hit.variantName,
    reorderLevelBaseMicros: hit.product.reorderLevelBaseMicros,
    projection: getBatchProjectionForStoreProduct(adapter, hit.product.id),
  }));
}

function latestDiscrepancy(adapter: DatabaseAdapter, storeId: string, storeProductId: string): { difference: bigint; id: string } | null {
  const row = adapter.getFirstRow<{ id: string; difference_base_units: string | null }>(
    `SELECT rs.id, rs.difference_base_units
     FROM inventory_reconciliation_submissions rs
     JOIN inventory_reconciliation_lines rl ON rl.id = rs.reconciliation_line_id
     JOIN inventory_reconciliations r ON r.id = rl.reconciliation_id
     WHERE rl.store_id = ? AND rl.store_product_id = ?
       AND r.status = 'IN_PROGRESS' AND rs.difference_base_units IS NOT NULL
       AND rs.id = (
         SELECT latest.id
         FROM inventory_reconciliation_submissions latest
         WHERE latest.reconciliation_line_id = rs.reconciliation_line_id
         ORDER BY latest.created_at DESC, latest.id DESC LIMIT 1
       )
     ORDER BY rs.created_at DESC, rs.id DESC LIMIT 1;`,
    [requireId(storeId), requireId(storeProductId)],
  );
  if (!row || row.difference_base_units === null) return null;
  return { difference: BigInt(row.difference_base_units), id: row.id };
}

function conditionKey(prefix: string, product: ProductContext, suffix = ''): string {
  return `${prefix}:${product.storeProductId}${suffix ? `:${suffix}` : ''}`;
}

function stockConditionKind(balance: bigint, reorderLevelBaseMicros: number | null): StockConditionKind | null {
  if (balance < 0n) return 'NEGATIVE_STOCK';
  if (balance === 0n) return 'ZERO_STOCK';
  if (reorderLevelBaseMicros !== null && balance <= BigInt(reorderLevelBaseMicros)) return 'LOW_STOCK';
  return null;
}

function parseReorderLevel(value: unknown): number | null | undefined {
  if (value === null) return null;
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  return undefined;
}

function thresholdEpisodeToken(adapter: DatabaseAdapter, product: ProductContext, kind: StockConditionKind): string {
  if (kind !== 'LOW_STOCK') return 'initial';
  const fallbackBalance = BigInt(product.projection.inventoryBalanceBaseMicros);
  let previousThreshold: number | null = null;
  let token = 'initial';
  for (const operation of listOutboxOperationsByStoreEntityInLedgerOrder(
    adapter,
    product.storeId,
    'STORE_PRODUCT',
    product.storeProductId,
    'PRODUCT_REORDER_LEVEL_UPDATED',
  )) {
    type ReorderLevelEntities = {
      previousReorderLevelBaseMicros?: unknown;
      inventoryBalanceBaseMicros?: unknown;
      request?: { reorderLevelBaseMicros?: unknown };
      storeProduct?: { reorderLevelBaseMicros?: unknown };
    };
    let entities: ReorderLevelEntities;
    try {
      entities = (JSON.parse(operation.payload) as { entities?: ReorderLevelEntities }).entities ?? {};
    } catch {
      continue;
    }
    const nextThreshold = parseReorderLevel(entities.request?.reorderLevelBaseMicros ?? entities.storeProduct?.reorderLevelBaseMicros);
    if (nextThreshold === undefined) continue;
    const parsedPrevious = parseReorderLevel(entities.previousReorderLevelBaseMicros);
    const previous = parsedPrevious === undefined ? previousThreshold : parsedPrevious;
    const balanceValue = entities.inventoryBalanceBaseMicros;
    let balance = fallbackBalance;
    if (typeof balanceValue === 'string' || typeof balanceValue === 'number') {
      try {
        balance = BigInt(String(balanceValue));
      } catch {
        balance = fallbackBalance;
      }
    }
    const previousKind = stockConditionKind(balance, previous);
    const nextKind = stockConditionKind(balance, nextThreshold);
    if (nextKind === kind && previousKind !== kind) token = operation.operationId;
    previousThreshold = nextThreshold;
  }
  return token;
}

function stockEpisodeToken(adapter: DatabaseAdapter, product: ProductContext, kind: StockConditionKind): string {
  let balance = 0n;
  let previous = stockConditionKind(0n, product.reorderLevelBaseMicros);
  let token = 'initial';
  for (const event of listInventoryEventsByStoreProductInLedgerOrder(adapter, product.storeProductId)) {
    const next = balance + BigInt(event.quantityBaseDeltaMicros);
    const nextKind = stockConditionKind(next, product.reorderLevelBaseMicros);
    if (nextKind === kind && previous !== kind) token = event.id;
    balance = next;
    previous = nextKind;
  }
  const thresholdToken = thresholdEpisodeToken(adapter, product, kind);
  return thresholdToken === 'initial' ? token : `${token}:${thresholdToken}`;
}

function batchGroupEpisodeToken(adapter: DatabaseAdapter, storeProductId: string, groupId: string): string {
  let balance = 0n;
  let token = 'initial';
  for (const entry of listBatchInventoryEntriesByStoreProduct(adapter, storeProductId).filter((candidate) => candidate.groupId === groupId)) {
    const next = balance + BigInt(entry.deltaBaseMicros);
    if (next > 0n && balance <= 0n) token = entry.id;
    balance = next;
  }
  return token;
}

function unknownEpisodeToken(adapter: DatabaseAdapter, storeProductId: string): string {
  let balance = 0n;
  let token = 'initial';
  for (const entry of listBatchInventoryEntriesByStoreProduct(adapter, storeProductId).filter((candidate) => candidate.groupId === null)) {
    const next = balance + BigInt(entry.deltaBaseMicros);
    if (next !== 0n && balance === 0n) token = entry.id;
    balance = next;
  }
  return token;
}

function expiryCandidate(adapter: DatabaseAdapter, product: ProductContext, settings: AttentionSettings, today: string, group: BatchProjection['groups'][number]): ConditionCandidate | null {
  const balance = BigInt(group.balanceBaseMicros);
  if (balance <= 0n || group.datePrecision === 'UNKNOWN' || group.dateValue === null) return null;
  const isMonth = group.datePrecision === 'MONTH';
  const comparisonDate = group.datePrecision === 'DAY' ? group.dateValue : `${group.dateValue}-01`;
  calendarDate(comparisonDate);
  const leadBoundary = addCalendarDays(today, settings.expiryLeadDays);
  const monthEndExclusive = isMonth ? addCalendarMonths(comparisonDate, 1) : null;
  let severity: AttentionSeverity;
  let severityRank: number;
  if ((isMonth && monthEndExclusive !== null && today >= monthEndExclusive) || (!isMonth && comparisonDate < today)) {
    severity = 'PASSED';
    severityRank = 3;
  } else if ((isMonth && today >= comparisonDate) || (!isMonth && comparisonDate === today)) {
    severity = 'REACHED';
    severityRank = 2;
  } else if (comparisonDate <= leadBoundary) {
    severity = 'UPCOMING';
    severityRank = 1;
  } else {
    return null;
  }
  const printedDate = group.datePrecision === 'MONTH' ? localMonthLabel(group.dateValue) : group.dateValue;
  const meaning = group.dateMeaning === 'BEST_BEFORE' ? 'best-before' : group.dateMeaning === 'EXPIRY' ? 'expiry' : 'recorded date';
  const status = severity === 'UPCOMING'
    ? 'is within the reminder window'
    : severity === 'REACHED'
      ? isMonth ? 'is within this month' : 'reaches today'
      : 'has passed';
  return {
    id: `expiry:${group.id}`,
    conditionKey: conditionKey('EXPIRY', product, `${group.id}:${batchGroupEpisodeToken(adapter, product.storeProductId, group.id)}`),
    conditionType: 'EXPIRY',
    kind: 'EXPIRY',
    severity,
    severityRank,
    storeProductId: product.storeProductId,
    productName: product.productName,
    groupId: group.id,
    balanceBaseMicros: group.balanceBaseMicros,
    title: `${product.productName}: ${printedDate} ${meaning}`,
    detail: `About ${quantityText(balance)} remain; the recorded date ${status}. Date passage does not remove stock.`,
    primaryAction: group.dateMeaning === 'EXPIRY' ? 'REMOVE' : 'RECONCILE',
    primaryActionLabel: group.dateMeaning === 'EXPIRY' ? 'Mark expired or removed' : 'Review recorded date',
  };
}

function stockCandidate(adapter: DatabaseAdapter, product: ProductContext): ConditionCandidate | null {
  const balance = BigInt(product.projection.inventoryBalanceBaseMicros);
  if (balance < 0n) {
    return {
      id: `stock:${product.storeProductId}`,
      conditionKey: conditionKey('STOCK_NEGATIVE', product, stockEpisodeToken(adapter, product, 'NEGATIVE_STOCK')),
      conditionType: 'STOCK',
      kind: 'NEGATIVE_STOCK',
      severity: 'NEGATIVE',
      severityRank: 3,
      storeProductId: product.storeProductId,
      productName: product.productName,
      groupId: null,
      balanceBaseMicros: balance.toString(),
      title: `${product.productName}: negative recorded stock`,
      detail: `Recorded stock is ${quantityText(balance)}. Reconcile the shelf count before treating the difference as resolved.`,
      primaryAction: 'RECONCILE',
      primaryActionLabel: 'Reconcile stock',
    };
  }
  if (balance === 0n) {
    return {
      id: `stock:${product.storeProductId}`,
      conditionKey: conditionKey('STOCK_ZERO', product, stockEpisodeToken(adapter, product, 'ZERO_STOCK')),
      conditionType: 'STOCK',
      kind: 'ZERO_STOCK',
      severity: 'ZERO',
      severityRank: 2,
      storeProductId: product.storeProductId,
      productName: product.productName,
      groupId: null,
      balanceBaseMicros: balance.toString(),
      title: `${product.productName}: zero recorded stock`,
      detail: 'No recorded stock remains. Restock if the shelf should be replenished.',
      primaryAction: 'RESTOCK',
      primaryActionLabel: 'Restock product',
    };
  }
  if (product.reorderLevelBaseMicros !== null && balance <= BigInt(product.reorderLevelBaseMicros)) {
    return {
      id: `stock:${product.storeProductId}`,
      conditionKey: conditionKey('STOCK_LOW', product, stockEpisodeToken(adapter, product, 'LOW_STOCK')),
      conditionType: 'STOCK',
      kind: 'LOW_STOCK',
      severity: 'LOW',
      severityRank: 1,
      storeProductId: product.storeProductId,
      productName: product.productName,
      groupId: null,
      balanceBaseMicros: balance.toString(),
      title: `${product.productName}: low recorded stock`,
      detail: `About ${quantityText(balance)} remain, at or below the reorder level.`,
      primaryAction: 'RESTOCK',
      primaryActionLabel: 'Restock product',
    };
  }
  return null;
}

function deriveCandidates(adapter: DatabaseAdapter, store: StoreRow, settings: AttentionSettings, at: LocalTime): ConditionCandidate[] {
  const candidates: ConditionCandidate[] = [];
  for (const product of productContexts(adapter, store.id)) {
    const stock = stockCandidate(adapter, product);
    if (stock) candidates.push(stock);
    const unknown = BigInt(product.projection.unknownResidualBaseMicros);
    if (unknown !== 0n) {
      candidates.push({
        id: `unknown:${product.storeProductId}`,
        conditionKey: conditionKey('UNKNOWN', product, unknownEpisodeToken(adapter, product.storeProductId)),
        conditionType: 'UNKNOWN_COVERAGE',
        kind: 'UNKNOWN_COVERAGE',
        severity: 'UNRESOLVED',
        severityRank: 1,
        storeProductId: product.storeProductId,
        productName: product.productName,
        groupId: null,
        balanceBaseMicros: unknown.toString(),
        title: `${product.productName}: unknown stock coverage`,
        detail: `${quantityText(unknown)} is not assigned to a recorded expiry group. Review the stock breakdown without assuming the group is physically verified.`,
        primaryAction: 'RECONCILE',
        primaryActionLabel: 'Review or reconcile stock',
      });
    }
    for (const group of product.projection.groups) {
      const balance = BigInt(group.balanceBaseMicros);
      if (balance <= 0n || group.datePrecision !== 'UNKNOWN') continue;
      candidates.push({
        id: `undated:${group.id}`,
        conditionKey: conditionKey('UNDATED', product, `${group.id}:${batchGroupEpisodeToken(adapter, product.storeProductId, group.id)}`),
        conditionType: 'UNKNOWN_COVERAGE',
        kind: 'UNKNOWN_COVERAGE',
        severity: 'UNRESOLVED',
        severityRank: 1,
        storeProductId: product.storeProductId,
        productName: product.productName,
        groupId: null,
        balanceBaseMicros: group.balanceBaseMicros,
        title: `${product.productName}: undated stock coverage`,
        detail: `${quantityText(balance)} has no recorded date. Review the stock breakdown before relying on expiry reminders.`,
        primaryAction: 'RECONCILE',
        primaryActionLabel: 'Review stock breakdown',
      });
    }
    const discrepancy = latestDiscrepancy(adapter, store.id, product.storeProductId);
    if (discrepancy && discrepancy.difference !== 0n) {
      candidates.push({
        id: `discrepancy:${product.storeProductId}`,
        conditionKey: conditionKey('DISCREPANCY', product, discrepancy.id),
        conditionType: 'DISCREPANCY',
        kind: 'DISCREPANCY',
        severity: 'UNRESOLVED',
        severityRank: 2,
        storeProductId: product.storeProductId,
        productName: product.productName,
        groupId: null,
        balanceBaseMicros: product.projection.inventoryBalanceBaseMicros,
        title: `${product.productName}: unresolved count difference`,
        detail: `The latest physical count differed by ${quantityText(discrepancy.difference)}. Review the stock evidence before recording another correction.`,
        primaryAction: 'RECONCILE',
        primaryActionLabel: 'Reconcile stock',
      });
    }
    for (const group of product.projection.groups) {
      const expiry = expiryCandidate(adapter, product, settings, at.date, group);
      if (expiry) candidates.push(expiry);
    }
  }
  return candidates;
}

function isSnoozed(candidate: ConditionCandidate, snooze: InventoryAttentionSnoozeRow | undefined, at: LocalTime): boolean {
  if (!snooze) return false;
  const due = compareLocalDateTime(at.date, at.minute, snooze.dueLocalDate, snooze.dueLocalMinute);
  return due < 0 && candidate.severityRank <= snooze.severityRank;
}

function overviewFor(adapter: DatabaseAdapter, store: StoreRow, settings: AttentionSettings, atIso: string): AttentionOverview {
  const at = localTime(store.timezone, atIso);
  const all = deriveCandidates(adapter, store, settings, at);
  const latestByKey = new Map<string, InventoryAttentionSnoozeRow>();
  for (const snooze of listInventoryAttentionSnoozesByStore(adapter, store.id)) {
    latestByKey.set(snooze.conditionKey, snooze);
  }
  const items: AttentionItem[] = [];
  let suppressedCount = 0;
  for (const candidate of all) {
    if (isSnoozed(candidate, latestByKey.get(candidate.conditionKey), at)) {
      suppressedCount += 1;
    } else {
      items.push(candidate);
    }
  }
  items.sort((left, right) => {
    if (left.severityRank !== right.severityRank) return right.severityRank - left.severityRank;
    if (left.productName !== right.productName) return left.productName.localeCompare(right.productName);
    return left.id.localeCompare(right.id);
  });
  return { localDate: at.date, localMinute: at.minute, settings, items, allConditionCount: all.length, suppressedCount };
}

function parsePayload(outbox: OutboxOperationRow): { entities?: Record<string, unknown> } {
  try {
    const parsed = JSON.parse(outbox.payload) as { entities?: Record<string, unknown> };
    if (!parsed || typeof parsed !== 'object' || !parsed.entities || typeof parsed.entities !== 'object') throw new Error('invalid payload');
    return parsed;
  } catch {
    throw new DomainError('INVALID_VALUE', 'The attention replay payload is invalid.');
  }
}

function assertReplayRequest(outbox: OutboxOperationRow, expected: Record<string, unknown>, message: string): { entities?: Record<string, unknown> } {
  const payload = parsePayload(outbox);
  if (JSON.stringify(payload.entities?.request) !== JSON.stringify(expected)) throw new DomainError('INVALID_VALUE', message);
  return payload;
}

function settingsFingerprint(input: SaveAttentionSettingsInput): Record<string, unknown> {
  return { expiryLeadDays: input.expiryLeadDays };
}

function snoozeFingerprint(input: SnoozeAttentionInput): Record<string, unknown> {
  return {
    conditionKey: input.conditionKey,
    conditionType: input.conditionType,
    storeProductId: input.storeProductId,
    groupId: input.groupId ?? null,
    severityRank: input.severityRank,
    snoozeKind: input.snoozeKind,
    // Relative reminders are requests, not resolved clock values. Their
    // durable due time is derived only for the first successful write.
    dueLocalDate: input.snoozeKind === 'CHOOSE_DATE_TIME' ? input.dueLocalDate ?? null : null,
    dueLocalMinute: input.snoozeKind === 'CHOOSE_DATE_TIME' ? input.dueLocalMinute ?? null : null,
  };
}

function resolveDue(input: SnoozeAttentionInput, at: LocalTime): { date: string; minute: number } {
  if (input.snoozeKind === 'LATER_TODAY') {
    return at.minute < 1439
      ? { date: at.date, minute: Math.min(1439, at.minute + 60) }
      : { date: addCalendarDays(at.date, 1), minute: 0 };
  }
  if (input.snoozeKind === 'TOMORROW') return { date: addCalendarDays(at.date, 1), minute: 9 * 60 };
  const date = requireText(input.dueLocalDate, 'dueLocalDate', 10);
  const minute = input.dueLocalMinute;
  if (minute === undefined || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isSafeInteger(minute) || minute < 0 || minute > 1439) {
    throw new DomainError('INVALID_VALUE', 'Choose a valid local date and time for the snooze.');
  }
  calendarDate(date);
  if (compareLocalDateTime(date, minute, at.date, at.minute) <= 0) {
    throw new DomainError('INVALID_VALUE', 'Snooze time must be in the future.');
  }
  return { date, minute };
}

export function getAttentionOverview(adapter: DatabaseAdapter, input: AttentionActor & { now?: string }): AttentionOverview {
  const { store } = assertActor(adapter, input, false);
  return overviewFor(adapter, store, mapSettings(store.id, getInventoryAttentionSettings(adapter, store.id)), input.now ?? nowIso());
}

export function saveAttentionSettings(adapter: DatabaseAdapter, input: SaveAttentionSettingsInput): SaveAttentionSettingsResult {
  assertActor(adapter, input, true);
  const operationId = requireId(input.operationId);
  const request = settingsFingerprint(input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'ATTENTION_SETTINGS_SAVED',
    entityType: 'INVENTORY_ATTENTION_SETTINGS',
    entityId: input.storeId,
  });
  if (replayed) {
    const payload = assertReplayRequest(replayed, request, 'This operation ID already belongs to different attention settings.');
    const settings = payload.entities?.settings;
    if (!settings || typeof settings !== 'object') throw new DomainError('INVALID_VALUE', 'Saved attention settings are missing from replay.');
    return { settings: settings as AttentionSettings, outbox: replayed };
  }
  return adapter.transaction(() => {
    const currentActor = assertActor(adapter, input, true);
    const saved = saveInventoryAttentionSettings(adapter, {
      storeId: input.storeId,
      expiryLeadDays: input.expiryLeadDays,
      updatedByStoreMemberId: currentActor.memberId,
      updatedByUserId: input.userId,
      updatedByDeviceId: input.deviceId,
    });
    const settings = mapSettings(input.storeId, saved);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'ATTENTION_SETTINGS_SAVED',
      operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'INVENTORY_ATTENTION_SETTINGS',
      entityId: input.storeId,
      occurredAt: saved.updatedAt,
      entities: { attentionVersion: 1, request, settings },
    });
    return { settings, outbox };
  });
}

export function snoozeAttention(adapter: DatabaseAdapter, input: SnoozeAttentionInput, options: { generateId?: () => string } = {}): SnoozeAttentionResult {
  const { store } = assertActor(adapter, input, true);
  const operationId = requireId(input.operationId);
  const request = snoozeFingerprint(input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'ATTENTION_SNOOZE_CREATED',
    entityType: 'ATTENTION_SNOOZE',
  });
  if (replayed) {
    const payload = assertReplayRequest(replayed, request, 'This operation ID already belongs to a different attention snooze.');
    const snoozeId = typeof payload.entities?.snoozeId === 'string' ? payload.entities.snoozeId : replayed.entityId;
    const snooze = getInventoryAttentionSnoozeById(adapter, snoozeId);
    if (!snooze) throw new DomainError('INVALID_VALUE', 'Attention snooze replay references missing history.');
    const storedOverview = payload.entities?.overview;
    const overview = storedOverview && typeof storedOverview === 'object'
      ? storedOverview as AttentionOverview
      : overviewFor(adapter, store, mapSettings(store.id, getInventoryAttentionSettings(adapter, store.id)), snooze.createdAt);
    return {
      snooze,
      overview,
      outbox: replayed,
    };
  }
  const atIso = input.now ?? nowIso();
  const at = localTime(store.timezone, atIso);
  const due = resolveDue(input, at);
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const currentActor = assertActor(adapter, input, true);
    const settings = mapSettings(store.id, getInventoryAttentionSettings(adapter, store.id));
    const current = deriveCandidates(adapter, store, settings, at).find((candidate) => candidate.conditionKey === input.conditionKey);
    if (!current) throw new DomainError('INVALID_VALUE', 'This attention condition is no longer active. Refresh the list.');
    if (current.storeProductId !== input.storeProductId || current.conditionType !== input.conditionType || current.groupId !== (input.groupId ?? null) || current.severityRank !== input.severityRank) {
      throw new DomainError('INVALID_VALUE', 'This attention condition changed. Refresh before snoozing it.');
    }
    const snooze = createInventoryAttentionSnooze(adapter, {
      id: generateId(),
      storeId: input.storeId,
      storeProductId: input.storeProductId,
      conditionKey: input.conditionKey,
      conditionType: input.conditionType,
      groupId: input.groupId,
      severityRank: input.severityRank,
      snoozeKind: input.snoozeKind,
      dueLocalDate: due.date,
      dueLocalMinute: due.minute,
      createdByStoreMemberId: currentActor.memberId,
      createdByUserId: input.userId,
      deviceId: input.deviceId,
      createdAt: atIso,
    });
    const overview = overviewFor(adapter, store, settings, atIso);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'ATTENTION_SNOOZE_CREATED',
      operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'ATTENTION_SNOOZE',
      entityId: snooze.id,
      occurredAt: atIso,
      entities: { attentionVersion: 1, request, snoozeId: snooze.id, snooze, overview },
    });
    return {
      snooze,
      overview,
      outbox,
    };
  });
}
