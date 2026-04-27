export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  if (import.meta.env.DEV) return;

  void navigator.serviceWorker.register("/sw.js", { scope: "/" });
}
