import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Case 1: exactly { networkMode: 'offlineFirst', staleTime: 1000 * 60 * 5 }
    # We might just want to remove networkMode: 'offlineFirst', and staleTime: 1000 * 60 * 5
    # Let's remove networkMode: 'offlineFirst', (including optional spaces)
    new_content = re.sub(r'[\n\s]*networkMode:\s*\'offlineFirst\'\s*,?', '', content)
    # Let's remove staleTime: 1000 * 60 * 5,
    new_content = re.sub(r'[\n\s]*staleTime:\s*1000\s*\*\s*60\s*\*\s*5\s*,?', '', new_content)
    
    # After removing, we might have empty objects: `{}` or `{ , }` or `{ enabled: isS3Key, }`
    # Let's clean up `{ , }` -> `{}`
    new_content = re.sub(r'\{\s*,\s*\}', '{}', new_content)
    # Let's clean up `, }` -> ` }`
    new_content = re.sub(r',\s*\}', ' }', new_content)
    # Let's clean up `{ ,` -> `{ `
    new_content = re.sub(r'\{\s*,', '{ ', new_content)
    # Let's clean up empty option objects if they are the last argument: `,{}` -> `` (be careful with this, maybe just let prettier/eslint fix it if possible)

    if content != new_content:
        with open(filepath, 'w') as f:
            f.write(new_content)
        print(f"Updated {filepath}")

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.ts') or file.endswith('.tsx'):
            if 'query-client.ts' not in file:
                process_file(os.path.join(root, file))

