import pandas as pd

# Fix Rokok Excel
rokok_file = r"d:\Billiard_APPS\Data_Rokok_Lengkap.xlsx"
df_rokok_bahan = pd.read_excel(rokok_file, sheet_name='Bahan Baku')
df_rokok_menu = pd.read_excel(rokok_file, sheet_name='Menu Resep')

# Replace ': 1.000' with ': 1'
df_rokok_menu['Resep Baku'] = df_rokok_menu['Resep Baku'].astype(str).str.replace(': 1.000', ': 1')

with pd.ExcelWriter(rokok_file, engine='openpyxl') as writer:
    df_rokok_bahan.to_excel(writer, sheet_name='Bahan Baku', index=False)
    df_rokok_menu.to_excel(writer, sheet_name='Menu Resep', index=False)

# Fix Cafe Excel
cafe_file = r"d:\Billiard_APPS\Data_Cafe_Lengkap.xlsx"
df_cafe_bahan = pd.read_excel(cafe_file, sheet_name='Bahan Baku')
df_cafe_menu = pd.read_excel(cafe_file, sheet_name='Menu Resep')

# Replace ': 1.000' with ': 1'
df_cafe_menu['Resep Baku'] = df_cafe_menu['Resep Baku'].astype(str).str.replace(': 1.000', ': 1')

with pd.ExcelWriter(cafe_file, engine='openpyxl') as writer:
    df_cafe_bahan.to_excel(writer, sheet_name='Bahan Baku', index=False)
    df_cafe_menu.to_excel(writer, sheet_name='Menu Resep', index=False)

print("FIXED")
