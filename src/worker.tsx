import { render, route } from "rwsdk/router";
import { defineApp, type RequestInfo } from "rwsdk/worker";

import { PirateApp } from "@/app";
import { Document } from "@/app/document";
import {
  resolveLocaleDirection,
  resolveRequestLocale,
  type UiDirection,
  type UiLocaleCode,
} from "@/lib/ui-locale-core";

type ThemeMode = "dark" | "light" | "system";

type AppContext = {
  dir: UiDirection;
  locale: UiLocaleCode;
  theme: ThemeMode;
};

type AppRequestInfo = RequestInfo<any, AppContext>;

function parseThemeCookie(cookieHeader: string | null): ThemeMode {
  const match = cookieHeader?.match(/(?:^|;\s*)theme=(dark|light|system)(?:;|$)/);
  return (match?.[1] as ThemeMode | undefined) ?? "dark";
}

function AppRoutePage(requestInfo: AppRequestInfo) {
  const url = new URL(requestInfo.request.url);

  return <PirateApp initialPath={url.pathname} />;
}

export default defineApp<AppRequestInfo>([
  ({ ctx, request }) => {
    const locale = resolveRequestLocale(request.headers.get("accept-language"));

    ctx.locale = locale;
    ctx.dir = resolveLocaleDirection(locale);
    ctx.theme = parseThemeCookie(request.headers.get("cookie"));
  },
  render(Document, [
    route("/", AppRoutePage),
    route("/your-communities", AppRoutePage),
    route("/verify", AppRoutePage),
    route("/submit", AppRoutePage),
    route("/communities/new", AppRoutePage),
    route("/c/:communityId", AppRoutePage),
    route("/p/:postId", AppRoutePage),
    route("/inbox", AppRoutePage),
    route("/me", AppRoutePage),
    route("/u/:userId", AppRoutePage),
    route("/onboarding", AppRoutePage),
    route("/auth", AppRoutePage),
    route("/auth/device", AppRoutePage),
  ]),
]);
