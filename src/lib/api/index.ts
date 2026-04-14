import * as React from "react";
import { ApiClient } from "./client";
import { getAccessToken, revalidateSession } from "./session-store";

export const api = new ApiClient({
  getToken: getAccessToken,
});

const ApiClientContext = React.createContext<ApiClient>(api);

export function ApiProvider({
  baseUrl,
  children,
}: {
  baseUrl?: string;
  children: React.ReactNode;
}) {
  const client = React.useMemo(() => {
    if (!baseUrl) return api;
    const c = new ApiClient({ baseUrl, getToken: getAccessToken });
    return c;
  }, [baseUrl]);

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
