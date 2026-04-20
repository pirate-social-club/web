import type {
  GateFailureDetails,
  JoinEligibility,
  MembershipGateSummary,
} from "@pirate/api-contracts";
import { getCountryDisplayName } from "@/lib/countries";

type IdentityGateAudience = "public" | "admin";
type VerificationProvider = "self" | "very";
type MissingCapability = JoinEligibility["missing_capabilities"][number];
type SupportedCopyLocale = "en" | "ar" | "zh";

const SELF_CAPABILITY_ORDER: MissingCapability[] = [
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

function getVisibleSelfCapabilities(capabilities: MissingCapability[]): MissingCapability[] {
  const ordered = SELF_CAPABILITY_ORDER.filter((capability) => capabilities.includes(capability));
  if (ordered.some((capability) => capability !== "unique_human")) {
    return ordered.filter((capability) => capability !== "unique_human");
  }
  return ordered;
}

export function formatGateRequirement(
  gate: MembershipGateSummary,
  options?: { audience?: IdentityGateAudience; locale?: string | null },
): string {
  const audience = options?.audience ?? "public";
  const locale = resolveCopyLocale(options?.locale);

  switch (gate.gate_type) {
    case "nationality": {
      if (gate.required_value) {
        const country = formatCountryName(gate.required_value, locale);
        if (locale === "ar") {
          if (audience === "admin") {
            return `يتطلب التحقق من الجنسية: ${country} (${gate.required_value})`;
          }
          return `يتطلب التحقق من الجنسية: ${country}`;
        }
        if (locale === "zh") {
          if (audience === "admin") {
            return `需要国籍验证：${country} (${gate.required_value})`;
          }
          return `需要国籍验证：${country}`;
        }
        if (audience === "admin") {
          return `Requires ${country} (${gate.required_value}) nationality`;
        }
        return `Requires ${country} nationality`;
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
    case "wallet_score":
      if (locale === "ar") return "يتطلب التحقق عبر Passport";
      if (locale === "zh") return "需要 Passport 验证";
      return "Requires passport verification";
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
): MissingCapability[] {
  const uniqueCapabilities = new Set<MissingCapability>();
  for (const capability of eligibility.missing_capabilities) {
    if (SELF_CAPABILITY_ORDER.includes(capability)) {
      uniqueCapabilities.add(capability);
    }
  }
  return SELF_CAPABILITY_ORDER.filter((capability) => uniqueCapabilities.has(capability));
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
        if (locale === "ar") {
          return {
            title: "تحقق بالهوية",
            description: "أكد أن عمرك 18+ بالهوية.",
            actionLabel: "تحقق بالهوية",
          };
        }
        if (locale === "zh") {
          return {
            title: "使用身份证件验证",
            description: "使用证件确认你已满 18 岁。",
            actionLabel: "使用身份证件验证",
          };
        }
        return {
          title: "Verify with ID",
          description: "Confirm you are 18+ with ID.",
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
        case "nationality": return "الجنسية";
        case "gender": return "علامة الجنس في وثيقة Self";
        case "unique_human": return "إثبات أنك إنسان";
      }
    }
    if (locale === "zh") {
      switch (capability) {
        case "age_over_18": return "18+ 状态";
        case "nationality": return "国籍";
        case "gender": return "Self 证件性别标记";
        case "unique_human": return "真人状态";
      }
    }
    switch (capability) {
      case "age_over_18": return "18+ status";
      case "nationality": return "nationality";
      case "gender": return "Self document marker";
      case "unique_human": return "unique human status";
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
    case "provider_not_accepted":
      if (locale === "ar") return "التحقق الحالي لا يلبّي متطلبات هذا المجتمع.";
      if (locale === "zh") return "你现有的验证方式不满足该社区要求。";
      return "Your existing verification does not satisfy this community's requirement.";
    case "unsupported":
      if (locale === "ar") return "هذا المجتمع يستخدم بوابة لا يمكن للتحقق الحالي تلبيتها هنا بعد.";
      if (locale === "zh") return "这个社区使用了你当前验证暂时无法满足的门槛。";
      return "This community uses a gate your current verification cannot satisfy here yet.";
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
