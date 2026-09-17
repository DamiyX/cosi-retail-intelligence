import type { OutboxStatus } from '../db/repositories';

/**
 * Retailer-facing local-sync language. The M3 sale path only writes PENDING,
 * while M7 may later update the durable outbox state. Screens must reflect
 * the stored state instead of permanently claiming that every sale is pending.
 */
export function saleSyncStatusLabel(status: OutboxStatus | null): string {
  switch (status) {
    case 'PENDING':
      return 'Saved on this device · Sync pending';
    case 'SYNCING':
      return 'Saved on this device · Syncing';
    case 'SYNCED':
      return 'Saved on this device · Synced';
    case 'ERROR_RETRYABLE':
      return 'Saved on this device · Sync will retry';
    case 'CONFLICT':
    case 'ERROR_PERMANENT':
      return 'Saved on this device · Sync needs attention';
    default:
      return 'Saved on this device · Sync status unavailable';
  }
}
