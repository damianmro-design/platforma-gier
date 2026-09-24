#!/usr/bin/env bash
# Local, opt-in backup of BOTH production databases.
# No credentials, raw SQL or age identities belong in the public repository.
set -Eeuo pipefail
set +x
umask 077

usage() {
  cat <<'HELP'
Usage: bash scripts/backup-supabase.sh [--check | --run]

--check  Check prerequisites and configuration without touching a database.
--run    Export and encrypt both databases to an OUTSIDE-repository directory.

Required for --run:
  ZAGRAJ_BACKUP_ROOT          absolute directory OUTSIDE this Git repository
  ZAGRAJ_BACKUP_RECIPIENT     age1... PUBLIC encryption recipient, not secret key
  ZAGRAJ_PLATFORM_DB_URL      production platform session-pooler/direct DB URL
  ZAGRAJ_POLOWANIE_DB_URL     production Polowanie session-pooler/direct DB URL

Install Supabase CLI, Docker and age; keep the age private identity OFF this server.
Backup includes schema/roles/data but NOT Supabase Storage file contents or settings.
See docs/release/backup-restore.md before use.
HELP
}

mode="${1:---help}"
if [[ "$mode" == "--help" || "$mode" == "-h" ]]; then usage; exit 0; fi
if [[ "$mode" != "--check" && "$mode" != "--run" ]]; then usage >&2; exit 2; fi

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
for tool in supabase docker age shasum node; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Missing prerequisite: %s\n' "$tool" >&2
    exit 1
  fi
done
if ! docker info >/dev/null 2>&1; then
  printf 'Docker must be running for Supabase CLI db dump.\n' >&2
  exit 1
fi

: "${ZAGRAJ_BACKUP_ROOT:?Set an absolute backup directory OUTSIDE the repo}"
: "${ZAGRAJ_BACKUP_RECIPIENT:?Set an age1... PUBLIC recipient}"
if [[ "$ZAGRAJ_BACKUP_ROOT" != /* ]]; then
  printf 'Backup root must be an absolute path.\n' >&2; exit 1
fi
if [[ ! "$ZAGRAJ_BACKUP_RECIPIENT" =~ ^age1[a-z0-9]+$ ]]; then
  printf 'Expected an age1... public recipient, never the private identity.\n' >&2; exit 1
fi

# Resolve canonical path so relative segments/symlinks cannot put SQL in Git.
mkdir -p -- "$ZAGRAJ_BACKUP_ROOT"
root="$(cd "$ZAGRAJ_BACKUP_ROOT" && pwd -P)"
if [[ "$root" == "$repo_root" || "$root/" == "$repo_root/"* ]]; then
  printf 'Refusing to write backups into the Git repository.\n' >&2; exit 1
fi
# Never chmod a generic system or home directory: use a dedicated named folder.
if [[ "$(basename "$root")" != zagraj-backups* ]]; then
  printf 'Use a dedicated folder named zagraj-backups (or zagraj-backups-*).\n' >&2; exit 1
fi
chmod 700 -- "$root"

if [[ "$mode" == "--check" ]]; then
  printf 'Prerequisites and external backup directory validated. NO database accessed.\n'
  exit 0
fi

: "${ZAGRAJ_PLATFORM_DB_URL:?Missing platform DB URL}"
: "${ZAGRAJ_POLOWANIE_DB_URL:?Missing Polowanie DB URL}"
case "$ZAGRAJ_PLATFORM_DB_URL $ZAGRAJ_POLOWANIE_DB_URL" in
  *"example"*|*"YOUR-PASSWORD"*|*"["*|*"]"*)
    printf 'A database URL is still a placeholder.\n' >&2; exit 1 ;;
esac

# Verify the exact project identity before connecting: never swap the two bases.
node "$repo_root/scripts/verify-backup-targets.mjs"

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
work="$(mktemp -d "$root/.incomplete-$stamp-XXXXXX")"
trap 'rm -rf -- "$work"' EXIT
mkdir -m 700 "$work/platform" "$work/polowanie"

# Keep CLI stderr out of ordinary CI output: connection failures can echo URLs.
# The private temporary log is discarded on both success and failure.
dump_one() {
  local url="$1" destination="$2" stage="$3"
  shift 3
  if ! supabase db dump --db-url "$url" -f "$destination/$stage.sql" "$@" >"$work/.dump.log" 2>&1; then
    printf 'Database dump failed (%s, %s). No backup was published.\n' "$destination" "$stage" >&2
    return 1
  fi
  rm -f -- "$work/.dump.log"
  if [[ ! -s "$destination/$stage.sql" ]]; then
    printf 'Database dump is empty (%s, %s).\n' "$destination" "$stage" >&2
    return 1
  fi
  if [[ "$stage" == "data" && "$destination" == "$work/polowanie" ]]; then
    if ! grep -Eq '^(COPY|INSERT INTO)[[:space:]]+(auth[.]users|"auth"[.]"users")([[:space:]]|[(])' "$destination/$stage.sql"; then
      printf 'Auth users table absent from Polowanie data dump. Refusing incomplete backup.\n' >&2
      return 1
    fi
  fi
  if ! age -r "$ZAGRAJ_BACKUP_RECIPIENT" -o "$destination/$stage.sql.age" "$destination/$stage.sql" >"$work/.encrypt.log" 2>&1; then
    printf 'Encryption failed. No backup was published.\n' >&2
    return 1
  fi
  rm -f -- "$work/.encrypt.log" "$destination/$stage.sql"
}

for project in platform polowanie; do
  if [[ "$project" == platform ]]; then url="$ZAGRAJ_PLATFORM_DB_URL"; else url="$ZAGRAJ_POLOWANIE_DB_URL"; fi
  dest="$work/$project"
  dump_one "$url" "$dest" roles --role-only
  dump_one "$url" "$dest" schema
  dump_one "$url" "$dest" data --use-copy --data-only -x "storage.buckets_vectors" -x "storage.vector_indexes"
  # Preserve the CLI migration ledger too; it is not included by the normal
  # schema/data dump and matters for safe future migrations after restoration.
  dump_one "$url" "$dest" history_schema --schema supabase_migrations
  dump_one "$url" "$dest" history_data --use-copy --data-only --schema supabase_migrations
  (cd "$dest" && shasum -a 256 *.sql.age > SHA256SUMS)
done

final="$root/zagraj-$stamp"
if [[ -e "$final" ]]; then
  printf 'Backup destination already exists; not overwriting.\n' >&2; exit 1
fi
mv -- "$work" "$final"
trap - EXIT
printf 'Encrypted backup complete: %s\n' "$final"
printf 'Check SHA256SUMS and perform a RESTORE DRILL in an isolated environment.\n'
