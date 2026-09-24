#!/usr/bin/env bash
# Interactive macOS operator flow. Secrets are entered silently and never written to disk.
set -Eeuo pipefail
set +x
umask 077

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
config_dir="$HOME/.config/zagraj-backup"
identity="$config_dir/identity.agekey"
backup_root="$HOME/secure/zagraj-backups"

usage() {
  printf '%s\n' \
    'Usage: bash scripts/backup-mac.sh --check | --setup | --run' \
    '--check: prerequisites only. No database access.' \
    '--setup: create your PRIVATE age identity on this Mac; save its copy OFF this Mac.' \
    '--run: enter both DB URLs silently; encrypted backup of both Supabase projects.'
}
mode="${1:---help}"
if [[ "$mode" == "--help" ]]; then usage; exit 0; fi
if [[ "$mode" != "--check" && "$mode" != "--setup" && "$mode" != "--run" ]]; then
  usage >&2; exit 2
fi
if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'This guide is for macOS only.\n' >&2; exit 1
fi

for command in supabase docker age age-keygen shasum node; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Missing tool: %s\n' "$command" >&2; exit 1
  fi
done
if ! docker info >/dev/null 2>&1; then
  printf 'Start Docker Desktop before continuing.\n' >&2; exit 1
fi
if ! fdesetup status 2>/dev/null | grep -q 'FileVault is On'; then
  printf 'FileVault must be enabled before temporary plaintext database files are created.\n' >&2
  exit 1
fi
printf 'Prerequisites, Docker and FileVault: checked.\n'

if [[ "$mode" == "--check" ]]; then
  printf 'No secrets requested; no database accessed.\n'
  exit 0
fi

if [[ "$mode" == "--setup" ]]; then
  mkdir -p -- "$config_dir" "$HOME/secure" "$backup_root"
  chmod 700 -- "$config_dir" "$HOME/secure" "$backup_root"
  if [[ -e "$identity" ]]; then
    printf 'Private identity already exists. Will not overwrite it.\n'
  else
    age-keygen -o "$identity" > /dev/null
    chmod 600 -- "$identity"
    printf 'New private identity created in your macOS user account.\n'
  fi
  printf 'Public recipient (safe to use locally):\n'
  age-keygen -y "$identity"
  printf 'Save a second PRIVATE identity copy on a separate encrypted drive.\n'
  printf 'Never send the private identity or database URLs to ChatGPT, GitHub or Vercel.\n'
  exit 0
fi

if [[ ! -f "$identity" ]]; then
  printf 'Missing private identity. Run --setup first.\n' >&2; exit 1
fi
printf '%s\n' \
  'This operation reads two production databases and temporarily creates plaintext' \
  'SQL files on the FileVault-protected Mac. It NEVER writes SQL to GitHub.' \
  'Before continuing, verify you saved your private age key on a separate encrypted drive.'
printf 'Enter KEY-SAVED to continue: '
IFS= read -r confirmation
if [[ "$confirmation" != "KEY-SAVED" ]]; then
  printf 'Canceled; no database accessed.\n'; exit 1
fi

export ZAGRAJ_BACKUP_ROOT="$backup_root"
export ZAGRAJ_BACKUP_RECIPIENT
ZAGRAJ_BACKUP_RECIPIENT="$(age-keygen -y "$identity")"
export ZAGRAJ_PLATFORM_DB_URL ZAGRAJ_POLOWANIE_DB_URL
trap 'unset ZAGRAJ_PLATFORM_DB_URL ZAGRAJ_POLOWANIE_DB_URL' EXIT

printf 'Paste platforma-gier SESSION pooler URL (hidden input), then Enter:\n'
IFS= read -rs ZAGRAJ_PLATFORM_DB_URL
printf '\n'
printf 'Paste Polowanie SESSION pooler URL (hidden input), then Enter:\n'
IFS= read -rs ZAGRAJ_POLOWANIE_DB_URL
printf '\n'

# Reject swapped/wrong DB projects before connecting. The verifier never prints URLs.
node "$repo_root/scripts/verify-backup-targets.mjs"
bash "$repo_root/scripts/backup-supabase.sh" --check
bash "$repo_root/scripts/backup-supabase.sh" --run

printf 'After completion, copy the ENCRYPTED bundle off-site and test restore.\n'
