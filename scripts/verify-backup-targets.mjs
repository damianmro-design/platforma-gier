import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const BACKUP_PROJECTS = Object.freeze({
  ZAGRAJ_PLATFORM_DB_URL: "glcjetxskjnlbeegirln",
  ZAGRAJ_POLOWANIE_DB_URL: "ggxfccvrswbnxfuavnht",
});

/** Validate identity only; never include connection strings or credentials in errors. */
export function validateDatabaseTarget(value, ref) {
  if (!value) return "missing";
  let uri;
  try {
    uri = new URL(value);
  } catch {
    return "invalid-url";
  }
  if (!["postgresql:", "postgres:"].includes(uri.protocol)) return "invalid-protocol";
  if (!uri.password || !uri.username) return "missing-credentials";
  if (uri.pathname !== "/postgres") return "invalid-database";
  const host = uri.hostname.toLowerCase();
  const user = decodeURIComponent(uri.username);
  if (host === `db.${ref}.supabase.co`) {
    return user === "postgres" && (!uri.port || uri.port === "5432")
      ? null : "invalid-direct-connection";
  }
  if (host.endsWith(".pooler.supabase.com")) {
    return user === `postgres.${ref}` && uri.port === "5432"
      ? null : "wrong-project-or-pooler-mode";
  }
  return "unknown-host";
}

export function validateBackupTargets(env) {
  return Object.entries(BACKUP_PROJECTS).flatMap(([key, ref]) => {
    const reason = validateDatabaseTarget(env[key], ref);
    return reason ? [`${key}: ${reason}`] : [];
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = validateBackupTargets(process.env);
  if (errors.length) {
    for (const problem of errors) console.error(problem);
    console.error("Backup aborted; verify project URL, role, database and mode.");
    process.exitCode = 1;
  } else {
    console.log("Verified: separate expected Supabase project identities; NO database contacted.");
  }
}
