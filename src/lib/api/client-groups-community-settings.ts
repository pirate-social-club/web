import type {
  Community,
  CommunityMoneyPolicy,
  CommunityPricingPolicy,
  UpdateCommunityMoneyPolicyRequest,
  UpdateCommunityPricingPolicyRequest,
} from "@pirate/api-contracts";

import type {
  ApiCommunityDonationPolicyResponse,
  ApiCommunityAssistantCredentialResponse,
  ApiCommunityAssistantChatDetailResponse,
  ApiCommunityAssistantChatListResponse,
  ApiCommunityAssistantChatResponse,
  ApiCommunityAssistantModelList,
  ApiCommunityAssistantPolicyResponse,
  ApiCommunityAssistantPolicyUpdate,
  ApiCommunityAssistantTranscriptionResponse,
  ApiCommunityGatesUpdateRequest,
  ApiCommunityKaraokePolicy,
  ApiCommunityKaraokePolicyUpdate,
  ApiCommunityMachineAccessPolicy,
  ApiCommunityMachineAccessPolicyUpdate,
  ApiCommunityStudyPolicy,
  ApiCommunityStudyPolicyUpdate,
  ApiCommunityTelegramChatSettings,
  ApiCommunityTelegramChatSettingsUpdate,
  ApiTelegramCommunityBot,
  ApiCommunityRuleInput,
  ApiCommunitySafetyUpdateRequest,
  ApiCommunityVisualPolicyUpdateRequest,
  ApiResolveDonationPartnerResponse,
  ApiTelegramSetupIntent,
  ApiUpdateCommunityRequest,
  CommunityLabelPolicyInput,
  CommunityReferenceLinksInput,
  DonationPolicyUpdateInput,
} from "./client-api-types";
import type { ApiRequest } from "./client-internal";

export function createCommunitySettingsApi(request: ApiRequest) {
  return {
    update: (communityId: string, body: ApiUpdateCommunityRequest): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateRules: (communityId: string, body: { rules: ApiCommunityRuleInput[] }): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/rules`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateReferenceLinks: (
      communityId: string,
      body: CommunityReferenceLinksInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/reference-links`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateLabelPolicy: (
      communityId: string,
      body: CommunityLabelPolicyInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/labels`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getDonationPolicy: (communityId: string): Promise<ApiCommunityDonationPolicyResponse> =>
      request<ApiCommunityDonationPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy`,
      ),
    resolveDonationPartner: (
      communityId: string,
      body: { endaoment_url: string },
    ): Promise<ApiResolveDonationPartnerResponse> =>
      request<ApiResolveDonationPartnerResponse>(
        `/communities/${encodeURIComponent(communityId)}/donation-policy/resolve`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    updateDonationPolicy: (
      communityId: string,
      body: DonationPolicyUpdateInput,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/donation-policy`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getMachineAccessPolicy: (communityId: string): Promise<ApiCommunityMachineAccessPolicy> =>
      request<ApiCommunityMachineAccessPolicy>(
        `/communities/${encodeURIComponent(communityId)}/machine-access-policy`,
      ),
    updateMachineAccessPolicy: (
      communityId: string,
      body: ApiCommunityMachineAccessPolicyUpdate,
    ): Promise<ApiCommunityMachineAccessPolicy> =>
      request<ApiCommunityMachineAccessPolicy>(
        `/communities/${encodeURIComponent(communityId)}/machine-access-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getKaraokePolicy: (communityId: string): Promise<ApiCommunityKaraokePolicy> =>
      request<ApiCommunityKaraokePolicy>(
        `/communities/${encodeURIComponent(communityId)}/karaoke-policy`,
      ),
    updateKaraokePolicy: (
      communityId: string,
      body: ApiCommunityKaraokePolicyUpdate,
    ): Promise<ApiCommunityKaraokePolicy> =>
      request<ApiCommunityKaraokePolicy>(
        `/communities/${encodeURIComponent(communityId)}/karaoke-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getStudyPolicy: (communityId: string): Promise<ApiCommunityStudyPolicy> =>
      request<ApiCommunityStudyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/study-policy`,
      ),
    updateStudyPolicy: (
      communityId: string,
      body: ApiCommunityStudyPolicyUpdate,
    ): Promise<ApiCommunityStudyPolicy> =>
      request<ApiCommunityStudyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/study-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    archiveCommunity: (communityId: string): Promise<{ community_id: string; status: string }> =>
      request<{ community_id: string; status: string }>(
        `/communities/${encodeURIComponent(communityId)}/archive`,
        { method: "POST", body: "{}" },
      ),
    unarchiveCommunity: (communityId: string): Promise<{ community_id: string; status: string }> =>
      request<{ community_id: string; status: string }>(
        `/communities/${encodeURIComponent(communityId)}/unarchive`,
        { method: "POST", body: "{}" },
      ),
    getTelegramChatSettings: (communityId: string): Promise<ApiCommunityTelegramChatSettings> =>
      request<ApiCommunityTelegramChatSettings>(
        `/communities/${encodeURIComponent(communityId)}/telegram-chat`,
      ),
    getTelegramBot: (communityId: string): Promise<ApiTelegramCommunityBot> =>
      request<ApiTelegramCommunityBot>(
        `/communities/${encodeURIComponent(communityId)}/telegram-bot`,
      ),
    saveTelegramBot: (communityId: string, body: { bot_token: string }): Promise<ApiTelegramCommunityBot> =>
      request<ApiTelegramCommunityBot>(
        `/communities/${encodeURIComponent(communityId)}/telegram-bot`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    revokeTelegramBot: (communityId: string): Promise<ApiTelegramCommunityBot> =>
      request<ApiTelegramCommunityBot>(
        `/communities/${encodeURIComponent(communityId)}/telegram-bot/revoke`,
        { method: "POST" },
      ),
    createTelegramSetupIntent: (communityId: string): Promise<ApiTelegramSetupIntent> =>
      request<ApiTelegramSetupIntent>(
        `/communities/${encodeURIComponent(communityId)}/telegram-chat/setup-intents`,
        { method: "POST" },
      ),
    updateTelegramChatSettings: (
      communityId: string,
      body: ApiCommunityTelegramChatSettingsUpdate,
    ): Promise<ApiCommunityTelegramChatSettings> =>
      request<ApiCommunityTelegramChatSettings>(
        `/communities/${encodeURIComponent(communityId)}/telegram-chat`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    unlinkTelegramChat: (communityId: string): Promise<ApiCommunityTelegramChatSettings> =>
      request<ApiCommunityTelegramChatSettings>(
        `/communities/${encodeURIComponent(communityId)}/telegram-chat/unlink`,
        { method: "POST" },
      ),
    getAssistantPolicy: (communityId: string): Promise<ApiCommunityAssistantPolicyResponse> =>
      request<ApiCommunityAssistantPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant-policy`,
      ),
    updateAssistantPolicy: (
      communityId: string,
      body: ApiCommunityAssistantPolicyUpdate,
    ): Promise<ApiCommunityAssistantPolicyResponse> =>
      request<ApiCommunityAssistantPolicyResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    saveAssistantCredential: (
      communityId: string,
      body: { api_key: string; provider?: "openrouter" | "elevenlabs" },
    ): Promise<ApiCommunityAssistantCredentialResponse> => {
      const providerPath = body.provider ? `/${encodeURIComponent(body.provider)}` : "";
      return request<ApiCommunityAssistantCredentialResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant-credential${providerPath}`,
        { method: "POST", body: JSON.stringify(body) },
      );
    },
    revokeAssistantCredential: (
      communityId: string,
      body?: { provider?: "openrouter" | "elevenlabs" },
    ): Promise<ApiCommunityAssistantCredentialResponse> => {
      const providerPath = body?.provider ? `/${encodeURIComponent(body.provider)}` : "";
      return request<ApiCommunityAssistantCredentialResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant-credential${providerPath}/revoke`,
        {
          method: "POST",
          ...(body ? { body: JSON.stringify(body) } : {}),
        },
      );
    },
    getAssistantModels: (communityId: string): Promise<ApiCommunityAssistantModelList> =>
      request<ApiCommunityAssistantModelList>(
        `/communities/${encodeURIComponent(communityId)}/assistant-models`,
      ),
    sendAssistantMessage: (
      communityId: string,
      body: { message: string; chat_id?: string | null },
    ): Promise<ApiCommunityAssistantChatResponse> =>
      request<ApiCommunityAssistantChatResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant/chat`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    sendAssistantAudioMessage: (
      communityId: string,
      input: { file: File; chat_id?: string | null },
    ): Promise<ApiCommunityAssistantChatResponse> => {
      const body = new FormData();
      body.set("file", input.file);
      if (input.chat_id) {
        body.set("chat_id", input.chat_id);
      }
      return request<ApiCommunityAssistantChatResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant/chat/audio`,
        { method: "POST", body },
      );
    },
    transcribeAssistantAudio: (
      communityId: string,
      input: { file: File },
    ): Promise<ApiCommunityAssistantTranscriptionResponse> => {
      const body = new FormData();
      body.set("file", input.file);
      return request<ApiCommunityAssistantTranscriptionResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant/transcriptions`,
        { method: "POST", body },
      );
    },
    synthesizeAssistantSpeech: (
      communityId: string,
      body: { text: string },
    ): Promise<Response> =>
      request<Response>(
        `/communities/${encodeURIComponent(communityId)}/assistant/speech`,
        { method: "POST", body: JSON.stringify(body), responseType: "response" },
      ),
    listAssistantChats: (communityId: string): Promise<ApiCommunityAssistantChatListResponse> =>
      request<ApiCommunityAssistantChatListResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant/chats`,
      ),
    getAssistantChat: (
      communityId: string,
      chatId: string,
    ): Promise<ApiCommunityAssistantChatDetailResponse> =>
      request<ApiCommunityAssistantChatDetailResponse>(
        `/communities/${encodeURIComponent(communityId)}/assistant/chats/${encodeURIComponent(chatId)}`,
      ),
    updateGates: (
      communityId: string,
      body: ApiCommunityGatesUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/gates`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateSafety: (
      communityId: string,
      body: ApiCommunitySafetyUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/safety`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    updateVisualPolicy: (
      communityId: string,
      body: ApiCommunityVisualPolicyUpdateRequest,
    ): Promise<Community> =>
      request<Community>(`/communities/${encodeURIComponent(communityId)}/visual-policy`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    getMoneyPolicy: (communityId: string): Promise<CommunityMoneyPolicy> =>
      request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
      ),
    updateMoneyPolicy: (
      communityId: string,
      body: UpdateCommunityMoneyPolicyRequest,
    ): Promise<CommunityMoneyPolicy> =>
      request<CommunityMoneyPolicy>(
        `/communities/${encodeURIComponent(communityId)}/money-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
    getPricingPolicy: (communityId: string): Promise<CommunityPricingPolicy> =>
      request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
      ),
    updatePricingPolicy: (
      communityId: string,
      body: UpdateCommunityPricingPolicyRequest,
    ): Promise<CommunityPricingPolicy> =>
      request<CommunityPricingPolicy>(
        `/communities/${encodeURIComponent(communityId)}/pricing-policy`,
        { method: "POST", body: JSON.stringify(body) },
      ),
  };
}
