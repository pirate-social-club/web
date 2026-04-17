import * as React from "react";
import { ApiClient } from "./client";
import { resolveApiBaseUrl } from "./base-url";
import { getAccessToken, revalidateSession } from "./session-store";

export const api = new ApiClient({
  getToken: getAccessToken,
});

const ApiClientContext = React.createContext<ApiClient>(api);

export function ApiProvider({
  baseUrl,
  initialHost,
  children,
}: {
  baseUrl?: string;
  initialHost?: string;
  children: React.ReactNode;
}) {
  const client = React.useMemo(() => {
    const resolvedBaseUrl = baseUrl ?? resolveApiBaseUrl(initialHost);
    const c = new ApiClient({ baseUrl: resolvedBaseUrl, getToken: getAccessToken });
    return c;
  }, [baseUrl, initialHost]);

  return React.createElement(
    ApiClientContext.Provider,
    { value: client },
    children,
  );
}

export function useApi(): ApiClient {
  return React.useContext(ApiClientContext);
}

export function useSessionRevalidation(): {
  revalidated: boolean | null;
  revalidate: () => Promise<void>;
} {
  const client = useApi();
  const [result, setResult] = React.useState<boolean | null>(null);

  const revalidate = React.useCallback(async () => {
    const ok = await revalidateSession(() => client.users.getMe());
    setResult(ok);
  }, [client]);

  return { revalidated: result, revalidate };
}
