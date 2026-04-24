export interface JsonErrorResponse {
  code?: string;
  message?: string;
  retryable?: boolean;
}

export type RefreshAuthCallback = () => Promise<boolean>;

export type ApiRequestInit = RequestInit & {
  tokenRequired?: boolean;
  tokenOptional?: boolean;
  replayedAfterRefresh?: boolean;
  replayedWithoutOptionalToken?: boolean;
};

export type ApiRequest = <T>(path: string, init?: ApiRequestInit) => Promise<T>;

type QueryParamValue = string | number | boolean | null | undefined;

export function buildQueryPath(
  path: string,
  params: Record<string, QueryParamValue>,
): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "" || value === false || value === 0) {
      continue;
    }
    search.set(key, String(value));
  }

  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
