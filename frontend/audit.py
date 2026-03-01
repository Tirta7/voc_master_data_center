import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def count_tags(text):
    div_open = len(re.findall(r'<div', text))
    div_close = len(re.findall(r'</div', text))
    form_open = len(re.findall(r'<form', text))
    form_close = len(re.findall(r'</form', text))
    header_open = len(re.findall(r'<header', text))
    header_close = len(re.findall(r'</header', text))
    brace_open = text.count('{')
    brace_close = text.count('}')
    paren_open = text.count('(')
    paren_close = text.count(')')
    
    # Self-closing divs are rare but let's check
    self_closing_divs = len(re.findall(r'<div[^>]*/>', text))
    
    return {
        'div': (div_open, div_close, self_closing_divs),
        'form': (form_open, form_close),
        'header': (header_open, header_close),
        'brace': (brace_open, brace_close),
        'paren': (paren_open, paren_close)
    }

counts = count_tags(content)
for key, val in counts.items():
    if key == 'div':
        print(f'{key:7}: open={val[0]}, close={val[1]}, self={val[2]} | balance={val[0] - val[1] - val[2]}')
    else:
        print(f'{key:7}: open={val[0]}, close={val[1]} | balance={val[0] - val[1]}')

# Line by line depth for divs
lines = content.split('\n')
depth = 0
for i, line in enumerate(lines):
    line_no = i + 1
    opens = len(re.findall(r'<div', line))
    closes = len(re.findall(r'</div', line))
    selfs = len(re.findall(r'<div[^>]*/>', line))
    
    diff = opens - closes - selfs
    if diff != 0:
        depth += diff
        # Only print if depth is suspicious or it's near the end
        if depth < 0 or line_no > 1850:
            print(f'Line {line_no:4}: depth={depth} | {line.strip()[:40]}')
