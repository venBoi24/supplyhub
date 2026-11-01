type LogLevel = "debug" | "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

const REDACTED = "[REDACTED]";
const MAX_DEPTH = 6;
const MAX_ARRAY_ITEMS = 50;
const MAX_STRING_LENGTH = 500;

const SENSITIVE_KEY =
  /pass(word|phrase)?|secret|token|authorization|cookie|session|api[-_]?key|card(number)?|cvv|cvc|email|phone|address/i;

export function sanitizeLogString(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f-\u009f]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STRING_LENGTH);
}

export function redact(value: unknown): unknown {
  return redactValue(value, 0, new WeakSet<object>());
}

function redactValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (typeof value === "string") {
    return sanitizeLogString(value);
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (typeof value === "function" || typeof value === "symbol") {
    return undefined;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Error) {
    return { name: value.name, message: sanitizeLogString(value.message) };
  }

  if (depth >= MAX_DEPTH) {
    return "[MAX_DEPTH]";
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return "[CIRCULAR]";
    }

    seen.add(value);

    if (Array.isArray(value)) {
      return value.slice(0, MAX_ARRAY_ITEMS).map((item) => redactValue(item, depth + 1, seen));
    }

    const result: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value)) {
      const safeKey = sanitizeLogString(key).slice(0, 100);
      result[safeKey] = SENSITIVE_KEY.test(key) ? REDACTED : redactValue(item, depth + 1, seen);
    }

    return result;
  }

  return sanitizeLogString(String(value));
}

function emit(level: LogLevel, event: string, context?: LogContext): void {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event: sanitizeLogString(event),
    ...(context ? { context: redact(context) } : {}),
  };

  const line = JSON.stringify(entry);

  if (level === "error") {
    console.error(line);
    return;
  }

  if (level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug: (event: string, context?: LogContext) => emit("debug", event, context),
  info: (event: string, context?: LogContext) => emit("info", event, context),
  warn: (event: string, context?: LogContext) => emit("warn", event, context),
  error: (event: string, context?: LogContext) => emit("error", event, context),
};
