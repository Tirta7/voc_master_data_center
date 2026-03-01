import sys

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Using 0-indexed line numbers relative to the editor:
# Header: 1365 - 1391 (indices 1364 to 1390)
# Hint: 1393 - 1404 (indices 1392 to 1403)
# List: 1406 - 1546 (indices 1405 to 1545)
# Footer bg: 1548 - 1809 (indices 1547 to 1808)
# Actions: 1811 - 1834 (indices 1810 to 1833)

out_lines = []
out_lines.extend(lines[:1364])  # lines 1 to 1364

# Header 
for i in range(1364, 1392): # up to 1391
    line = lines[i]
    if i == 1364: # Line 1365
        line = line.replace('bg-gradient-to-br from-slate-50 to-white border-b border-slate-100', 'bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex-shrink-0 z-10')
    out_lines.append(line)

# Start scrollable wrapper
out_lines.append('                        <div className="flex-1 overflow-y-auto custom-scrollbar">\n')

# Hint
out_lines.extend(lines[1392:1405])

# List
list_lines = lines[1405:1546]
list_start = list_lines[0].replace('flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-4', 'px-8 pb-6 pt-2 space-y-4')
out_lines.append(list_start)
out_lines.extend(list_lines[1:])

# Footer (Stats + AI Calculator)
footer_lines = lines[1546:1810] # 1547 to 1810 (indices 1546 to 1809)
# wait, line 1547 is comment, 1548 is the div
footer_div = footer_lines[1].replace(' mt-auto', '') 
out_lines.append(footer_lines[0])
out_lines.append(footer_div)
out_lines.extend(footer_lines[2:])

# End scrollable wrapper
out_lines.append('                        </div>\n\n')

# Sticky Action Footer
out_lines.append('                        {/* Sticky Action Footer */}\n')
out_lines.append('                        <div className="p-4 md:p-8 bg-white border-t border-slate-100 flex-shrink-0">\n')
out_lines.extend(lines[1810:1835]) # 1811 to 1835
out_lines.append('                        </div>\n')

out_lines.extend(lines[1835:]) # 1836 to EOF

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print("Modal layout restructured successfully.")
