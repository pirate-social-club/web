import { initClient, initClientNavigation, type NavigationCacheStorage } from "rwsdk/client";

const DEV_DYNAMIC_IMPORT_RELOAD_KEY = "pirate.dev.dynamic-import-reload";

if (import.meta.env.DEV) {
  const viteClientPath = "/@vite/client";
  void import(viteClientPath);
}

function createNoopNavigationCacheStorage(): NavigationCacheStorage {
  return {
    async open() {
      return {
        async put() {},
        async match() {
          return undefined;
        },
      };
    },
    async delete() {
      return true;
    },
    async keys() {
      return [];
    },
  };
}

function isDynamicImportFetchError(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Failed to fetch dynamically imported module")
    || error.message.includes("Importing a module script failed")
  );
}

function reloadOnceForDynamicImportError() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }

  const currentHref = window.location.href;
  const previousHref = window.sessionStorage.getItem(DEV_DYNAMIC_IMPORT_RELOAD_KEY);
  if (previousHref === currentHref) {
    return;
  }

  window.sessionStorage.setItem(DEV_DYNAMIC_IMPORT_RELOAD_KEY, currentHref);
  window.location.reload();
}

function installDevDynamicImportRecovery() {
  if (!import.meta.env.DEV || typeof window === "undefined") {
    return;
  }

  window.addEventListener("error", (event) => {
    if (isDynamicImportFetchError(event.error)) {
      reloadOnceForDynamicImportError();
    }
  });

  window.addEventListener("unhandledrejection", (event) => {
    if (isDynamicImportFetchError(event.reason)) {
      reloadOnceForDynamicImportError();
    }
  });
}

installDevDynamicImportRecovery();

const { handleResponse, onHydrated } = initClientNavigation({
  cacheStorage: import.meta.env.DEV ? createNoopNavigationCacheStorage() : undefined,
});

void initClient({
  handleResponse,
  onHydrated: () => {
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(DEV_DYNAMIC_IMPORT_RELOAD_KEY);
    }
    onHydrated();
  },
});
