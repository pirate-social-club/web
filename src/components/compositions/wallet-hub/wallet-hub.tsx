"use client";

import * as React from "react";
import { Check, Copy } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";

import type {
  WalletHubChainId,
  WalletHubChainSection,
  WalletHubProps,
  WalletHubToken,
} from "./wallet-hub.types";

function CopyAddressField({ value }: { value: string }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback(async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }, [value]);

  return (
    <div className="flex items-center gap-2">
      <Input
        aria-label={copy.walletAddressLabel}
        className="font-mono text-base tracking-[0.01em]"
        readOnly
        value={value}
      />
      <Button
        aria-label={copied ? copy.copied : copy.copyAddress}
        onClick={handleCopy}
        size="icon"
        variant="secondary"
      >
        {copied ? <Check className="size-5" /> : <Copy className="size-5" />}
      </Button>
    </div>
  );
}

function WalletHeaderCard({
  walletAddress,
  walletLabel,
  onChangeWallet,
}: Pick<WalletHubProps, "walletAddress" | "walletLabel" | "onChangeWallet">) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  return (
    <Card className="border-border bg-card shadow-none">
      <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">{copy.title}</h1>
            <div className="text-base text-muted-foreground">{walletLabel ?? copy.evmWallet}</div>
          </div>
          {onChangeWallet ? (
            <Button onClick={onChangeWallet} variant="secondary">
              {copy.changeWallet}
            </Button>
          ) : null}
        </div>

        <CopyAddressField value={walletAddress} />
      </div>
    </Card>
  );
}

function TokenRow({ token }: { token: WalletHubToken }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="truncate text-base font-medium text-foreground">${token.symbol}</div>
      <div className="shrink-0 text-base text-foreground">{token.balance ?? copy.balanceLater}</div>
    </div>
  );
}

function ChainSectionCard({ section }: { section: WalletHubChainSection }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").wallet;
  return (
    <Card className="border-border bg-card shadow-none">
      <div className="space-y-4 px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex items-center gap-3">
          <ChainIcon chainId={section.chainId} />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
          </div>
        </div>

        {section.tokens.length > 0 ? (
          <div className="divide-y divide-border">
            {section.tokens.map((token) => (
              <TokenRow key={token.id} token={token} />
            ))}
          </div>
        ) : (
          <div className="text-base text-muted-foreground">
            {section.availability === "ready" ? copy.noAssetsYet : copy.later}
          </div>
        )}
      </div>
    </Card>
  );
}

export function WalletHub({
  title,
  walletLabel,
  walletAddress,
  onChangeWallet,
  chainSections,
}: WalletHubProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
      {title ? (
        <div className="text-base font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </div>
      ) : null}

      <WalletHeaderCard
        onChangeWallet={onChangeWallet}
        walletAddress={walletAddress}
        walletLabel={walletLabel}
      />

      <div className="space-y-4">
        {chainSections.map((section) => (
          <ChainSectionCard key={section.chainId} section={section} />
        ))}
      </div>
    </div>
  );
}

function ChainIcon({
  chainId,
  className,
}: {
  chainId: WalletHubChainId;
  className?: string;
}) {
  return (
    <div className={cn("grid size-11 shrink-0 place-items-center overflow-hidden rounded-full", className)}>
      {chainId === "ethereum" ? <EthereumIcon /> : null}
      {chainId === "base" ? <BaseIcon /> : null}
      {chainId === "story" ? <StoryIcon /> : null}
      {chainId === "tempo" ? <TempoIcon /> : null}
      {chainId === "solana" ? <SolanaIcon /> : null}
      {chainId === "bitcoin" ? <BitcoinIcon /> : null}
    </div>
  );
}

function EthereumIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <defs>
        <linearGradient id="eth-bg" x1="8" x2="36" y1="6" y2="38" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f6f7fb" />
          <stop offset="1" stopColor="#ccd4e4" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="22" fill="url(#eth-bg)" />
      <path d="M22 8.5 14.8 21l7.2 4.3 7.2-4.3Z" fill="#6e7e9a" />
      <path d="M22 8.5v16.8l7.2-4.3Z" fill="#8897b0" />
      <path d="m14.8 22.7 7.2 12.8 7.2-12.8-7.2 4.3Z" fill="#4d5b75" />
      <path d="M22 27v8.5l7.2-12.8Z" fill="#687792" />
    </svg>
  );
}

function BaseIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="22" fill="#0052ff" />
      <circle cx="22" cy="22" r="10.2" fill="none" stroke="#ffffff" strokeWidth="8" />
      <circle cx="33.4" cy="22" r="4.1" fill="#ffffff" />
    </svg>
  );
}

function StoryIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <defs>
        <linearGradient id="story-bg" x1="8" x2="34" y1="8" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffb868" />
          <stop offset="1" stopColor="#ff7b31" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="22" fill="url(#story-bg)" />
      <path
        d="M13 14.5c2.2-2.1 5.1-3.2 8.7-3.2 3.5 0 6.3.8 8.3 2.4l-2.3 3.7c-1.5-1.1-3.6-1.7-6.3-1.7-2.4 0-4.1.6-5.1 1.9-.9 1.1-1.3 2.7-1.3 4.6 0 1.9.5 3.4 1.5 4.7 1.1 1.3 2.8 1.9 5.1 1.9 2.5 0 4.7-.6 6.4-1.9l2.1 3.6c-2.2 1.8-5.1 2.8-8.8 2.8-3.8 0-6.7-1.1-8.8-3.3-1.9-2.1-2.9-4.7-2.9-7.8 0-3.3 1.1-6 3.4-7.7Z"
        fill="#12100f"
      />
    </svg>
  );
}

function TempoIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <defs>
        <linearGradient id="tempo-bg" x1="8" x2="36" y1="8" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffd58c" />
          <stop offset="1" stopColor="#f59a23" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="22" fill="url(#tempo-bg)" />
      <path d="M12 15.5h20v4.2h-7.7V32h-4.7V19.7H12z" fill="#20170d" />
      <path d="M13.8 26.8h10.4v3.6H13.8z" fill="#20170d" opacity=".78" />
    </svg>
  );
}

function SolanaIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <defs>
        <linearGradient id="sol-bg" x1="8" x2="36" y1="8" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1b1530" />
          <stop offset="1" stopColor="#08070d" />
        </linearGradient>
        <linearGradient id="sol-bars" x1="10" x2="34" y1="14" y2="31" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00f5d4" />
          <stop offset=".5" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#ff4ecd" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="22" fill="url(#sol-bg)" />
      <path d="M13.3 13h16.1l-3.6 3.7H9.7z" fill="url(#sol-bars)" />
      <path d="M17.1 20.2h16.1L29.6 24H13.5z" fill="url(#sol-bars)" />
      <path d="M13.3 27.5h16.1l-3.6 3.6H9.7z" fill="url(#sol-bars)" />
    </svg>
  );
}

function BitcoinIcon() {
  return (
    <svg aria-hidden="true" className="size-full" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="22" fill="#f7931a" />
      <path
        d="M24 10.8h2.4v3.1c2.9.5 4.7 2.4 4.7 5.1 0 1.8-.8 3.3-2.3 4.2 1.9.8 3 2.4 3 4.7 0 3.8-2.9 6.2-7.5 6.2V37h-2.4v-3h-1.6V37H18v-3.1h-3.2v-4h2.1c.6 0 .8-.2.8-.8v-9.7c0-.6-.2-.8-.8-.8h-2.1v-4H18v-3.1h2.3v3.1h1.6Zm-.3 8.1h2c1.7 0 2.7-.8 2.7-2.2 0-1.3-.9-2.1-2.6-2.1h-2.1Zm0 10.6h2.5c1.9 0 3-.9 3-2.5 0-1.6-1.1-2.5-3.2-2.5h-2.3Z"
        fill="#fff7eb"
      />
    </svg>
  );
}
