import type { Migration } from '../db/migrations';

/** Private control intent/cache only. None of these rows confer permission. */
export const staffMigration:Migration={version:28,name:'staff_control_intent',statements:[
  `CREATE TABLE staff_control_requests (
    operation_id TEXT PRIMARY KEY,store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,
    actor_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE RESTRICT,
    target_key TEXT NOT NULL,request TEXT NOT NULL CHECK(json_valid(request)),
    status TEXT NOT NULL CHECK(status IN ('PENDING','CONFIRMED','CONFLICT','DISABLED')),
    receipt TEXT CHECK(receipt IS NULL OR json_valid(receipt)),created_at TEXT NOT NULL,
    CHECK((status='PENDING' AND receipt IS NULL) OR (status<>'PENDING' AND receipt IS NOT NULL))
  );`,
  `CREATE UNIQUE INDEX idx_staff_one_pending_target ON staff_control_requests(store_id,target_key) WHERE status='PENDING';`,
  `CREATE INDEX idx_staff_control_actor ON staff_control_requests(store_id,actor_user_id,device_id,created_at DESC,operation_id DESC);`,
  `CREATE TRIGGER trg_staff_control_body_immutable BEFORE UPDATE ON staff_control_requests
    WHEN NEW.operation_id<>OLD.operation_id OR NEW.store_id<>OLD.store_id OR NEW.actor_user_id<>OLD.actor_user_id
      OR NEW.device_id<>OLD.device_id OR NEW.target_key<>OLD.target_key OR NEW.request<>OLD.request OR NEW.created_at<>OLD.created_at
      OR OLD.status<>'PENDING'
    BEGIN SELECT RAISE(ABORT,'staff request body and terminal receipt are immutable'); END;`,
  `CREATE TABLE staff_control_snapshots (
    store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE RESTRICT,target_key TEXT NOT NULL,
    version INTEGER NOT NULL CHECK(version BETWEEN 0 AND 9007199254740991),
    snapshot TEXT NOT NULL CHECK(json_valid(snapshot)),PRIMARY KEY(store_id,target_key)
  );`,
  `CREATE TRIGGER trg_staff_snapshot_monotonic BEFORE UPDATE ON staff_control_snapshots
    WHEN NEW.version<OLD.version OR (NEW.version=OLD.version AND NEW.snapshot<>OLD.snapshot)
      OR NEW.store_id<>OLD.store_id OR NEW.target_key<>OLD.target_key
    BEGIN SELECT RAISE(ABORT,'staff snapshot must not regress or conflict at one version'); END;`,
]};
