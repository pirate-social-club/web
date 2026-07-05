import * as Sentry from "@sentry/react";

type SentryLevel = "debug" | "error" | "info" | "warning";

let initialized = false;
let enabled = false;

function readEnv(name: string): string | undefined {
  const value = (import.meta.env as Record<string, unknown>)[name];
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function sentryEnvironment(): string {
  return readEnv("VITE_SENTRY_ENVIRONMENT")
    ?? readEnv("VITE_PIRATE_APP_ENV")
    ?? import.meta.env.MODE
    ?? "development";
}

function normalizeLevel(level: SentryLevel): Sentry.SeverityLevel {
  return level === "warning" ? "warning" : level;
}

function findError(args: unknown[]): Error | null {
  for (const arg of args) {
    if (arg instanceof Error) return arg;
    if (arg && typeof arg === "object" && "error" in arg) {
      const nested = (arg as { error?: unknown }).error;
      if (nested instanceof Error) return nested;
    }
  }
  return null;
}

function breadcrumbData(args: unknown[]): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  args.forEach((arg, index) => {
    if (arg instanceof Error) {
      data[`error_${index}`] = {
        message: arg.message,
        name: arg.name,
        stack: arg.stack,
      };
      return;
    }
    data[`arg_${index}`] = arg;
  });
  return Object.keys(data).length > 0 ? data : undefined;
}

function breadcrumbMessage(args: unknown[]): string {
  const first = args[0];
  if (typeof first === "string" && first.trim()) return first;
  const error = findError(args);
  return error?.message || "client log";
}

export function initSentry(): void {
  if (initialized) return;
  initialized = true;

  const dsn = readEnv("VITE_SENTRY_DSN");
  if (!dsn) return;

  enabled = true;
  Sentry.init({
    dsn,
    environment: sentryEnvironment(),
    release: readEnv("VITE_SENTRY_RELEASE"),
    sendDefaultPii: false,
  });
}

export function recordLogBreadcrumb(level: SentryLevel, args: unknown[]): void {
  if (!enabled) return;
  Sentry.addBreadcrumb({
    category: "client.log",
    data: breadcrumbData(args),
    level: normalizeLevel(level),
    message: breadcrumbMessage(args),
  });
}

export function captureLoggedError(args: unknown[]): void {
  if (!enabled) return;
  const error = findError(args);
  if (error) {
    Sentry.captureException(error);
    return;
  }
  Sentry.captureMessage(breadcrumbMessage(args), "error");
}
