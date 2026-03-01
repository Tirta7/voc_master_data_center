import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

brace_depth = 0
paren_depth = 0
div_depth = 0
results = []

for i, line in enumerate(lines):
    line_no = i + 1
    
    # Braces
    brace_open = line.count('{')
    brace_close = line.count('}')
    
    # Parens
    paren_open = line.count('(')
    paren_close = line.count(')')
    
    # Divs (ignoring self-closing)
    div_open = len(re.findall(r'<div', line))
    div_close = len(re.findall(r'</div', line))
    self_divs = len(re.findall(r'<div[^>]*/>', line))
    div_open -= self_divs
    
    old_b = brace_depth
    old_p = paren_depth
    old_d = div_depth
    
    brace_depth += brace_open - brace_close
    paren_depth += paren_open - paren_close
    div_depth += div_open - div_close
    
    if brace_depth != old_b or paren_depth != old_p or div_depth != old_d:
        results.append(f'{line_no:4}: B={brace_depth} P={paren_depth} D={div_depth} | {line.strip()[:60]}')

with open('d:\\Billiard_APPS\\frontend\\audit_log.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
    f.write(f'\n\nFinal Balance: B={brace_depth} P={paren_depth} D={div_depth}')
