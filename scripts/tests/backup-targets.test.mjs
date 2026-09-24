import test from "node:test";
import assert from "node:assert/strict";
import {
  validateDatabaseTarget,
  validateBackupTargets,
  BACKUP_PROJECTS,
} from "../verify-backup-targets.mjs";

const platformRef = BACKUP_PROJECTS.ZAGRAJ_PLATFORM_DB_URL;
const polowanieRef = BACKUP_PROJECTS.ZAGRAJ_POLOWANIE_DB_URL;

function pooler(ref) {
  return `postgresql://postgres.${ref}:local-FAKE-password@aws-0-us-east-1.pooler.supabase.com:5432/postgres`;
}

test("correct project identity and session-pooler mode pass", () => {
  assert.equal(validateDatabaseTarget(pooler(platformRef), platformRef), null);
  assert.equal(validateDatabaseTarget(pooler(polowanieRef), polowanieRef), null);
});

test("swapping the two databases fails before connecting", () => {
  const result = validateBackupTargets({
    ZAGRAJ_PLATFORM_DB_URL: pooler(polowanieRef),
    ZAGRAJ_POLOWANIE_DB_URL: pooler(platformRef),
  });
  assert.equal(result.length, 2);
  assert.doesNotMatch(result.join(" "), /local-FAKE-password/);
});

test("only valid direct host and project username are accepted", () => {
  assert.equal(validateDatabaseTarget(
    `postgresql://postgres:local-FAKE-password@db.${platformRef}.supabase.co:5432/postgres`,
    platformRef,
  ), null);
  assert.ok(validateDatabaseTarget(
    `postgresql://postgres.${platformRef}:local-FAKE-password@db.${platformRef}.supabase.co:5432/postgres`,
    platformRef,
  ));
});

test("wrong database, transaction pooler and unrecognized hostname fail", () => {
  assert.ok(validateDatabaseTarget(pooler(platformRef).replace(":5432", ":6543"), platformRef));
  assert.ok(validateDatabaseTarget(pooler(platformRef).replace("/postgres", "/wrong"), platformRef));
  assert.ok(validateDatabaseTarget(pooler(platformRef).replace("pooler.supabase.com", "fake.example.org"), platformRef));
});

test("publishable keys are not database URLs", () => {
  assert.ok(validateDatabaseTarget("sb_publishable_fake", platformRef));
});
