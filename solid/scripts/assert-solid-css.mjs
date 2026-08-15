import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const solidRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const clientAssets = path.join(solidRoot, "dist", "client", "assets");

function cssFiles(directory) {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const entryPath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? cssFiles(entryPath)
      : entry.name.endsWith(".css") ? [entryPath] : [];
  });
}

const files = cssFiles(clientAssets);
if (files.length === 0) {
  throw new Error(`Solid CSS assertion found no emitted CSS under ${clientAssets}`);
}

const css = files.map(file => readFileSync(file, "utf8")).join("\n");
const requiredUtilities = ["bg-primary", "rounded-full", "h-11", "font-semibold"];
const missing = requiredUtilities.filter(utility => !css.includes(`.${utility}`));

if (missing.length > 0) {
  throw new Error(
    `Solid CSS assertion missing utility selectors: ${missing.join(", ")}\n` +
    `Checked: ${files.join(", ")}`,
  );
}

console.log(`Solid CSS assertion passed (${requiredUtilities.join(", ")})`);
