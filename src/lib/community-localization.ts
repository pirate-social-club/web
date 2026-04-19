"use client";

type CommunityLocalizedTextItem = {
  field_key: string;
  translated_value?: string | null;
  translation_state: "ready" | "pending" | "same_language" | "policy_blocked";
};

type CommunityLocalizedText = {
  resolved_locale: string;
  items: CommunityLocalizedTextItem[];
};

type LocalizableCommunityLike = {
  localized_text?: CommunityLocalizedText | null;
};

function getLocalizedItem(
  community: LocalizableCommunityLike | null | undefined,
  fieldKey: string,
): CommunityLocalizedTextItem | null {
  const items = community?.localized_text?.items;
  if (!Array.isArray(items)) {
    return null;
  }

  return items.find((item) => item.field_key === fieldKey) ?? null;
}

export function resolveCommunityLocalizedText(
  community: LocalizableCommunityLike | null | undefined,
  fieldKey: string,
  canonicalValue: string | null | undefined,
): string {
  const localizedItem = getLocalizedItem(community, fieldKey);
  if (
    localizedItem?.translation_state === "ready"
    && typeof localizedItem.translated_value === "string"
    && localizedItem.translated_value.trim()
  ) {
    return localizedItem.translated_value;
  }

  return canonicalValue ?? "";
}
