import * as React from "react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { OnboardingPage } from "./pages";

const {
  authState,
  getCurrentProfileMock,
  getGlobalHandleAvailabilityMock,
  getLatestRedditImportSummaryMock,
  getOnboardingStatusMock,
  joinCommunityMock,
  navigateMock,
  renameGlobalHandleMock,
  startOrCheckRedditVerificationMock,
  startRedditImportMock,
  toastMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  toastMock: vi.fn(),
  authState: {
    accessToken: "token_123",
    connect: vi.fn(),
    isAuthenticated: true,
    isConnecting: false,
  },
  getOnboardingStatusMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  getLatestRedditImportSummaryMock: vi.fn(),
  startOrCheckRedditVerificationMock: vi.fn(),
  startRedditImportMock: vi.fn(),
  getGlobalHandleAvailabilityMock: vi.fn(),
  renameGlobalHandleMock: vi.fn(),
  joinCommunityMock: vi.fn(),
}));

vi.mock("@/app/router", async () => {
  const actual = await vi.importActual<typeof import("@/app/router")>("@/app/router");
  return {
    ...actual,
    navigate: navigateMock,
  };
});

vi.mock("@/components/compositions/pirate-auth/pirate-auth-provider", () => ({
  usePirateAuth: () => authState,
}));

vi.mock("@/components/primitives/sonner", () => ({
  toast: toastMock,
}));

vi.mock("@/lib/pirate-api", async () => {
  const actual = await vi.importActual<typeof import("@/lib/pirate-api")>("@/lib/pirate-api");
  return {
    ...actual,
    getOnboardingStatus: getOnboardingStatusMock,
    getCurrentProfile: getCurrentProfileMock,
    getLatestRedditImportSummary: getLatestRedditImportSummaryMock,
    startOrCheckRedditVerification: startOrCheckRedditVerificationMock,
    startRedditImport: startRedditImportMock,
    getGlobalHandleAvailability: getGlobalHandleAvailabilityMock,
    renameGlobalHandle: renameGlobalHandleMock,
    joinCommunity: joinCommunityMock,
  };
});

describe("OnboardingPage", () => {
  beforeEach(() => {
    authState.accessToken = "token_123";
    authState.isAuthenticated = true;
    authState.isConnecting = false;
    authState.connect.mockReset();

    window.localStorage.clear();

    navigateMock.mockReset();
    toastMock.mockReset();
    getOnboardingStatusMock.mockReset();
    getCurrentProfileMock.mockReset();
    getLatestRedditImportSummaryMock.mockReset();
    startOrCheckRedditVerificationMock.mockReset();
    startRedditImportMock.mockReset();
    getGlobalHandleAvailabilityMock.mockReset();
    renameGlobalHandleMock.mockReset();
    joinCommunityMock.mockReset();
  });

  test("walks the Reddit, username, and communities happy path", async () => {
    const user = userEvent.setup();

    getCurrentProfileMock.mockResolvedValue({
      user_id: "user_01",
      display_name: null,
      bio: null,
      profile_image_url: null,
      banner_image_url: null,
      joined_at: "2026-04-01T00:00:00.000Z",
      global_handle: {
        id: "gh_01",
        label: "user_abc123.pirate",
        issuance_source: "generated_signup",
        free_rename_consumed: true,
        created_at: "2026-04-01T00:00:00.000Z",
      },
      stats: {
        joined_communities_count: 0,
        posts_count: 0,
        comments_count: 0,
      },
    });

    getOnboardingStatusMock
      .mockResolvedValueOnce({
        reddit_verification_status: "not_started",
        reddit_import_status: "not_started",
        generated_handle_assigned: true,
        suggested_community_ids: [],
      })
      .mockResolvedValueOnce({
        reddit_verification_status: "verified",
        reddit_import_status: "succeeded",
        generated_handle_assigned: true,
        suggested_community_ids: [],
      })
      .mockResolvedValueOnce({
        reddit_verification_status: "verified",
        reddit_import_status: "succeeded",
        generated_handle_assigned: false,
        suggested_community_ids: ["comm_01"],
      });

    getLatestRedditImportSummaryMock
      .mockResolvedValueOnce({
        reddit_username: "technohippie",
        imported_post_count: 12,
        imported_comment_count: 48,
        suggested_communities: [],
      })
      .mockResolvedValueOnce({
        reddit_username: "technohippie",
        imported_post_count: 12,
        imported_comment_count: 48,
        suggested_communities: [
          {
            community_id: "comm_01",
            name: "c/pirates",
            reason: "Suggested from your Reddit activity.",
          },
        ],
      });

    startOrCheckRedditVerificationMock
      .mockResolvedValueOnce({
        reddit_username: "technohippie",
        status: "pending",
        verification_hint: "pirate-technohippie-1234",
        code_placement_surface: "profile",
        checked_count: 0,
        last_checked_at: null,
        verified_at: null,
        failed_reason: null,
      })
      .mockResolvedValueOnce({
        reddit_username: "technohippie",
        status: "verified",
        verification_hint: "pirate-technohippie-1234",
        code_placement_surface: "profile",
        checked_count: 1,
        last_checked_at: "2026-04-01T00:01:00.000Z",
        verified_at: "2026-04-01T00:01:00.000Z",
        failed_reason: null,
      });

    startRedditImportMock.mockResolvedValue({
      import_job_id: "job_01",
      status: "queued",
    });

    getGlobalHandleAvailabilityMock.mockImplementation(async ({ label }: { label: string }) => ({
      label,
      status: "available",
    }));

    renameGlobalHandleMock.mockResolvedValue({
      id: "gh_02",
      label: "technohippie.pirate",
      issuance_source: "reddit_verified_claim",
      free_rename_consumed: true,
      created_at: "2026-04-01T00:02:00.000Z",
    });

    render(<OnboardingPage />);

    const redditInput = await screen.findByPlaceholderText("technohippie");
    await user.type(redditInput, "technohippie");
    await user.click(screen.getByRole("button", { name: "Continue" }));

    expect(startOrCheckRedditVerificationMock).toHaveBeenCalledWith({
      accessToken: "token_123",
      redditUsername: "technohippie",
    });

    expect(await screen.findByText("pirate-technohippie-1234")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(startRedditImportMock).toHaveBeenCalledWith({
        accessToken: "token_123",
        redditUsername: "technohippie",
      });
    });

    const handleInput = await screen.findByPlaceholderText("your-name");
    expect(handleInput).toHaveValue("user_abc123");

    await user.clear(handleInput);
    await user.type(handleInput, "technohippie");

    await waitFor(() => {
      expect(getGlobalHandleAvailabilityMock).toHaveBeenCalledWith({
        accessToken: "token_123",
        label: "technohippie",
      });
    });

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      expect(renameGlobalHandleMock).toHaveBeenCalledWith({
        accessToken: "token_123",
        desiredLabel: "technohippie",
      });
    });

    expect(await screen.findByText("c/pirates")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Done" }));

    expect(navigateMock).toHaveBeenCalledWith("/");
    expect(window.localStorage.getItem("pirate.onboarding.reddit")).toBeNull();
  });
});
