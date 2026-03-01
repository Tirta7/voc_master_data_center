import sys

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# The recipe modal wrapper starts at 1361, ends at 1836
# Let's split this into chunks based on exact lines
out_lines = []
out_lines.extend(lines[:1365])  # Up to the line before header

# Header (1365 to 1391) -> Add flex-shrink-0 z-10
for i in range(1365, 1392):
    line = lines[i]
    if i == 1365:
        line = line.replace('bg-gradient-to-br from-slate-50 to-white border-b border-slate-100"', 'bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex-shrink-0 z-10"')
    out_lines.append(line)

# Instructional Hint (1393 to 1404)
hint_lines = lines[1393:1405]

# List (1406 to 1546)
list_lines = lines[1406:1546]

# Footer (1547 to 1809)
footer_lines = lines[1547:1810]

# Actions (1811 to 1834)
action_lines = lines[1811:1835]

# Now, build the new structure:
# Scrollable wrapper start
out_lines.append('                        <div className="flex-1 overflow-y-auto custom-scrollbar">\n')

# Hint goes inside scroll wrapper, give it some bottom margin
out_lines.extend(hint_lines)

# List wrapper -> change from flex-1 overflow... to just padding
list_start_line = list_lines[0].replace('<div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">', '<div className="px-8 pb-6 pt-2 space-y-4">')
out_lines.append(list_start_line)
out_lines.extend(list_lines[1:]) # rest of the list

# Footer goes inside scroll wrapper
# change bg-slate-50 mt-auto to just bg-slate-50
footer_start_line = footer_lines[1].replace('mt-auto', '') 
out_lines.append(footer_lines[0]) # comment
out_lines.append(footer_start_line)
out_lines.extend(footer_lines[2:]) # rest of footer

# End of scrollable wrapper
out_lines.append('                        </div>\n')

# Sticky Action Footer
out_lines.append('                        <div className="p-4 md:p-8 bg-white border-t border-slate-100 flex-shrink-0">\n')
# We need to preserve the flex layout of actions
out_lines.extend(action_lines)
out_lines.append('                        </div>\n')

# Rest of the file
out_lines.extend(lines[1835:])

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(out_lines)

print("Modal refactored successfully.")
