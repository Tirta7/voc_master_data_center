import re

path = r'd:\Billiard_APPS\frontend\src\app\admin\inventory\page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Modify Header
# Find: <div className="relative px-5 md:px-8 pt-6 md:pt-10 pb-5 md:pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">
# Replace with: <div className="relative px-5 md:px-8 pt-6 md:pt-10 pb-5 md:pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex-shrink-0 z-10">
text = text.replace(
    '<div className="relative px-5 md:px-8 pt-6 md:pt-10 pb-5 md:pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100">',
    '<div className="relative px-5 md:px-8 pt-6 md:pt-10 pb-5 md:pb-8 bg-gradient-to-br from-slate-50 to-white border-b border-slate-100 flex-shrink-0 z-10">'
)

# 2. Modify Scroll wrapper
# Around line 1406 we have:
# <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">
# We want to change the flow. Let's find exactly the Instructional Hint:
# {/* Instructional Hint */}
# <div className="px-8 mt-6"> ... </div>

hint_pattern = r'({/\* Instructional Hint \*/}.*?</div>\s*</div>)'
hint_match = re.search(hint_pattern, text, re.DOTALL)
if hint_match:
    hint_block = hint_match.group(1)
    
    # Let's replace the flex-1 overflow... in the List
    # We will wrap the hint, the list, and the summary in a new <div className="flex-1 overflow-y-auto custom-scrollbar">
    
    text = text.replace(
        '<div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar space-y-4">',
        '''<div className="flex-1 overflow-y-auto custom-scrollbar">
                            ''' + hint_block + '''
                            
                            <div className="px-8 pb-6 space-y-4">'''
    )
    
    # We also need to remove the original hint from its old place (before the overflow-y-auto)
    # Since we injected it after the new scroll wrapper, we must erase the old one.
    # Wait, the old one was BEFORE the overflow-y-auto. 
    # Let's do this more cleanly.

text = f.read() # reload to undo that messy string rep
