import { expect, test } from "@playwright/test";

import { createMockStoredSession } from "./fixtures/auth-session";
import { expectNoBrowserError } from "./fixtures/e2e-helpers";
import { installStoredSession } from "./fixtures/session";

const communityId = "com_e2e_assistant";
const communityName = "E2E Assistant Community";
const assistantName = "E2E Community Guide";
const assistantReply = "BROWSER_ASSISTANT_E2E_OK";
const chatId = "asc_e2e_assistant";

type CapturedAssistantSend = {
  body: {
    chat_id?: unknown;
    message?: unknown;
  };
};

test.describe("community assistant chat UI", () => {
  test("shows a community assistant next to Bedsheet and sends through the chat thread", async ({ page }) => {
    const sends: CapturedAssistantSend[] = [];
    let sent = false;

    await page.route("http://127.0.0.1:8791/**", async (route) => {
      await route.fulfill({ json: { ok: true }, status: 200 });
    });

    await page.route("http://127.0.0.1:8787/**", async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      const path = url.pathname;

      if (request.method() === "GET" && path === "/public-profiles/e2e-test.pirate") {
        await route.fulfill({
          json: {
            created_communities: [{
              community: communityId,
              created: "2026-05-24T10:00:00.000Z",
              display_name: communityName,
              id: communityId,
              route_slug: "e2e-assistant",
            }],
            profile: null,
          },
          status: 200,
        });
        return;
      }

      if (request.method() === "GET" && path === `/public-communities/${communityId}`) {
        await route.fulfill({
          json: {
            avatar_ref: null,
            display_name: communityName,
            id: communityId,
            route_slug: "e2e-assistant",
          },
          status: 200,
        });
        return;
      }

      if (request.method() === "GET" && path === `/communities/${communityId}/assistant-policy`) {
        await route.fulfill({
          json: {
            avatarRef: null,
            community: communityId,
            defaultPrompt: "Ask the E2E community assistant.",
            displayName: assistantName,
            enabled: true,
            object: "community_assistant_policy_public",
            shortBio: "Answers with mocked community context.",
            starterPrompts: ["Run browser assistant smoke"],
          },
          status: 200,
        });
        return;
      }

      if (request.method() === "GET" && path === `/communities/${communityId}/assistant/chats`) {
        await route.fulfill({
          json: {
            data: sent
              ? [{
                  community: communityId,
                  created_at: "2026-05-24T10:00:00.000Z",
                  id: chatId,
                  object: "community_assistant_chat",
                  status: "active",
                  title: null,
                  updated_at: "2026-05-24T10:01:00.000Z",
                  user: "usr_e2e",
                }]
              : [],
            object: "list",
          },
          status: 200,
        });
        return;
      }

      if (request.method() === "GET" && path === `/communities/${communityId}/assistant/chats/${chatId}`) {
        await route.fulfill({
          json: {
            chat: {
              community: communityId,
              created_at: "2026-05-24T10:00:00.000Z",
              id: chatId,
              object: "community_assistant_chat",
              status: "active",
              title: null,
              updated_at: "2026-05-24T10:01:00.000Z",
              user: "usr_e2e",
            },
            messages: [{
              chat: chatId,
              community: communityId,
              completion_tokens: null,
              content: "Run browser assistant smoke.",
              created_at: "2026-05-24T10:00:30.000Z",
              id: "msg_user_e2e",
              model_id: null,
              object: "community_assistant_message",
              prompt_tokens: null,
              provider_message_id: null,
              role: "user",
              total_tokens: null,
              user: "usr_e2e",
            }, {
              chat: chatId,
              community: communityId,
              completion_tokens: null,
              content: assistantReply,
              created_at: "2026-05-24T10:01:00.000Z",
              id: "msg_assistant_e2e",
              model_id: "mock/browser",
              object: "community_assistant_message",
              prompt_tokens: null,
              provider_message_id: "mock-message",
              role: "assistant",
              total_tokens: null,
              user: "usr_e2e",
            }],
            object: "community_assistant_chat_detail",
          },
          status: 200,
        });
        return;
      }

      if (request.method() === "POST" && path === `/communities/${communityId}/assistant/chat`) {
        const body = request.postDataJSON() as CapturedAssistantSend["body"];
        sends.push({ body });
        sent = true;
        await route.fulfill({
          json: {
            assistant_message: {
              chat: chatId,
              community: communityId,
              completion_tokens: null,
              content: assistantReply,
              created_at: "2026-05-24T10:01:00.000Z",
              id: "msg_assistant_e2e",
              model_id: "mock/browser",
              object: "community_assistant_message",
              prompt_tokens: null,
              provider_message_id: "mock-message",
              role: "assistant",
              total_tokens: null,
              user: "usr_e2e",
            },
            chat: {
              community: communityId,
              created_at: "2026-05-24T10:00:00.000Z",
              id: chatId,
              object: "community_assistant_chat",
              status: "active",
              title: null,
              updated_at: "2026-05-24T10:01:00.000Z",
              user: "usr_e2e",
            },
            object: "community_assistant_chat_response",
            user_message: {
              chat: chatId,
              community: communityId,
              completion_tokens: null,
              content: String(body.message ?? ""),
              created_at: "2026-05-24T10:00:30.000Z",
              id: "msg_user_e2e",
              model_id: null,
              object: "community_assistant_message",
              prompt_tokens: null,
              provider_message_id: null,
              role: "user",
              total_tokens: null,
              user: "usr_e2e",
            },
          },
          status: 200,
        });
        return;
      }

      await route.fulfill({ json: { code: "not_found", message: path }, status: 404 });
    });

    await installStoredSession(page, createMockStoredSession());
    await page.addInitScript(({ id, name }) => {
      window.localStorage.setItem("pirate_known_communities", JSON.stringify([{
        avatarSrc: null,
        communityId: id,
        displayName: name,
        routeSlug: "e2e-assistant",
        updatedAt: "2026-05-24T10:00:00.000Z",
      }]));
    }, { id: communityId, name: communityName });

    await page.goto("/chat");

    await expect(page.getByRole("button").filter({ hasText: "Bedsheet" }).first()).toBeVisible();
    const assistantThread = page.getByRole("button").filter({ hasText: communityName }).first();
    await expect(assistantThread).toBeVisible();

    await assistantThread.click();
    await expect(page.locator("body")).toContainText(assistantName);

    await page.getByRole("textbox", { name: /message/i }).fill("Run browser assistant smoke.");
    await page.getByRole("button", { name: /send message/i }).click();
    await expect(page.locator("body")).toContainText(assistantReply);

    expect(sends).toHaveLength(1);
    expect(sends[0]?.body).toMatchObject({
      chat_id: null,
      message: "Run browser assistant smoke.",
    });

    await page.reload();
    await expect(page.locator("body")).toContainText(assistantReply);
    await expectNoBrowserError(page);
  });
});
