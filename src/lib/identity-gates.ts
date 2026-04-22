import type {
  GateFailureDetails,
  JoinEligibility,
  MembershipGateSummary,
  RequestedVerificationCapability,
  VerificationRequirement,
} from "@pirate/api-contracts";
import { getCountryDisplayName } from "@/lib/countries";

type IdentityGateAudience = "public" | "admin";
type VerificationProvider = "self" | "very" | "passport";
type MissingCapability = JoinEligibility["missing_capabilities"][number];
type SupportedCopyLocale = "en" | "ar" | "zh";

const SELF_CAPABILITY_ORDER: RequestedVerificationCapability[] = [
  "unique_human",
  "age_over_18",
  "minimum_age",
  "nationality",
  "gender",
];
const SELF_REQUESTED_CAPABILITY_ORDER: RequestedVerificationCapability[] = [
  "unique_human",
  "age_over_18",
  "nationality",
  "gender",
];

function resolveCopyLocale(locale: string | null | undefined): SupportedCopyLocale {
  const normalized = String(locale ?? "").toLowerCase();
  if (normalized.startsWith("ar")) return "ar";
  if (normalized.startsWith("zh")) return "zh";
  return "en";
}

function joinWithAnd(values: string[], locale: SupportedCopyLocale): string {
  if (values.length <= 1) return values[0] ?? "";
  if (locale === "ar") {
    if (values.length === 2) return `${values[0]} و${values[1]}`;
    return `${values.slice(0, -1).join("، ")}، و${values[values.length - 1]}`;
  }
  if (locale === "zh") {
    if (values.length === 2) return `${values[0]}和${values[1]}`;
    return `${values.slice(0, -1).join("、")}和${values[values.length - 1]}`;
  }
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

function formatCountryName(code: string, locale: SupportedCopyLocale): string {
  return getCountryDisplayName(code, locale) ?? code;
}

function shortenAddress(address: string): string {
  if (address.length <= 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatInventoryAssetLabel(gate: MembershipGateSummary): string {
  if (gate.asset_filter_label?.trim()) {
    return gate.asset_filter_label.trim();
  }
  if (gate.asset_category === "watch") {
    return "watch";
  }
  return "card";
}

function getVisibleSelfCapabilities(capabilities: MissingCapability[]): MissingCapability[] {
  const ordered = SELF_CAPABILITY_ORDER.filter((capability) => capabilities.includes(capability));
  if (ordered.some((capability) => capability !== "unique_human")) {
    return ordered.filter((capability) => capability !== "unique_human");
  }
  return ordered;
}

function isSelfRequestedCapability(capability: MissingCapability): capability is RequestedVerificationCapability {
  return SELF_REQUESTED_CAPABILITY_ORDER.some((candidate) => candidate === capability);
}

export function formatGateRequirement(
  gate: MembershipGateSummary,
  options?: { audience?: IdentityGateAudience; locale?: string | null },
): string {
  const audience = options?.audience ?? "public";
  const locale = resolveCopyLocale(options?.locale);

  switch (gate.gate_type) {
    case "nationality": {
      const requiredValues = gate.required_values?.length ? gate.required_values : gate.required_value ? [gate.required_value] : [];
      if (requiredValues.length > 0) {
        const countries = requiredValues.map((value) => {
          const country = formatCountryName(value, locale);
          return audience === "admin" ? `${country} (${value})` : country;
        });
        const countryLabel = joinWithAnd(countries, locale);
        if (locale === "ar") {
          return `يتطلب التحقق من الجنسية: ${countryLabel}`;
        }
        if (locale === "zh") {
          return `需要国籍验证：${countryLabel}`;
        }
        return `Requires ${countryLabel} nationality`;
      }
      if (locale === "ar") return "يتطلب التحقق من الجنسية";
      if (locale === "zh") return "需要国籍验证";
      return "Requires nationality verification";
    }
    case "gender": {
      if (locale === "ar") {
        if (audience === "admin" && gate.required_value) {
          return `يتطلب علامة الجنس في وثيقة Self: ${gate.required_value}`;
        }
        return "تحقق بالهوية";
      }
      if (locale === "zh") {
        if (audience === "admin" && gate.required_value) {
          return `需要 Self 证件性别标记 ${gate.required_value}`;
        }
        return "使用身份证件验证";
      }
      if (audience === "admin" && gate.required_value) {
        return `Requires Self document marker ${gate.required_value}`;
      }
      return "Verify with ID";
    }
    case "unique_human":
      if (locale === "ar") return "يتطلب التحقق من أنك إنسان";
      if (locale === "zh") return "需要真人验证";
      return "Requires unique human verification";
    case "age_over_18":
      if (locale === "ar") return "يتطلب التحقق من أن عمرك 18+";
      if (locale === "zh") return "需要 18+ 验证";
      return "Requires 18+ verification";
    case "minimum_age": {
      const age = gate.required_minimum_age ?? 18;
      if (locale === "ar") return `يتطلب التحقق من أن عمرك ${age}+`;
      if (locale === "zh") return `需要 ${age}+ 验证`;
      return `Requires ${age}+ verification`;
    }
    case "wallet_score":
      if (typeof gate.minimum_score === "number") {
        if (locale === "ar") return `يتطلب درجة Passport ${gate.minimum_score}+`;
        if (locale === "zh") return `需要 Passport 分数 ${gate.minimum_score}+`;
        return `Requires Passport score ${gate.minimum_score}+`;
      }
      if (locale === "ar") return "يتطلب درجة Passport";
      if (locale === "zh") return "需要 Passport 分数";
      return "Requires Passport score";
    case "erc721_holding": {
      const label = gate.contract_address ? shortenAddress(gate.contract_address) : null;
      if (locale === "ar") {
        return label ? `يتطلب امتلاك NFT على إيثريوم من ${label}` : "يتطلب امتلاك NFT على إيثريوم";
      }
      if (locale === "zh") {
        return label ? `需要持有来自 ${label} 的以太坊 NFT` : "需要持有以太坊 NFT";
      }
      return label ? `Requires Ethereum NFT from ${label}` : "Requires Ethereum NFT";
    }
    case "erc721_inventory_match": {
      const quantity = gate.min_quantity ?? 1;
      const assetLabel = formatInventoryAssetLabel(gate);
      if (locale === "ar") return `يتطلب ${quantity} من مقتنيات Courtyard: ${assetLabel}`;
      if (locale === "zh") return `需要 ${quantity} 个 Courtyard 藏品：${assetLabel}`;
      return `Requires ${quantity} Courtyard ${assetLabel}`;
    }
    default:
      if (locale === "ar") return `يتطلب التحقق من ${gate.gate_type}`;
      if (locale === "zh") return `需要 ${gate.gate_type} 验证`;
      return `Requires ${gate.gate_type} verification`;
  }
}

export function getJoinCtaLabel(
  eligibility: JoinEligibility,
  options?: { locale?: string | null },
): string {
  const locale = resolveCopyLocale(options?.locale);
  switch (eligibility.status) {
    case "joinable":
      if (locale === "ar") return "انضم";
      if (locale === "zh") return "加入";
      return "Join";
    case "requestable":
      if (locale === "ar") return "اطلب الانضمام";
      if (locale === "zh") return "申请加入";
      return "Request to Join";
    case "verification_required":
      if (locale === "ar") return "تحقق للانضمام";
      if (locale === "zh") return "验证后加入";
      return "Verify to Join";
    case "already_joined":
      if (locale === "ar") return "تم الانضمام";
      if (locale === "zh") return "已加入";
      return "Joined";
    case "banned":
      if (locale === "ar") return "غير متاح";
      if (locale === "zh") return "不可用";
      return "Unavailable";
    case "gate_failed":
      if (locale === "ar") return "غير مؤهل";
      if (locale === "zh") return "不符合条件";
      return "Not eligible";
  }
}

export function isJoinCtaActionable(eligibility: JoinEligibility): boolean {
  return eligibility.status === "joinable"
    || eligibility.status === "requestable"
    || eligibility.status === "verification_required";
}

export function getSelfVerificationCapabilities(
  eligibility: Pick<JoinEligibility, "missing_capabilities">,
): RequestedVerificationCapability[] {
  const uniqueCapabilities = new Set<RequestedVerificationCapability>();
  for (const capability of eligibility.missing_capabilities) {
    if (isSelfRequestedCapability(capability)) {
      uniqueCapabilities.add(capability);
    }
  }
  return SELF_REQUESTED_CAPABILITY_ORDER.filter((capability) => uniqueCapabilities.has(capability));
}

export function getVerificationCapabilitiesForProvider(
  eligibility: Pick<JoinEligibility, "missing_capabilities">,
  provider: VerificationProvider,
): RequestedVerificationCapability[] {
  const uniqueCapabilities = new Set<RequestedVerificationCapability>();
  for (const capability of eligibility.missing_capabilities) {
    if (provider === "very") {
      if (capability === "unique_human") {
        uniqueCapabilities.add(capability);
      }
    } else if (provider === "passport") {
      continue;
    } else if (isSelfRequestedCapability(capability)) {
      uniqueCapabilities.add(capability);
    }
  }
  if (provider === "self") {
    return SELF_REQUESTED_CAPABILITY_ORDER.filter((capability) => uniqueCapabilities.has(capability));
  }
  if (provider === "passport") {
    return [];
  }
  return Array.from(uniqueCapabilities);
}

export function getVerificationRequirementsForGates(
  gates: MembershipGateSummary[] | null | undefined,
): VerificationRequirement[] {
  const minimumAges = (gates ?? [])
    .filter((gate) => gate.gate_type === "minimum_age" && Number.isInteger(gate.required_minimum_age))
    .map((gate) => gate.required_minimum_age as number);
  if (minimumAges.length === 0) {
    return [];
  }
  return [{ proof_type: "minimum_age", minimum_age: Math.max(...minimumAges) }];
}

export function resolveSuggestedVerificationProvider(
  eligibility: Pick<JoinEligibility, "suggested_verification_provider">,
): VerificationProvider {
  return eligibility.suggested_verification_provider ?? "self";
}

export function getVerificationPromptCopy(
  provider: VerificationProvider,
  capabilities: MissingCapability[],
  options?: { locale?: string | null },
): {
  title: string;
  description: string;
  actionLabel: string;
} {
  const locale = resolveCopyLocale(options?.locale);

  if (provider === "very") {
    if (locale === "ar") {
      return {
        title: "تحقق بالهوية",
        description: "أكمل فحص الهوية للمتابعة.",
        actionLabel: "تحقق بالهوية",
      };
    }
    if (locale === "zh") {
      return {
        title: "使用身份证件验证",
        description: "完成身份验证后继续。",
        actionLabel: "使用身份证件验证",
      };
    }
    return {
      title: "Verify with ID",
      description: "Complete ID check to continue.",
      actionLabel: "Verify with ID",
    };
  }

  if (provider === "passport") {
    if (locale === "ar") {
      return {
        title: "درجة Passport مطلوبة",
        description: "ارفع درجة Passport ثم عد للانضمام.",
        actionLabel: "فتح Passport",
      };
    }
    if (locale === "zh") {
      return {
        title: "需要 Passport 分数",
        description: "提高 Passport 分数后回来加入。",
        actionLabel: "打开 Passport",
      };
    }
    return {
      title: "Passport score required",
      description: "Improve your Passport score, then come back to join.",
      actionLabel: "Open Passport",
    };
  }

  const visibleCapabilities = getVisibleSelfCapabilities(capabilities);

  if (visibleCapabilities.length === 0 || visibleCapabilities[0] === "unique_human") {
    if (locale === "ar") {
      return {
        title: "تحقق بالهوية",
        description: "أكمل فحص الهوية للمتابعة.",
        actionLabel: "تحقق بالهوية",
      };
    }
    if (locale === "zh") {
      return {
        title: "使用身份证件验证",
        description: "完成身份验证后继续。",
        actionLabel: "使用身份证件验证",
      };
    }
    return {
      title: "Verify with ID",
      description: "Complete ID check to continue.",
      actionLabel: "Verify with ID",
    };
  }

  if (visibleCapabilities.length === 1) {
    switch (visibleCapabilities[0]) {
      case "age_over_18":
      case "minimum_age":
        if (locale === "ar") {
          return {
            title: "تحقق بالهوية",
            description: visibleCapabilities[0] === "minimum_age" ? "أكد العمر بالهوية." : "أكد أن عمرك 18+ بالهوية.",
            actionLabel: "تحقق بالهوية",
          };
        }
        if (locale === "zh") {
          return {
            title: "使用身份证件验证",
            description: visibleCapabilities[0] === "minimum_age" ? "使用证件确认年龄。" : "使用证件确认你已满 18 岁。",
            actionLabel: "使用身份证件验证",
          };
        }
        return {
          title: "Verify with ID",
          description: visibleCapabilities[0] === "minimum_age" ? "Confirm age with ID." : "Confirm you are 18+ with ID.",
          actionLabel: "Verify with ID",
        };
      case "nationality":
        if (locale === "ar") {
          return {
            title: "تحقق بالهوية",
            description: "أكد الجنسية بالهوية.",
            actionLabel: "تحقق بالهوية",
          };
        }
        if (locale === "zh") {
          return {
            title: "使用身份证件验证",
            description: "使用证件确认国籍。",
            actionLabel: "使用身份证件验证",
          };
        }
        return {
          title: "Verify with ID",
          description: "Confirm nationality with ID.",
          actionLabel: "Verify with ID",
        };
      case "gender":
        if (locale === "ar") {
          return {
            title: "تحقق بالهوية",
            description: "أكمل فحص الهوية للمتابعة.",
            actionLabel: "تحقق بالهوية",
          };
        }
        if (locale === "zh") {
          return {
            title: "使用身份证件验证",
            description: "完成身份验证后继续。",
            actionLabel: "使用身份证件验证",
          };
        }
        return {
          title: "Verify with ID",
          description: "Complete ID check to continue.",
          actionLabel: "Verify with ID",
        };
      default:
        break;
    }
  }

  const capabilityLabels = visibleCapabilities.map((capability) => {
    if (locale === "ar") {
      switch (capability) {
        case "age_over_18": return "حالة 18+";
        case "minimum_age": return "العمر";
        case "nationality": return "الجنسية";
        case "gender": return "علامة الجنس في وثيقة Self";
        case "unique_human": return "إثبات أنك إنسان";
        case "wallet_score": return "درجة Passport";
      }
    }
    if (locale === "zh") {
      switch (capability) {
        case "age_over_18": return "18+ 状态";
        case "minimum_age": return "年龄";
        case "nationality": return "国籍";
        case "gender": return "Self 证件性别标记";
        case "unique_human": return "真人状态";
        case "wallet_score": return "Passport 分数";
      }
    }
    switch (capability) {
      case "age_over_18": return "18+ status";
      case "minimum_age": return "age status";
      case "nationality": return "nationality";
      case "gender": return "Self document marker";
      case "unique_human": return "unique human status";
      case "wallet_score": return "Passport score";
    }
  });

  if (locale === "ar") {
    return {
      title: "تحقق بالهوية",
      description: `أكد ${joinWithAnd(capabilityLabels, locale)} بالهوية.`,
      actionLabel: "تحقق بالهوية",
    };
  }
  if (locale === "zh") {
    return {
      title: "使用身份证件验证",
      description: `使用证件确认${joinWithAnd(capabilityLabels, locale)}。`,
      actionLabel: "使用身份证件验证",
    };
  }
  return {
    title: "Verify with ID",
    description: `Confirm ${joinWithAnd(capabilityLabels, locale)} with ID.`,
    actionLabel: "Verify with ID",
  };
}

export function getGateFailureMessage(
  details: Pick<GateFailureDetails, "failure_reason">,
  options?: { locale?: string | null },
): string | null {
  const locale = resolveCopyLocale(options?.locale);
  switch (details.failure_reason) {
    case "nationality_mismatch":
      if (locale === "ar") return "لا تطابق جنسيتك الموثقة متطلبات هذا المجتمع.";
      if (locale === "zh") return "你已验证的国籍不符合该社区的要求。";
      return "Your verified nationality does not match this community's requirement.";
    case "gender_mismatch":
      if (locale === "ar") return "فحص هويتك لا يطابق قاعدة هذا المجتمع.";
      if (locale === "zh") return "你的证件验证结果不符合该社区规则。";
      return "Your ID check does not match this community's rule.";
    case "minimum_age_mismatch":
      if (locale === "ar") return "عمرك الموثق لا يطابق متطلبات هذا المجتمع.";
      if (locale === "zh") return "你已验证的年龄不符合该社区要求。";
      return "Your verified age does not match this community's requirement.";
    case "provider_not_accepted":
      if (locale === "ar") return "التحقق الحالي لا يلبّي متطلبات هذا المجتمع.";
      if (locale === "zh") return "你现有的验证方式不满足该社区要求。";
      return "Your existing verification does not satisfy this community's requirement.";
    case "unsupported":
      if (locale === "ar") return "هذا المجتمع يستخدم بوابة لا يمكن للتحقق الحالي تلبيتها هنا بعد.";
      if (locale === "zh") return "这个社区使用了你当前验证暂时无法满足的门槛。";
      return "This community uses a gate your current verification cannot satisfy here yet.";
    case "erc721_holding_required":
      if (locale === "ar") return "اربط محفظة إيثريوم تملك هذا الـ NFT للانضمام إلى هذا المجتمع.";
      if (locale === "zh") return "连接持有该 NFT 的以太坊钱包即可加入此社区。";
      return "Connect an Ethereum wallet that holds this NFT to join this community.";
    case "erc721_inventory_match_required":
      if (locale === "ar") return "اربط محفظة تملك مقتنيات Courtyard المطلوبة للانضمام.";
      if (locale === "zh") return "连接持有所需 Courtyard 藏品的钱包即可加入。";
      return "Connect a wallet that holds the required Courtyard collectibles to join.";
    case "token_inventory_unavailable":
      if (locale === "ar") return "تعذر فحص مقتنيات Courtyard الآن.";
      if (locale === "zh") return "暂时无法检查 Courtyard 藏品。";
      return "Courtyard collectible inventory could not be checked right now.";
    case "wallet_score_too_low":
      if (locale === "ar") return "درجة Passport الخاصة بك لا تلبي متطلبات هذا المجتمع.";
      if (locale === "zh") return "你的 Passport 分数不符合该社区要求。";
      return "Your Passport score does not meet this community's requirement.";
    case "banned":
      if (locale === "ar") return "أنت غير مؤهل للانضمام إلى هذا المجتمع.";
      if (locale === "zh") return "你没有资格加入这个社区。";
      return "You are not eligible to join this community.";
    default:
      return null;
  }
}

export function getGateDraftWarning(gateType: MembershipGateSummary["gate_type"]): string | null {
  if (gateType === "gender") {
    return "This gate uses the Self document marker (M/F), which reflects passport data, not self-identified gender.";
  }
  return null;
}
