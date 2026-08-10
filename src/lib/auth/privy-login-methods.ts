export type PrivyLoginMethod = "wallet" | "email" | "google" | "twitter" | "passkey";

export type PrivyLoginMethodState = {
  loginMethods: PrivyLoginMethod[];
  originReady: boolean;
};

const LOGIN_METHODS_WITHOUT_PASSKEY: PrivyLoginMethod[] = [
  "wallet",
  "email",
  "google",
  "twitter",
];

export function resolvePrivyLoginMethods(hostname: string): PrivyLoginMethod[] {
  const host = hostname.trim().toLowerCase().replace(/\.+$/u, "");
  const supportsPiratePasskey = host === "pirate.sc"
    || host.endsWith(".pirate.sc")
    || host === "localhost"
    || host.endsWith(".localhost")
    || host === "127.0.0.1";

  return supportsPiratePasskey
    ? [...LOGIN_METHODS_WITHOUT_PASSKEY, "passkey"]
    : [...LOGIN_METHODS_WITHOUT_PASSKEY];
}

export function resolvePrivyLoginConfig(
  loginMethods: PrivyLoginMethod[],
): { loginMethods: PrivyLoginMethod[]; globalDisablePasskeys: boolean } {
  return {
    loginMethods,
    globalDisablePasskeys: !loginMethods.includes("passkey"),
  };
}

export function resolvePrivyLoginMethodState(
  hostname: string | null,
): PrivyLoginMethodState {
  return {
    loginMethods: resolvePrivyLoginMethods(hostname ?? ""),
    originReady: hostname !== null,
  };
}
