import { DomainError } from '@retail/domain';

import { generateMobileId } from '../crypto/mobileIds';
import type { DatabaseAdapter } from '../db/adapter';
import {
  closeInventoryCheckAssignment,
  closeInventoryCheckAttempt,
  createInventoryCheckAssignment,
  createInventoryCheckAttempt,
  enqueueOutboxOperation,
  findExpectedOutboxReplay,
  getDeviceById,
  getInventoryCheckAssignmentById,
  getInventoryCheckSettings,
  getLatestCompletedInventoryCheckAt,
  getProductVariantById,
  getStoreById,
  getStoreProductById,
  listInventoryCheckAssignmentsByStore,
  listInventoryCheckAttemptsByAssignment,
  listStoreProducts,
  saveInventoryCheckSettings,
  type InventoryCheckAssignmentRow,
  type InventoryCheckAttemptRow,
  type InventoryCheckSettingsRow,
  type OutboxOperationRow,
} from '../db/repositories';
import { getInventoryBalanceBigIntByStoreProduct } from '../db/repositories/inventoryEvents';
import { nowIso, requireId, requireText } from '../db/repositories/common';

const DEFAULT_DAILY_TARGET = 3;
const DEFAULT_WINDOW_START_MINUTE = 0;
const DEFAULT_WINDOW_END_MINUTE = 1439;

export type GuidedCheckOverviewReason =
  | 'READY'
  | 'PAUSED'
  | 'OUTSIDE_WINDOW'
  | 'PENDING_WORK'
  | 'TARGET_MET'
  | 'NO_ELIGIBLE_CANDIDATE';

export interface GuidedCheckSettings {
  storeId: string;
  dailyTarget: number;
  paused: boolean;
  windowStartMinute: number;
  windowEndMinute: number;
  policyVersion: string;
  version: number;
  updatedByStoreMemberId: string | null;
  updatedByUserId: string | null;
  updatedByDeviceId: string | null;
  updatedAt: string | null;
}

export interface GuidedCheckAssignmentView extends InventoryCheckAssignmentRow {
  productName: string;
  inventoryBalanceBaseMicros: string;
  latestAttempt: InventoryCheckAttemptRow | null;
  lastCompletedAt: string | null;
}

export interface GuidedCheckOverview {
  localDate: string;
  localMinute: number;
  withinWindow: boolean;
  settings: GuidedCheckSettings;
  reason: GuidedCheckOverviewReason;
  completedInitialCount: number;
  remainingTarget: number;
  eligibleCandidateCount: number;
  pending: GuidedCheckAssignmentView[];
  today: GuidedCheckAssignmentView[];
}

export interface GuidedCheckGenerationResult {
  overview: GuidedCheckOverview;
  assignments: GuidedCheckAssignmentView[];
  outbox: OutboxOperationRow | null;
}

export interface GuidedCheckReplacementResult {
  overview: GuidedCheckOverview;
  replacedAssignment: GuidedCheckAssignmentView;
  replacementAssignment: GuidedCheckAssignmentView | null;
  exhausted: boolean;
  outbox: OutboxOperationRow;
}

export interface GuidedCheckActor {
  storeId: string;
  deviceId: string;
  userId: string;
}

export interface SaveGuidedCheckSettingsInput extends GuidedCheckActor {
  operationId: string;
  dailyTarget: number;
  paused: boolean;
  windowStartMinute: number;
  windowEndMinute: number;
}

export interface GenerateGuidedChecksInput extends GuidedCheckActor {
  operationId: string;
  now?: string;
}

export interface ReplaceGuidedCheckInput extends GuidedCheckActor {
  operationId: string;
  assignmentId: string;
  reasonCode: string;
  note?: string | null;
  now?: string;
}

interface LocalTime {
  iso: string;
  date: string;
  minute: number;
}

interface Candidate {
  storeProductId: string;
  productName: string;
  inventoryBalanceBaseMicros: string;
  lastCompletedAt: string | null;
  lastActivityAt: string | null;
}

interface OutboxPayload {
  entities?: Record<string, unknown>;
}

function assertOwner(adapter: DatabaseAdapter, input: GuidedCheckActor): { memberId: string } {
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
  if (!member || member.role !== 'OWNER') throw new DomainError('INVALID_VALUE', 'Only an active store owner can manage guided checks.');
  return { memberId: member.id };
}

function localTime(storeTimezone: string, iso: string): LocalTime {
  const instant = new Date(iso);
  if (Number.isNaN(instant.getTime())) throw new DomainError('INVALID_VALUE', 'Guided check time is invalid.');
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
    throw new DomainError('INVALID_VALUE', 'Store timezone is invalid for guided checks.');
  }
}

function defaultSettings(storeId: string): GuidedCheckSettings {
  return {
    storeId,
    dailyTarget: DEFAULT_DAILY_TARGET,
    paused: false,
    windowStartMinute: DEFAULT_WINDOW_START_MINUTE,
    windowEndMinute: DEFAULT_WINDOW_END_MINUTE,
    policyVersion: 'M5-GUIDED-1',
    version: 0,
    updatedByStoreMemberId: null,
    updatedByUserId: null,
    updatedByDeviceId: null,
    updatedAt: null,
  };
}

function mapSettings(storeId: string, row: InventoryCheckSettingsRow | null): GuidedCheckSettings {
  return row ? { ...row } : defaultSettings(storeId);
}

function withinWindow(settings: GuidedCheckSettings, minute: number): boolean {
  return minute >= settings.windowStartMinute && minute <= settings.windowEndMinute;
}

function productName(adapter: DatabaseAdapter, storeProductId: string): string {
  const product = getStoreProductById(adapter, storeProductId);
  if (!product) return 'Removed product';
  return getProductVariantById(adapter, product.productVariantId)?.name ?? 'Unnamed product';
}

function lastActivityAt(adapter: DatabaseAdapter, storeProductId: string): string | null {
  const row = adapter.getFirstRow<{ occurred_at: string | null }>(
    `SELECT MAX(occurred_at) AS occurred_at FROM inventory_events WHERE store_product_id = ?;`,
    [requireId(storeProductId)],
  );
  return row?.occurred_at ?? null;
}

function assignmentView(adapter: DatabaseAdapter, assignment: InventoryCheckAssignmentRow): GuidedCheckAssignmentView {
  const attempts = listInventoryCheckAttemptsByAssignment(adapter, assignment.id);
  return {
    ...assignment,
    productName: productName(adapter, assignment.storeProductId),
    inventoryBalanceBaseMicros: getInventoryBalanceBigIntByStoreProduct(adapter, assignment.storeProductId).toString(),
    latestAttempt: attempts[attempts.length - 1] ?? null,
    lastCompletedAt: getLatestCompletedInventoryCheckAt(adapter, assignment.storeProductId),
  };
}

function selectionCandidates(
  adapter: DatabaseAdapter,
  storeId: string,
  excludedProductIds: ReadonlySet<string>,
): Candidate[] {
  const candidates = listStoreProducts(adapter, storeId, '', 'ACTIVE').flatMap((hit) => {
    if (excludedProductIds.has(hit.product.id)) return [];
    const balance = getInventoryBalanceBigIntByStoreProduct(adapter, hit.product.id);
    if (balance <= 0n) return [];
    return [{
      storeProductId: hit.product.id,
      productName: hit.variantName,
      inventoryBalanceBaseMicros: balance.toString(),
      lastCompletedAt: getLatestCompletedInventoryCheckAt(adapter, hit.product.id),
      lastActivityAt: lastActivityAt(adapter, hit.product.id),
    }];
  });
  return candidates.sort((left, right) => {
    const leftNeverChecked = left.lastCompletedAt === null ? 0 : 1;
    const rightNeverChecked = right.lastCompletedAt === null ? 0 : 1;
    if (leftNeverChecked !== rightNeverChecked) return leftNeverChecked - rightNeverChecked;
    if (left.lastCompletedAt !== right.lastCompletedAt) {
      if (left.lastCompletedAt === null) return -1;
      if (right.lastCompletedAt === null) return 1;
      return left.lastCompletedAt.localeCompare(right.lastCompletedAt);
    }
    if (left.lastActivityAt !== right.lastActivityAt) {
      if (left.lastActivityAt === null) return 1;
      if (right.lastActivityAt === null) return -1;
      return right.lastActivityAt.localeCompare(left.lastActivityAt);
    }
    return left.storeProductId.localeCompare(right.storeProductId);
  });
}

function requestFingerprint(input: { now?: string }): Record<string, unknown> {
  return { now: input.now ?? null };
}

function replacementFingerprint(input: { assignmentId: string; reasonCode: string; note: string | null }): Record<string, unknown> {
  return { assignmentId: input.assignmentId, reasonCode: input.reasonCode, note: input.note };
}

function settingsFingerprint(input: SaveGuidedCheckSettingsInput): Record<string, unknown> {
  return {
    dailyTarget: input.dailyTarget,
    paused: input.paused,
    windowStartMinute: input.windowStartMinute,
    windowEndMinute: input.windowEndMinute,
  };
}

function parsePayload(outbox: OutboxOperationRow): OutboxPayload {
  try {
    const parsed = JSON.parse(outbox.payload) as OutboxPayload;
    if (!parsed || typeof parsed !== 'object' || !parsed.entities || typeof parsed.entities !== 'object') throw new Error('invalid payload');
    return parsed;
  } catch {
    throw new DomainError('INVALID_VALUE', 'The guided check replay payload is invalid.');
  }
}

function assertReplayRequest(outbox: OutboxOperationRow, expected: Record<string, unknown>, message: string): OutboxPayload {
  const payload = parsePayload(outbox);
  const request = payload.entities?.request;
  if (JSON.stringify(request) !== JSON.stringify(expected)) throw new DomainError('INVALID_VALUE', message);
  return payload;
}

function viewsFromIds(adapter: DatabaseAdapter, ids: string[]): GuidedCheckAssignmentView[] {
  return ids.flatMap((id) => {
    const assignment = getInventoryCheckAssignmentById(adapter, id);
    return assignment ? [assignmentView(adapter, assignment)] : [];
  });
}

function overviewFor(adapter: DatabaseAdapter, actor: GuidedCheckActor, atIso: string): GuidedCheckOverview {
  const store = getStoreById(adapter, actor.storeId);
  if (!store) throw new DomainError('INVALID_VALUE', 'Store does not exist.');
  const time = localTime(store.timezone, atIso);
  const settings = mapSettings(store.id, getInventoryCheckSettings(adapter, store.id));
  const assignments = listInventoryCheckAssignmentsByStore(adapter, store.id);
  const pending = assignments.filter((assignment) => assignment.status === 'PENDING').map((assignment) => assignmentView(adapter, assignment));
  const todayRows = assignments.filter((assignment) => assignment.localDate === time.date);
  const today = todayRows.map((assignment) => assignmentView(adapter, assignment));
  const excluded = new Set(todayRows.map((assignment) => assignment.storeProductId));
  const candidates = selectionCandidates(adapter, store.id, excluded);
  const completedInitialCount = todayRows.filter((assignment) => assignment.assignmentKind === 'INITIAL').length;
  const remainingTarget = Math.max(0, settings.dailyTarget - completedInitialCount);
  let reason: GuidedCheckOverviewReason = 'READY';
  if (settings.paused) reason = 'PAUSED';
  else if (pending.length > 0) reason = 'PENDING_WORK';
  else if (!withinWindow(settings, time.minute)) reason = 'OUTSIDE_WINDOW';
  else if (remainingTarget === 0) reason = 'TARGET_MET';
  else if (candidates.length === 0) reason = 'NO_ELIGIBLE_CANDIDATE';
  return {
    localDate: time.date,
    localMinute: time.minute,
    withinWindow: withinWindow(settings, time.minute),
    settings,
    reason,
    completedInitialCount,
    remainingTarget,
    eligibleCandidateCount: candidates.length,
    pending,
    today,
  };
}

function assignmentIdsFromPayload(payload: OutboxPayload): string[] {
  const raw = payload.entities?.assignmentIds;
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === 'string');
}

export function getGuidedCheckOverview(
  adapter: DatabaseAdapter,
  input: GuidedCheckActor & { now?: string },
): GuidedCheckOverview {
  assertOwner(adapter, input);
  return overviewFor(adapter, input, input.now ?? nowIso());
}

export function saveGuidedCheckSettings(
  adapter: DatabaseAdapter,
  input: SaveGuidedCheckSettingsInput,
): { settings: GuidedCheckSettings; outbox: OutboxOperationRow } {
  const actor: GuidedCheckActor = input;
  assertOwner(adapter, actor);
  const operationId = requireId(input.operationId);
  const request = settingsFingerprint(input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'CHECK_SETTINGS_SAVED',
    entityType: 'INVENTORY_CHECK_SETTINGS',
    entityId: input.storeId,
  });
  if (replayed) {
    const payload = assertReplayRequest(replayed, request, 'This operation ID already belongs to different guided check settings.');
    const stored = payload.entities?.settings;
    if (!stored || typeof stored !== 'object') throw new DomainError('INVALID_VALUE', 'The saved guided check settings are missing.');
    return { settings: stored as GuidedCheckSettings, outbox: replayed };
  }
  return adapter.transaction(() => {
    const { memberId } = assertOwner(adapter, actor);
    const saved = saveInventoryCheckSettings(adapter, {
      storeId: input.storeId,
      dailyTarget: input.dailyTarget,
      paused: input.paused,
      windowStartMinute: input.windowStartMinute,
      windowEndMinute: input.windowEndMinute,
      updatedByStoreMemberId: memberId,
      updatedByUserId: input.userId,
      updatedByDeviceId: input.deviceId,
    });
    const occurredAt = nowIso();
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'CHECK_SETTINGS_SAVED',
      operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'INVENTORY_CHECK_SETTINGS',
      entityId: input.storeId,
      occurredAt,
      entities: { settingsVersion: 1, request, settings: saved },
    });
    return { settings: saved, outbox };
  });
}

export function generateGuidedChecks(
  adapter: DatabaseAdapter,
  input: GenerateGuidedChecksInput,
  options: { generateId?: () => string } = {},
): GuidedCheckGenerationResult {
  const actor: GuidedCheckActor = input;
  const owner = assertOwner(adapter, actor);
  const operationId = requireId(input.operationId);
  const request = requestFingerprint(input);
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'CHECK_ASSIGNMENT_CREATED',
    entityType: 'CHECK_ASSIGNMENT',
  });
  if (replayed) {
    const payload = assertReplayRequest(replayed, request, 'This operation ID already belongs to a different guided check generation.');
    const storedOverview = payload.entities?.overview;
    const overview = storedOverview && typeof storedOverview === 'object'
      ? storedOverview as GuidedCheckOverview
      : overviewFor(adapter, actor, replayed.createdAt);
    return {
      overview,
      assignments: viewsFromIds(adapter, assignmentIdsFromPayload(payload)),
      outbox: replayed,
    };
  }
  const store = getStoreById(adapter, input.storeId);
  if (!store) throw new DomainError('INVALID_VALUE', 'Store does not exist.');
  const atIso = input.now ?? nowIso();
  const time = localTime(store.timezone, atIso);
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    assertOwner(adapter, actor);
    const currentSettings = mapSettings(store.id, getInventoryCheckSettings(adapter, store.id));
    const before = overviewFor(adapter, actor, atIso);
    if (before.reason !== 'READY') {
      return { overview: before, assignments: [], outbox: null };
    }
    const excluded = new Set(before.today.map((assignment) => assignment.storeProductId));
    const candidates = selectionCandidates(adapter, store.id, excluded).slice(0, before.remainingTarget);
    if (candidates.length === 0) {
      return { overview: overviewFor(adapter, actor, atIso), assignments: [], outbox: null };
    }
    const assignmentIds: string[] = [];
    const assignments: InventoryCheckAssignmentRow[] = [];
    const attempts: InventoryCheckAttemptRow[] = [];
    for (const candidate of candidates) {
      const assignmentId = generateId();
      const assignment = createInventoryCheckAssignment(adapter, {
        id: assignmentId,
        storeId: store.id,
        storeProductId: candidate.storeProductId,
        localDate: time.date,
        assignmentKind: 'INITIAL',
        rootAssignmentId: assignmentId,
        policyVersion: currentSettings.policyVersion,
        createdByStoreMemberId: owner.memberId,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: atIso,
      });
      const attempt = createInventoryCheckAttempt(adapter, {
        id: generateId(),
        assignmentId: assignment.id,
        storeId: store.id,
        storeProductId: candidate.storeProductId,
        attemptKind: 'INITIAL',
        createdByStoreMemberId: owner.memberId,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: atIso,
      });
      assignmentIds.push(assignment.id);
      assignments.push(assignment);
      attempts.push(attempt);
    }
    const overview = overviewFor(adapter, actor, atIso);
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'CHECK_ASSIGNMENT_CREATED',
      operationId,
      storeId: store.id,
      deviceId: input.deviceId,
      entityType: 'CHECK_ASSIGNMENT',
      entityId: operationId,
      occurredAt: atIso,
      entities: {
        assignmentVersion: 1,
        action: 'GENERATED',
        request,
        assignmentIds,
        assignments,
        attempts,
        overview,
      },
    });
    return {
      overview,
      assignments: assignments.map((assignment) => assignmentView(adapter, assignment)),
      outbox,
    };
  });
}

export function replaceGuidedCheck(
  adapter: DatabaseAdapter,
  input: ReplaceGuidedCheckInput,
  options: { generateId?: () => string } = {},
): GuidedCheckReplacementResult {
  const actor: GuidedCheckActor = input;
  const owner = assertOwner(adapter, actor);
  const assignmentId = requireId(input.assignmentId);
  const reasonCode = requireText(input.reasonCode.trim(), 'reasonCode', 64);
  const note = input.note?.trim() || null;
  const request = replacementFingerprint({ assignmentId, reasonCode, note });
  const replayed = findExpectedOutboxReplay(adapter, {
    operationId: input.operationId,
    storeId: input.storeId,
    deviceId: input.deviceId,
    operationType: 'CHECK_ASSIGNMENT_CREATED',
    entityType: 'CHECK_ASSIGNMENT',
    entityId: assignmentId,
  });
  if (replayed) {
    const payload = assertReplayRequest(replayed, request, 'This operation ID already belongs to a different guided check replacement.');
    const replaced = getInventoryCheckAssignmentById(adapter, assignmentId);
    if (!replaced) throw new DomainError('INVALID_VALUE', 'The replaced guided check is missing.');
    const replacementId = typeof payload.entities?.replacementAssignmentId === 'string' ? payload.entities.replacementAssignmentId : null;
    const replacement = replacementId ? getInventoryCheckAssignmentById(adapter, replacementId) : null;
    return {
      overview: overviewFor(adapter, actor, input.now ?? nowIso()),
      replacedAssignment: assignmentView(adapter, replaced),
      replacementAssignment: replacement ? assignmentView(adapter, replacement) : null,
      exhausted: replacement === null,
      outbox: replayed,
    };
  }
  const generateId = options.generateId ?? generateMobileId;
  return adapter.transaction(() => {
    const current = getInventoryCheckAssignmentById(adapter, assignmentId);
    if (!current || current.storeId !== input.storeId) throw new DomainError('INVALID_VALUE', 'Guided check assignment does not belong to this store.');
    if (current.status !== 'PENDING') throw new DomainError('INVALID_VALUE', 'Only a pending guided check can be replaced.');
    const atIso = input.now ?? nowIso();
    const excluded = new Set(
      listInventoryCheckAssignmentsByStore(adapter, input.storeId, current.localDate)
        .map((assignment) => assignment.storeProductId),
    );
    const candidate = selectionCandidates(adapter, input.storeId, excluded)[0] ?? null;
    const attempts = listInventoryCheckAttemptsByAssignment(adapter, current.id);
    const openAttempt = attempts.find((attempt) => attempt.status === 'OPEN');
    if (!openAttempt) throw new DomainError('INVALID_VALUE', 'Guided check has no open attempt to replace.');
    const cancelledAttempt = closeInventoryCheckAttempt(adapter, {
      id: openAttempt.id,
      status: 'CANCELLED',
      reasonCode,
      note,
      closedAt: atIso,
      closedByStoreMemberId: owner.memberId,
      closedByUserId: input.userId,
      closedByDeviceId: input.deviceId,
    });
    const replaced = closeInventoryCheckAssignment(adapter, {
      id: current.id,
      status: candidate ? 'REPLACED' : 'EXHAUSTED',
      closedAt: atIso,
      closedByStoreMemberId: owner.memberId,
      closedByUserId: input.userId,
      closedByDeviceId: input.deviceId,
    });
    let replacement: InventoryCheckAssignmentRow | null = null;
    let replacementAttempt: InventoryCheckAttemptRow | null = null;
    if (candidate) {
      replacement = createInventoryCheckAssignment(adapter, {
        id: generateId(),
        storeId: input.storeId,
        storeProductId: candidate.storeProductId,
        localDate: current.localDate,
        assignmentKind: 'REPLACEMENT',
        replacesAssignmentId: current.id,
        rootAssignmentId: current.rootAssignmentId,
        policyVersion: current.policyVersion,
        createdByStoreMemberId: owner.memberId,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: atIso,
      });
      replacementAttempt = createInventoryCheckAttempt(adapter, {
        id: generateId(),
        assignmentId: replacement.id,
        storeId: input.storeId,
        storeProductId: candidate.storeProductId,
        attemptKind: 'REPLACEMENT',
        reasonCode,
        note,
        createdByStoreMemberId: owner.memberId,
        createdByUserId: input.userId,
        deviceId: input.deviceId,
        createdAt: atIso,
      });
    }
    const outbox = enqueueOutboxOperation(adapter, {
      operationType: 'CHECK_ASSIGNMENT_CREATED',
      operationId: input.operationId,
      storeId: input.storeId,
      deviceId: input.deviceId,
      entityType: 'CHECK_ASSIGNMENT',
      entityId: assignmentId,
      occurredAt: atIso,
      entities: {
        assignmentVersion: 1,
        action: candidate ? 'REPLACED' : 'EXHAUSTED',
        request,
        assignmentIds: [replaced.id, ...(replacement ? [replacement.id] : [])],
        replacementAssignmentId: replacement?.id ?? null,
        replacedAssignment: replaced,
        cancelledAttempt,
        replacementAttempt,
      },
    });
    const overview = overviewFor(adapter, actor, atIso);
    return {
      overview,
      replacedAssignment: assignmentView(adapter, replaced),
      replacementAssignment: replacement ? assignmentView(adapter, replacement) : null,
      exhausted: replacement === null,
      outbox,
    };
  });
}
