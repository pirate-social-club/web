export interface JsonErrorResponse {
  code?: string;
  message?: string;
  retryable?: boolean;
}

export type RefreshAuthCallback = () => Promise<boolean>;

export type ApiRequestInit = RequestInit & {
  tokenRequired?: boolean;
  replayedAfterRefresh?: boolean;
};

export type ApiRequest = <T>(path: string, init?: ApiRequestInit) => Promise<T>;
