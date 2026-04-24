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

# Line-based patterns only! No multiline matching.
patterns = [
    # text-base font-semibold text-foreground
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-semibold\s+text-foreground([^"]*)"\s*/?>', r'<Type as="\1" variant="body-strong" className="\2\3" />'),
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-semibold\s+text-foreground([^"]*)"\s*>(.*?)</\1>', r'<Type as="\1" variant="body-strong" className="\2\3">\4</Type>'),
    # text-base font-medium text-foreground
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-medium\s+text-foreground([^"]*)"\s*/?>', r'<Type as="\1" variant="label" className="\2\3" />'),
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-medium\s+text-foreground([^"]*)"\s*>(.*?)</\1>', r'<Type as="\1" variant="label" className="\2\3">\4</Type>'),
    # text-base font-semibold text-muted-foreground
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-semibold\s+text-muted-foreground([^"]*)"\s*/?>', r'<Type as="\1" variant="caption" className="\2\3 font-semibold" />'),
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-semibold\s+text-muted-foreground([^"]*)"\s*>(.*?)</\1>', r'<Type as="\1" variant="caption" className="\2\3 font-semibold">\4</Type>'),
    # text-base font-medium text-muted-foreground
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-medium\s+text-muted-foreground([^"]*)"\s*/?>', r'<Type as="\1" variant="caption" className="\2\3" />'),
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-medium\s+text-muted-foreground([^"]*)"\s*>(.*?)</\1>', r'<Type as="\1" variant="caption" className="\2\3">\4</Type>'),
    # text-base font-normal text-muted-foreground
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-normal\s+text-muted-foreground([^"]*)"\s*/?>', r'<Type as="\1" variant="caption" className="\2\3" />'),
    (r'<(p|div|span|h3|label|dd|dt|a|summary|li)\s+className="([^"]*?)text-base\s+font-normal\s+text-muted-foreground([^"]*)"\s*>(.*?)</\1>', r'<Type as="\1" variant="caption" className="\2\3">\4</Type>'),
    # h3 text-base font-semibold text-foreground
    (r'<h3\s+className="([^"]*?)text-base\s+font-semibold\s+text-foreground([^"]*)"\s*>(.*?)</h3>', r'<Type as="h3" variant="body-strong" className="\1\2">\3</Type>'),
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
                original_line = line
                for pattern, repl in patterns:
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
