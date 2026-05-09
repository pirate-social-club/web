"use client";

import * as React from "react";

import { PublicCommunityRoutePage } from "@/app/public-community-route";
import { navigate } from "@/app/router";
import { Button } from "@/components/primitives/button";
import { PageContainer } from "@/components/primitives/layout-shell";
import { Type } from "@/components/primitives/type";

export function TelegramMiniAppHomePage() {
  return (
    <main className="min-h-screen bg-background px-4 py-6">
      <PageContainer size="narrow">
        <section className="flex min-h-[70svh] flex-col justify-center gap-6">
          <div className="space-y-3">
            <Type as="p" variant="overline">Telegram Mini App</Type>
            <Type as="h1" variant="h1">Pirate communities</Type>
            <Type as="p" variant="body">
              Read public community posts inside Telegram. Verified participation can come later.
            </Type>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => navigate("/")}>Open feed</Button>
            <Button onClick={() => navigate("/popular")} variant="secondary">Popular</Button>
          </div>
        </section>
      </PageContainer>
    </main>
  );
}

export function TelegramMiniAppCommunityPage({
  communityId,
}: {
  communityId: string;
}) {
  return (
    <main className="min-h-screen bg-background px-3 pb-8 pt-[calc(env(safe-area-inset-top)+1rem)]">
      <PublicCommunityRoutePage communityId={communityId} disableCanonicalRouteReplace />
    </main>
  );
}
