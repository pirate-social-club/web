export type FixtureDiscoveryDiagnostic = {
  detail: string;
  stage: "feed" | "hydrate" | "owner-admin" | "policy" | "search";
  target: string;
};

export function fixtureDiagnosticDetail(error: unknown): string {
  const detail = error instanceof Error ? error.message : String(error);
  return detail.replace(/\s+/gu, " ").slice(0, 500);
}

export function formatFixtureDiscoveryDiagnostics(diagnostics: FixtureDiscoveryDiagnostic[]): string {
  if (diagnostics.length === 0) return "No discovery diagnostics were recorded.";
  return diagnostics
    .map(({ detail, stage, target }) => `- ${stage} ${target}: ${detail}`)
    .join("\n");
}
