import type {
  AgentOwnershipPairing,
  AgentOwnershipPairingClaimRequest,
  AgentOwnershipPairingClaimResult,
  AgentOwnershipSession,
  AgentHandle,
  CompleteAgentOwnershipSessionRequest,
  StartAgentOwnershipSessionRequest,
  UpdateAgentHandleRequest,
  UpdateUserAgentRequest,
  UserAgent,
  UserAgentListResponse,
} from "@pirate/api-contracts";

import type { ApiRequest } from "./client-internal";

export function createAgentsApi(request: ApiRequest) {
  return {
    createPairing: (): Promise<AgentOwnershipPairing> =>
      request<AgentOwnershipPairing>("/agent-ownership-pairing", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    claimPairing: (
      body: AgentOwnershipPairingClaimRequest,
    ): Promise<AgentOwnershipPairingClaimResult> =>
      request<AgentOwnershipPairingClaimResult>("/agent-ownership-pairing/claim", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    list: (): Promise<UserAgentListResponse> =>
      request<UserAgentListResponse>("/agents"),
    get: (agentId: string): Promise<UserAgent> =>
      request<UserAgent>(`/agents/${encodeURIComponent(agentId)}`),
    update: (
      agentId: string,
      body: UpdateUserAgentRequest,
    ): Promise<UserAgent> =>
      request<UserAgent>(`/agents/${encodeURIComponent(agentId)}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    getHandle: (agentId: string): Promise<AgentHandle> =>
      request<AgentHandle>(`/agents/${encodeURIComponent(agentId)}/handle`),
    claimHandle: (
      agentId: string,
      body: UpdateAgentHandleRequest,
    ): Promise<AgentHandle> =>
      request<AgentHandle>(`/agents/${encodeURIComponent(agentId)}/handle`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    startOwnershipSession: (
      body: StartAgentOwnershipSessionRequest,
    ): Promise<AgentOwnershipSession> =>
      request<AgentOwnershipSession>("/agent-ownership-sessions", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getOwnershipSession: (
      agentOwnershipSessionId: string,
    ): Promise<AgentOwnershipSession> =>
      request<AgentOwnershipSession>(
        `/agent-ownership-sessions/${encodeURIComponent(agentOwnershipSessionId)}`,
      ),
    completeOwnershipSession: (
      agentOwnershipSessionId: string,
      body: CompleteAgentOwnershipSessionRequest,
    ): Promise<AgentOwnershipSession> =>
      request<AgentOwnershipSession>(
        `/agent-ownership-sessions/${encodeURIComponent(agentOwnershipSessionId)}/complete`,
        {
          method: "POST",
          body: JSON.stringify(body),
        },
      ),
  };
}
