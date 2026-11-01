const TRANSACTION_POOLER_KEY = "SUPABASE_TRANSACTION_POOLER_KEY";
const SESSION_POOLER_KEY = "SUPABASE_SESSION_POOLER_KEY";
// The deployed Vercel environment stores this key name as-is; keep it for compatibility.
const DIRECT_CONNECTION_KEY = "SUPPABASE_Direct_connection_KEY";

type Environment = Readonly<Record<string, string | undefined>>;

type SupabaseMode = "transaction" | "session";

function read(env: Environment, key: string): string | undefined {
  const value = env[key]?.trim();
  return value ? value : undefined;
}

function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "::1" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0" ||
    hostname.startsWith("127.")
  );
}

function isSupabaseHost(hostname: string): boolean {
  return hostname.endsWith(".supabase.co") || hostname.endsWith(".pooler.supabase.com");
}

export function isLoopbackDatabaseUrl(raw: string): boolean {
  try {
    return isLoopbackHost(new URL(raw).hostname);
  } catch {
    return false;
  }
}

/**
 * Supabase poolers present a private CA that Node's trust store rejects, so the only
 * options are requiring `no-verify` or shipping that CA. Traffic stays encrypted; a
 * managed CA is the follow-up if certificate verification becomes a hard requirement.
 */
export function normalizeDatabaseUrl(raw: string, mode: SupabaseMode = "transaction"): string {
  const url = new URL(raw);

  if (isSupabaseHost(url.hostname)) {
    if (url.hostname.endsWith(".pooler.supabase.com")) {
      url.port = mode === "session" ? "5432" : "6543";
    }

    url.searchParams.set("sslmode", "no-verify");
    return url.toString();
  }

  if (!isLoopbackHost(url.hostname) && !url.searchParams.has("sslmode")) {
    url.searchParams.set("sslmode", "require");
  }

  return url.toString();
}

function isDeployed(env: Environment): boolean {
  return env.VERCEL === "1" || env.NODE_ENV === "production";
}

function supabaseRuntimeUrl(env: Environment): string | undefined {
  const pooler = read(env, TRANSACTION_POOLER_KEY) ?? read(env, SESSION_POOLER_KEY);

  if (pooler) {
    return normalizeDatabaseUrl(pooler, "transaction");
  }

  const direct = read(env, DIRECT_CONNECTION_KEY);
  return direct ? normalizeDatabaseUrl(direct) : undefined;
}

export function resolveDatabaseUrl(env: Environment): string | undefined {
  const explicit = read(env, "DATABASE_URL");

  if (explicit && !isLoopbackDatabaseUrl(explicit)) {
    return normalizeDatabaseUrl(explicit);
  }

  if (isDeployed(env)) {
    const supabase = supabaseRuntimeUrl(env);

    if (supabase) {
      return supabase;
    }
  }

  if (explicit) {
    return normalizeDatabaseUrl(explicit);
  }

  return supabaseRuntimeUrl(env);
}

export function resolveMigrationDatabaseUrl(env: Environment): string | undefined {
  const explicit = read(env, "DATABASE_URL");

  if (!isDeployed(env) && explicit) {
    return normalizeDatabaseUrl(explicit);
  }

  // Session mode keeps advisory locks on one server connection, which migrations rely on.
  const session = read(env, SESSION_POOLER_KEY);

  if (session) {
    return normalizeDatabaseUrl(session, "session");
  }

  const transaction = read(env, TRANSACTION_POOLER_KEY);

  if (transaction) {
    return normalizeDatabaseUrl(transaction, "session");
  }

  const direct = read(env, DIRECT_CONNECTION_KEY);

  if (direct) {
    return normalizeDatabaseUrl(direct);
  }

  return explicit ? normalizeDatabaseUrl(explicit) : undefined;
}
