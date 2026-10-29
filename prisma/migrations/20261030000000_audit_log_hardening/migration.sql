-- Audit log hardening: richer records, a tamper-evident hash chain and database-enforced append-only storage.

-- The actor is recorded as plain values. A foreign key would let deleting an account change old log rows
-- (ON DELETE SET NULL), which an append-only log must never allow.
ALTER TABLE "AuditLog" DROP CONSTRAINT IF EXISTS "AuditLog_userId_fkey";

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "seq" SERIAL NOT NULL;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorEmail" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "actorRole" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "category" TEXT NOT NULL DEFAULT 'SYSTEM';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "severity" TEXT NOT NULL DEFAULT 'INFO';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "outcome" TEXT NOT NULL DEFAULT 'SUCCESS';
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "userAgent" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "requestId" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "method" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "path" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "prevHash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "hash" TEXT;
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "keyId" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "AuditLog_seq_key" ON "AuditLog"("seq");
CREATE INDEX IF NOT EXISTS "AuditLog_category_idx" ON "AuditLog"("category");
CREATE INDEX IF NOT EXISTS "AuditLog_severity_idx" ON "AuditLog"("severity");
CREATE INDEX IF NOT EXISTS "AuditLog_outcome_idx" ON "AuditLog"("outcome");
CREATE INDEX IF NOT EXISTS "AuditLog_entityId_idx" ON "AuditLog"("entityId");

-- Append-only: rows can be inserted but never changed or removed, not even by the application's own
-- database user. (Dropping the table or the trigger needs schema-owner rights and is itself a deliberate act.)
CREATE OR REPLACE FUNCTION audit_log_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % is not permitted', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS "AuditLog_no_update_delete" ON "AuditLog";
CREATE TRIGGER "AuditLog_no_update_delete"
  BEFORE UPDATE OR DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION audit_log_append_only();

DROP TRIGGER IF EXISTS "AuditLog_no_truncate" ON "AuditLog";
CREATE TRIGGER "AuditLog_no_truncate"
  BEFORE TRUNCATE ON "AuditLog"
  FOR EACH STATEMENT EXECUTE FUNCTION audit_log_append_only();
