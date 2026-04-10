import type { UiLocaleCode } from "@/lib/ui-locale";
import {
  GENERATED_LOCALE_CATALOGS,
  LOCALE_NAMESPACES,
  type GeneratedLocaleCatalogs,
  type LocaleNamespace,
  type RealLocaleCode,
} from "./generated";

export { LOCALE_NAMESPACES } from "./generated";
export type { LocaleNamespace, RealLocaleCode } from "./generated";

type WidenLocaleMessages<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? WidenLocaleMessages<Item>[]
    : T extends object
      ? { [Key in keyof T]: WidenLocaleMessages<T[Key]> }
      : T;

export type ShellMessages = WidenLocaleMessages<GeneratedLocaleCatalogs["en"]["shell"]>;
export type RoutesMessages = WidenLocaleMessages<GeneratedLocaleCatalogs["en"]["routes"]>;
type NamespaceMessages<N extends LocaleNamespace> = WidenLocaleMessages<GeneratedLocaleCatalogs["en"][N]>;

function pseudoExpand(input: string) {
  const expanded = input
    .replace(/a/gi, "aa")
    .replace(/e/gi, "ee")
    .replace(/i/gi, "ii")
    .replace(/o/gi, "oo")
    .replace(/u/gi, "uu");

  return `[!! ${expanded} ::: ${expanded} !!]`;
}

function pseudoizeValue<T>(value: T): T {
  if (typeof value === "string") {
    return pseudoExpand(value) as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => pseudoizeValue(item)) as T;
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, pseudoizeValue(nestedValue)]),
    ) as T;
  }

  return value;
}

export function getLocaleMessages<N extends LocaleNamespace>(
  locale: UiLocaleCode,
  namespace: N,
): NamespaceMessages<N> {
  if (locale === "pseudo") {
    return pseudoizeValue(GENERATED_LOCALE_CATALOGS.en[namespace]) as NamespaceMessages<N>;
  }

  return GENERATED_LOCALE_CATALOGS[locale as RealLocaleCode][namespace] as NamespaceMessages<N>;
}
