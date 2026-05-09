type LogMethod = "debug" | "error" | "info" | "warn";

const logsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_CLIENT_LOGS === "true";

function runtimeLogsEnabled(): boolean {
  try {
    return typeof window !== "undefined" && (
      window.localStorage.getItem("pirate_debug_logs") === "1" ||
      window.localStorage.getItem("pirate_debug_chat") === "1"
    );
  } catch {
    return false;
  }
}

function writeLog(method: LogMethod, args: unknown[]) {
  if (!logsEnabled && !runtimeLogsEnabled() && method !== "error" && method !== "warn") {
    return;
  }

  console[method](...args);
}

export const logger = {
  debug: (...args: unknown[]) => writeLog("debug", args),
  error: (...args: unknown[]) => writeLog("error", args),
  info: (...args: unknown[]) => writeLog("info", args),
  warn: (...args: unknown[]) => writeLog("warn", args),
};
