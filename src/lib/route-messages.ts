export function interpolateMessage(
  template: string,
  replacements: Record<string, string>,
): string {
  return template.replace(/\{(\w+)\}/gu, (_, key: string) => replacements[key] ?? `{${key}}`);
}
