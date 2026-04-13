type Unsubscribe = () => void;

export interface DesktopPlatformInfo {
  platform: string;
  arch: string;
}

export interface DesktopSession {
  version?: number;
  provider?: string;
  walletAddress?: string;
  accessToken?: string;
  [key: string]: unknown;
}

interface DesktopBridgeSystem {
  openExternal(url: string): Promise<void>;
  getPlatform(): Promise<DesktopPlatformInfo>;
}

interface DesktopBridgeAuth {
  startLogin(): Promise<{ started: true }>;
  logout(): Promise<void>;
  getSession(): Promise<DesktopSession | null>;
  onSessionChanged(callback: (session: DesktopSession | null) => void): Unsubscribe;
}

export interface DesktopBridge {
  system: DesktopBridgeSystem;
  auth?: DesktopBridgeAuth;
}

export function hasDesktopBridge(): boolean {
  return typeof window !== "undefined" && "pirateDesktop" in window;
}

export function getDesktopBridge(): DesktopBridge | null {
  if (!hasDesktopBridge()) {
    return null;
  }

  return window.pirateDesktop as DesktopBridge;
}

export async function openExternal(url: string): Promise<void> {
  const bridge = getDesktopBridge();

  if (bridge) {
    await bridge.system.openExternal(url);
    return;
  }

  window.open(url, "_blank", "noopener,noreferrer");
}

export async function getPlatform(): Promise<DesktopPlatformInfo | null> {
  const bridge = getDesktopBridge();
  if (!bridge) return null;
  return bridge.system.getPlatform();
}

export async function getSession(): Promise<DesktopSession | null> {
  const bridge = getDesktopBridge();
  if (!bridge?.auth) return null;
  return bridge.auth.getSession();
}

export function onSessionChanged(
  callback: (session: DesktopSession | null) => void,
): Unsubscribe {
  const bridge = getDesktopBridge();
  if (!bridge?.auth) return () => {};
  return bridge.auth.onSessionChanged(callback);
}

declare global {
  interface Window {
    pirateDesktop?: DesktopBridge;
  }
}
