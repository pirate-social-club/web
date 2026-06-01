import { expect, test, type Locator, type Page, type Route } from "@playwright/test";

import {
  installAuthenticatedApiMocks,
  installMockSession,
  jsonResponse,
} from "./fixtures/api-mocks";
import {
  mockCommunityPreview,
  mockJoinEligibility,
  mockProfile,
  mockUser,
} from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";

const pirateApiPattern = /https?:\/\/(?:api-staging\.pirate\.sc|api\.pirate\.sc|127\.0\.0\.1:8787)\/.*/u;

type GateAtom = {
  type: string;
  accepted_providers?: string[] | null;
  allowed?: string[];
  provider?: string | null;
  minimum_score?: number;
};

type GateExpression = {
  op: "and" | "or" | "gate";
  children?: GateExpression[];
  gate?: GateAtom;
};

type GatePolicy = {
  version: 1;
  expression: GateExpression;
};

type CreateCommunityBody = {
  allow_anonymous_identity?: boolean;
  anonymous_identity_scope?: string | null;
  database_region?: string | null;
  default_age_gate_policy?: "none" | "18_plus";
  description?: string | null;
  display_name?: string;
  gate_policy?: GatePolicy | null;
  membership_mode?: "open" | "request" | "gated";
};

type CreatedCommunity = {
  id: string;
  body: CreateCommunityBody;
};

function gateSummariesFromPolicy(policy: GatePolicy | null | undefined) {
  return collectGateAtoms(policy).map((gate) => ({
    accepted_providers: gate.provider ? [gate.provider] : null,
    gate_type: gate.type,
    minimum_score: gate.minimum_score ?? null,
  }));
}

function collectGateAtoms(policy: GatePolicy | null | undefined): GateAtom[] {
  if (!policy) return [];

  const atoms: GateAtom[] = [];
  const visit = (expression: GateExpression) => {
    if (expression.op === "gate" && expression.gate) {
      atoms.push(expression.gate);
      return;
    }
    for (const child of expression.children ?? []) visit(child);
  };

  visit(policy.expression);
  return atoms;
}

function createdCommunityResponse(created: CreatedCommunity) {
  const summaries = gateSummariesFromPolicy(created.body.gate_policy);
  return {
    ...mockCommunityPreview,
    id: created.id,
    object: "community",
    route_slug: created.id,
    display_name: created.body.display_name ?? "E2E Created Community",
    description: created.body.description ?? null,
    membership_mode: created.body.membership_mode ?? "gated",
    allow_anonymous_identity: created.body.allow_anonymous_identity ?? true,
    anonymous_identity_scope: created.body.anonymous_identity_scope ?? "community_stable",
    default_age_gate_policy: created.body.default_age_gate_policy ?? "none",
    gate_policy: created.body.gate_policy ?? null,
    membership_gate_summaries: summaries,
    viewer_community_role: "owner",
    viewer_membership_status: "member",
    created_by_user: mockUser.id,
    gate_rules: [],
    governance_mode: "centralized",
    provisioning_state: "active",
    status: "active",
  };
}

function createdCommunityPreview(created: CreatedCommunity) {
  const community = createdCommunityResponse(created);
  return {
    ...mockCommunityPreview,
    id: created.id,
    route_slug: community.route_slug,
    display_name: community.display_name,
    description: community.description,
    membership_mode: community.membership_mode,
    allow_anonymous_identity: community.allow_anonymous_identity,
    anonymous_identity_scope: community.anonymous_identity_scope,
    membership_gate_summaries: community.membership_gate_summaries,
    viewer_community_role: "owner",
    viewer_membership_status: "member",
  };
}

async function installCreateCommunityMocks(page: Page, state: { created: CreatedCommunity[] }) {
  await installAuthenticatedApiMocks(page);
  await installMockSession(page);

  await page.route(pirateApiPattern, async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method().toUpperCase();
    const path = url.pathname;

    if (method === "GET" && path === `/public-profiles/${encodeURIComponent(mockProfile.global_handle.label)}`) {
      await route.fulfill(jsonResponse({
        created_communities: [],
        is_canonical: true,
        profile: mockProfile,
        requested_handle_label: mockProfile.global_handle.label,
        resolved_handle_label: mockProfile.global_handle.label,
      }));
      return;
    }

    if (method === "POST" && path === "/communities") {
      const body = request.postDataJSON() as CreateCommunityBody;
      const created: CreatedCommunity = {
        body,
        id: `cmt_e2e_created_${state.created.length + 1}`,
      };
      state.created.push(created);
      await route.fulfill(jsonResponse({
        community: createdCommunityResponse(created),
        job: {
          id: `job_${created.id}`,
          object: "job",
          job_type: "community_provisioning",
          status: "succeeded",
          subject_type: "community",
          subject: created.id,
          created: Date.parse("2026-05-01T00:00:00.000Z"),
        },
      }, 202));
      return;
    }

    const communityMatch = path.match(/^\/communities\/([^/]+)(?:\/([^/]+))?$/u);
    if (communityMatch) {
      const communityId = decodeURIComponent(communityMatch[1] ?? "");
      const suffix = communityMatch[2] ?? null;
      const created = state.created.find((item) => item.id === communityId);
      if (created) {
        if (method === "GET" && suffix === "preview") {
          await route.fulfill(jsonResponse(createdCommunityPreview(created)));
          return;
        }
        if (method === "GET" && suffix === "posts") {
          await route.fulfill(jsonResponse({ items: [] }));
          return;
        }
        if (method === "GET" && suffix === "join-eligibility") {
          await route.fulfill(jsonResponse({
            ...mockJoinEligibility,
            community: communityId,
            membership_gate_summaries: gateSummariesFromPolicy(created.body.gate_policy),
          }));
          return;
        }
        if (method === "GET" && (suffix === "listings" || suffix === "purchases")) {
          await route.fulfill(jsonResponse({ items: [] }));
          return;
        }
        if (method === "GET" && suffix === null) {
          await route.fulfill(jsonResponse(createdCommunityResponse(created)));
          return;
        }
      }
    }

    await route.fallback();
  });
}

async function waitForClientHydration(locator: Locator) {
  // This route is SSR-rendered; typing before React hydrates changes the DOM value but not composer state.
  await expect.poll(
    () => locator.evaluate((element) =>
      Object.keys(element).some((key) => key.startsWith("__reactProps")),
    ).catch(() => false),
    { timeout: 30_000 },
  ).toBe(true);
}

async function startCreateCommunityFlow(page: Page, displayName: string) {
  await page.goto("/communities/new");
  const nameInput = page.getByPlaceholder("Community name");
  await expect(nameInput).toBeEditable();
  await waitForClientHydration(nameInput);
  await nameInput.click();
  await nameInput.pressSequentially(displayName);
  await expect(nameInput).toHaveValue(displayName);

  const descriptionInput = page.getByPlaceholder("What is this community for?");
  await descriptionInput.click();
  await descriptionInput.pressSequentially(`${displayName} browser gate test.`);

  const nextButton = page.locator("button").filter({ hasText: /^Next$/u });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  await expect(page.getByText("Identity gates")).toBeVisible();
}

async function submitCreateCommunityFlow(page: Page, displayName: string, expectedReviewText?: string | RegExp) {
  const nextButton = page.locator("button").filter({ hasText: /^Next$/u });
  await expect(nextButton).toBeEnabled();
  await nextButton.click();
  const main = page.getByRole("main").last();
  await expect(main).toContainText(displayName);
  if (expectedReviewText) {
    await expect(main).toContainText(expectedReviewText);
  }
  await main.getByRole("button", { name: /^create community$/i }).click();
}

function expectSingleCreatedBody(state: { created: CreatedCommunity[] }): CreateCommunityBody {
  expect(state.created).toHaveLength(1);
  const body = state.created[0]?.body;
  expect(body).toBeTruthy();
  expect(body?.membership_mode).toBe("gated");
  return body!;
}

function expectFlatGatePolicy(
  body: CreateCommunityBody,
  input: {
    mode: "and" | "or";
    atoms: GateAtom[];
  },
) {
  expect(body.gate_policy).toEqual({
    version: 1,
    expression: {
      op: input.mode,
      children: input.atoms.map((gate) => ({ op: "gate", gate })),
    },
  });
}

test.describe("create-community gate policies with mocked API", () => {
  test("creates a proof-of-work gated community from the default flow", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E PoW Community");
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E PoW Community", "Proof-of-work check");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{ type: "altcha_pow" }],
    });
    await expect(page).toHaveURL(/\/c\/cmt_e2e_created_1$/u);
    await expectNoBrowserError(page);
  });

  test("creates a Very-only community without leaking the default proof-of-work gate", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Very Community");
    await page.getByRole("checkbox", { name: /palm scan \(very\)/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("checkbox", { name: /palm scan \(very\)/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E Very Community", "Palm scan");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{ type: "unique_human", provider: "very" }],
    });
    await expectNoBrowserError(page);
  });

  test("creates a Very OR proof-of-work community when fallback is enabled", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Very Or PoW Community");
    await page.getByRole("checkbox", { name: /palm scan \(very\)/i }).click();
    await page.getByRole("button", { name: /allow proof-of-work fallback/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E Very Or PoW Community", /Palm scan or Proof-of-work check/u);

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "or",
      atoms: [
        { type: "unique_human", provider: "very" },
        { type: "altcha_pow" },
      ],
    });
    await expectNoBrowserError(page);
  });

  test("creates a wallet-score OR proof-of-work community in any-gate mode", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Passport Or PoW Community");
    await page.getByRole("button", { name: /any selected gate/i }).click();
    await page.getByRole("checkbox", { name: /passport score threshold/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("checkbox", { name: /passport score threshold/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E Passport Or PoW Community", /Proof-of-work check or Passport Score 20\+/u);

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "or",
      atoms: [
        { type: "altcha_pow" },
        { type: "wallet_score", provider: "passport", minimum_score: 20 },
      ],
    });
    await expectNoBrowserError(page);
  });

  test("creates an all-mode wallet-score community without leaking proof-of-work", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Passport Only Community");
    await page.getByRole("checkbox", { name: /passport score threshold/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("checkbox", { name: /passport score threshold/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E Passport Only Community", "Passport Score 20+");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{ type: "wallet_score", provider: "passport", minimum_score: 20 }],
    });
    await expectNoBrowserError(page);
  });

  test("normalizes proof-of-work away after switching any-mode gates back to all mode", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Passport Round Trip Community");
    await page.getByRole("button", { name: /any selected gate/i }).click();
    await page.getByRole("checkbox", { name: /passport score threshold/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("button", { name: /all selected gates/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("checkbox", { name: /passport score threshold/i })).toHaveAttribute("aria-checked", "true");
    await submitCreateCommunityFlow(page, "E2E Passport Round Trip Community", "Passport Score 20+");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{ type: "wallet_score", provider: "passport", minimum_score: 20 }],
    });
    await expectNoBrowserError(page);
  });

  test("resets to all mode when proof-of-work fallback removal leaves one gate", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Fallback Reset Community");
    await page.getByRole("checkbox", { name: /palm scan \(very\)/i }).click();
    await page.getByRole("button", { name: /allow proof-of-work fallback/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "true");

    await page.getByRole("checkbox", { name: /proof-of-work check/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "false");
    await submitCreateCommunityFlow(page, "E2E Fallback Reset Community", "Palm scan");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{ type: "unique_human", provider: "very" }],
    });
    await expectNoBrowserError(page);
  });

  test("creates a nationality gate with explicit document proof providers", async ({ page }) => {
    const state = { created: [] as CreatedCommunity[] };
    await installCreateCommunityMocks(page, state);

    await startCreateCommunityFlow(page, "E2E Nationality Community");
    await page.getByRole("checkbox", { name: /nationality verification/i }).click();
    await expect(page.getByRole("checkbox", { name: /proof-of-work check/i })).toHaveAttribute("aria-checked", "false");
    await expect(page.getByRole("checkbox", { name: /self\.xyz/i })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByRole("checkbox", { name: /zkpassport/i })).toHaveAttribute("aria-checked", "true");
    await page.getByRole("checkbox", { name: /zkpassport/i }).click();
    await expect(page.getByRole("checkbox", { name: /zkpassport/i })).toHaveAttribute("aria-checked", "false");
    await submitCreateCommunityFlow(page, "E2E Nationality Community", "Nationality verification");

    const body = expectSingleCreatedBody(state);
    expectFlatGatePolicy(body, {
      mode: "and",
      atoms: [{
        type: "nationality",
        provider: "self",
        accepted_providers: ["self"],
        allowed: [],
      }],
    });
    await expectNoBrowserError(page);
  });
});
