import { twMerge } from "tailwind-merge";

type ClassValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, boolean | undefined>
  | ClassValue[];

function toClassString(input: ClassValue): string {
  if (input === null || input === undefined || input === false) return "";
  if (typeof input === "string" || typeof input === "number") return String(input);
  if (typeof input === "boolean") return "";
  if (Array.isArray(input)) return input.map(toClassString).join(" ");
  return Object.entries(input)
    .filter(([, enabled]) => enabled)
    .map(([name]) => name)
    .join(" ");
}

/**
 * Classname combiner for app features: joins class fragments and resolves
 * Tailwind conflicts. Mirrors the solid-ui `cn()` implementation.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(inputs.map(toClassString).join(" "));
}
