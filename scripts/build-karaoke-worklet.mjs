import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const entry = resolve(root, "src/components/compositions/karaoke/capture/karaoke-capture-processor.ts");
const outfile = resolve(root, "public/_lib/karaoke-capture-processor.js");

await mkdir(dirname(outfile), { recursive: true });

await build({
  bundle: true,
  entryPoints: [entry],
  format: "iife",
  legalComments: "none",
  logLevel: "info",
  outfile,
  platform: "browser",
  sourcemap: false,
  target: "es2022",
});
