
import os

file_path = r'D:\Billiard_APPS\frontend\src\app\admin\settings\page.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 1579 is index 1578
# I'll replace the block from 1579 to 1588 (indices 1578 to 1587)
replacement = [
    "                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${\n",
    "                                                waStatus?.status === 'CONNECTED' ? 'bg-emerald-100 text-emerald-600' : \n",
    "                                                waStatus?.status === 'CONNECTING' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'\n",
    "                                            }`}>\n",
    "                                                <div className={`w-2 h-2 rounded-full ${\n",
    "                                                    waStatus?.status === 'CONNECTED' ? 'bg-emerald-500' : \n",
    "                                                    waStatus?.status === 'CONNECTING' ? 'bg-amber-500 animate-pulse' : 'bg-rose-500'\n",
    "                                                }`}></div>\n",
    "                                                {waStatus?.status || 'UNKNOWN'}\n",
    "                                            </div>\n"
]

# Ensure we don't exceed list bounds
if len(lines) >= 1588:
    lines[1578:1588] = replacement
    with open(file_path, 'w', encoding='utf-8') as f:
        f.writelines(lines)
    print("Repair 1579-1588 completed.")
else:
    print(f"Error: lines count {len(lines)} is less than 1588")
