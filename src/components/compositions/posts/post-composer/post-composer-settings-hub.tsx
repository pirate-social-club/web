"use client";

import { Check } from "@phosphor-icons/react";

import { CardContent } from "@/components/primitives/card";
import { Type } from "@/components/primitives/type";
import { cn } from "@/lib/utils";

import { PostComposerSettingsRow, PostComposerSettingsSections } from "./post-composer-settings-sections";
import { PostComposerCharitySection } from "./post-composer-sections";
import type { AssetLicensePresetId, AttachmentState } from "./post-composer.types";
import type { PostComposerController } from "./use-post-composer-controller";

function attachmentFromTab(controller: PostComposerController): AttachmentState {
  const { fields, media, tabs } = controller;

  if (tabs.activeTab === "link") {
    return { kind: "link", url: fields.linkUrlValue };
  }
  if (tabs.activeTab === "image") {
    return {
      kind: "image",
      label: media.activeImageUpload?.name ?? media.imageUploadLabel ?? "Image",
    };
  }
  if (tabs.activeTab === "video") {
    return {
      kind: "video",
      label: media.videoState.primaryVideoLabel ?? media.videoState.primaryVideoUpload?.name ?? "Video",
    };
  }
  if (tabs.activeTab === "song") {
    return {
      kind: "song",
      label: controller.song.state.primaryAudioLabel ?? controller.song.state.primaryAudioUpload?.name ?? "Song",
    };
  }
  if (tabs.activeTab === "live") {
    return { kind: "live" };
  }
  return null;
}

function accessFromController(controller: PostComposerController): "free" | "paid" {
  return controller.commerce.monetizationState.visible ? "paid" : "free";
}

function visibilityFromController(controller: PostComposerController): "public" | "community" {
  return controller.audience.state.visibility === "members_only" ? "community" : "public";
}

function identityFromController(controller: PostComposerController): "pseudonym" | "anonymous" {
  return controller.identity.identityMode === "anonymous" ? "anonymous" : "pseudonym";
}

function licenseCopyForPreset(
  licenseCopy: Record<string, string> | null,
  preset: AssetLicensePresetId,
) {
  return {
    label: licenseCopy?.[preset] ?? preset,
    description: licenseCopy?.[`${preset}Description`] ?? "",
  };
}

function settingsCopy(controller: PostComposerController) {
  const { copy, identity, license, tabs } = controller;
  const assetLicenseCopy = license.assetLicenseCopy;
  const nonCommercial = licenseCopyForPreset(assetLicenseCopy, "non-commercial");
  const commercialUse = licenseCopyForPreset(assetLicenseCopy, "commercial-use");
  const commercialRemix = licenseCopyForPreset(assetLicenseCopy, "commercial-remix");

  return {
    postAsTitle: copy.sections.postAs,
    publicIdentityDescription: "Your public profile",
    anonymousIdentityDescription: identity.identity?.anonymousDescription ?? "Same identity across this community",
    visibilityTitle: "Who can see this?",
    publicVisibilityLabel: copy.audience.public,
    communityVisibilityLabel: copy.audience.community,
    paidUnlockTitle: copy.access.paidUnlock,
    paidUnlockLabel: copy.access.paidUnlock,
    priceLabel: copy.fields.price ?? copy.fields.unlockPriceUsd,
    pricePlaceholder: copy.placeholders.unlockPrice,
    licenseLabel: copy.sections.license,
    licenseLabels: {
      "non-commercial": nonCommercial.label,
      "commercial-use": commercialUse.label,
      "commercial-remix": commercialRemix.label,
    },
    licenseDescriptions: {
      "non-commercial": nonCommercial.description,
      "commercial-use": commercialUse.description,
      "commercial-remix": commercialRemix.description,
    },
    royaltyLabel: assetLicenseCopy?.revenueShare ?? "Royalty",
    royaltyPlaceholder: String(
      tabs.activeTab === "song"
        ? controller.license.state.commercialRevSharePct ?? 10
        : controller.license.state.commercialRevSharePct ?? 15,
    ),
  };
}

function publicInitials(handle: string) {
  const trimmed = handle.replace(/^@/, "").trim();
  if (!trimmed) return "me";
  const chunks = trimmed.split(/[-.\s_]+/).filter(Boolean);
  if (chunks.length === 1) return chunks[0].slice(0, 2).toLowerCase();
  return `${chunks[0][0] ?? ""}${chunks[1][0] ?? ""}`.toLowerCase();
}

export function PostComposerSettingsHub({
  controller,
}: {
  controller: PostComposerController;
}) {
  const {
    audience,
    commerce,
    charity,
    identity,
    isMobile,
    license,
    primary,
  } = controller;
  const attachment = attachmentFromTab(controller);
  const publicHandle = identity.identity?.publicHandle ?? "name.pirate";
  const anonymousLabel = identity.identity?.anonymousLabel ?? "Pseudonym";
  const access = accessFromController(controller);

  return (
    <CardContent className={cn("space-y-8 p-5", isMobile && "px-0 pb-4 pt-1")}>
      <PostComposerSettingsSections
        access={access}
        agentIdentityDescription="Post from your agent identity"
        agentIdentityLabel={identity.identity?.agentLabel}
        agentIdentitySelected={identity.authorMode === "agent"}
        anonymousIdentityLabel={anonymousLabel}
        attachment={attachment}
        copy={settingsCopy(controller)}
        identity={identityFromController(controller)}
        license={license.state.presetId}
        onAccessChange={(nextAccess) =>
          commerce.updateMonetizationState((current) => ({
            ...current,
            regionalPricingEnabled: nextAccess === "paid"
              ? current.regionalPricingEnabled
              : false,
            visible: nextAccess === "paid",
          }))
        }
        onAgentIdentitySelect={() => identity.setAuthorMode("agent")}
        onIdentityChange={(nextIdentity) => {
          identity.setAuthorMode("human");
          identity.setIdentityMode(nextIdentity === "anonymous" ? "anonymous" : "public");
        }}
        onLicenseChange={(presetId) =>
          license.update((current) => ({
            presetId,
            commercialRevSharePct: presetId === "commercial-remix"
              ? current.commercialRevSharePct ?? 10
              : undefined,
          }))
        }
        onPriceChange={(priceUsd) =>
          commerce.updateMonetizationState((current) => ({
            ...current,
            priceUsd,
          }))
        }
        onRoyaltyPercentChange={(value) =>
          license.update((current) => ({
            ...current,
            commercialRevSharePct: value.trim() ? Number.parseInt(value, 10) : undefined,
          }))
        }
        onVisibilityChange={(nextVisibility) =>
          audience.update((current) => ({
            ...current,
            visibility: nextVisibility === "community" ? "members_only" : "public",
          }))
        }
        price={commerce.monetizationState.priceUsd ?? ""}
        publicAvatarSrc={identity.publicAvatarSrc ?? undefined}
        publicAvatarSeed={identity.publicAvatarSeed ?? undefined}
        publicIdentityInitials={publicInitials(publicHandle)}
        publicIdentityLabel={publicHandle}
        royaltyPercent={String(license.state.commercialRevSharePct ?? 10)}
        showLicenseFields={
          attachment?.kind === "video"
            ? commerce.monetizationState.visible
            : attachment?.kind === "song" && primary.activeSongMode === "original"
        }
        showAnonymousIdentity={identity.identity?.allowAnonymousIdentity === true}
        visibility={visibilityFromController(controller)}
      />

      {attachment?.kind === "live" ? (
        <section className="space-y-3">
          <Type as="h2" variant="h3" className="text-muted-foreground">
            Live event
          </Type>
          <PostComposerSettingsRow
            icon={<Check className="size-7" />}
            label="Live event"
            onClick={() => undefined}
            value={`${primary.liveState.roomKind} · ${primary.liveState.accessMode}`}
          />
        </section>
      ) : null}

      {(attachment?.kind === "song" || attachment?.kind === "video")
      && commerce.monetizationState.visible
      && charity.partner ? (
        <PostComposerCharitySection
          charityContribution={charity.state}
          charityPartner={charity.partner}
          copy={controller.copy}
          updateCharityContribution={charity.update}
        />
      ) : null}
    </CardContent>
  );
}
