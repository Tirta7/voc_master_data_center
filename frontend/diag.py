import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

depth = 0
open_tags = []

for i, line in enumerate(lines):
    line_no = i + 1
    
    # Simple regex for div and form tags
    # This doesn't handle everything but should catch the main structure
    opens = re.findall(r'<div|<form', line)
    closes = re.findall(r'</div|</form', line)
    
    # Also handle self-closing divs if any (rare in JSX but possible)
    self_closes = re.findall(r'<div[^>]*/>', line)
    
    # Adjust depth
    new_depth = depth + len(opens) - len(closes) - len(self_closes)
    
    if new_depth != depth:
        # print(f'{line_no:4}: depth {depth} -> {new_depth} | {line.strip()[:50]}')
        depth = new_depth

print(f'Final depth: {depth}')

if depth != 0:
    print('Mismatch detected!')
    # Let's find where it goes wrong around the modal
    depth = 0
    for i, line in enumerate(lines):
        line_no = i + 1
        opens = re.findall(r'<div|<form', line)
        closes = re.findall(r'</div|</form', line)
        self_closes = re.findall(r'<div[^>]*/>', line)
        
        for _ in opens: open_tags.append(line_no)
        for _ in self_closes: open_tags.pop()
        for _ in closes:
            if open_tags:
                open_tags.pop()
            else:
                print(f'Error: Extra closing tag at line {line_no}')
        
        depth += len(opens) - len(closes) - len(self_closes)
        
        if line_no > 1350 and line_no < 1900:
            if 'Recipe Modal' in line or 'Category Management Modal' in line or line_no in [1361, 1362, 1404, 1834, 1835, 1897]:
                print(f'{line_no:4}: depth {depth} | {line.strip()[:60]}')

print(f'Open tags started at lines: {open_tags}')
