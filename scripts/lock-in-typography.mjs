import { readFileSync, writeFileSync } from "fs";
import { globSync } from "glob";

const files = globSync("src/**/*.{tsx,ts}", { absolute: true });

let changed = 0;

for (const file of files) {
  if (file.includes("node_modules")) continue;
  if (file.includes(".stories.")) continue; // skip stories for now to reduce noise
  if (file.includes("/primitives/type.")) continue;

  let content = readFileSync(file, "utf-8");
  const original = content;

  // Pattern: h1 with text-3xl -> Type h1
  content = content.replace(
    /<h1\s+className="([^"]*)text-3xl\s+font-semibold\s+tracking-tight\s+text-foreground([^"]*)"([^>]*)>(.*?)<\/h1>/gs,
    '<Type as="h1" variant="h1" className="$1$2"$3>$4</Type>'
  );

  // Pattern: h1 with text-2xl -> Type h2 (since it's often used as h1 visually but h2 size)
  // Actually let's be more specific: h1 text-2xl -> variant h2
  content = content.replace(
    /<h1\s+className="([^"]*)text-2xl\s+font-semibold\s+tracking-tight\s+text-foreground([^"]*)"([^>]*)>(.*?)<\/h1>/gs,
    '<Type as="h1" variant="h2" className="$1$2"$3>$4</Type>'
  );

  // Pattern: h2 with text-2xl -> Type h2
  content = content.replace(
    /<h2\s+className="([^"]*)text-2xl\s+font-semibold\s+tracking-tight([^"]*)"([^>]*)>(.*?)<\/h2>/gs,
    '<Type as="h2" variant="h2" className="$1$2"$3>$4</Type>'
  );

  // Pattern: h2 with text-xl font-semibold text-foreground -> Type h3
  content = content.replace(
    /<h2\s+className="([^"]*)text-xl\s+font-semibold\s+text-foreground([^"]*)"([^>]*)>(.*?)<\/h2>/gs,
    '<Type as="h2" variant="h3" className="$1$2"$3>$4</Type>'
  );

  // Pattern: h2 with text-xl font-semibold tracking-tight -> Type h3
  content = content.replace(
    /<h2\s+className="([^"]*)text-xl\s+font-semibold\s+tracking-tight([^"]*)"([^>]*)>(.*?)<\/h2>/gs,
    '<Type as="h2" variant="h3" className="$1$2"$3>$4</Type>'
  );

  // Pattern: h3 with text-lg font-semibold -> Type h4
  content = content.replace(
    /<h3\s+className="([^"]*)text-lg\s+font-semibold([^"]*)"([^>]*)>(.*?)<\/h3>/gs,
    '<Type as="h3" variant="h4" className="$1$2"$3>$4</Type>'
  );

  // Pattern: div/span with text-lg font-semibold text-foreground -> Type h4
  content = content.replace(
    /<div\s+className="([^"]*)text-lg\s+font-semibold\s+text-foreground([^"]*)"([^>]*)>(.*?)<\/div>/gs,
    '<Type as="div" variant="h4" className="$1$2"$3>$4</Type>'
  );

  // Pattern: p with text-base leading-6 text-muted-foreground -> Type caption
  content = content.replace(
    /<p\s+className="([^"]*)text-base\s+leading-6\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/p>/gs,
    '<Type as="p" variant="caption" className="$1$2"$3>$4</Type>'
  );

  // Pattern: p with text-base text-muted-foreground -> Type caption
  content = content.replace(
    /<p\s+className="([^"]*)text-base\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/p>/gs,
    '<Type as="p" variant="caption" className="$1$2"$3>$4</Type>'
  );

  // Pattern: span with text-base text-muted-foreground -> Type caption
  content = content.replace(
    /<span\s+className="([^"]*)text-base\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/span>/gs,
    '<Type as="span" variant="caption" className="$1$2"$3>$4</Type>'
  );

  // Pattern: div with text-base text-muted-foreground -> Type caption
  content = content.replace(
    /<div\s+className="([^"]*)text-base\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/div>/gs,
    '<Type as="div" variant="caption" className="$1$2"$3>$4</Type>'
  );

  // Pattern: overline div/span uppercase tracking-widest text-muted-foreground
  content = content.replace(
    /<div\s+className="([^"]*)text-base\s+font-medium\s+uppercase\s+tracking-widest\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/div>/gs,
    '<Type as="div" variant="overline" className="$1$2"$3>$4</Type>'
  );

  content = content.replace(
    /<span\s+className="([^"]*)text-base\s+font-medium\s+uppercase\s+tracking-widest\s+text-muted-foreground([^"]*)"([^>]*)>(.*?)<\/span>/gs,
    '<Type as="span" variant="overline" className="$1$2"$3>$4</Type>'
  );

  if (content !== original) {
    // Add import if missing
    if (!content.includes('from "./type"') && !content.includes('from "@/components/primitives/type"')) {
      // Determine relative path to primitives/type from this file
      const relativeDepth = file.replace(process.cwd() + "/src/", "").split("/").length - 1;
      const prefix = relativeDepth === 0 ? "./" : "../".repeat(relativeDepth);
      // Try to add import after the last import statement
      const lastImport = content.lastIndexOf("import ");
      const lastImportEnd = content.indexOf(";", lastImport) + 1;
      content = content.slice(0, lastImportEnd) + "\nimport { Type } from \"@/components/primitives/type\";" + content.slice(lastImportEnd);
    }
    writeFileSync(file, content, "utf-8");
    changed++;
    console.log("Changed:", file);
  }
}

console.log(`Modified ${changed} files.`);
