// Client build placeholder for `rwsdk/worker`. The real worker runtime should
// never execute in the browser bundle.
export function defineApp<T>(routes: T): T {
  return routes;
}

export const requestInfo = {} as never;
