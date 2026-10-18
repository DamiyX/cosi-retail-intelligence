import { DomainError, compareTimestampInstants, parseTimestampInstant } from '@retail/domain';
import type { DatabaseAdapter, SqlParams } from '../db/adapter';
import { requireId } from '../db/repositories/common';
import { assertCurrentActor, resolveCurrentActor, type ActorIdentity } from '../storeContext/access';

export const ACTIVITY_KINDS = ['SALE','RESTOCK','EXPENSE','WITHDRAWAL','ADJUSTMENT','RECONCILIATION','CHECK','ATTEMPT','COUNT'] as const;
export type ActivityKind = typeof ACTIVITY_KINDS[number];
export interface ActivityCursor { recordedAt: string; kind: ActivityKind; id: string }
export interface ActivityFilter { memberId?: string; from?: string; until?: string; kind?: ActivityKind }
export interface ActivityRow extends ActivityCursor {
  actorId: string; actorName: string; actorStatus: string; deviceId: string; deviceLabel: string;
  status: string; detail: string | null; checkId: string | null;
}
export interface StaffMember { id: string; userId: string; name: string; role: string; status: string; accountStatus: string }
export interface StaffDevice { id: string; label: string; status: string }
export interface Page<T,C> { rows: T[]; next: C | null }
export interface CheckEvidence {
  id: string; recordedAt: string; kind: string; status: string; actorId: string; actorName: string;
  closedById: string | null; closedByName: string | null; closedAt: string | null;
  deviceId: string; reason: string | null; note: string | null; physical: string | null; difference: string | null;
}
export interface CheckReview {
  id: string; status: string; rootId: string; replacesId: string | null;
  evidence: Page<CheckEvidence, { recordedAt: string; kind: string; id: string }>;
}

function limitValue(value = 20) {
  if (!Number.isInteger(value) || value < 1 || value > 50) throw new DomainError('INVALID_VALUE','Page size must be between 1 and 50.');
  return value;
}
function time(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) || new Date(value).toISOString() !== value)
    throw new DomainError('INVALID_VALUE','Use a valid UTC date/time.');
  return value;
}

function historyTime(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))
    throw new DomainError('INVALID_VALUE', 'History cursor must contain a supported timestamp.');
  const instant = parseTimestampInstant(value);
  if (!instant) throw new DomainError('INVALID_VALUE', 'History cursor must contain a valid date/time.');
  return instant;
}

/** Read-only SQL keys equivalent to the domain comparator for accepted M7 ISO history.
 * Parse whole local seconds first, then subtract the offset manually (including
 * offsets beyond SQLite's built-in timezone range). Fraction digits remain text.
 * Results stay LIMIT-bounded; no history is materialized or rewritten in JS.
 */
function instantSql(column: string) {
  return `CAST(strftime('%s',substr(${column},1,19)||'Z') AS INTEGER) -
    CASE WHEN substr(${column},-1)='Z' THEN 0 ELSE
      (CASE WHEN substr(${column},-6,1)='-' THEN -1 ELSE 1 END)*
      (CAST(substr(${column},-5,2) AS INTEGER)*3600+CAST(substr(${column},-2,2) AS INTEGER)*60) END instant_seconds,
    CASE WHEN substr(${column},20,1)='.' THEN
      rtrim(substr(${column},21,length(${column})-20-(CASE WHEN substr(${column},-1)='Z' THEN 1 ELSE 6 END)),'0')
      ELSE '' END instant_fraction`;
}

// These are the existing facts. Recorded time orders this local display only.
const sources = [
  "SELECT 'SALE' kind,id,store_id,created_by_user_id actor_id,device_id,created_at recorded_at,status,NULL detail,NULL check_id FROM sales",
  "SELECT 'RESTOCK',id,store_id,created_by_user_id,device_id,created_at,status,NULL,NULL FROM purchases",
  "SELECT 'EXPENSE',id,store_id,created_by_user_id,device_id,created_at,'SAVED',category,NULL FROM expenses",
  "SELECT 'WITHDRAWAL',id,store_id,created_by_user_id,device_id,created_at,'SAVED',NULL,NULL FROM owner_withdrawals",
  "SELECT 'ADJUSTMENT',id,store_id,created_by_user_id,device_id,created_at,'SAVED',reason_code,NULL FROM inventory_adjustments",
  "SELECT 'RECONCILIATION',id,store_id,created_by_user_id,device_id,created_at,status,NULL,check_assignment_id FROM inventory_reconciliations",
  "SELECT 'CHECK',id,store_id,created_by_user_id,device_id,created_at,status,assignment_kind,id FROM inventory_check_assignments",
  "SELECT 'ATTEMPT',id,store_id,created_by_user_id,device_id,created_at,status,reason_code,assignment_id FROM inventory_check_attempts",
  `SELECT 'COUNT',s.id,s.store_id,s.created_by_user_id,s.device_id,s.created_at,s.submission_type,
    s.difference_base_units,r.check_assignment_id FROM inventory_reconciliation_submissions s
    JOIN inventory_reconciliation_lines l ON l.id=s.reconciliation_line_id AND l.store_id=s.store_id
    JOIN inventory_reconciliations r ON r.id=l.reconciliation_id AND r.store_id=s.store_id`,
].join(' UNION ALL ');

export function createStaffClient(db: DatabaseAdapter, options: Partial<ActorIdentity> = {}) {
  const actor = resolveCurrentActor(db, options, true);
  const guard = () => assertCurrentActor(db, actor, true);
  return {
    storeId: actor.storeId,
    storeName: actor.store.name,
    actor,
    listMembers(after?: string, limit = 20): Page<StaffMember,string> {
      guard(); limitValue(limit);
      const rows = db.getAllRows<StaffMember>(
        `SELECT m.id,m.user_id userId,coalesce(u.display_name,'Unknown recorded person') name,m.role,m.status,
          coalesce(u.status,'MISSING') accountStatus FROM store_members m LEFT JOIN users u ON u.id=m.user_id
         WHERE m.store_id=? AND (? IS NULL OR m.id>?) ORDER BY m.id LIMIT ?;`,
        [actor.storeId,after ?? null,after ?? null,limit+1],
      );
      return {rows:rows.slice(0,limit),next:rows.length>limit ? rows[limit-1].id : null};
    },
    listDevices(memberId: string, after?: string, limit = 20): Page<StaffDevice,string> {
      guard(); limitValue(limit);
      const member = db.getFirstRow<{user_id:string}>('SELECT user_id FROM store_members WHERE store_id=? AND id=?;', [actor.storeId,requireId(memberId)]);
      if (!member) throw new DomainError('INVALID_VALUE','Member is unavailable in this store.');
      const rows = db.getAllRows<StaffDevice>(
        `SELECT id,coalesce(device_label,'Recorded device') label,status FROM devices
         WHERE store_id=? AND user_id=? AND (? IS NULL OR id>?) ORDER BY id LIMIT ?;`,
        [actor.storeId,member.user_id,after ?? null,after ?? null,limit+1],
      );
      return {rows:rows.slice(0,limit),next:rows.length>limit ? rows[limit-1].id : null};
    },
    listActivity(filter: ActivityFilter = {}, after?: ActivityCursor, limit = 20): Page<ActivityRow,ActivityCursor> {
      guard(); limitValue(limit);
      if (filter.kind && !ACTIVITY_KINDS.includes(filter.kind)) throw new DomainError('INVALID_VALUE','Unsupported activity filter.');
      if (filter.from) time(filter.from); if (filter.until) time(filter.until);
      if (filter.from && filter.until && compareTimestampInstants(filter.from, filter.until) >= 0) throw new DomainError('INVALID_VALUE','Date range must end after it starts.');
      let user: string | null = null;
      if (filter.memberId) {
        user = db.getFirstRow<{user_id:string}>('SELECT user_id FROM store_members WHERE store_id=? AND id=?;', [actor.storeId,requireId(filter.memberId)])?.user_id ?? null;
        if (!user) throw new DomainError('INVALID_VALUE','Member filter is unavailable in this store.');
      }
      if (after) { historyTime(after.recordedAt); requireId(after.id); if(!ACTIVITY_KINDS.includes(after.kind)) throw new DomainError('INVALID_VALUE','Unsupported cursor.'); }
      const from = filter.from ? historyTime(filter.from) : null, until = filter.until ? historyTime(filter.until) : null;
      const cursor = after ? historyTime(after.recordedAt) : null;
      const params: SqlParams = [actor.storeId,user,user,filter.kind ?? null,filter.kind ?? null,
        from?.seconds ?? null,from?.seconds ?? null,from?.fraction ?? null,
        until?.seconds ?? null,until?.seconds ?? null,until?.fraction ?? null,
        cursor?.seconds ?? null,cursor?.seconds ?? null,cursor?.fraction ?? null,after?.kind ?? null,after?.id ?? null,limit+1];
      const rows = db.getAllRows<ActivityRow>(
        `WITH facts AS (${sources}), activity AS (SELECT *,${instantSql('recorded_at')} FROM facts)
         SELECT a.id,a.kind,a.recorded_at recordedAt,a.actor_id actorId,
          coalesce(u.display_name,'Unknown recorded person') actorName,coalesce(u.status,'MISSING') actorStatus,
          a.device_id deviceId,coalesce(d.device_label,'Recorded device') deviceLabel,a.status,a.detail,a.check_id checkId
         FROM activity a LEFT JOIN users u ON u.id=a.actor_id
         LEFT JOIN devices d ON d.id=a.device_id AND d.store_id=a.store_id
         WHERE a.store_id=? AND (? IS NULL OR a.actor_id=?) AND (? IS NULL OR a.kind=?)
           AND (? IS NULL OR (a.instant_seconds,a.instant_fraction)>=(?,?))
           AND (? IS NULL OR (a.instant_seconds,a.instant_fraction)<(?,?))
           AND (? IS NULL OR (a.instant_seconds,a.instant_fraction,a.kind,a.id)<(?,?,?,?))
         ORDER BY a.instant_seconds DESC,a.instant_fraction DESC,a.kind DESC,a.id DESC LIMIT ?;`,params,
      );
      const last = rows[limit-1];
      return {rows:rows.slice(0,limit),next:rows.length>limit ? {recordedAt:last.recordedAt,kind:last.kind,id:last.id} : null};
    },
    getCheckReview(id: string, after?: {recordedAt:string;kind:string;id:string}, limit = 20): CheckReview {
      guard(); limitValue(limit); requireId(id);
      const assignment = db.getFirstRow<{id:string;status:string;rootId:string;replacesId:string|null}>(
        'SELECT id,status,root_assignment_id rootId,replaces_assignment_id replacesId FROM inventory_check_assignments WHERE store_id=? AND id=?;', [actor.storeId,id],
      );
      if (!assignment) throw new DomainError('INVALID_VALUE','Stock check is unavailable in this store.');
      if(after) {historyTime(after.recordedAt);requireId(after.id);if(!['ATTEMPT','FIRST','RECOUNT'].includes(after.kind)) throw new DomainError('INVALID_VALUE','Invalid review cursor.');}
      const cursor = after ? historyTime(after.recordedAt) : null;
      const rows = db.getAllRows<CheckEvidence>(
        `WITH facts AS (
          SELECT a.id,a.created_at recordedAt,'ATTEMPT' kind,a.status,a.created_by_user_id actorId,a.device_id deviceId,
            a.closed_by_user_id closedById,a.closed_at closedAt,a.reason_code reason,a.note,NULL physical,NULL difference
            FROM inventory_check_attempts a WHERE a.store_id=? AND a.assignment_id=?
          UNION ALL SELECT s.id,s.created_at,s.submission_type,'SUBMITTED',s.created_by_user_id,s.device_id,
            NULL,NULL,s.reason_code,s.note,s.physical_base_units,s.difference_base_units
            FROM inventory_reconciliation_submissions s JOIN inventory_reconciliation_lines l ON l.id=s.reconciliation_line_id AND l.store_id=s.store_id
            JOIN inventory_reconciliations r ON r.id=l.reconciliation_id AND r.store_id=s.store_id
            WHERE s.store_id=? AND r.check_assignment_id=?),
          evidence AS (SELECT *,${instantSql('recordedAt')} FROM facts)
         SELECT e.id,e.recordedAt,e.kind,e.status,e.actorId,e.deviceId,e.closedById,e.closedAt,e.reason,e.note,e.physical,e.difference,
          coalesce(u.display_name,'Unknown recorded person') actorName,c.display_name closedByName
          FROM evidence e LEFT JOIN users u ON u.id=e.actorId LEFT JOIN users c ON c.id=e.closedById
          WHERE (? IS NULL OR (instant_seconds,instant_fraction,kind,e.id)<(?,?,?,?))
          ORDER BY instant_seconds DESC,instant_fraction DESC,kind DESC,e.id DESC LIMIT ?;`,
        [actor.storeId,id,actor.storeId,id,cursor?.seconds ?? null,cursor?.seconds ?? null,cursor?.fraction ?? null,after?.kind ?? null,after?.id ?? null,limit+1],
      );
      const last=rows[limit-1];
      return {...assignment,evidence:{rows:rows.slice(0,limit),next:rows.length>limit ? {recordedAt:last.recordedAt,kind:last.kind,id:last.id} : null}};
    },
  };
}
export type StaffClient = ReturnType<typeof createStaffClient>;
