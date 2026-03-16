
import os

file_path = r'D:\Billiard_APPS\frontend\src\app\admin\settings\page.tsx'

with open(file_path, 'rb') as f:
    data = f.read()

# Remove nulls
data = data.replace(b'\x00', b' ')

# Normalize line endings: CRLF -> LF
data = data.replace(b'\r\n', b'\n')
# CR -> LF (for any orphaned CRs)
data = data.replace(b'\r', b'\n')

# Convert back to string and write as UTF-8
text = data.decode('utf-8', errors='ignore')

# One final fix: line 1580 area mangling regex
import re
text = re.sub(
    r"waStatus\?\.status === 'CONNECTED' \? 'bg-e\s+D' && \(rald-500' :merald-600' :",
    "waStatus?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : ",
    text
)

with open(file_path, 'w', encoding='utf-8', newline='\n') as f:
    f.write(text)

print("Normalization and regex fix completed.")
