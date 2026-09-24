import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, chmodSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const script = resolve("scripts/backup-supabase.sh");

function run(env, mode) {
  return spawnSync("bash", [script, mode], {
    env: { ...process.env, ...env },
    encoding: "utf8",
    timeout: 15_000,
  });
}

test("backup script passes bash syntax check", () => {
  assert.equal(spawnSync("bash", ["-n", script]).status, 0);
});

test("help does not require credentials or contact databases", () => {
  const result = run({}, "--help");
  assert.equal(result.status, 0);
  assert.match(result.stdout, /--run/);
});

test("mock backup writes six ciphertext files, manifest, no plaintext", () => {
  const root = mkdtempSync(join(tmpdir(), "zagraj-backup-ci-"));
  try {
    const bin = join(root, "bin");
    mkdirSync(bin);
    const commands = {
      docker: "#!/usr/bin/env bash\nexit 0\n",
      supabase: [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'out=""',
        'while (( $# )); do',
        '  if [[ "$1" == "-f" ]]; then out="$2"; shift 2; else shift; fi',
        "done",
        '[[ -n "$out" ]] || exit 5',
        'case "$out" in',
        '  */data.sql) printf "COPY auth.users (id) FROM stdin;\\\\n\\\\.\\\\n" > "$out" ;; ',
        '  *) printf "synthetic dump\\\\n" > "$out" ;; ',
        'esac',
        "",
      ].join("\n"),
      age: [
        "#!/usr/bin/env bash",
        "set -euo pipefail",
        'out=""',
        'while (( $# )); do',
        '  if [[ "$1" == "-o" ]]; then out="$2"; shift 2; else shift; fi',
        "done",
        '[[ -n "$out" ]] || exit 5',
        "printf 'mock ciphertext; NOT genuine encryption\\n' > \"$out\"",
        "",
      ].join("\n"),
    };
    for (const [name, contents] of Object.entries(commands)) {
      const target = join(bin, name);
      writeFileSync(target, contents);
      chmodSync(target, 0o700);
    }
    const backupRoot = join(root, "zagraj-backups");
    const platformRef = "glcjetxskjnlbeegirln";
    const polowanieRef = "ggxfccvrswbnxfuavnht";
    const env = {
      PATH: bin + ":" + process.env.PATH,
      ZAGRAJ_BACKUP_ROOT: backupRoot,
      ZAGRAJ_BACKUP_RECIPIENT: "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
      ZAGRAJ_PLATFORM_DB_URL: `postgresql://postgres.${platformRef}:fake-secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
      ZAGRAJ_POLOWANIE_DB_URL: `postgresql://postgres.${polowanieRef}:fake-secret@aws-0-us-east-1.pooler.supabase.com:5432/postgres`,
    };
    const result = run(env, "--run");
    assert.equal(result.status, 0, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /fake-secret/);
    const dirs = readdirSync(backupRoot).filter((name) => name.startsWith("zagraj-"));
    assert.equal(dirs.length, 1);
    for (const name of ["platform", "polowanie"]) {
      const files = readdirSync(join(backupRoot, dirs[0], name)).sort();
      assert.deepEqual(files, ["SHA256SUMS", "data.sql.age", "history_data.sql.age", "history_schema.sql.age", "roles.sql.age", "schema.sql.age"]);
      assert.match(readFileSync(join(backupRoot, dirs[0], name, "SHA256SUMS"), "utf8"), /roles.sql.age/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("backup destination inside repository is refused before export", () => {
  const env = {
    ZAGRAJ_BACKUP_ROOT: resolve(".backup-should-not-exist"),
    ZAGRAJ_BACKUP_RECIPIENT: "age1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq",
  };
  const mocks = mkdtempSync(join(tmpdir(), "zagraj-mock-tools-"));
  try {
    for (const name of ["supabase", "docker", "age", "shasum"]) {
      const file = join(mocks, name);
      writeFileSync(file, "#!/usr/bin/env bash\nexit 0\n");
      chmodSync(file, 0o700);
    }
    const result = run({ ...env, PATH: mocks + ":" + process.env.PATH }, "--check");
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Refusing to write backups into the Git repository/);
  } finally {
    rmSync(env.ZAGRAJ_BACKUP_ROOT, { recursive: true, force: true });
    rmSync(mocks, { recursive: true, force: true });
  }
});
