import { describe, expect, mock, test } from "bun:test";
import { renderToString, ssrElement } from "@solidjs/web";
import { createComponent } from "solid-js";

const designSystemPath = new URL("../../../design-system.ts", import.meta.url).pathname;
const contentRailPath = new URL("../../shell/content-rail-shell.tsx", import.meta.url).pathname;
const pageShellPath = new URL("../../shell/page-shell.tsx", import.meta.url).pathname;
const identityHeroPath = new URL("../identity-hero/identity-hero.tsx", import.meta.url).pathname;
const postCardPath = new URL("../../posts/post-card/post-card.tsx", import.meta.url).pathname;
const skeletonPath = new URL("../../posts/post-card/skeleton.tsx", import.meta.url).pathname;
const commentCardPath = new URL("../../posts/post-thread/comment-card.tsx", import.meta.url).pathname;
const walletHubPath = new URL("../../wallet/wallet-hub.tsx", import.meta.url).pathname;
const jsxRuntimePath = new URL("../../../../node_modules/@solidjs/web/types/jsx.d.ts", import.meta.url).pathname;

const element = (tag: string, props: Record<string, unknown>) => {
  const { children, class: className, ...rest } = props;
  return ssrElement(tag, { ...rest, ...(className ? { class: className } : {}) }, children, false);
};
const primitive = (tag: string) => (props: Record<string, unknown>) => element(tag, props);
const passthrough = (props: Record<string, unknown>) => props.children;

mock.module(designSystemPath, () => ({
  Avatar: primitive("span"),
  Button: primitive("button"),
  Card: primitive("section"),
  TabsList: passthrough,
  TabsTrigger: primitive("button"),
  IconChatCircle: primitive("svg"),
  IconFileText: primitive("svg"),
  IconList: primitive("svg"),
  IconWallet: primitive("svg"),
  Separator: primitive("hr"),
  Tabs: passthrough,
  TabsContent: passthrough,
  Type: (props: Record<string, unknown>) => element(String(props.as ?? "span"), props),
  cn: (...values: unknown[]) => values.filter(Boolean).join(" "),
  createIsMobile: () => () => false,
}));
mock.module(contentRailPath, () => ({ ContentRailShell: (props: Record<string, unknown>) => [props.header, props.children] }));
mock.module(pageShellPath, () => ({ StandardRoutePage: primitive("main") }));
mock.module(identityHeroPath, () => ({ IdentityHero: (props: Record<string, unknown>) => element("header", { children: props.title }) }));
mock.module(postCardPath, () => ({ PostCard: primitive("article") }));
mock.module(skeletonPath, () => ({ PostCardSkeleton: primitive("article") }));
mock.module(commentCardPath, () => ({ CommentCard: primitive("div") }));
mock.module(walletHubPath, () => ({ WalletHub: primitive("section") }));
mock.module(jsxRuntimePath, () => ({
  Fragment: (props: { children?: unknown }) => props.children,
  jsx: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxs: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
  jsxDEV: (type: unknown, props: Record<string, unknown>) => typeof type === "string" ? ssrElement(type, props, props.children, false) : createComponent(type as never, props),
}));

const { ProfilePage } = await import("./profile-page");

describe("profile page SSR", () => {
  test("renders deterministic profile tabs and wallet without network media", () => {
    const html = renderToString(() => createComponent(ProfilePage, {
      comments: [],
      overviewItems: [],
      posts: [],
      profile: {
        avatarSrc: "data:image/svg+xml,fixture",
        bio: "Offline profile bio",
        canMessage: true,
        displayName: "Pampa",
        handle: "pampa.pirate",
        viewerContext: "public",
      },
      rightRail: {
        stats: [{ label: "Karma", value: 42 }],
        walletAddress: "0xabc",
        walletChainSections: [{ availability: "ready", chainId: "ethereum", title: "Ethereum", tokens: [] }],
      },
    }));
    expect(html).toContain("Pampa");
    expect(html).toContain("Wallet");
    expect(html).toContain("Overview");
    expect(html).not.toContain("https://");
  });
});
