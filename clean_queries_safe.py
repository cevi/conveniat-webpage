import os

replacements = [
    ("{ networkMode: 'offlineFirst', staleTime: 1000 * 60 * 5 },", ""),
    ("{ networkMode: 'offlineFirst', staleTime: 1000 * 60 * 5 }", ""),
    ("networkMode: 'offlineFirst',", ""),
    ("networkMode: 'offlineFirst'", ""),
    ("{ enabled: isS3Key, networkMode: 'offlineFirst', staleTime: 1000 * 60 * 5 },", "{ enabled: isS3Key },"),
    ("{ enabled: !!entry, networkMode: 'offlineFirst', staleTime: 1000 * 60 * 5 },", "{ enabled: !!entry },"),
]

def process_file(filepath):
    with open(filepath, 'r') as f:
        lines = f.readlines()
        
    changed = False
    new_lines = []
    
    for line in lines:
        new_line = line
        for old, new in replacements:
            if old in new_line:
                new_line = new_line.replace(old, new)
                changed = True
        
        # If the line became empty except for whitespace, we might just skip it or leave it. Prettier will fix it.
        # But wait, what if it was `  { networkMode: 'offlineFirst', staleTime: ... },`? It becomes `  `. Prettier will handle empty lines.
        new_lines.append(new_line)

    if changed:
        with open(filepath, 'w') as f:
            f.writelines(new_lines)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            if 'query-client.ts' not in file:
                process_file(os.path.join(root, file))

