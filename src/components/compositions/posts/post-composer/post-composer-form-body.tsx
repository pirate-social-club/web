"use client";

import { CardContent } from "@/components/primitives/card";
import { Input } from "@/components/primitives/input";
import { cn } from "@/lib/utils";

import { FieldLabel } from "./post-composer-fields";
import { QualifierSection } from "./post-composer-identity-section";
import { PostComposerPrimaryArea } from "./post-composer-content";
import {
  PostComposerAssetLicenseSection,
  PostComposerCharitySection,
  PostComposerCommerceAccessSection,
} from "./post-composer-sections";
import type { PostComposerController } from "./use-post-composer-controller";

export function PostComposerFormBody({
  controller,
}: {
  controller: PostComposerController;
}) {
  const {
    advanceDerivativePicker,
    charity,
    commerce,
    copy,
    fields,
    identity,
    isMobile,
    license,
    media,
    primary,
    song,
    tabs,
  } = controller;

  return (
    <CardContent className={cn("space-y-5 p-5", isMobile && "space-y-5 px-0 pb-4 pt-3")}>
      <>
        <div>
          {!isMobile ? <FieldLabel label={copy.fields.title} /> : null}
          <Input
            className="h-14"
            maxLength={300}
            onChange={(event) => fields.onTitleValueChange?.(event.target.value)}
            placeholder={copy.placeholders.title}
            value={fields.titleValue}
          />
        </div>

        <PostComposerPrimaryArea
          activeSongMode={primary.activeSongMode}
          activeTab={tabs.activeTab}
          captionValue={fields.captionValue}
          copy={copy}
          derivativePickerKey={primary.derivativePickerKey}
          derivativeSearchResults={primary.derivativeSearchResults}
          derivativeState={primary.derivativeState}
          imageUploadLabel={media.activeImageUpload?.name ?? media.imageUploadLabel}
          linkUrlValue={fields.linkUrlValue}
          liveState={primary.liveState}
          lyricsValue={fields.lyricsValue}
          onAdvanceDerivativePicker={advanceDerivativePicker}
          onCaptionValueChange={fields.onCaptionValueChange}
          onImageUploadChange={media.setImageUpload}
          onLinkUrlValueChange={fields.onLinkUrlValueChange}
          onLyricsValueChange={fields.onLyricsValueChange}
          onTextBodyValueChange={fields.onTextBodyValueChange}
          setLiveState={primary.setLiveState}
          setSongModeWithCallback={primary.handleSongModeChange}
          songState={song.state}
          textBodyValue={fields.textBodyValue}
          updateDerivativeState={primary.updateDerivativeState}
          updateSongState={song.update}
          updateVideoState={media.updateVideoState}
          videoState={media.videoState}
        />

        {tabs.activeTab === "song" || tabs.activeTab === "video" ? (
          <>
            {license.shouldShowAssetLicense && license.assetLicenseCopy ? (
              <PostComposerAssetLicenseSection
                licenseCopy={license.assetLicenseCopy}
                licenseState={license.state}
                sectionTitle={copy.sections.license}
                updateLicenseState={license.update}
              />
            ) : null}
            <PostComposerCommerceAccessSection
              contentKind={tabs.activeTab}
              copy={copy}
              monetizationState={commerce.monetizationState}
              previewStartSeconds={song.state.previewStartSeconds ?? undefined}
              onPreviewStartSecondsChange={
                (value) => song.update((current) => ({ ...current, previewStartSeconds: value }))
              }
              updateMonetizationState={commerce.updateMonetizationState}
            />
          </>
        ) : null}

        {(tabs.activeTab === "song" || tabs.activeTab === "video") && commerce.monetizationState.visible && charity.partner ? (
          <PostComposerCharitySection
            charityContribution={charity.state}
            charityPartner={charity.partner}
            copy={copy}
            updateCharityContribution={charity.update}
          />
        ) : null}

        {Boolean(identity.identity?.availableQualifiers?.some((q) => !q.suppressedByClubGate)) &&
          identity.authorMode !== "agent" &&
          identity.identityMode === "anonymous" &&
          identity.identity?.allowQualifiersOnAnonymousPosts !== false &&
          identity.identity ? (
          <QualifierSection
            identity={identity.identity}
            onSelectedQualifierIdsChange={identity.setSelectedQualifierIds}
            selectedQualifierIds={identity.selectedQualifierIds}
          />
        ) : null}
      </>
    </CardContent>
  );
}
