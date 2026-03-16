
import os

file_path = r'D:\Billiard_APPS\frontend\src\app\admin\settings\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "CO" in line and "ED" in line and len(line) > 200:
        print(f"Found mangled line at index {i} (line {i+1}): {repr(line[:100])}...")
    elif "ONNECTED" in line:
        print(f"Found ONNECTED at index {i} (line {i+1}): {repr(line[:100])}...")
