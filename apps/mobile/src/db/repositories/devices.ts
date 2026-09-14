import { DomainError } from '@retail/domain';

import type { DatabaseAdapter } from '../adapter';
import { nowIso, optionalText, requireId, requireText } from './common';

export type DevicePlatform = 'ANDROID' | 'IOS' | 'OTHER';

const PLATFORMS: readonly DevicePlatform[] = ['ANDROID', 'IOS', 'OTHER'];

export interface DeviceRow {
  id: string;
  storeId: string;
  userId: string | null;
  platform: DevicePlatform;
  deviceLabel: string | null;
  appVersion: string;
  lastSeenAt: string | null;
  status: string;
  createdAt: string;
}

export interface CreateDeviceInput {
  id: string;
  storeId: string;
  userId?: string | null;
  platform: DevicePlatform;
  deviceLabel?: string | null;
  appVersion: string;
}

function mapRow(row: Record<string, string | null>): DeviceRow {
  const platform = row.platform as string;
  if (platform !== 'ANDROID' && platform !== 'IOS' && platform !== 'OTHER') {
    throw new DomainError('INVALID_VALUE', `Stored device platform is invalid: ${platform}.`);
  }
  return {
    id: row.id as string,
    storeId: row.store_id as string,
    userId: row.user_id,
    platform,
    deviceLabel: row.device_label,
    appVersion: row.app_version as string,
    lastSeenAt: row.last_seen_at,
    status: row.status as string,
    createdAt: row.created_at as string,
  };
}

export function createDevice(adapter: DatabaseAdapter, input: CreateDeviceInput): DeviceRow {
  const id = requireId(input.id);
  const storeId = requireId(input.storeId);
  const userId =
    input.userId === undefined || input.userId === null ? null : requireId(input.userId);
  if (!PLATFORMS.includes(input.platform)) {
    throw new DomainError('INVALID_VALUE', 'Device platform must be ANDROID, IOS, or OTHER.');
  }
  const deviceLabel = optionalText(input.deviceLabel, 'device label');
  const appVersion = requireText(input.appVersion, 'app version', 50);
  const timestamp = nowIso();
  adapter.run(
    `INSERT INTO devices
      (id, store_id, user_id, platform, device_label, app_version, last_seen_at, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, NULL, 'ACTIVE', ?);`,
    [id, storeId, userId, input.platform, deviceLabel, appVersion, timestamp],
  );
  const created = getDeviceById(adapter, id);
  if (!created) {
    throw new Error('Device insert did not persist.');
  }
  return created;
}

export function getDeviceById(adapter: DatabaseAdapter, id: string): DeviceRow | null {
  const row = adapter.getFirstRow<Record<string, string | null>>(
    `SELECT id, store_id, user_id, platform, device_label, app_version,
            last_seen_at, status, created_at
     FROM devices WHERE id = ?;`,
    [requireId(id)],
  );
  return row ? mapRow(row) : null;
}
