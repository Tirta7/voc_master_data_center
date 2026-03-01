import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

div_depth = 0

print("Tracing div depth inside Recipe Modal (1360 to 1838):")

for i in range(1359, 1840):
    line = lines[i]
    line_no = i + 1
    
    div_open = len(re.findall(r'<div', line))
    div_close = len(re.findall(r'</div', line))
    self_divs = len(re.findall(r'<div[^>]*/>', line))
    div_open -= self_divs
    
    diff = div_open - div_close
    
    if diff != 0:
        div_depth += diff
        print(f'{line_no:4}: diff={diff:2} depth={div_depth:2} | {line.strip()[:60]}')
        
    if line_no == 1838:
        break

print(f"Final internal depth: {div_depth} (expected 0 if perfectly balanced inside the modal)")
