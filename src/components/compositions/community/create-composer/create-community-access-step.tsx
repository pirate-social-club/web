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
  SegmentedControl,
} from "./create-community-composer.sections";
import type { CommunityMembershipMode } from "./create-community-composer.types";
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

  return (
    <>
      <Section title={copy.membershipSection}>
        <SegmentedControl
          onChange={(value) => access.setActiveMembershipMode(value as CommunityMembershipMode)}
          options={{
            open: { label: copy.membershipOpenLabel, detail: copy.membershipOpenDetail },
            request: { label: copy.membershipRequestLabel, detail: copy.membershipRequestDetail },
            gated: { label: copy.membershipGatedLabel, detail: copy.membershipGatedDetail },
          }}
          value={access.activeMembershipMode}
        />

        {!access.hasAdultMinimumAgeGate ? (
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
        ) : null}

        {access.activeMembershipMode === "gated" ? (
          <div className={cn("space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-5 py-4", isMobile && "rounded-none border-0 bg-transparent px-0 py-0")}>
            <FormSectionHeading title={copy.gateChecksTitle} />

            <CheckboxCard
              checked={gateState.nationalityEnabled}
              description={copy.nationalityDescription}
              title={copy.nationalityTitle}
              onCheckedChange={gateState.setNationalityEnabled}
            />

            {gateState.nationalityEnabled ? (
              <div className="space-y-2 border-s-2 border-primary ps-4">
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
              checked={gateState.minimumAgeEnabled}
              description={copy.minimumAgeDescription}
              title={copy.minimumAgeTitle}
              onCheckedChange={gateState.setMinimumAgeEnabled}
            />

            {gateState.minimumAgeEnabled ? (
              <div className="space-y-2 border-s-2 border-primary ps-4">
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
              checked={gateState.walletScoreEnabled}
              description={copy.walletScoreDescription}
              title={copy.walletScoreTitle}
              onCheckedChange={gateState.setWalletScoreEnabled}
            />

            {gateState.walletScoreEnabled ? (
              <div className="space-y-2 border-s-2 border-primary ps-4">
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
              checked={gateState.erc721Enabled}
              description={copy.erc721Description}
              title={copy.erc721Title}
              onCheckedChange={gateState.setErc721Enabled}
            />

            {gateState.erc721Enabled ? (
              <div className="space-y-2 border-s-2 border-primary ps-4">
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
              checked={gateState.courtyardInventoryEnabled}
              description={copy.courtyardDescription}
              disabled={access.courtyardInventoryGroups === undefined}
              title={copy.courtyardTitle}
              onCheckedChange={gateState.setCourtyardInventoryEnabled}
            />

            {gateState.courtyardInventoryEnabled && access.courtyardInventoryGroups !== undefined ? (
              <div className="space-y-4 border-s-2 border-primary ps-4">
                <CourtyardWalletGateBuilder
                  groups={access.courtyardInventoryGroups}
                  loading={access.courtyardInventoryLoading}
                  quantity={gateState.courtyardInventoryDraft.minQuantity}
                  selectedGroup={resolveSelectedCourtyardGroup(gateState.courtyardInventoryDraft, access.courtyardInventoryGroups)}
                  onQuantityChange={(value) => gateState.setCourtyardInventoryDraft((draft) => ({ ...draft, minQuantity: value }))}
                  onSelectGroup={(group) => gateState.setCourtyardInventoryDraft({
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
                  })}
                />
              </div>
            ) : gateState.courtyardInventoryEnabled ? (
              <FormNote tone="warning">{copy.courtyardCatalogUnavailable}</FormNote>
            ) : null}
          </div>
        ) : null}
      </Section>

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
