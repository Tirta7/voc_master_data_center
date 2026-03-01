import sys

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'rb') as f:
    content = f.read()

for i, b in enumerate(content):
    if b > 127:
        # Check if it's UTF-8
        try:
            char = content[i:i+3].decode('utf-8')
            # If it's something like a non-breaking space or special quote, it might be an issue
            print(f'Non-ASCII at byte {i}: {char!r}')
        except:
            print(f'Raw byte at {i}: {b}')

# Also check for zero width spaces specifically
for i, line in enumerate(content.decode('utf-8', errors='ignore').split('\n')):
    if '\u200b' in line:
        print(f'Zero-width space at line {i+1}')
    if '\u00a0' in line:
        print(f'Non-breaking space at line {i+1}')
