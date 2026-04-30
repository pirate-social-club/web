"use client";

import { isAddress } from "viem";

import { CheckboxCard } from "@/components/primitives/checkbox-card";
import {
  FormNote,
  FormSectionHeading,
} from "@/components/primitives/form-layout";
import { Input } from "@/components/primitives/input";
import { OptionCard } from "@/components/primitives/option-card";
import { Type } from "@/components/primitives/type";
import { isCountryCode } from "@/lib/countries";
import { COURTYARD_POLYGON_REGISTRY } from "@/lib/courtyard-inventory-gates";
import { cn } from "@/lib/utils";

import {
  CheckboxRow,
  FieldLabel,
  NumericStepper,
  Section,
} from "./create-community-composer.sections";
import { CourtyardWalletGateBuilder } from "./courtyard-wallet-gate-builder";
import { NationalityMultiPicker } from "./nationality-picker";
import type { CreateCommunityComposerController } from "./use-create-community-composer-controller";
import { resolveSelectedCourtyardGroup } from "./use-community-gate-state";

export function CreateCommunityAccessStep({
  controller,
}: {
  controller: CreateCommunityComposerController;
}) {
  const { access, copy, isMobile } = controller;
  const gateState = access.gateState;
  const chooseGated = () => access.setActiveMembershipMode("gated");
  const chooseRequest = () => {
    access.setActiveMembershipMode("request");
    gateState.setNationalityEnabled(false);
    gateState.setMinimumAgeEnabled(false);
    gateState.setWalletScoreEnabled(false);
    gateState.setGenderEnabled(false);
    gateState.setErc721Enabled(false);
    gateState.setCourtyardInventoryEnabled(false);
  };

  return (
    <>
      <Section title={copy.membershipSection}>
        <div className={cn("space-y-3", isMobile && "space-y-4")}>
          <OptionCard
            className={access.activeMembershipMode === "request" ? "border-border bg-muted/30" : undefined}
            selected={access.activeMembershipMode === "request"}
            title={copy.membershipRequestLabel}
            onClick={chooseRequest}
          />

          <OptionCard
            className={access.activeMembershipMode === "gated" ? "border-border bg-muted/30" : undefined}
            selected={access.activeMembershipMode === "gated"}
            title={copy.membershipGatedLabel}
            onClick={chooseGated}
          />

          {access.activeMembershipMode === "gated" ? (
            <div className="space-y-3 pt-2">
              <FormSectionHeading title={copy.walletGateChecksTitle} />

              <CheckboxCard
                className={gateState.walletScoreEnabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.walletScoreEnabled}
                title={copy.walletScoreTitle}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setWalletScoreEnabled(checked);
                }}
              />

              {gateState.walletScoreEnabled ? (
                <div className="space-y-2 ps-4">
                  <FieldLabel label={copy.walletScoreLabel} />
                  <NumericStepper
                    max={100}
                    min={0}
                    value={gateState.minimumWalletScore}
                    onChange={gateState.setMinimumWalletScore}
                  />
                  {(!Number.isFinite(gateState.minimumWalletScore) || gateState.minimumWalletScore < 0 || gateState.minimumWalletScore > 100) ? (
                    <FormNote tone="warning">{copy.walletScoreInvalid}</FormNote>
                  ) : null}
                </div>
              ) : null}

              <CheckboxCard
                className={gateState.erc721Enabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.erc721Enabled}
                title={copy.erc721Title}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setErc721Enabled(checked);
                }}
              />

              {gateState.erc721Enabled ? (
                <div className="space-y-2 ps-4">
                  <FieldLabel label={copy.collectionContractLabel} />
                  <Input
                    className="h-12 rounded-[var(--radius-lg)]"
                    onChange={(event) => gateState.setErc721ContractAddress(event.target.value)}
                    placeholder={copy.collectionContractPlaceholder}
                    value={gateState.erc721ContractAddress}
                  />
                  {gateState.erc721ContractAddress.trim().length > 0 && !isAddress(gateState.erc721ContractAddress.trim()) ? (
                    <FormNote tone="warning">{copy.invalidContractAddress}</FormNote>
                  ) : null}
                </div>
              ) : null}

              <CheckboxCard
                className={gateState.courtyardInventoryEnabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.courtyardInventoryEnabled}
                disabled={access.courtyardInventoryGroups === undefined}
                title={copy.courtyardTitle}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setCourtyardInventoryEnabled(checked);
                }}
              />

              {gateState.courtyardInventoryEnabled && access.courtyardInventoryGroups !== undefined ? (
                <div className="space-y-4 ps-4">
                  <CourtyardWalletGateBuilder
                    groups={access.courtyardInventoryGroups}
                    loading={access.courtyardInventoryLoading}
                    quantity={gateState.courtyardInventoryDraft.minQuantity}
                    selectedGroup={resolveSelectedCourtyardGroup(gateState.courtyardInventoryDraft, access.courtyardInventoryGroups)}
                    onQuantityChange={(value) => gateState.setCourtyardInventoryDraft((draft) => ({ ...draft, minQuantity: value }))}
                    onSelectGroup={(group) => {
                      chooseGated();
                      gateState.setCourtyardInventoryDraft({
                        gateType: "erc721_inventory_match",
                        chainNamespace: "eip155:137",
                        contractAddress: COURTYARD_POLYGON_REGISTRY,
                        inventoryProvider: "courtyard",
                        minQuantity: 1,
                        assetFilter: {
                          category: group.category,
                          franchise: group.franchise,
                          subject: group.subject,
                          brand: group.brand,
                          model: group.model,
                          reference: group.reference,
                          set: group.set,
                          year: group.year,
                          grader: group.grader,
                          grade: group.grade,
                          condition: group.condition,
                        },
                      });
                    }}
                  />
                </div>
              ) : gateState.courtyardInventoryEnabled ? (
                <FormNote tone="warning">{copy.courtyardCatalogUnavailable}</FormNote>
              ) : null}

              <FormSectionHeading title={copy.biometricGateChecksTitle} />

              <CheckboxCard
                className={gateState.nationalityEnabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.nationalityEnabled}
                title={copy.nationalityTitle}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setNationalityEnabled(checked);
                }}
              />

              {gateState.nationalityEnabled ? (
                <div className="space-y-2 ps-4">
                  <FieldLabel label={copy.allowedNationalityLabel} />
                  <NationalityMultiPicker
                    onChange={gateState.setNationalityRequiredValues}
                    values={gateState.nationalityRequiredValues}
                  />
                  {gateState.nationalityRequiredValues.some((value) => !isCountryCode(value)) ? (
                    <FormNote tone="warning">{copy.selectValidCountry}</FormNote>
                  ) : null}
                </div>
              ) : null}

              <CheckboxCard
                className={gateState.minimumAgeEnabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.minimumAgeEnabled}
                title={copy.minimumAgeTitle}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setMinimumAgeEnabled(checked);
                }}
              />

              {gateState.minimumAgeEnabled ? (
                <div className="space-y-2 ps-4">
                  <FieldLabel label={copy.minimumAgeLabel} />
                  <NumericStepper
                    max={125}
                    min={18}
                    value={gateState.minimumAge}
                    onChange={gateState.setMinimumAge}
                  />
                  {(!Number.isInteger(gateState.minimumAge) || gateState.minimumAge < 18 || gateState.minimumAge > 125) ? (
                    <FormNote tone="warning">{copy.minimumAgeInvalid}</FormNote>
                  ) : null}
                </div>
              ) : null}

              <CheckboxCard
                className={gateState.genderEnabled ? "border-border bg-muted/30" : undefined}
                checked={gateState.genderEnabled}
                title={copy.genderTitle}
                onCheckedChange={(checked) => {
                  chooseGated();
                  gateState.setGenderEnabled(checked);
                }}
              />

              {gateState.genderEnabled ? (
                <div className="grid gap-3 ps-4 sm:grid-cols-2">
                  <OptionCard
                    className={gateState.genderRequiredValue === "F" ? "border-border bg-muted/30" : undefined}
                    selected={gateState.genderRequiredValue === "F"}
                    title={copy.fMarkerLabel}
                    onClick={() => {
                      chooseGated();
                      gateState.setGenderRequiredValue("F");
                    }}
                  />
                  <OptionCard
                    className={gateState.genderRequiredValue === "M" ? "border-border bg-muted/30" : undefined}
                    selected={gateState.genderRequiredValue === "M"}
                    title={copy.mMarkerLabel}
                    onClick={() => {
                      chooseGated();
                      gateState.setGenderRequiredValue("M");
                    }}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

      </Section>

      {!access.hasAdultMinimumAgeGate ? (
        <Section className={cn("border-t border-border-soft pt-8", isMobile && "border-t-0 pt-1")} title={copy.contentRatingSection}>
          <div className="space-y-2">
            <CheckboxRow
              checked={access.activeDefaultAgeGatePolicy === "18_plus"}
              id="community-18-plus"
              label={copy.ageGateLabel}
              onCheckedChange={(checked) =>
                access.setActiveDefaultAgeGatePolicy(checked ? "18_plus" : "none")
              }
            />
            {access.activeDefaultAgeGatePolicy === "18_plus" && !access.deferCreatorVerification && !access.creatorAgeOver18Verified ? (
              <FormNote tone="warning">
                {copy.creatorAgeRequired}
              </FormNote>
            ) : null}
          </div>
        </Section>
      ) : null}

      <Section className={cn("border-t border-border-soft pt-8", isMobile && "border-t-0 pt-1")} title={copy.identityAccessSection}>
        <div className="space-y-5">
          <CheckboxRow
            checked={access.activeAllowAnonymousIdentity}
            id="community-allow-anonymous-posting"
            label={copy.allowAnonymousPosting}
            onCheckedChange={access.setActiveAllowAnonymousIdentity}
          />

          {access.activeAllowAnonymousIdentity ? (
            <div className="space-y-3 border-s border-border-soft ps-4">
              <Type as="p" variant="label">{copy.anonymousScopeLabel}</Type>
              <div className="space-y-2">
                {([
                  { key: "community_stable" as const, label: copy.anonymousCommunityStableLabel, detail: copy.anonymousCommunityStableDetail },
                  { key: "thread_stable" as const, label: copy.anonymousThreadStableLabel, detail: copy.anonymousThreadStableDetail },
                ]).map((option) => (
                  <OptionCard
                    key={option.key}
                    description={option.detail}
                    selected={option.key === access.activeAnonymousScope}
                    title={option.label}
                    onClick={() => access.setActiveAnonymousScope(option.key)}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </Section>
    </>
  );
}
