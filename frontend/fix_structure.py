import sys
import os

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'
if not os.path.exists(path):
    print(f'File not found: {path}')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f'Original file length: {len(lines)}')

# Step 1: Remove the premature closer at 1404
# In Step 1302 view, 1404 is '                        </div>'
# It closes line 1362 structurally if 1403 closed 1394.
# But wait, I earlier said 1403 closed 1395 and 1404 closed 1394.
# If so, 1404 is correct.
# However, Wrapper 2 (1362) is still open.
# And Footer (1548) is open and closed at 1835.
# So Wrapper 2 (1362) and Backdrop (1361) are OPEN.

# Let's count explicitly.
# 1361: Backdrop (+1)
# 1362: Content (+2)
# 1404: Closes Instruction Container (0 open relative to Instruction block)
# 1406: Main Content (+3)
# 1545: Closes Main Content (+2)
# 1548: Footer (+3)
# 1609: AI Calc (+4)
# 1834: Closes AI Calc (+3)
# 1835: Closes Footer (+2)
# We need TWO more closers before showRecipeModal ends!

# Step 2: Add the missing closers before 1836 (index 1835)
# Current lines[1835] is '            )}'
# We want to insert 2 div closers before it.

lines.insert(1835, '                    </div>\n')
lines.insert(1836, '                </div>\n')

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print(f'Successfully added missing closers. New length: {len(lines)}')
