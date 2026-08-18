import type { WalletHubChainSection } from "../../wallet/wallet-hub.types";
import { basePostFixture, fixtureImage, noop, shareActionsFixture } from "../../posts/post-card/fixtures";
import type { ProfileActivityItem, ProfileCommentItem, ProfilePageProps, ProfilePostItem } from "./profile-page.types";

const pampaPost = (postId: string, title: string, body: string): ProfilePostItem => ({
  postId,
  post: {
    ...basePostFixture,
    byline: {
      ...basePostFixture.byline,
      author: { href: "#", kind: "user", label: "u/pampa_of_argentina", avatarSrc: fixtureImage(`author-${postId}`, 100, 100) },
      community: { href: "#", kind: "community", label: "c/argentina", avatarSrc: fixtureImage(`community-${postId}`, 100, 100) },
      timestampLabel: postId === "post-1" ? "28m" : "7h",
    },
    content: { body, type: "text" },
    engagement: { commentCount: postId === "post-1" ? 86 : 41, score: postId === "post-1" ? 1284 : 392 },
    menuItems: [],
    onMenuAction: noop,
    postId,
    shareActions: shareActionsFixture,
    title,
    viewContext: "profile",
  },
});

export const profilePosts: ProfilePostItem[] = [
  {
    postId: "post-1",
    post: {
      ...pampaPost("post-1", "Buenos Aires holds the world record for bookstores per capita", "A rainy street, a stack of books, and a city that rewards a long walk.").post,
      content: { alt: "A rainy Buenos Aires street", src: fixtureImage("buenos-aires-bookstores", 900, 600), type: "image" },
    },
  },
  pampaPost("post-2", "April listening report from the southern cone", "This month has been all Charly, Sumo, and a lot more post-punk than usual."),
  {
    postId: "post-3",
    post: {
      ...pampaPost("post-3", "Sunday walk through San Telmo", "A quiet walk through the old market streets.").post,
      content: { accessMode: "public", durationLabel: "0:48", posterSrc: fixtureImage("san-telmo-poster", 900, 600), src: "data:video/mp4;base64,AAAA", type: "video" },
    },
  },
];

export const profileComments: ProfileCommentItem[] = [
  {
    authorAvatarSrc: fixtureImage("pampa-comment", 100, 100),
    authorHref: "#",
    authorLabel: "u/pampa_of_argentina",
    body: "The profile should keep community and post context attached to every comment.",
    commentId: "comment-1",
    communityLabel: "c/pirate-build",
    communityHref: "#community-pirate-build",
    onVote: noop,
    postHref: "#",
    postTitle: "What should the profile page surface first?",
    scoreLabel: "148 score",
    timestampLabel: "12m",
    viewerVote: "up",
  },
  {
    authorAvatarSrc: fixtureImage("pampa-comment-2", 100, 100),
    authorHref: "#",
    authorLabel: "u/pampa_of_argentina",
    body: "Music taste belongs beside posts and comments in the profile information architecture.",
    commentId: "comment-2",
    communityLabel: "c/lastfm",
    communityHref: "#community-lastfm",
    onVote: noop,
    postHref: "#",
    postTitle: "Should music have its own tab?",
    scoreLabel: "74 score",
    timestampLabel: "4h",
  },
  {
    authorAvatarSrc: fixtureImage("pampa-comment-3", 100, 100),
    authorHref: "#",
    authorLabel: "u/pampa_of_argentina",
    body: "Follow and message belong in the header on mobile so the first screen keeps the primary action.",
    bodyDir: "auto",
    bodyLang: "en",
    commentId: "comment-3",
    communityHref: "#community-design",
    communityLabel: "c/design",
    onVote: noop,
    postHref: "#post-actions",
    postTitle: "Desktop versus mobile profile actions",
    scoreLabel: "33 score",
    timestampLabel: "1d",
    viewerVote: "down",
  },
];

const overviewItems: ProfileActivityItem[] = [
  { kind: "post", id: "overview-post-1", post: profilePosts[0]! },
  { kind: "comment", id: "overview-comment-1", comment: profileComments[0]! },
  { kind: "post", id: "overview-post-2", post: profilePosts[1]! },
];

export const walletChainSections: WalletHubChainSection[] = [
  {
    availability: "ready",
    chainId: "ethereum",
    title: "Ethereum",
    walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
    tokens: [
      { balance: "4.1267", fiatValue: "$10,943.82", id: "eth", name: "Ethereum", symbol: "ETH" },
      { balance: "512.36", fiatValue: "$512.36", id: "usdc", name: "USD Coin", symbol: "USDC" },
      { balance: "250.00", fiatValue: "$250.00", id: "usdt", name: "Tether USD", symbol: "USDT" },
      { balance: "120.00", fiatValue: "$120.00", id: "dai", name: "Dai Stablecoin", symbol: "DAI" },
      { balance: "0.0125", fiatValue: "$869.82", id: "wbtc", name: "Wrapped Bitcoin", symbol: "WBTC" },
      { balance: "35.72", fiatValue: "$388.99", id: "link", name: "Chainlink", symbol: "LINK" },
    ],
  },
  {
    availability: "ready",
    chainId: "story",
    title: "Story",
    walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
    tokens: [{ balance: "96.40", fiatValue: "$173.52", id: "ip", name: "Story", symbol: "IP" }],
  },
  {
    availability: "ready",
    chainId: "bitcoin",
    title: "Bitcoin",
    walletAddress: "bc1qflgh4s9q8qg7d8e83a5fd",
    tokens: [{ balance: "0.2864", fiatValue: "$19,910.87", id: "btc", name: "Bitcoin", symbol: "BTC" }],
  },
  {
    availability: "ready",
    chainId: "solana",
    title: "Solana",
    walletAddress: "8Bv3n4Jcw7pQZsVJwX7nXcK",
    tokens: [
      { balance: "22.40", fiatValue: "$3,280.48", id: "sol", name: "Solana", symbol: "SOL" },
      { balance: "840.15", fiatValue: "$840.15", id: "usdc-sol", name: "USD Coin", symbol: "USDC" },
    ],
  },
  {
    availability: "ready",
    chainId: "tempo",
    title: "Tempo",
    walletAddress: "tempo1q90p4q7kkd8a56a2z7p",
    tokens: [{ balance: "1,204.11", fiatValue: "$1,204.11", id: "tempo-pathusd", name: "pathUSD", symbol: "pathUSD" }],
  },
  {
    availability: "ready",
    chainId: "cosmos",
    title: "Cosmos",
    walletAddress: "cosmos1cv8e7h3lt5x0r3d5z",
    tokens: [{ balance: "91.50", fiatValue: "$626.78", id: "atom", name: "Cosmos Hub", symbol: "ATOM" }],
  },
];

export const baseProfileProps: ProfilePageProps = {
  comments: profileComments,
  overviewItems,
  posts: profilePosts,
  profile: {
    avatarSrc: fixtureImage("pampa-avatar", 160, 160),
    bannerSrc: fixtureImage("pampa-banner", 1200, 400),
    bio: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
    canMessage: true,
    displayName: "Pampa_of_Argentina",
    handle: "u/pampa_of_argentina.pirate",
    meta: [{ label: "Posts", value: "126" }, { label: "Comments", value: "894" }],
    nationalityBadgeCountryCode: "AR",
    nationalityBadgeLabel: "Verified Argentina nationality",
    onToggleFollow: noop,
    viewerContext: "public",
    viewerFollows: false,
  },
  rightRail: {
    description: "Buenos Aires, bookstores, football, and a listening history that should probably count as public infrastructure.",
    stats: [
      { label: "Karma", value: 20028 },
      { label: "Contributions", value: 1352 },
      { label: "Followers", value: 842 },
      { label: "Following", value: 118 },
    ],
    verificationItems: [
      { label: "Palm Scan", value: "Verified" },
      { label: "Wallet Score", value: "19.8" },
      { label: "Nationality", value: "Argentina" },
      { label: "Age", value: "18+" },
    ],
    walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
    walletChainSections,
  },
};
