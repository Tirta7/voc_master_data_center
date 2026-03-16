
import os

file_path = r'D:\Billiard_APPS\frontend\src\app\admin\settings\page.tsx'

with open(file_path, 'rb') as f:
    content_bytes = f.read()

# Replace null bytes with spaces
content_bytes = content_bytes.replace(b'\x00', b' ')

# Convert to string and handle lines
content = content_bytes.decode('utf-8', errors='ignore')
lines = content.splitlines(keepends=True)

# Step 1: Fix double brace at 1571 (index 1570)
# Original: {                            {activeTab === 'whatsapp' && (
if len(lines) > 1570 and "{                            {activeTab === 'whatsapp' && (" in lines[1570]:
    lines[1570] = lines[1570].replace("{                            {", "{")

# Step 2: Excise orphaned block 1942 to 2252 (indices 1941 to 2251)
# Keep lines 0 to 1941 (up to line 1941 included)
# Skip lines 1942 to 2252
# Keep lines from 2253 onwards
if len(lines) > 2253:
    new_lines = lines[:1941] + lines[2253:]
    
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    print(f"Excised lines 1942-2252. New line count: {len(new_lines)}")
else:
    print(f"Error: unexpected line count {len(lines)}")
