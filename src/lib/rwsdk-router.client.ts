// Client build placeholder for worker-only `rwsdk/router` APIs referenced from
// `src/worker.tsx`. These stubs let the client phase ignore the worker entry.
export function route(...args: unknown[]) {
  return args;
}

export function render(...args: unknown[]) {
  return args;
}
