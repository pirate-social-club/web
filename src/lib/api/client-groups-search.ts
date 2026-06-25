import type {
  ApiSearchResultKind,
  ApiSearchResultsResponse,
} from "./client-api-types";
import { buildQueryPath, type ApiRequest } from "./client-internal";

type SearchOptions = {
  query: string;
  limit?: number | null;
  cursor?: string | null;
  kinds?: readonly ApiSearchResultKind[] | null;
};

export function createSearchApi(request: ApiRequest) {
  return {
    pirate: (input: SearchOptions): Promise<ApiSearchResultsResponse> =>
      request<ApiSearchResultsResponse>(buildQueryPath("/search", {
        q: input.query,
        limit: input.limit,
        cursor: input.cursor,
        kinds: input.kinds && input.kinds.length > 0 ? input.kinds.join(",") : null,
      }), {
        tokenRequired: false,
      }),
  };
}
