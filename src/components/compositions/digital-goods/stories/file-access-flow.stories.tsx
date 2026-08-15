import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";

import { PostCardMedia } from "@/components/compositions/posts/post-card/post-card-media";
import type { GenericAssetContentSpec } from "@/components/compositions/posts/post-card/post-card.types";
import { Type } from "@/components/primitives/type";

type State = "listing" | "quoted" | "entitled" | "downloaded" | "cdr_preparing" | "decrypting" | "verified" | "expired" | "quarantined" | "takedown";

function FileAccessFlow({ initialState = "listing" }: { initialState?: State }) {
  const [state, setState] = React.useState<State>(initialState);
  const staticMessage: Partial<Record<State, string>> = {
    cdr_preparing: "Entitled · CDR preparation is retrying",
    decrypting: "Download ready · decrypting ciphertext",
    verified: "Verified save complete · SHA-256 matches",
    expired: "Access expired · request a fresh entitlement",
    quarantined: "Asset quarantined · ordinary response: Asset not found",
    takedown: "Takedown active · delivery and commerce stopped",
  };
  const content: GenericAssetContentSpec = {
    type: "generic_asset",
    assetId: "ast_storybook_file",
    assetKind: "download_file",
    communityId: "com_storybook",
    title: "Quarterly data export.csv",
    filename: "quarterly-data-export.csv",
    mimeType: "text/csv",
    sizeBytes: 12_400,
    accessMode: "locked",
    listingMode: "listed",
    listingStatus: "active",
    priceLabel: "1 WIP",
    accessState: state === "cdr_preparing" ? "delivery_pending" : state === "listing" || state === "quoted" ? "purchase_required" : "available",
    hasEntitlement: state === "entitled" || state === "downloaded" || state === "decrypting" || state === "verified",
    onBuy: state === "listing" ? () => setState("quoted") : undefined,
    onDownload: state === "entitled" ? () => setState("downloaded") : undefined,
  };
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-5 p-6">
      <Type as="p" className="text-muted-foreground" variant="body">Buyer flow · simulated Base Sepolia USDC</Type>
      <h1 className="text-3xl font-semibold">Quarterly data export.csv</h1>
      <PostCardMedia content={content} />
      {staticMessage[initialState] ? <Type as="p" className="rounded-md bg-muted p-3" variant="body">{staticMessage[initialState]}</Type> : null}
      {state === "quoted" ? <button className="rounded-md bg-primary px-4 py-2 text-primary-foreground" onClick={() => setState("entitled")} type="button">Pay simulated $1 WIP</button> : null}
      {state === "downloaded" ? <Type as="p" className="text-success" variant="body-strong">Download authorized</Type> : null}
      <Type as="p" className="text-muted-foreground" variant="body">If enforcement is quarantined or missing, the ordinary response remains “Asset not found.”</Type>
    </main>
  );
}

const meta = { title: "Compositions/Digital Goods/File Access", component: FileAccessFlow, tags: ["digital-goods"], parameters: { layout: "fullscreen" } } satisfies Meta<typeof FileAccessFlow>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Flow: Story = { name: "Buyer file access flow" };
Flow.play = async ({ canvasElement }) => {
  const click = (label: string) => {
    const button = [...canvasElement.querySelectorAll<HTMLButtonElement>("button")].find((candidate) => candidate.textContent?.trim() === label);
    if (!button) throw new Error(`buyer flow action is missing: ${label}`);
    button.click();
  };
  click("Unlock · 1 WIP");
  await new Promise((resolve) => setTimeout(resolve, 0));
  click("Pay simulated $1 WIP");
  await new Promise((resolve) => setTimeout(resolve, 0));
  click("Download file");
  await new Promise((resolve) => setTimeout(resolve, 0));
  if (!canvasElement.textContent?.includes("Download authorized")) throw new Error("buyer flow did not reach authorized state");
};

export const EntitledCdrPreparing: Story = { name: "Entitlement — CDR preparing", args: { initialState: "cdr_preparing" } };
export const Decrypting: Story = { name: "Delivery — decrypting and verifying save", args: { initialState: "decrypting" } };
export const Expired: Story = { name: "Failure — expired access", args: { initialState: "expired" } };
export const Quarantined: Story = { name: "Enforcement — quarantine", args: { initialState: "quarantined" } };
export const Takedown: Story = { name: "Terminal — takedown", args: { initialState: "takedown" } };
