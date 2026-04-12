"use client";

import * as React from "react";
import { Plus, Trash } from "@phosphor-icons/react";

import { Button } from "@/components/primitives/button";
import { IconButton } from "@/components/primitives/icon-button";
import { Input } from "@/components/primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/primitives/select";
import { cn } from "@/lib/utils";

import type {
  CommunitySettingsAccessProps,
  CommunitySettingsGateRule,
  GateRuleFamily,
  GateRuleScope,
  GateRuleType,
  SupportedChainNamespace,
} from "./community-settings.types";

const activeScopes: readonly GateRuleScope[] = ["membership", "posting"] as const;
const isoCountryCodePattern = /^[A-Z]{2}$/u;

const scopeLabels: Record<GateRuleScope, { label: string; description: string }> = {
  membership: {
    label: "Membership",
    description: "Required to join the community.",
  },
  viewer: {
    label: "Viewer",
    description: "Required to view content.",
  },
  posting: {
    label: "Posting",
    description: "Required to create posts.",
  },
};

const familyLabels: Record<GateRuleFamily, string> = {
  identity_proof: "Identity proof",
  token_holding: "Token holding",
};

const identityGateTypes: GateRuleType[] = [
  "unique_human",
  "age_over_18",
  "nationality",
  "sanctions_clear",
];

const tokenGateTypes: GateRuleType[] = [
  "erc721_holding",
  "erc1155_holding",
];

const gateTypeLabels: Record<GateRuleType, string> = {
  unique_human: "Unique human",
  age_over_18: "Age 18+",
  sanctions_clear: "Sanctions clear",
  nationality: "Nationality",
  gender: "Gender",
  wallet_score: "Wallet score",
  erc721_holding: "ERC-721 NFT",
  erc1155_holding: "ERC-1155 NFT",
  erc20_balance: "ERC-20 token",
  solana_nft_holding: "Solana NFT",
};

const chainLabels: Record<SupportedChainNamespace, string> = {
  "eip155:1": "Ethereum",
  "eip155:137": "Polygon",
};

function readConfigString(config: Record<string, unknown> | null | undefined, key: string): string {
  const value = config?.[key];
  return typeof value === "string" ? value : "";
}

function readConfigStringArray(
  config: Record<string, unknown> | null | undefined,
  key: string,
): string[] {
  const value = config?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((entry): entry is string => typeof entry === "string");
}

function normalizeCountryCode(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z]/gu, "").slice(0, 2);
}

function parseCountryCodeList(value: string): string[] {
  return value
    .split(",")
    .map((entry) => normalizeCountryCode(entry))
    .filter((entry) => isoCountryCodePattern.test(entry));
}

function buildIdentityProofRequirements(gateType: GateRuleType): CommunitySettingsGateRule["proofRequirements"] {
  if (gateType === "unique_human") {
    return [
      {
        proof_type: "unique_human",
        accepted_providers: ["self", "very"],
      },
    ];
  }

  if (gateType === "age_over_18") {
    return [
      {
        proof_type: "age_over_18",
        accepted_providers: ["self"],
      },
    ];
  }

  if (gateType === "nationality") {
    return [
      {
        proof_type: "nationality",
        accepted_providers: ["self"],
      },
    ];
  }

  return null;
}

function buildIdentityGateDefaults(gateType: GateRuleType): Pick<
  CommunitySettingsGateRule,
  "gateType" | "chainNamespace" | "proofRequirements" | "gateConfig"
> {
  if (gateType === "nationality") {
    return {
      gateType,
      chainNamespace: null,
      proofRequirements: buildIdentityProofRequirements(gateType),
      gateConfig: {
        required_value: "",
      },
    };
  }

  return {
    gateType,
    chainNamespace: null,
    proofRequirements: buildIdentityProofRequirements(gateType),
    gateConfig: null,
  };
}

function familyGateTypes(family: GateRuleFamily): GateRuleType[] {
  return family === "identity_proof" ? identityGateTypes : tokenGateTypes;
}

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-4", className)}>
      <div className="space-y-1.5">
        <h3 className="text-lg font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {description ? (
          <p className="text-base leading-6 text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function TokenGateConfigFields({
  gateRule,
  readOnly,
  onConfigChange,
  onChainChange,
}: {
  gateRule: CommunitySettingsGateRule;
  readOnly?: boolean;
  onConfigChange: (key: string, value: string) => void;
  onChainChange: (chain: SupportedChainNamespace) => void;
}) {
  const config = gateRule.gateConfig ?? {};
  const isErc1155 = gateRule.gateType === "erc1155_holding";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <p className="text-base font-medium leading-tight text-muted-foreground">
            Chain
          </p>
          <Select
            disabled={readOnly}
            onValueChange={(v) => onChainChange(v as SupportedChainNamespace)}
            value={gateRule.chainNamespace ?? "eip155:1"}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(chainLabels) as SupportedChainNamespace[]).map((chain) => (
                <SelectItem key={chain} value={chain}>
                  {chainLabels[chain]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <p className="text-base font-medium leading-tight text-muted-foreground">
            Contract address
          </p>
          <Input
            disabled={readOnly}
            placeholder="0x..."
            value={typeof config.contract_address === "string" ? config.contract_address : ""}
            onChange={(e) => onConfigChange("contract_address", e.target.value)}
          />
        </div>
      </div>
      {isErc1155 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="text-base font-medium leading-tight text-muted-foreground">
              Token ID
            </p>
            <Input
              disabled={readOnly}
              placeholder="1"
              value={typeof config.token_id === "string" ? config.token_id : ""}
              onChange={(e) => onConfigChange("token_id", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-medium leading-tight text-muted-foreground">
              Min balance
            </p>
            <Input
              disabled={readOnly}
              placeholder="1"
              value={typeof config.min_balance === "string" ? config.min_balance : ""}
              onChange={(e) => onConfigChange("min_balance", e.target.value)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function NationalityGateConfigFields({
  gateRule,
  readOnly,
  onConfigReplace,
}: {
  gateRule: CommunitySettingsGateRule;
  readOnly?: boolean;
  onConfigReplace: (next: Record<string, unknown>) => void;
}) {
  const requiredValue = normalizeCountryCode(readConfigString(gateRule.gateConfig, "required_value"));
  const excludedValues = readConfigStringArray(gateRule.gateConfig, "excluded_values")
    .map((value) => normalizeCountryCode(value))
    .filter((value) => isoCountryCodePattern.test(value));
  const matchMode = excludedValues.length > 0 ? "exclude" : "require";

  return (
    <div className="grid gap-3 sm:grid-cols-[minmax(0,160px)_minmax(0,1fr)]">
      <div className="space-y-1.5">
        <p className="text-base font-medium leading-tight text-muted-foreground">
          Match
        </p>
        <Select
          disabled={readOnly}
          onValueChange={(value) =>
            onConfigReplace(
              value === "exclude"
                ? { excluded_values: excludedValues }
                : { required_value: requiredValue },
            )}
          value={matchMode}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="require">Allow only</SelectItem>
            <SelectItem value="exclude">Exclude</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-medium leading-tight text-muted-foreground">
          {matchMode === "exclude" ? "Country codes" : "Country code"}
        </p>
        <Input
          disabled={readOnly}
          maxLength={matchMode === "exclude" ? undefined : 2}
          placeholder={matchMode === "exclude" ? "US, CA" : "US"}
          value={matchMode === "exclude" ? excludedValues.join(", ") : requiredValue}
          onChange={(e) =>
            onConfigReplace(
              matchMode === "exclude"
                ? {
                    excluded_values: parseCountryCodeList(e.target.value),
                  }
                : {
                    required_value: normalizeCountryCode(e.target.value),
                  },
            )}
        />
      </div>
    </div>
  );
}

function GateRuleCard({
  errors,
  gateRule,
  readOnly,
  onDisable,
  onFamilyChange,
  onTypeChange,
  onConfigChange,
  onConfigReplace,
  onChainChange,
}: {
  errors?: string[];
  gateRule: CommunitySettingsGateRule;
  readOnly?: boolean;
  onTypeChange: (value: GateRuleType) => void;
  onFamilyChange: (value: GateRuleFamily) => void;
  onConfigChange: (key: string, value: string) => void;
  onConfigReplace: (next: Record<string, unknown>) => void;
  onChainChange: (chain: SupportedChainNamespace) => void;
  onDisable: () => void;
}) {
  const availableTypes = familyGateTypes(gateRule.gateFamily);
  const isTokenGate = gateRule.gateFamily === "token_holding";
  const isNationalityGate =
    gateRule.gateFamily === "identity_proof" && gateRule.gateType === "nationality";

  return (
    <div className="space-y-3 rounded-[var(--radius-lg)] border border-border-soft bg-muted/20 px-4 py-3">
      <div className="flex items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(familyLabels) as GateRuleFamily[]).map((family) => (
            <button
              key={family}
              type="button"
              disabled={readOnly}
              className={cn(
                "rounded-full border px-3 py-1 text-base font-medium transition-colors",
                family === gateRule.gateFamily
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border-soft bg-background text-foreground hover:bg-muted",
                readOnly && "cursor-default opacity-60",
              )}
              onClick={() => !readOnly && onFamilyChange(family)}
            >
              {familyLabels[family]}
            </button>
          ))}
        </div>
        <Select
          disabled={readOnly}
          onValueChange={(v) => onTypeChange(v as GateRuleType)}
          value={gateRule.gateType}
        >
          <SelectTrigger className="w-auto min-w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {gateTypeLabels[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!readOnly ? (
          <div className="ml-auto">
            <IconButton size="sm" variant="ghost" onClick={onDisable}>
              <Trash className="size-4" />
            </IconButton>
          </div>
        ) : null}
      </div>
      {isTokenGate ? (
        <TokenGateConfigFields
          gateRule={gateRule}
          readOnly={readOnly}
          onConfigChange={onConfigChange}
          onChainChange={onChainChange}
        />
      ) : null}
      {isNationalityGate ? (
        <NationalityGateConfigFields
          gateRule={gateRule}
          readOnly={readOnly}
          onConfigReplace={onConfigReplace}
        />
      ) : null}
      {errors && errors.length > 0 ? (
        <div className="space-y-1">
          {errors.map((error) => (
            <p key={error} className="text-base text-destructive">
              {error}
            </p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function AccessScopeGroup({
  gateRuleErrors,
  gateRules,
  onAddGate,
  onDisableGate,
  onGateFamilyChange,
  onGateTypeChange,
  onGateConfigChange,
  onGateConfigReplace,
  onGateChainChange,
  readOnly,
  scope,
  scopeInfo,
}: {
  scope: GateRuleScope;
  scopeInfo: { label: string; description: string };
  gateRules: CommunitySettingsGateRule[];
  gateRuleErrors?: Record<string, string[]>;
  readOnly?: boolean;
  onAddGate: (scope: GateRuleScope) => void;
  onGateTypeChange: (gateRuleId: string, type: GateRuleType) => void;
  onGateFamilyChange: (gateRuleId: string, family: GateRuleFamily) => void;
  onGateConfigChange: (gateRuleId: string, key: string, value: string) => void;
  onGateConfigReplace: (gateRuleId: string, next: Record<string, unknown>) => void;
  onGateChainChange: (gateRuleId: string, chain: SupportedChainNamespace) => void;
  onDisableGate: (gateRuleId: string) => void;
}) {
  return (
    <Section description={scopeInfo.description} title={scopeInfo.label}>
      {gateRules.length === 0 ? (
        <p className="text-base text-muted-foreground">
          No {scopeInfo.label.toLowerCase()} gates configured.
        </p>
      ) : (
        <div className="space-y-3">
          {gateRules.map((rule) => (
            <GateRuleCard
              errors={gateRuleErrors?.[rule.gateRuleId]}
              key={rule.gateRuleId}
              gateRule={rule}
              readOnly={readOnly}
              onDisable={() => onDisableGate(rule.gateRuleId)}
              onFamilyChange={(f) => onGateFamilyChange(rule.gateRuleId, f)}
              onTypeChange={(t) => onGateTypeChange(rule.gateRuleId, t)}
              onConfigChange={(k, v) => onGateConfigChange(rule.gateRuleId, k, v)}
              onConfigReplace={(next) => onGateConfigReplace(rule.gateRuleId, next)}
              onChainChange={(c) => onGateChainChange(rule.gateRuleId, c)}
            />
          ))}
        </div>
      )}
      {!readOnly ? (
        <Button variant="outline" size="sm" onClick={() => onAddGate(scope)}>
          <Plus className="mr-1.5 size-3.5" weight="bold" />
          Add gate
        </Button>
      ) : null}
    </Section>
  );
}

export function CommunitySettingsAccess({
  className,
  gateRuleErrors,
  gateRules,
  onGateRulesChange,
  readOnly,
}: CommunitySettingsAccessProps) {
  const activeRules = React.useMemo(
    () =>
      gateRules
        .filter((r) => r.status === "active")
        .sort((a, b) => a.position - b.position),
    [gateRules],
  );

  const rulesByScope = React.useMemo(() => {
    const groups = {} as Record<
      GateRuleScope,
      CommunitySettingsGateRule[]
    >;
    for (const scope of activeScopes) {
      groups[scope] = activeRules.filter((r) => r.scope === scope);
    }
    return groups;
  }, [activeRules]);

  const addGate = React.useCallback(
    (scope: GateRuleScope) => {
      const scopeRules = rulesByScope[scope];
      const maxPosition = scopeRules.reduce(
        (max, r) => Math.max(max, r.position),
        -1,
      );
      const newRule: CommunitySettingsGateRule = {
        gateRuleId: crypto.randomUUID(),
        scope,
        gateFamily: "identity_proof",
        status: "active",
        position: maxPosition + 1,
        ...buildIdentityGateDefaults("unique_human"),
      };
      onGateRulesChange([...gateRules, newRule]);
    },
    [gateRules, rulesByScope, onGateRulesChange],
  );

  const updateGate = React.useCallback(
    (gateRuleId: string, partial: Partial<CommunitySettingsGateRule>) => {
      onGateRulesChange(
        gateRules.map((r) =>
          r.gateRuleId === gateRuleId ? { ...r, ...partial } : r,
        ),
      );
    },
    [gateRules, onGateRulesChange],
  );

  const disableGate = React.useCallback(
    (gateRuleId: string) => {
      onGateRulesChange(
        gateRules.map((r) =>
          r.gateRuleId === gateRuleId
            ? { ...r, status: "disabled" as const }
            : r,
        ),
      );
    },
    [gateRules, onGateRulesChange],
  );

  const updateGateConfig = React.useCallback(
    (gateRuleId: string, key: string, value: string) => {
      onGateRulesChange(
        gateRules.map((r) =>
          r.gateRuleId === gateRuleId
            ? { ...r, gateConfig: { ...r.gateConfig, [key]: value } }
            : r,
        ),
      );
    },
    [gateRules, onGateRulesChange],
  );

  const replaceGateConfig = React.useCallback(
    (gateRuleId: string, next: Record<string, unknown>) => {
      onGateRulesChange(
        gateRules.map((r) =>
          r.gateRuleId === gateRuleId
            ? { ...r, gateConfig: next }
            : r,
        ),
      );
    },
    [gateRules, onGateRulesChange],
  );

  const updateGateChain = React.useCallback(
    (gateRuleId: string, chain: SupportedChainNamespace) => {
      onGateRulesChange(
        gateRules.map((r) =>
          r.gateRuleId === gateRuleId
            ? { ...r, chainNamespace: chain }
            : r,
        ),
      );
    },
    [gateRules, onGateRulesChange],
  );

  return (
    <div className={cn("space-y-8", className)}>
      {activeScopes.map((scope) => (
        <AccessScopeGroup
          gateRuleErrors={gateRuleErrors}
          gateRules={rulesByScope[scope]}
          key={scope}
          readOnly={readOnly}
          scope={scope}
          scopeInfo={scopeLabels[scope]}
          onAddGate={addGate}
          onDisableGate={disableGate}
          onGateFamilyChange={(id, family) =>
            updateGate(id, {
              gateFamily: family,
              ...(family === "token_holding"
                ? {
                    gateType: familyGateTypes(family)[0],
                    proofRequirements: null,
                    chainNamespace: "eip155:1",
                    gateConfig: {},
                  }
                : buildIdentityGateDefaults("unique_human")),
            })
          }
          onGateTypeChange={(id, type) =>
            updateGate(
              id,
              type === "unique_human"
                || type === "age_over_18"
                || type === "nationality"
                || type === "sanctions_clear"
                ? buildIdentityGateDefaults(type)
                : { gateType: type },
            )}
          onGateConfigChange={updateGateConfig}
          onGateConfigReplace={replaceGateConfig}
          onGateChainChange={updateGateChain}
        />
      ))}
    </div>
  );
}
