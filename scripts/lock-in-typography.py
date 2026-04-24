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

patterns = [
    (r'<h1\s+className="([^"]*?)text-3xl(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</h1>', r'<Type as="h1" variant="h1" className="\1\2">\3</Type>', "h1 text-3xl"),
    (r'<h1\s+className="([^"]*?)text-2xl(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</h1>', r'<Type as="h1" variant="h2" className="\1\2">\3</Type>', "h1 text-2xl"),
    (r'<h2\s+className="([^"]*?)text-2xl(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</h2>', r'<Type as="h2" variant="h2" className="\1\2">\3</Type>', "h2 text-2xl"),
    (r'<h2\s+className="([^"]*?)text-xl(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</h2>', r'<Type as="h2" variant="h3" className="\1\2">\3</Type>', "h2 text-xl"),
    (r'<h3\s+className="([^"]*?)text-lg(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</h3>', r'<Type as="h3" variant="h4" className="\1\2">\3</Type>', "h3 text-lg"),
    (r'<div\s+className="([^"]*?)text-xl(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</div>', r'<Type as="div" variant="h3" className="\1\2">\3</Type>', "div text-xl"),
    (r'<div\s+className="([^"]*?)text-lg(?:\s+font-semibold)?(?:\s+tracking-tight)?(?:\s+text-foreground)?([^"]*?)"\s*>(.*?)</div>', r'<Type as="div" variant="h4" className="\1\2">\3</Type>', "div text-lg"),
    (r'<p\s+className="([^"]*?)text-base(?:\s+leading-[a-z]+)?(?:\s+text-muted-foreground)([^"]*?)"\s*>(.*?)</p>', r'<Type as="p" variant="caption" className="\1\2">\3</Type>', "p text-base text-muted-foreground"),
    (r'<span\s+className="([^"]*?)text-base(?:\s+text-muted-foreground)([^"]*?)"\s*>(.*?)</span>', r'<Type as="span" variant="caption" className="\1\2">\3</Type>', "span text-base text-muted-foreground"),
    (r'<div\s+className="([^"]*?)text-base(?:\s+text-muted-foreground)([^"]*?)"\s*>(.*?)</div>', r'<Type as="div" variant="caption" className="\1\2">\3</Type>', "div text-base text-muted-foreground"),
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
                content = f.read()
            original = content
            for pattern, repl, _desc in patterns:
                content = re.sub(pattern, repl, content, flags=re.DOTALL)
            if content != original:
                if "Type" not in content or 'from "@/components/primitives/type"' not in content:
                    # add import after last import statement
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
