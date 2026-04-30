import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import {
  CaretLeft,
  Check,
  X,
} from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/primitives/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/primitives/sheet";
import { Textarea } from "@/components/primitives/textarea";
import { Type } from "@/components/primitives/type";
import { PostCard } from "@/components/compositions/posts/post-card/post-card";
import type { PostCardProps } from "@/components/compositions/posts/post-card/post-card.types";
import { PostComposerAttachmentCard } from "../../post-composer-attachment-card";
import {
  PostComposerDesktopAttachmentToolbar,
  PostComposerMobileAttachmentBar,
} from "../../post-composer-attachment-bar";
import { PostComposerSongDetailsSection } from "../../post-composer-song-details-section";
import { PostComposerVideoDetailsSection } from "../../post-composer-video-details-section";
import { attachmentActions } from "../../post-composer-config";
import { buildPostComposerPreviewContent } from "../../post-composer-preview";
import { getComposeCanAdvance } from "../../post-composer-utils";
import {
  PostComposerSettingsRow,
  PostComposerSettingsSections,
  type PostComposerSettingsSectionsProps,
} from "../../post-composer-settings-sections";
import type {
  AttachmentKind,
  AttachmentState,
  SongDetailsState,
  VideoDetailsState,
} from "../../post-composer.types";
import { useKeyboardBottomOffset } from "../../use-keyboard-bottom-offset";
import { useAttachmentFlowState, type FlowStep } from "./use-attachment-flow-state";
import { cn } from "@/lib/utils";

type SettingsSheet = "details" | null;
type SettingsSectionStoryProps = Omit<PostComposerSettingsSectionsProps, "publicAvatarSrc">;

const meta = {
  title: "Compositions/Posts/PostComposer/Attachment Flow Prototype",
  parameters: {
    layout: "fullscreen",
    viewport: { defaultViewport: "mobile2" },
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

const publicAvatarSrc = "https://api.dicebear.com/9.x/thumbs/svg?seed=saint-pablo.pirate";
function attachmentLabel(attachment: AttachmentState) {
  if (!attachment) return "Text";
  switch (attachment.kind) {
    case "link":
      return "Link";
    case "image":
      return "Image";
    case "video":
      return "Video";
    case "song":
      return "Song";
    case "live":
      return "Live event";
  }
}

function attachmentDetailsLabel(attachment: AttachmentState) {
  if (attachment?.kind === "live") return "Live event";
  return "";
}

function attachmentDetailsValue(attachment: AttachmentState) {
  if (attachment?.kind === "live") return "Schedule";
  return "";
}

function hasAttachmentDetails(attachment: AttachmentState) {
  return Boolean(attachment && attachment.kind === "live");
}

function HeaderPrimaryAction({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="h-10 min-w-18 bg-primary px-5 text-base font-semibold text-primary-foreground hover:bg-primary/90"
      disabled={disabled}
      onClick={onClick}
      variant="default"
    >
      {children}
    </Button>
  );
}

function FlowHeader({
  canAdvance,
  onBack,
  onClose,
  onNext,
  step,
}: {
  canAdvance: boolean;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  step: FlowStep;
}) {
  const title = step === "review" ? "Preview" : "";
  const canGoBack = step !== "compose";

  return (
    <header className="fixed inset-x-0 top-0 z-30 flex h-18 items-end justify-between bg-background/95 px-4 pb-2 text-foreground backdrop-blur-xl">
      {canGoBack ? (
        <button
          aria-label="Back"
          className="grid size-11 place-items-center rounded-full text-foreground"
          onClick={onBack}
          type="button"
        >
          <CaretLeft className="size-7" weight="bold" />
        </button>
      ) : (
        <button
          aria-label="Close"
          className="grid size-11 place-items-center rounded-full text-foreground"
          onClick={onClose}
          type="button"
        >
          <X className="size-7" weight="bold" />
        </button>
      )}
      {title ? (
        <Type as="h1" variant="h3" className="absolute inset-x-20 bottom-5 truncate text-center">
          {title}
        </Type>
      ) : null}
      {step === "review" ? (
        <span className="size-11" aria-hidden />
      ) : (
        <HeaderPrimaryAction disabled={!canAdvance} onClick={onNext}>
          Next
        </HeaderPrimaryAction>
      )}
    </header>
  );
}

function CommunityPill() {
  return (
    <button
      className="inline-flex max-w-full items-center gap-3 rounded-full border border-border-soft bg-card px-4 py-3 text-start text-base font-semibold text-foreground shadow-sm"
      type="button"
    >
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-base font-bold">
        r/
      </span>
      <span className="min-w-0 truncate">Select a community</span>
      <span className="text-muted-foreground">v</span>
    </button>
  );
}

function ComposeStep({
  attachment,
  body,
  bottomOffset,
  onAttachmentChange,
  onAttachmentRemove,
  onAttachmentSelect,
  onBodyChange,
  onTitleChange,
  title,
}: {
  attachment: AttachmentState;
  body: string;
  bottomOffset: number;
  onAttachmentChange: (next: AttachmentState) => void;
  onAttachmentRemove: () => void;
  onAttachmentSelect: (kind: AttachmentKind) => void;
  onBodyChange: (value: string) => void;
  onTitleChange: (value: string) => void;
  title: string;
}) {
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);

  function handleAttachmentSelect(kind: AttachmentKind) {
    if (kind === "image") {
      imageInputRef.current?.click();
      return;
    }
    if (kind === "video") {
      videoInputRef.current?.click();
      return;
    }
    if (kind === "song") {
      audioInputRef.current?.click();
      return;
    }
    onAttachmentSelect(kind);
  }

  function handleFile(kind: "image" | "video" | "song", files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (kind === "song") {
      onAttachmentChange({ kind, label: file.name });
      return;
    }
    onAttachmentChange({ kind, label: file.name, previewUrl: URL.createObjectURL(file) });
  }

  return (
    <>
      <main
        className="min-h-screen space-y-7 px-5 pb-32 pt-24"
        style={{ paddingBottom: 120 + bottomOffset }}
      >
        <CommunityPill />
        <Textarea
          className="min-h-18 resize-none break-words rounded-none border-0 bg-transparent px-0 py-0 text-3xl font-semibold leading-tight shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="Title"
          value={title}
        />
        <PostComposerAttachmentCard
          attachment={attachment}
          onChange={onAttachmentChange}
          onRemove={onAttachmentRemove}
          onReplace={handleAttachmentSelect}
        />
        <Textarea
          className="min-h-[38dvh] resize-none rounded-none border-0 bg-transparent px-0 py-0 text-xl leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
          onChange={(event) => onBodyChange(event.target.value)}
          placeholder={attachment ? "body text (optional)" : "body text"}
          value={body}
        />
      </main>
      <PostComposerMobileAttachmentBar
        actions={attachmentActions}
        activeKind={attachment?.kind ?? null}
        onSelect={handleAttachmentSelect}
      />
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => handleFile("image", event.target.files)}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        className="sr-only"
        onChange={(event) => handleFile("video", event.target.files)}
        ref={videoInputRef}
        type="file"
      />
      <input
        accept="audio/*"
        className="sr-only"
        onChange={(event) => handleFile("song", event.target.files)}
        ref={audioInputRef}
        type="file"
      />
    </>
  );
}

function SongDetailsStep({
  onChange,
  value,
}: {
  onChange: (value: SongDetailsState) => void;
  value: SongDetailsState;
}) {
  return (
    <main className="min-h-screen space-y-8 px-5 pb-12 pt-24">
      <PostComposerSongDetailsSection onChange={onChange} value={value} />
    </main>
  );
}

function VideoDetailsStep({
  attachment,
  onChange,
  value,
}: {
  attachment: AttachmentState;
  onChange: (value: VideoDetailsState) => void;
  value: VideoDetailsState;
}) {
  return (
    <main className="min-h-screen space-y-8 px-5 pb-12 pt-24">
      <PostComposerVideoDetailsSection attachment={attachment} onChange={onChange} value={value} />
    </main>
  );
}

function SettingsStep(props: SettingsSectionStoryProps) {
  const [sheet, setSheet] = React.useState<SettingsSheet>(null);
  const detailLabel = attachmentLabel(props.attachment);
  const showDetails = hasAttachmentDetails(props.attachment);

  return (
    <main className="min-h-screen space-y-8 px-5 pb-12 pt-24">
      <PostComposerSettingsSections {...props} publicAvatarSrc={publicAvatarSrc} />
      {showDetails ? (
        <section className="space-y-3">
          <Type as="h2" variant="h3" className="text-muted-foreground">
            {detailLabel} details
          </Type>
          <PostComposerSettingsRow
            icon={<Check className="size-7" />}
            label={attachmentDetailsLabel(props.attachment)}
            onClick={() => setSheet("details")}
            value={attachmentDetailsValue(props.attachment)}
          />
        </section>
      ) : null}

      <Sheet open={sheet === "details"} onOpenChange={(open) => setSheet(open ? "details" : null)}>
        <SheetContent className="max-h-[82dvh] overflow-y-auto rounded-t-[var(--radius-3xl)] px-4 pb-6 pt-4" side="bottom">
          <SheetHeader className="pe-12 text-start">
            <SheetTitle>{detailLabel} details</SheetTitle>
          </SheetHeader>
          <div className="mt-5 space-y-4">
            <Type as="p" variant="body" className="text-muted-foreground">
              {props.attachment?.kind === "song"
                ? "Genre, language, lyrics, cover art, stems, remix/source, and preview start move here."
                : props.attachment?.kind === "video"
                  ? "Poster frame, preview, rights, and licensing move here."
                    : "Schedule, room type, guests, access, cover, and setlist move here."}
            </Type>
          </div>
        </SheetContent>
      </Sheet>
    </main>
  );
}

function ReviewStep({
  access,
  attachment,
  body,
  identity,
  onPost,
  price,
  title,
  videoDetails,
  visibility,
}: {
  access: "free" | "paid";
  attachment: AttachmentState;
  body: string;
  identity: "pseudonym" | "anonymous";
  onPost: () => void;
  price: string;
  title: string;
  videoDetails: VideoDetailsState;
  visibility: "public" | "community";
}) {
  const priceLabel = price.trim() ? `$${price.trim()}` : undefined;
  const authorLabel = identity === "pseudonym" ? "saint-pablo.pirate" : "anon_amber-anchor-00";
  const previewPost: PostCardProps = {
    viewContext: "community",
    identityPresentation: identity === "anonymous" ? "anonymous_primary" : "author_primary",
    byline: {
      author: {
        kind: "user",
        label: authorLabel,
        href: "#",
        avatarSrc: identity === "pseudonym" ? publicAvatarSrc : undefined,
      },
      timestampLabel: visibility === "public" ? "Public" : "Citizens",
    },
    title: title || "Untitled post",
    content: buildPostComposerPreviewContent({ access, attachment, body, price, title, videoDetails }),
    engagement: {
      score: 0,
      commentCount: 0,
      unlock: access === "paid" && priceLabel ? { label: priceLabel, onBuy: () => undefined } : undefined,
    },
  };

  return (
    <>
      <main className="min-h-screen pb-28 pt-20">
        <PostCard {...previewPost} />
      </main>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border-soft bg-background/95 px-5 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-xl">
        <Button className="h-12 w-full text-base font-semibold" onClick={onPost} variant="default">
          Post
        </Button>
      </div>
    </>
  );
}

function MobileAttachmentFlow({
  initialAttachment = null,
  initialStep = "compose",
}: {
  initialAttachment?: AttachmentState;
  initialStep?: FlowStep;
}) {
  const bottomOffset = useKeyboardBottomOffset();
  const flow = useAttachmentFlowState({ initialAttachment, initialStep });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <FlowHeader
        canAdvance={flow.canAdvance}
        onBack={flow.goBack}
        onClose={() => undefined}
        onNext={flow.goNext}
        step={flow.step}
      />
      {flow.step === "compose" ? (
        <ComposeStep
          attachment={flow.attachment}
          body={flow.body}
          bottomOffset={bottomOffset}
          onAttachmentChange={flow.replaceAttachment}
          onAttachmentRemove={() => flow.replaceAttachment(null)}
          onAttachmentSelect={flow.selectAttachment}
          onBodyChange={flow.setBody}
          onTitleChange={flow.setTitle}
          title={flow.title}
        />
      ) : flow.step === "song-details" ? (
        <SongDetailsStep onChange={flow.setSongDetails} value={flow.songDetails} />
      ) : flow.step === "video-details" ? (
        <VideoDetailsStep
          attachment={flow.attachment}
          onChange={flow.setVideoDetails}
          value={flow.videoDetails}
        />
      ) : flow.step === "settings" ? (
        <SettingsStep
          access={flow.access}
          attachment={flow.attachment}
          identity={flow.identity}
          license={flow.license}
          onAccessChange={flow.setAccess}
          onIdentityChange={flow.setIdentity}
          onLicenseChange={flow.setLicense}
          onPriceChange={flow.setPrice}
          onRoyaltyPercentChange={flow.setRoyaltyPercent}
          onVisibilityChange={flow.setVisibility}
          price={flow.price}
          royaltyPercent={flow.royaltyPercent}
          visibility={flow.visibility}
        />
      ) : (
        <ReviewStep
          access={flow.access}
          attachment={flow.attachment}
          body={flow.body}
          identity={flow.identity}
          onPost={() => undefined}
          price={flow.price}
          title={flow.title}
          videoDetails={flow.videoDetails}
          visibility={flow.visibility}
        />
      )}
    </div>
  );
}

function DesktopSettingsPanel(props: SettingsSectionStoryProps) {
  return (
    <PostComposerSettingsSections
      {...props}
      className="mx-auto max-w-2xl"
      publicAvatarSrc={publicAvatarSrc}
    />
  );
}

function DesktopAttachmentFlow() {
  const flow = useAttachmentFlowState();
  const imageInputRef = React.useRef<HTMLInputElement | null>(null);
  const videoInputRef = React.useRef<HTMLInputElement | null>(null);
  const audioInputRef = React.useRef<HTMLInputElement | null>(null);

  function handleAttachmentSelect(kind: AttachmentKind) {
    if (kind === "image") {
      imageInputRef.current?.click();
      return;
    }
    if (kind === "video") {
      videoInputRef.current?.click();
      return;
    }
    if (kind === "song") {
      audioInputRef.current?.click();
      return;
    }
    flow.selectAttachment(kind);
  }

  const previewPost: PostCardProps = {
    viewContext: "community",
    identityPresentation: flow.identity === "anonymous" ? "anonymous_primary" : "author_primary",
    byline: {
      author: {
        kind: "user",
        label: flow.identity === "pseudonym" ? "saint-pablo.pirate" : "anon_amber-anchor-00",
        href: "#",
        avatarSrc: flow.identity === "pseudonym" ? publicAvatarSrc : undefined,
      },
      timestampLabel: flow.visibility === "public" ? "Public" : "Citizens",
    },
    title: flow.title || "Untitled post",
    content: buildPostComposerPreviewContent({
      access: flow.access,
      attachment: flow.attachment,
      body: flow.body,
      price: flow.price,
      title: flow.title,
      videoDetails: flow.videoDetails,
    }),
    engagement: {
      score: 0,
      commentCount: 0,
      unlock: flow.access === "paid" ? { label: `$${flow.price}`, onBuy: () => undefined } : undefined,
    },
  };

  const stepLabel =
    flow.step === "compose"
      ? "Write post"
      : flow.step === "song-details"
        ? "Song details"
        : flow.step === "video-details"
          ? "Video details"
          : flow.step === "settings"
            ? "Post settings"
            : "Preview";

  return (
    <div className="min-h-screen bg-background px-8 py-8 text-foreground">
      <div className="mx-auto max-w-[980px]">
        <Card className="overflow-hidden bg-card shadow-none">
          <CardHeader className="border-b border-border-soft px-6 py-5">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <Type as="h1" variant="h3" className="truncate">
                  {stepLabel}
                </Type>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {(["compose", "video-details", "song-details", "settings", "review"] as const)
                  .filter(
                    (item) =>
                      (item !== "song-details" || flow.attachment?.kind === "song") &&
                      (item !== "video-details" || flow.attachment?.kind === "video"),
                  )
                  .map((item) => (
                    <span
                      className={cn(
                        "h-1.5 w-9 rounded-full",
                        flow.step === item ? "bg-primary" : "bg-border-soft",
                      )}
                      key={item}
                    />
                  ))}
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-6 py-6">
            {flow.step === "compose" ? (
              <main className="space-y-8">
                <CommunityPill />
                <section className="space-y-6">
                  <Textarea
                    className="min-h-20 resize-none break-words rounded-none border-0 bg-transparent px-0 py-0 text-3xl font-semibold leading-tight shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                    onChange={(event) => flow.setTitle(event.target.value)}
                    placeholder="Title"
                    value={flow.title}
                  />
                  <PostComposerAttachmentCard
                    attachment={flow.attachment}
                    onChange={flow.replaceAttachment}
                    onRemove={() => flow.replaceAttachment(null)}
                    onReplace={handleAttachmentSelect}
                  />
                  <Textarea
                    className="min-h-56 resize-none rounded-none border-0 bg-transparent px-0 py-0 text-xl leading-relaxed shadow-none placeholder:text-muted-foreground focus-visible:ring-0"
                    onChange={(event) => flow.setBody(event.target.value)}
                    placeholder={flow.attachment ? "body text (optional)" : "body text"}
                    value={flow.body}
                  />
                  <PostComposerDesktopAttachmentToolbar
                    actions={attachmentActions}
                    activeKind={flow.attachment?.kind ?? null}
                    onSelect={handleAttachmentSelect}
                  />
                </section>
              </main>
            ) : flow.step === "song-details" ? (
              <main className="mx-auto max-w-2xl">
                <PostComposerSongDetailsSection onChange={flow.setSongDetails} value={flow.songDetails} />
              </main>
            ) : flow.step === "video-details" ? (
              <main className="mx-auto max-w-2xl">
                <PostComposerVideoDetailsSection
                  attachment={flow.attachment}
                  onChange={flow.setVideoDetails}
                  value={flow.videoDetails}
                />
              </main>
            ) : flow.step === "settings" ? (
              <main>
                <DesktopSettingsPanel
                  access={flow.access}
                  attachment={flow.attachment}
                  identity={flow.identity}
                  license={flow.license}
                  onAccessChange={flow.setAccess}
                  onIdentityChange={flow.setIdentity}
                  onLicenseChange={flow.setLicense}
                  onPriceChange={flow.setPrice}
                  onRoyaltyPercentChange={flow.setRoyaltyPercent}
                  onVisibilityChange={flow.setVisibility}
                  price={flow.price}
                  royaltyPercent={flow.royaltyPercent}
                  visibility={flow.visibility}
                />
              </main>
            ) : (
              <main className="mx-auto max-w-2xl overflow-hidden rounded-[var(--radius-lg)] border border-border-soft bg-background">
                <PostCard {...previewPost} />
              </main>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t border-border-soft px-6 py-4">
            <Button
              className={flow.step === "compose" ? "invisible" : undefined}
              onClick={flow.goBack}
              variant="outline"
            >
              Back
            </Button>
            {flow.step === "review" ? (
              <Button className="px-6">Post</Button>
            ) : (
              <Button
                className="px-6"
                disabled={
                  flow.step === "compose" &&
                  !getComposeCanAdvance({
                    attachment: flow.attachment,
                    body: flow.body,
                    title: flow.title,
                  })
                }
                onClick={flow.goNext}
              >
                Next
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
      <input
        accept="image/*"
        className="sr-only"
        onChange={(event) => flow.handleFile("image", event.target.files)}
        ref={imageInputRef}
        type="file"
      />
      <input
        accept="video/*"
        className="sr-only"
        onChange={(event) => flow.handleFile("video", event.target.files)}
        ref={videoInputRef}
        type="file"
      />
      <input
        accept="audio/*"
        className="sr-only"
        onChange={(event) => flow.handleFile("song", event.target.files)}
        ref={audioInputRef}
        type="file"
      />
    </div>
  );
}

export const Interactive: Story = {
  render: () => <MobileAttachmentFlow />,
};

export const DesktopInteractive: Story = {
  parameters: {
    viewport: { defaultViewport: "desktop" },
  },
  render: () => <DesktopAttachmentFlow />,
};

export const LinkCompose: Story = {
  render: () => <MobileAttachmentFlow initialAttachment={{ kind: "link", url: "" }} />,
};

export const SongSettings: Story = {
  render: () => (
    <MobileAttachmentFlow
      initialAttachment={{ kind: "song", label: "midnight-waves.wav" }}
      initialStep="song-details"
    />
  ),
};

export const VideoDetails: Story = {
  render: () => (
    <MobileAttachmentFlow
      initialAttachment={{ kind: "video", label: "encore-fan-edit.mp4" }}
      initialStep="video-details"
    />
  ),
};

export const LiveSettings: Story = {
  render: () => (
    <MobileAttachmentFlow
      initialAttachment={{ kind: "live" }}
      initialStep="settings"
    />
  ),
};

export const Review: Story = {
  render: () => (
    <MobileAttachmentFlow
      initialAttachment={{ kind: "video", label: "encore-fan-edit.mp4" }}
      initialStep="review"
    />
  ),
};
