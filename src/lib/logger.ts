type LogMethod = "debug" | "error" | "info" | "warn";

const logsEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_CLIENT_LOGS === "true";

function writeLog(method: LogMethod, args: unknown[]) {
  if (!logsEnabled && method !== "error" && method !== "warn") {
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
