import { readFile } from "node:fs/promises";

// These are intentional debt ceilings, not general style limits. Reducing a
// file is always allowed; increasing one requires extracting at least as much
// responsibility as the feature adds.
const limits = new Map([
  ["src/app/authenticated-state/create-post-state.tsx", 1307],
  ["src/app/authenticated-routes/post-route.tsx", 1277],
  ["src/app/authenticated-routes/moderation-route.tsx", 1259],
  ["src/app/authenticated-state/post-state.tsx", 1063],
]);

function countLines(source) {
  return source.length === 0 ? 0 : source.split(/\r?\n/u).length - (source.endsWith("\n") ? 1 : 0);
}

let failed = false;

for (const [file, limit] of limits) {
  let source;
  try {
    source = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") {
      console.log(`${file}: removed (ratchet satisfied)`);
      continue;
    }
    throw error;
  }

  const lines = countLines(source);
  if (lines > limit) {
    failed = true;
    console.error(
      `::error file=${file}::Oversized-file ratchet exceeded: ${lines} lines (limit ${limit}, +${lines - limit}). Extract responsibility or reduce another part of this file.`,
    );
  } else {
    console.log(`${file}: ${lines}/${limit} lines`);
  }
}

if (failed) {
  process.exitCode = 1;
}
