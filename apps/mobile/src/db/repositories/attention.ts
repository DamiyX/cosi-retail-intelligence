import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalId, requireId, requireText } from './common';

export const ATTENTION_POLICY_VERSION = 'M5-ATTENTION-1';

export type AttentionConditionType = 'STOCK' | 'EXPIRY' | 'DISCREPANCY' | 'UNKNOWN_COVERAGE';
export type AttentionSnoozeKind = 'LATER_TODAY' | 'TOMORROW' | 'CHOOSE_DATE_TIME';

export interface InventoryAttentionSettingsRow {
  storeId: string;
  expiryLeadDays: number;
  policyVersion: string;
  version: number;
  updatedByStoreMemberId: string;
  updatedByUserId: string;
  updatedByDeviceId: string;
  updatedAt: string;
}

export interface InventoryAttentionSnoozeRow {
  id: string;
  storeId: string;
  storeProductId: string;
  conditionKey: string;
  conditionType: AttentionConditionType;
  groupId: string | null;
  severityRank: number;
  snoozeKind: AttentionSnoozeKind;
  dueLocalDate: string;
  dueLocalMinute: number;
  policyVersion: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt: string;
}

export interface SaveInventoryAttentionSettingsInput {
  storeId: string;
  expiryLeadDays: number;
  policyVersion?: string;
  updatedByStoreMemberId: string;
  updatedByUserId: string;
  updatedByDeviceId: string;
  updatedAt?: string;
}

export interface CreateInventoryAttentionSnoozeInput {
  id: string;
  storeId: string;
  storeProductId: string;
  conditionKey: string;
  conditionType: AttentionConditionType;
  groupId?: string | null;
  severityRank: number;
  snoozeKind: AttentionSnoozeKind;
  dueLocalDate: string;
  dueLocalMinute: number;
  policyVersion?: string;
  createdByStoreMemberId: string;
  createdByUserId: string;
  deviceId: string;
  createdAt?: string;
}

type Row = Record<string, string | number | null>;

const SETTINGS_COLUMNS =
  'store_id, expiry_lead_days, policy_version, version, updated_by_store_member_id, ' +
  'updated_by_user_id, updated_by_device_id, updated_at';
const SNOOZE_COLUMNS =
  'id, store_id, store_product_id, condition_key, condition_type, group_id, severity_rank, ' +
  'snooze_kind, due_local_date, due_local_minute, policy_version, created_by_store_member_id, ' +
  'created_by_user_id, device_id, created_at';

function localDate(value: string): string {
  const date = requireText(value, 'localDate', 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DomainError('INVALID_VALUE', 'Local date must use YYYY-MM-DD.');
  return date;
}

function minute(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1439) {
    throw new DomainError('INVALID_VALUE', 'Local minute must be an integer between 0 and 1439.');
  }
  return value;
}

function leadDays(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0 || value > 3650) {
    throw new DomainError('INVALID_VALUE', 'Expiry lead days must be a whole number from 0 to 3650.');
  }
  return value;
}

function conditionType(value: AttentionConditionType): AttentionConditionType {
  if (value !== 'STOCK' && value !== 'EXPIRY' && value !== 'DISCREPANCY' && value !== 'UNKNOWN_COVERAGE') {
    throw new DomainError('INVALID_VALUE', 'Attention condition type is invalid.');
  }
  return value;
}

function snoozeKind(value: AttentionSnoozeKind): AttentionSnoozeKind {
  if (value !== 'LATER_TODAY' && value !== 'TOMORROW' && value !== 'CHOOSE_DATE_TIME') {
    throw new DomainError('INVALID_VALUE', 'Attention snooze kind is invalid.');
  }
  return value;
}

function mapSettings(row: Row): InventoryAttentionSettingsRow {
  return {
    storeId: row.store_id as string,
    expiryLeadDays: row.expiry_lead_days as number,
    policyVersion: row.policy_version as string,
    version: row.version as number,
    updatedByStoreMemberId: row.updated_by_store_member_id as string,
    updatedByUserId: row.updated_by_user_id as string,
    updatedByDeviceId: row.updated_by_device_id as string,
    updatedAt: row.updated_at as string,
  };
}

function mapSnooze(row: Row): InventoryAttentionSnoozeRow {
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    storeProductId: row.store_product_id as string,
    conditionKey: row.condition_key as string,
    conditionType: row.condition_type as AttentionConditionType,
    groupId: (row.group_id as string | null) ?? null,
    severityRank: row.severity_rank as number,
    snoozeKind: row.snooze_kind as AttentionSnoozeKind,
    dueLocalDate: row.due_local_date as string,
    dueLocalMinute: row.due_local_minute as number,
    policyVersion: row.policy_version as string,
    createdByStoreMemberId: row.created_by_store_member_id as string,
    createdByUserId: row.created_by_user_id as string,
    deviceId: row.device_id as string,
    createdAt: row.created_at as string,
  };
}

export function getInventoryAttentionSettings(adapter: DatabaseAdapter, storeId: string): InventoryAttentionSettingsRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${SETTINGS_COLUMNS} FROM inventory_attention_settings WHERE store_id = ?;`,
    [requireId(storeId)],
  );
  return row ? mapSettings(row) : null;
}

export function saveInventoryAttentionSettings(
  adapter: DatabaseAdapter,
  input: SaveInventoryAttentionSettingsInput,
): InventoryAttentionSettingsRow {
  const storeId = requireId(input.storeId);
  const updatedAt = requireText(input.updatedAt ?? nowIso(), 'updatedAt', 64);
  adapter.run(
    `INSERT INTO inventory_attention_settings
      (store_id, expiry_lead_days, policy_version, version, updated_by_store_member_id,
       updated_by_user_id, updated_by_device_id, updated_at)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?)
     ON CONFLICT(store_id) DO UPDATE SET
       expiry_lead_days = excluded.expiry_lead_days,
       policy_version = excluded.policy_version,
       version = inventory_attention_settings.version + 1,
       updated_by_store_member_id = excluded.updated_by_store_member_id,
       updated_by_user_id = excluded.updated_by_user_id,
       updated_by_device_id = excluded.updated_by_device_id,
       updated_at = excluded.updated_at;`,
    [
      storeId,
      leadDays(input.expiryLeadDays),
      requireText(input.policyVersion ?? ATTENTION_POLICY_VERSION, 'policyVersion', 64),
      requireId(input.updatedByStoreMemberId),
      requireId(input.updatedByUserId),
      requireId(input.updatedByDeviceId),
      updatedAt,
    ],
  );
  const saved = getInventoryAttentionSettings(adapter, storeId);
  if (!saved) throw new Error('Inventory attention settings did not persist.');
  return saved;
}

export function createInventoryAttentionSnooze(
  adapter: DatabaseAdapter,
  input: CreateInventoryAttentionSnoozeInput,
): InventoryAttentionSnoozeRow {
  const type = conditionType(input.conditionType);
  const groupId = optionalId(input.groupId);
  if ((type === 'EXPIRY') !== (groupId !== null)) {
    throw new DomainError('INVALID_VALUE', 'Expiry attention snoozes require their batch group.');
  }
  const createdAt = requireText(input.createdAt ?? nowIso(), 'createdAt', 64);
  adapter.run(
    `INSERT INTO inventory_attention_snoozes
      (id, store_id, store_product_id, condition_key, condition_type, group_id, severity_rank,
       snooze_kind, due_local_date, due_local_minute, policy_version, created_by_store_member_id,
       created_by_user_id, device_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      requireId(input.id),
      requireId(input.storeId),
      requireId(input.storeProductId),
      requireText(input.conditionKey, 'conditionKey', 200),
      type,
      groupId,
      Number.isSafeInteger(input.severityRank) && input.severityRank > 0 ? input.severityRank : (() => { throw new DomainError('INVALID_VALUE', 'Attention severity rank is invalid.'); })(),
      snoozeKind(input.snoozeKind),
      localDate(input.dueLocalDate),
      minute(input.dueLocalMinute),
      requireText(input.policyVersion ?? ATTENTION_POLICY_VERSION, 'policyVersion', 64),
      requireId(input.createdByStoreMemberId),
      requireId(input.createdByUserId),
      requireId(input.deviceId),
      createdAt,
    ],
  );
  const row = getInventoryAttentionSnoozeById(adapter, input.id);
  if (!row) throw new Error('Inventory attention snooze did not persist.');
  return row;
}

export function getInventoryAttentionSnoozeById(adapter: DatabaseAdapter, id: string): InventoryAttentionSnoozeRow | null {
  const row = adapter.getFirstRow<Row>(`SELECT ${SNOOZE_COLUMNS} FROM inventory_attention_snoozes WHERE id = ?;`, [requireId(id)]);
  return row ? mapSnooze(row) : null;
}

export function getLatestInventoryAttentionSnooze(
  adapter: DatabaseAdapter,
  storeProductId: string,
  conditionKey: string,
): InventoryAttentionSnoozeRow | null {
  const row = adapter.getFirstRow<Row>(
    `SELECT ${SNOOZE_COLUMNS} FROM inventory_attention_snoozes
     WHERE store_product_id = ? AND condition_key = ?
     ORDER BY created_at DESC, id DESC LIMIT 1;`,
    [requireId(storeProductId), requireText(conditionKey, 'conditionKey', 200)],
  );
  return row ? mapSnooze(row) : null;
}

export function listInventoryAttentionSnoozesByStore(adapter: DatabaseAdapter, storeId: string): InventoryAttentionSnoozeRow[] {
  return adapter.getAllRows<Row>(
    `SELECT ${SNOOZE_COLUMNS} FROM inventory_attention_snoozes
     WHERE store_id = ? ORDER BY created_at ASC, id ASC;`,
    [requireId(storeId)],
  ).map(mapSnooze);
}
