import os
import re

files_to_fix = [
    r"d:\Billiard_APPS\backend\src\ai\entities\upsell-prompt.entity.ts",
    r"d:\Billiard_APPS\backend\src\ai\entities\battle-plan.entity.ts",
    r"d:\Billiard_APPS\backend\src\ai\entities\battle-plan-item.entity.ts"
]

for filepath in files_to_fix:
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Replace '.js' with '' in imports
    new_content = re.sub(r"(from\s+['\"].*)\.js(['\"])", r"\1\2", content)
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(new_content)

print("FIXED IMPORTS")
