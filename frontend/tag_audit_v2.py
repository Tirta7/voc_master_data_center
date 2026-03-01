import sys
import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

tag_pattern = re.compile(r'</?([a-zA-Z0-9_A-Z]+)[^>]*>')
stack = []
self_closing = ['input', 'img', 'br', 'hr', 'AlertCircle', 'AlertTriangle', 'Database', 'ChevronRight', 'Plus', 'Save', 'Search', 'ChefHat', 'Package', 'Scale', 'Zap', 'ArrowUp', 'ArrowDown', 'Filter', 'MoreHorizontal', 'Trash2', 'X', 'Box', 'Info', 'Edit2', 'User', 'DollarSign', 'TrendingUp', 'ShieldOff', 'InputField', 'StatCard', 'InventoryStockView', 'RecipesView', 'CategoriesView', 'StockReportView', 'MarginGuardView']

results = []

lines = text.split('\n')
for i, line in enumerate(lines):
    line_no = i + 1
    # Strip comments that start with // or spaces
    # This is a bit rough but okay for tracing
    matches = tag_pattern.finditer(line)
    for m in matches:
        full_tag = m.group(0)
        tag_name = m.group(1)
        
        # skip typescript types like <any> or <Ingredient>
        if tag_name in ['any', 'Ingredient', 'Category', 'MenuItem']:
            continue
            
        if full_tag.endswith('/>'):
            continue
            
        if full_tag.startswith('</'):
            if stack and stack[-1][0] == tag_name:
                stack.pop()
            else:
                results.append(f"Line {line_no}: Found closing </{tag_name}> but stack top is {stack[-1] if stack else 'empty'}. Stack context: {stack[-5:]}")
                if stack and tag_name in [s[0] for s in stack]:
                    while stack and stack[-1][0] != tag_name:
                        popped = stack.pop()
                        results.append(f"  -> Popped {popped[0]} (opened at line {popped[1]}) to match {tag_name}")
                    if stack:
                        stack.pop()
        else:
            if tag_name not in self_closing:
                stack.append((tag_name, line_no))

if stack:
    results.append(f"Unclosed tags at EOF:")
    for t in stack:
        results.append(f"  {t[0]} (from line {t[1]})")

with open('d:\\Billiard_APPS\\frontend\\tag_audit.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(results))
