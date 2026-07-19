export type FetchImplementation = (
  ...args: Parameters<typeof globalThis.fetch>
) => ReturnType<typeof globalThis.fetch>;

type FetchMockGlobal = {
  fetch: FetchImplementation;
  setTimeout: typeof globalThis.setTimeout;
};

export function createFetchMock(
  implementation: FetchImplementation,
  platformFetch: typeof globalThis.fetch = globalThis.fetch,
): typeof globalThis.fetch {
  const preconnect = (platformFetch as typeof platformFetch & { preconnect?: unknown }).preconnect;
  if (preconnect !== undefined && !("preconnect" in implementation)) {
    Object.defineProperty(implementation, "preconnect", {
      configurable: true,
      value: preconnect,
    });
  }
  return implementation as typeof globalThis.fetch;
}

/**
 * Gives synchronous test registration a fetch-mutable view of the real global.
 * Every installed implementation keeps the platform fetch function's static
 * `preconnect` member, while its call and response types remain derived from
 * the runtime's actual `typeof fetch` contract.
 */
export function withFetchMockGlobal(register: (testGlobal: FetchMockGlobal) => void): void {
  const platformGlobal = globalThis;
  const testGlobal: FetchMockGlobal = {
    get fetch() {
      return platformGlobal.fetch;
    },
    set fetch(implementation) {
      platformGlobal.fetch = createFetchMock(implementation, platformGlobal.fetch);
    },
    setTimeout: platformGlobal.setTimeout.bind(platformGlobal),
  };

  register(testGlobal);
}
