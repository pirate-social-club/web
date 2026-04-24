"use client";

import { Type } from "@/components/primitives/type";
import * as React from "react";
import {
  NetworkBase,
  NetworkBitcoin,
  NetworkCosmosHub,
  NetworkEthereum,
  NetworkOptimism,
  NetworkSolana,
  NetworkTempo,
  TokenBTC,
  TokenETH,
  TokenUSDC,
  TokenUSDT,
  type IconComponent,
} from "@web3icons/react";

import { navigate } from "@/app/router";
import { BadgedCircle } from "@/components/primitives/badged-circle";
import { Card } from "@/components/primitives/card";
import { CopyField } from "@/components/primitives/copy-field";
import { Separator } from "@/components/primitives/separator";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUiLocale } from "@/lib/ui-locale";
import { getLocaleMessages } from "@/locales";
import { cn } from "@/lib/utils";
import { CommentCard } from "../post-thread/comment-card";
import { PostCard } from "../post-card/post-card";
import { SongItem } from "../song-item/song-item";
import type { WalletHubChainId, WalletHubChainSection, WalletHubToken } from "@/components/compositions/wallet-hub/wallet-hub.types";
import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePageProps,
  ProfileScrobbleItem,
  ProfileVerificationItem,
  ProfileWalletAsset,
} from "./profile-page.types";

type ProfileWalletToken = WalletHubToken & {
  fiatValue?: string;
};

type ProfileWalletChainSection = Omit<WalletHubChainSection, "tokens"> & {
  tokens: ProfileWalletToken[];
};

const TOKEN_ICON_BY_SYMBOL: Partial<Record<string, IconComponent>> = {
  BTC: TokenBTC,
  ETH: TokenETH,
  USDC: TokenUSDC,
  USDT: TokenUSDT,
  WBTC: TokenBTC,
  WETH: TokenETH,
};

const CHAIN_ICON_BY_CHAIN_ID: Partial<Record<WalletHubChainId, IconComponent>> = {
  base: NetworkBase,
  bitcoin: NetworkBitcoin,
  cosmos: NetworkCosmosHub,
  ethereum: NetworkEthereum,
  optimism: NetworkOptimism,
  solana: NetworkSolana,
  tempo: NetworkTempo,
};

function Panel({
  children,
  emptyCopy,
  hasContent,
  title,
}: {
  children?: React.ReactNode;
  emptyCopy: string;
  hasContent: boolean;
  title: string;
}) {
  const isMobile = useIsMobile();
  return (
    <Card className={cn("overflow-hidden", isMobile && "border-0 bg-transparent shadow-none")}>
      <div className={cn("border-b border-border px-5 py-4", isMobile && "px-0")}>
        <Type as="h2" variant="h4" className="text-start">{title}</Type>
      </div>
      {hasContent ? children : (
        <div className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "px-0")}>
          {emptyCopy}
        </div>
      )}
    </Card>
  );
}

function FeedEmptyState({ copy }: { copy: string }) {
  const isMobile = useIsMobile();
  return (
    <Card className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "border-0 bg-transparent px-0 shadow-none")}>
      {copy}
    </Card>
  );
}

function FeedStack({ children }: { children: React.ReactNode }) {
  return <div className="space-y-3">{children}</div>;
}

function isInteractiveTarget(target: EventTarget | null, currentTarget: HTMLElement): boolean {
  if (!(target instanceof Element)) return false;

  const interactiveElement = target.closest(
    'a, button, input, textarea, select, summary, [role="button"], [role="link"], [data-post-card-interactive="true"]',
  );

  return interactiveElement != null && currentTarget.contains(interactiveElement);
}

function toSongItemProps(scrobble: ProfileScrobbleItem) {
  const { scrobbleId: _scrobbleId, ...songItem } = scrobble;
  return songItem;
}

function CommentRow({ comment }: { comment: ProfileCommentItem }) {
  const isClickable = Boolean(comment.postHref);

  return (
    <article
      className={cn(
        "px-5 py-4 text-start transition-colors",
        isClickable && "cursor-pointer hover:bg-muted/20 focus-visible:bg-muted/20",
      )}
      onClick={(event) => {
        if (!isClickable || !comment.postHref || isInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        navigate(comment.postHref);
      }}
      onKeyDown={(event) => {
        if (!isClickable || !comment.postHref || isInteractiveTarget(event.target, event.currentTarget)) {
          return;
        }

        if (event.key !== "Enter" && event.key !== " ") {
          return;
        }

        event.preventDefault();
        navigate(comment.postHref);
      }}
      role={isClickable ? "link" : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      <CommentCard
        authorLabel={comment.authorLabel}
        authorHref={comment.authorHref}
        metadataLabel={comment.communityLabel}
        scoreLabel={comment.scoreLabel}
        timestampLabel={comment.timestampLabel}
        body={comment.body}
        bodyDir={comment.bodyDir}
        bodyLang={comment.bodyLang}
        viewerVote={comment.viewerVote}
        onVote={comment.onVote}
      />
      {comment.postTitle ? (
        <div className="mt-3">
          {comment.postHref ? (
            <a className="text-base font-medium text-primary hover:underline" href={comment.postHref}>
              {comment.postTitle}
            </a>
          ) : (
            <div className="text-base font-medium text-primary">{comment.postTitle}</div>
          )}
        </div>
      ) : null}
    </article>
  );
}

export function VerificationRows({
  verificationItems,
}: {
  verificationItems: ProfileVerificationItem[];
}) {
  return (
    <div>
      {verificationItems.map((item, index) => (
        <React.Fragment key={item.label}>
          {index > 0 ? <Separator /> : null}
          <div className="space-y-2 px-5 py-4 text-start">
            <div className="flex items-start justify-between gap-4">
              <div className="text-base text-muted-foreground">{item.label}</div>
              <Type as="div" variant="body-strong" className="">{item.value}</Type>
            </div>
            {item.note ? (
              <div className="text-base leading-6 text-muted-foreground">{item.note}</div>
            ) : null}
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

function ActivityRows({ items }: { items: ProfileActivityItem[] }) {
  return (
    <FeedStack>
      {items.map((item) => {
        if (item.kind === "post") {
          return (
            <Card className="overflow-hidden" key={item.id}>
              <PostCard className="border-b-0" {...item.post.post} />
            </Card>
          );
        }

        if (item.kind === "comment") {
          return <CommentRow key={item.id} comment={item.comment} />;
        }

        return (
          <Card className="overflow-hidden" key={item.id}>
            <SongItem {...toSongItemProps(item.scrobble)} />
          </Card>
        );
      })}
    </FeedStack>
  );
}

export function OverviewPanel({ items }: { items: ProfileActivityItem[] }) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  if (items.length === 0) return <FeedEmptyState copy={copy.emptyActivity} />;
  return <ActivityRows items={items} />;
}

export function PostsPanel({
  posts,
}: {
  posts: NonNullable<ProfilePageProps["posts"]>;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  if (posts.length === 0) return <FeedEmptyState copy={copy.emptyPosts} />;

  return (
    <FeedStack>
      {posts.map((post) => (
        <Card className="overflow-hidden" key={post.postId}>
          <PostCard className="border-b-0" {...post.post} />
        </Card>
      ))}
    </FeedStack>
  );
}

export function CommentsPanel({
  comments,
}: {
  comments: NonNullable<ProfilePageProps["comments"]>;
}) {
  const { locale } = useUiLocale();
  const routeCopy = getLocaleMessages(locale, "routes");
  const isMobile = useIsMobile();

  if (comments.length === 0) {
    return (
      <div className={cn("text-start px-5 py-8 text-base leading-7 text-muted-foreground", isMobile && "px-0")}>
        {routeCopy.common.noComments}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {comments.map((comment) => (
        <CommentRow key={comment.commentId} comment={comment} />
      ))}
    </div>
  );
}

export function ScrobblesPanel({
  scrobbles,
}: {
  scrobbles: NonNullable<ProfilePageProps["scrobbles"]>;
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  return (
    <Panel emptyCopy={copy.emptyScrobbles} hasContent={scrobbles.length > 0} title={copy.scrobblesTab}>
      <FeedStack>
        {scrobbles.map((scrobble) => (
          <Card className="overflow-hidden" key={scrobble.scrobbleId}>
            <SongItem {...toSongItemProps(scrobble)} />
          </Card>
        ))}
      </FeedStack>
    </Panel>
  );
}

export function WalletPanel({
  walletAddress,
  walletAssets = [],
  walletChainSections,
}: {
  walletAddress?: string;
  walletAssets?: ProfileWalletAsset[];
  walletChainSections?: WalletHubChainSection[];
}) {
  const { locale } = useUiLocale();
  const copy = getLocaleMessages(locale, "routes").profile;
  const chainSections = (walletChainSections ?? profileAssetsToChainSections(walletAssets, walletAddress)) as ProfileWalletChainSection[];
  const hasWalletContent = Boolean(walletAddress) || chainSections.length > 0;

  return (
    <Panel emptyCopy={copy.emptyWallet} hasContent={hasWalletContent} title={copy.walletTitle}>
      <div className="space-y-3 p-3 sm:p-4">
        {chainSections.length ? (
          chainSections.map((section) => (
            <WalletChainCard
              fallbackAddress={walletAddress}
              key={section.chainId}
              section={section}
            />
          ))
        ) : walletAddress ? (
          <Card className="border-border bg-background/40 p-4 shadow-none">
            <CopyField value={walletAddress} />
          </Card>
        ) : null}
      </div>
    </Panel>
  );
}

function profileAssetsToChainSections(
  walletAssets: ProfileWalletAsset[],
  walletAddress?: string,
): ProfileWalletChainSection[] {
  const sections = new Map<string, ProfileWalletChainSection>();

  for (const asset of walletAssets) {
    const chainId = asset.chainId ?? "ethereum";
    const existing = sections.get(chainId);
    const token = {
      id: asset.assetId,
      symbol: asset.symbol ?? asset.label,
      name: asset.name ?? asset.note ?? asset.label,
      balance: asset.value,
      fiatValue: asset.fiatValue,
    };

    if (!existing) {
      sections.set(chainId, {
        availability: "ready",
        chainId,
        title: chainTitle(chainId),
        tokens: [token],
        walletAddress,
      });
      continue;
    }

    existing.tokens.push(token);
  }

  return Array.from(sections.values());
}

function chainTitle(chainId: WalletHubChainSection["chainId"]) {
  if (chainId === "base") return "Base";
  if (chainId === "bitcoin") return "Bitcoin";
  if (chainId === "cosmos") return "Cosmos";
  if (chainId === "optimism") return "Optimism";
  if (chainId === "solana") return "Solana";
  if (chainId === "story") return "Story";
  if (chainId === "tempo") return "Tempo";
  return "Ethereum";
}

function WalletChainCard({
  fallbackAddress,
  section,
}: {
  fallbackAddress?: string;
  section: ProfileWalletChainSection;
}) {
  const address = section.walletAddress ?? fallbackAddress;

  return (
    <Card className="overflow-hidden border-border bg-background/40 shadow-none">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <ChainIcon chainId={section.chainId} className="size-12" />
          <div className="min-w-0">
            <Type as="div" variant="h4" className="truncate">{section.title}</Type>
            {section.note ? <div className="truncate text-base text-muted-foreground">{section.note}</div> : null}
          </div>
        </div>
        {address ? (
          <CopyField className="w-full sm:max-w-sm" value={address} />
        ) : null}
      </div>
      {section.tokens.length ? (
        <>
          <Separator />
          <div className="divide-y divide-border-soft">
            {section.tokens.map((token) => (
              <WalletTokenRow
                chainId={section.chainId}
                key={token.id}
                token={token}
              />
            ))}
          </div>
        </>
      ) : null}
    </Card>
  );
}

function ChainIcon({
  chainId,
  className,
}: {
  chainId: WalletHubChainId;
  className?: string;
}) {
  const ChainIconComponent = CHAIN_ICON_BY_CHAIN_ID[chainId];

  return (
    <div className={cn("grid shrink-0 place-items-center overflow-hidden rounded-full border border-border bg-white p-1.5", className)}>
      {ChainIconComponent ? (
        <ChainIconComponent aria-hidden="true" className="size-[82%]" variant="branded" />
      ) : (
        <IconFallback label={chainId} />
      )}
    </div>
  );
}

function WalletTokenRow({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: ProfileWalletToken;
}) {
  const fiatValue = token.fiatValue ?? (typeof token.usdPrice === "number" ? `$${token.usdPrice.toLocaleString("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}` : null);

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <WalletAssetIcon chainId={chainId} token={token} />
        <div className="min-w-0">
          <Type as="div" variant="body-strong" className="truncate">{token.symbol}</Type>
        </div>
      </div>
      <div className="shrink-0 text-end">
        {token.balance ? <Type as="div" variant="body-strong">{token.balance}</Type> : null}
        {fiatValue ? <div className="text-base text-muted-foreground">{fiatValue}</div> : null}
      </div>
    </div>
  );
}

function WalletAssetIcon({
  chainId,
  token,
}: {
  chainId: WalletHubChainId;
  token: ProfileWalletToken;
}) {
  const symbol = token.symbol.toUpperCase();
  const TokenIconComponent = TOKEN_ICON_BY_SYMBOL[symbol];
  const ChainIconComponent = CHAIN_ICON_BY_CHAIN_ID[chainId];

  return (
    <BadgedCircle
      badge={ChainIconComponent ? (
        <ChainIconComponent aria-hidden="true" className="size-4.5" variant="branded" />
      ) : (
        <IconFallback label={chainId} />
      )}
      badgeFrameClassName="border border-white/70"
      badgeOffsetXPercent={12}
      badgeOffsetYPercent={0}
      badgePadding={3}
      badgeSize={18}
      className="size-12"
    >
      <div className="grid size-12 place-items-center overflow-hidden rounded-full border border-border bg-white p-1.5">
        {TokenIconComponent ? (
          <TokenIconComponent aria-hidden="true" className="size-9" variant="branded" />
        ) : (
          <IconFallback label={symbol} />
        )}
      </div>
    </BadgedCircle>
  );
}

function IconFallback({ label }: { label: string }) {
  return (
    <div className="grid size-full place-items-center bg-muted text-base font-semibold text-foreground">
      {label.slice(0, 1).toUpperCase()}
    </div>
  );
}
