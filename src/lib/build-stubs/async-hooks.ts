export class AsyncLocalStorage<T = unknown> {
  getStore(): T | undefined {
    return undefined;
  }

  run<R>(_store: T, callback: (...args: never[]) => R): R {
    return callback();
  }
}
