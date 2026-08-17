import { startSolidBoundaryHarness } from "./local-boundary-harness.mjs";

const externalBase = process.env.SOLID_BOUNDARY_BASE_URL;
const harness = externalBase ? null : await startSolidBoundaryHarness();
const base = externalBase ?? harness.baseUrl;

try {
  const response = await fetch(`${base}/`, { headers: { host: "app.example.hns" } });
  const body = await response.text();
  if (harness) {
    const unsigned = await harness.unsigned("/");
    if (unsigned.status !== 404) throw new Error(`Unsigned Worker request returned ${unsigned.status}`);
  }

  const shellMarker = 'data-layout="app-shell"';
  const fallbackText = "App shell unavailable";
  const hasShell = body.includes(shellMarker);
  const hasFallback = body.includes(fallbackText);
  if (!response.ok || !hasShell || hasFallback) {
    throw new Error([
      `SSR root assertion failed (status ${response.status})`,
      `hasShell=${hasShell}`,
      `hasFallback=${hasFallback}`,
    ].join("; "));
  }
  console.log(`Solid SSR assertion passed (status ${response.status}, signed Worker gateway, unsigned direct request denied)`);
} finally {
  await harness?.close();
}
