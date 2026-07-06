"use client";

import { Plugs } from "@phosphor-icons/react";
import type * as React from "react";

import {
  ProviderKeyField,
  ProviderKeyStatusLine,
} from "@/components/compositions/community/provider-keys/provider-key-field";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";
import type { CommunityIntegrationsPageProps } from "./community-integrations.types";

function ProviderCard({
  children,
  description,
  label,
  powers,
}: {
  children: React.ReactNode;
  description: string;
  label: string;
  powers: string[];
}) {
  return (
    <section className="rounded-md border border-border-soft bg-card">
      <div className="grid gap-3 border-b border-border-soft px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="space-y-1">
          <Type as="h2" variant="h2">{label}</Type>
          <p className="text-base leading-6 text-muted-foreground">{description}</p>
        </div>
        {children}
      </div>
      <div className="space-y-2 px-4 py-4">
        <div className="text-base font-medium text-muted-foreground">Powers</div>
        <ul className="grid gap-2 text-base leading-6 md:grid-cols-3">
          {powers.map((item) => (
            <li className="rounded-md border border-border-soft bg-muted/30 px-3 py-2" key={item}>
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function CommunityIntegrationsPage({
  className,
  onElevenLabsKeyRevoke,
  onElevenLabsKeySave,
  onOpenRouterKeyRevoke,
  onOpenRouterKeySave,
  savingCredential = false,
  settings,
}: CommunityIntegrationsPageProps) {
  return (
    <section className={cn("mx-auto flex w-full max-w-5xl flex-col gap-6 md:gap-8", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Plugs className="size-7 text-muted-foreground" weight="duotone" />
          <Type as="h1" variant="h1" className="md:text-4xl">Integrations</Type>
        </div>
        <p className="max-w-3xl text-base leading-7 text-muted-foreground">
          Connect shared provider keys once for this community. Pirate stores keys encrypted and never shows them again.
        </p>
      </div>

      <div className="space-y-4">
        <ProviderCard
          description="Used for assistant model responses and model search."
          label="OpenRouter"
          powers={["Assistant model", "Assistant text"]}
        >
          <ProviderKeyStatusLine keyStatus={settings.openRouterKeyStatus} />
        </ProviderCard>
        <div className="border-y border-border-soft">
          <ProviderKeyField
            connectedPrefix="sk-or-..."
            description="Paste this community's OpenRouter API key."
            disabled={savingCredential}
            invalidPrefix="sk-or-..."
            keyStatus={settings.openRouterKeyStatus}
            label="OpenRouter key"
            onKeyRevoke={() => {
              void onOpenRouterKeyRevoke?.();
            }}
            onKeySave={(apiKey) => {
              void onOpenRouterKeySave?.(apiKey);
            }}
            placeholder="sk-or-..."
            saveLabel="Save OpenRouter key"
            saveNewLabel="Save new OpenRouter key"
          />
        </div>

        <ProviderCard
          description="Used anywhere this community needs speech transcription, spoken replies, or voice scoring."
          label="ElevenLabs"
          powers={["Assistant voice", "Study say-it-back", "Karaoke scoring"]}
        >
          <ProviderKeyStatusLine keyStatus={settings.elevenLabsKeyStatus} />
        </ProviderCard>
        <div className="border-y border-border-soft">
          <ProviderKeyField
            connectedPrefix="..."
            description="Paste this community's ElevenLabs API key."
            disabled={savingCredential}
            invalidPrefix="..."
            keyStatus={settings.elevenLabsKeyStatus}
            label="ElevenLabs key"
            onKeyRevoke={() => {
              void onElevenLabsKeyRevoke?.();
            }}
            onKeySave={(apiKey) => {
              void onElevenLabsKeySave?.(apiKey);
            }}
            placeholder="ElevenLabs API key"
            saveLabel="Save ElevenLabs key"
            saveNewLabel="Save new ElevenLabs key"
          />
        </div>
      </div>
    </section>
  );
}
