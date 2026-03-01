import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# Find all opening and closing tags in the recipe modal section
# We'll just parse the whole file for unbalanced tags using regex
# This is a basic HTML/JSX tag stack parser

import xml.etree.ElementTree as ET

# Instead of ET, let's just use regex and a stack
tag_pattern = re.compile(r'</?([a-zA-Z0-9_A-Z]+)[^>]*>')
stack = []
self_closing = ['input', 'img', 'br', 'hr', 'AlertCircle', 'AlertTriangle', 'Database', 'ChevronRight', 'Plus', 'Save', 'Search', 'ChefHat', 'Package', 'Scale', 'Zap', 'ArrowUp', 'ArrowDown', 'Filter', 'MoreHorizontal', 'Trash2', 'X', 'Box', 'Info', 'Edit2', 'User', 'DollarSign', 'TrendingUp', 'ShieldOff', 'InputField', 'StatCard', 'InventoryStockView', 'RecipesView', 'CategoriesView', 'StockReportView', 'MarginGuardView']

lines = text.split('\n')
for i, line in enumerate(lines):
    line_no = i + 1
    # Strip string literals and comments for simpler parsing?
    # A bit risky but let's just look at tags
    matches = tag_pattern.finditer(line)
    for m in matches:
        full_tag = m.group(0)
        tag_name = m.group(1)
        
        # skip if it's self-closing like <Icon /> or ends with />
        if full_tag.endswith('/>'):
            continue
            
        if full_tag.startswith('</'):
            if stack and stack[-1][0] == tag_name:
                stack.pop()
            else:
                # Mismatch!
                print(f"Line {line_no}: Found closing </{tag_name}> but stack top is {stack[-1] if stack else 'empty'}. Stack context: {stack[-5:]}")
                if stack and tag_name in [s[0] for s in stack]:
                    # pop until we find it
                    while stack and stack[-1][0] != tag_name:
                        popped = stack.pop()
                        print(f"  -> Popped {popped[0]} (opened at line {popped[1]}) to match {tag_name}")
                    if stack:
                        stack.pop()
        else:
            if tag_name not in self_closing:
                stack.append((tag_name, line_no))

if stack:
    print(f"Unclosed tags at EOF: {stack}")
