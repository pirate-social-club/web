import { resolveApiUrl } from "@/lib/api/base-url";
import type {
  PirateSponsoredIntentRequest,
  PirateSponsoredRelayErrorCode,
  PirateSponsoredRelayResponse,
} from "@/lib/pirate-sponsored-intent";
import { isPirateSponsoredRelayFailure } from "@/lib/pirate-sponsored-intent";

const DEFAULT_RELAY_PATH = "/api/privy-relay";

export class PrivyRelayResponseError extends Error {
  readonly code: PirateSponsoredRelayErrorCode;
  readonly status: number;

  constructor(code: PirateSponsoredRelayErrorCode, message: string, status: number) {
    super(message);
    this.name = "PrivyRelayResponseError";
    this.code = code;
    this.status = status;
  }
}

function isRelayResponse(value: unknown): value is PirateSponsoredRelayResponse {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Record<string, unknown>;
  return typeof payload.txHash === "string"
    || (typeof payload.error === "string" && typeof payload.message === "string");
}

async function parseRelayResponse(response: Response): Promise<PirateSponsoredRelayResponse> {
  const body = await response.json().catch(() => null);
  if (isRelayResponse(body)) {
    return body;
  }

  if (!response.ok) {
    throw new Error(`Privy relay request failed with HTTP ${response.status}.`);
  }

  throw new Error("Privy relay returned an invalid response.");
}

export async function sendPrivyRelayIntent(input: {
  accessToken?: string | null;
  relayPath?: string;
  request: PirateSponsoredIntentRequest;
}): Promise<`0x${string}`> {
  const response = await fetch(resolveApiUrl(input.relayPath ?? DEFAULT_RELAY_PATH), {
    body: JSON.stringify(input.request),
    headers: {
      "content-type": "application/json",
      ...(input.accessToken ? { authorization: `Bearer ${input.accessToken}` } : {}),
    },
    method: "POST",
  });
  const payload = await parseRelayResponse(response);

  if (isPirateSponsoredRelayFailure(payload)) {
    throw new PrivyRelayResponseError(payload.error, payload.message, response.status);
  }

  if (!response.ok) {
    throw new Error(`Privy relay request failed with HTTP ${response.status}.`);
  }

  return payload.txHash;
}
