import os
import re

target_dirs = [
    "src/app",
    "src/components/compositions",
    "src/components/states",
    "src/components/legal",
]

exclude_files = {
    "type.tsx",
    "type.stories.tsx",
}

# Line-based replacements. Only touch simple string classNames on a single line.
replacements = [
    # h2 text-xl
    (r'<h2\s+className="text-xl\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</h2>', r'<Type as="h2" variant="h3">\1</Type>'),
    (r'<h2\s+className="text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</h2>', r'<Type as="h2" variant="h4">\1</Type>'),
    (r'<h2\s+className="text-start\s+text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</h2>', r'<Type as="h2" variant="h4" className="text-start">\1</Type>'),
    (r'<h3\s+className="text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</h3>', r'<Type as="h3" variant="h4">\1</Type>'),
    # div headings
    (r'<div\s+className="text-xl\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</div>', r'<Type as="div" variant="h3">\1</Type>'),
    (r'<div\s+className="text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</div>', r'<Type as="div" variant="h4">\1</Type>'),
    (r'<div\s+className="truncate\s+text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</div>', r'<Type as="div" variant="h4" className="truncate">\1</Type>'),
    # span headings
    (r'<span\s+className="truncate\s+text-lg\s+font-semibold(?:\s+leading-none)?(?:\s+tracking-widest)?(?:\s+text-foreground)?"\s*>(.*?)</span>', r'<Type as="span" variant="h4" className="truncate">\1</Type>'),
    # dd/dt descriptions
    (r'<dd\s+className="truncate\s+text-lg\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</dd>', r'<Type as="dd" variant="h4" className="truncate">\1</Type>'),
    (r'<dd\s+className="text-xl\s+font-semibold(?:\s+tracking-tight)?(?:\s+text-foreground)?"\s*>(.*?)</dd>', r'<Type as="dd" variant="h3">\1</Type>'),
    # p text-lg
    (r'<p\s+className="mt-2\s+text-lg\s+text-muted-foreground"\s*>(.*?)</p>', r'<Type as="p" variant="caption" className="mt-2">\1</Type>'),
    (r'<p\s+className="mt-1\s+text-lg\s+font-semibold\s+text-foreground"\s*>(.*?)</p>', r'<Type as="p" variant="body-strong" className="mt-1">\1</Type>'),
]

changed_files = []

for target_dir in target_dirs:
    for root, _, files in os.walk(target_dir):
        for name in files:
            if not name.endswith((".tsx", ".ts")):
                continue
            if name in exclude_files:
                continue
            path = os.path.join(root, name)
            with open(path, "r", encoding="utf-8") as f:
                lines = f.readlines()
            new_lines = []
            modified = False
            for line in lines:
                if "cn(" in line or "?" in line or "{" in line.replace("{", ""): # crude skip for complex lines
                    # Actually we want to allow simple lines that happen to have {} for JSX children
                    pass
                original_line = line
                for pattern, repl in replacements:
                    line = re.sub(pattern, repl, line)
                if line != original_line:
                    modified = True
                new_lines.append(line)
            if modified:
                content = "".join(new_lines)
                if 'from "@/components/primitives/type"' not in content and 'from "./type"' not in content:
                    last_import = content.rfind("import ")
                    if last_import != -1:
                        end = content.find(";", last_import) + 1
                        content = content[:end] + '\nimport { Type } from "@/components/primitives/type";' + content[end:]
                with open(path, "w", encoding="utf-8") as f:
                    f.write(content)
                changed_files.append(path)

print(f"Modified {len(changed_files)} files")
for p in changed_files:
    print("  ", p)
