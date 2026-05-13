import type {
  ProfileActivityItem,
  ProfileCommentItem,
  ProfilePostItem,
  ProfileScrobbleItem,
} from "../profile-page/profile-page.types";
import type {
  PublicProfilePostItem,
  PublicProfileScrobbleItem,
  PublicProfileVideoItem,
} from "../public-profile-page/public-profile-page.types";
import type { WalletHubChainSection } from "@/components/compositions/wallet/wallet-hub/wallet-hub.types";

export const profilePosts: ProfilePostItem[] = [
  {
    postId: "post_1",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/interesting", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "28m",
      },
      title:
        "Buenos Aires holds the world record for bookstores per capita, with approximately 25 bookstores for every 100,000 inhabitants.",
      content: {
        type: "image",
        src: "https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=900&q=80",
        alt: "A rainy Buenos Aires street with classic architecture.",
      },
      engagement: { score: 1284, commentCount: 86, saved: true },
      menuItems: [
        { key: "save", label: "Save post" },
        { key: "hide", label: "Hide post" },
        { key: "report", label: "Report", destructive: true },
      ],
    },
  },
  {
    postId: "post_2",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/lastfm", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "7h",
      },
      title: "April listening report from the southern cone",
      content: {
        type: "text",
        body:
          "This month has been all Charly, Sumo, and a lot more post-punk than usual. I want a profile view that makes scrobbles feel first-class, not bolted on below posts.",
      },
      engagement: { score: 392, commentCount: 41 },
    },
  },
  {
    postId: "post_3",
    post: {
      viewContext: "profile",
      byline: {
        community: { kind: "community", label: "c/argentina", href: "#" },
        author: { kind: "user", label: "u/Pampa_of_Argentina", href: "#" },
        timestampLabel: "2d",
      },
      title: "Sunday walk through San Telmo",
      content: {
        type: "video",
        src: "https://www.w3schools.com/html/mov_bbb.mp4",
        posterSrc: "https://images.unsplash.com/photo-1524499982521-1ffd58dd89ea?auto=format&fit=crop&w=900&q=80",
        durationLabel: "0:48",
        accessMode: "public",
      },
      engagement: { score: 621, commentCount: 58 },
    },
  },
];

export const profileComments: ProfileCommentItem[] = [
  {
    commentId: "comment_1",
    authorLabel: "u/Pampa_of_Argentina",
    authorHref: "#",
    body:
      "The best version of profile comments probably looks like a compact reply feed. You still need the community and the post title, otherwise the comment feels detached from context.",
    communityLabel: "c/pirate-build",
    communityHref: "#",
    postTitle: "What should the profile page surface first?",
    postHref: "#",
    scoreLabel: "148 score",
    timestampLabel: "12m",
    viewerVote: "up",
    onVote: () => {},
  },
  {
    commentId: "comment_2",
    authorLabel: "u/Pampa_of_Argentina",
    authorHref: "#",
    body:
      "If scrobbles matter to Pirate, they should sit beside posts and comments in the profile IA, not inside a buried integrations tab.",
    communityLabel: "c/lastfm",
    communityHref: "#",
    postTitle: "Should scrobbles have their own tab?",
    postHref: "#",
    scoreLabel: "74 score",
    timestampLabel: "4h",
    viewerVote: null,
    onVote: () => {},
  },
  {
    commentId: "comment_3",
    authorLabel: "u/Pampa_of_Argentina",
    authorHref: "#",
    body:
      "I would keep follow and message in the right rail on desktop, then move them into the header block on mobile so the first screen still carries the primary action.",
    communityLabel: "c/design",
    communityHref: "#",
    postTitle: "Desktop versus mobile profile actions",
    postHref: "#",
    scoreLabel: "33 score",
    timestampLabel: "1d",
    viewerVote: "down",
    onVote: () => {},
  },
];

export const profileScrobbles: ProfileScrobbleItem[] = [
  {
    scrobbleId: "scrobble_1",
    title: "Cancion Animal",
    artistName: "Soda Stereo",
    artworkSrc: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled 6m ago" },
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
  {
    scrobbleId: "scrobble_2",
    title: "Viernes 3 AM",
    artistName: "Seru Giran",
    artworkSrc: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled 2h ago" },
      { label: "c/classicrock", href: "#" },
      { label: "302 plays" },
    ],
  },
  {
    scrobbleId: "scrobble_3",
    title: "Post-Crucifixion",
    artistName: "Pescado Rabioso",
    artworkSrc: "https://images.unsplash.com/photo-1501612780327-45045538702b?auto=format&fit=crop&w=400&q=80",
    metaItems: [
      { label: "Scrobbled yesterday" },
      { label: "c/lastfm", href: "#" },
      { label: "221 plays" },
    ],
  },
];

export const overviewItems: ProfileActivityItem[] = [
  { kind: "post", id: "overview_post_1", post: profilePosts[0] },
  { kind: "comment", id: "overview_comment_1", comment: profileComments[0] },
  { kind: "scrobble", id: "overview_scrobble_1", scrobble: profileScrobbles[0] },
  { kind: "post", id: "overview_post_2", post: profilePosts[1] },
];

export const walletChainSections: WalletHubChainSection[] = [
  {
    chainId: "ethereum",
    title: "Ethereum",
    availability: "ready",
    walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
    tokens: [
      { id: "eth", symbol: "ETH", name: "Ethereum", balance: "4.1267", fiatValue: "$10,943.82" },
      { id: "usdc", symbol: "USDC", name: "USD Coin", balance: "512.36", fiatValue: "$512.36" },
      { id: "usdt", symbol: "USDT", name: "Tether USD", balance: "250.00", fiatValue: "$250.00" },
      { id: "dai", symbol: "DAI", name: "Dai Stablecoin", balance: "120.00", fiatValue: "$120.00" },
      { id: "wbtc", symbol: "WBTC", name: "Wrapped Bitcoin", balance: "0.0125", fiatValue: "$869.82" },
      { id: "link", symbol: "LINK", name: "Chainlink", balance: "35.72", fiatValue: "$388.99" },
    ],
  },
  {
    chainId: "story",
    title: "Story",
    availability: "ready",
    walletAddress: "0xc74e2d06c9a7e304817b3c177b91e0c1f4873",
    tokens: [
      { id: "ip", symbol: "IP", name: "Story", balance: "96.40", fiatValue: "$173.52" },
      { id: "wip", symbol: "WIP", name: "Wrapped IP", balance: "18.20", fiatValue: "$32.76" },
    ],
  },
  {
    chainId: "bitcoin",
    title: "Bitcoin",
    availability: "ready",
    walletAddress: "bc1qflgh4s9q8qg7d8e83a5fd",
    tokens: [
      { id: "btc", symbol: "BTC", name: "Bitcoin", balance: "0.2864", fiatValue: "$19,910.87" },
    ],
  },
  {
    chainId: "solana",
    title: "Solana",
    availability: "ready",
    walletAddress: "8Bv3n4Jcw7pQZsVJwX7nXcK",
    tokens: [
      { id: "sol", symbol: "SOL", name: "Solana", balance: "22.40", fiatValue: "$3,280.48" },
      { id: "usdc-sol", symbol: "USDC", name: "USD Coin", balance: "840.15", fiatValue: "$840.15" },
    ],
  },
  {
    chainId: "tempo",
    title: "Tempo",
    availability: "ready",
    walletAddress: "tempo1q90p4q7kkd8a56a2z7p",
    tokens: [
      { id: "tempo-pathusd", symbol: "pathUSD", name: "pathUSD", balance: "1,204.11", fiatValue: "$1,204.11" },
    ],
  },
  {
    chainId: "cosmos",
    title: "Cosmos",
    availability: "ready",
    walletAddress: "cosmos1cv8e7h3lt5x0r3d5z",
    tokens: [
      { id: "atom", symbol: "ATOM", name: "Cosmos Hub", balance: "91.50", fiatValue: "$626.78" },
    ],
  },
];

export const publicProfilePosts: PublicProfilePostItem[] = profilePosts.slice(0, 2).map((item) => ({
  postId: item.postId,
  post: {
    ...item.post,
    content: item.post.content.type === "text"
      ? {
          ...item.post.content,
          body: "This month has been all Charly, Sumo, and a lot more post-punk than usual.",
        }
      : item.post.content,
    menuItems: item.postId === "post_1" ? [] : item.post.menuItems,
  },
}));

export const publicProfileVideos: PublicProfileVideoItem[] = [
  {
    videoId: "video_1",
    post: profilePosts[2].post,
  },
];

export const publicProfileSongs: PublicProfileScrobbleItem[] = [
  {
    ...profileScrobbles[0],
    scrobbleId: "song_1",
    metaItems: [
      { label: "c/argentina", href: "#" },
      { label: "418 plays" },
    ],
  },
  {
    ...profileScrobbles[1],
    scrobbleId: "song_2",
    metaItems: [
      { label: "c/classicrock", href: "#" },
      { label: "302 plays" },
    ],
  },
];

export const publicProfileScrobbles: PublicProfileScrobbleItem[] = [
  profileScrobbles[0],
  {
    ...profileScrobbles[2],
    scrobbleId: "scrobble_2",
  },
];
