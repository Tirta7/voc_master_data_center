import re
import csv
import io
import pandas as pd

sql_file = r"d:\Billiard_APPS\bc_ballistic_billiard_cafe_managementV6_updateV99.sql"
out_excel = r"d:\Billiard_APPS\Data_Cafe_Lengkap.xlsx"

with open(sql_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract cafe_stocks
matches = re.finditer(r"INSERT INTO `cafe_stocks`.*?VALUES\s*(.*?);", content, re.DOTALL | re.IGNORECASE)

bahan_baku_data = []
menu_resep_data = []

for match in matches:
    values_str = match.group(1)
    tuples = re.findall(r"\((.*?)\)", values_str)
    
    for t in tuples:
        reader = csv.reader(io.StringIO(t), quotechar="'", skipinitialspace=True)
        try:
            row = next(reader)
            if len(row) >= 9:
                item_name = row[1]
                current_stock = row[2]
                capital_price = row[4]
                price_per_item = row[5]
                handler = row[8].strip("'").upper()
                
                # Bahan Baku logic
                bahan_baku_data.append([
                    item_name,       # Nama Bahan
                    "",              # SKU
                    "CAFE",          # Kategori
                    "Porsi",         # Satuan (Default)
                    capital_price,   # Harga Beli
                    current_stock,   # Stok Awal
                    "10",            # Min Stok
                    handler          # Departemen
                ])
                
                # Menu Resep logic
                menu_resep_data.append([
                    item_name,       # Nama Menu
                    "",              # SKU
                    "CAFE",          # Kategori
                    price_per_item,  # Harga Jual
                    handler,         # Departemen
                    f"{item_name}: 1.000" # Resep Baku
                ])
        except Exception as e:
            pass

# Create DataFrames
df_bahan = pd.DataFrame(bahan_baku_data, columns=['Nama Bahan', 'SKU', 'Kategori', 'Satuan', 'Harga Beli', 'Stok Awal', 'Min Stok', 'Departemen'])
df_menu = pd.DataFrame(menu_resep_data, columns=['Nama Menu', 'SKU', 'Kategori', 'Harga Jual', 'Departemen', 'Resep Baku'])

# Write to Excel
with pd.ExcelWriter(out_excel, engine='openpyxl') as writer:
    df_bahan.to_excel(writer, sheet_name='Bahan Baku', index=False)
    df_menu.to_excel(writer, sheet_name='Menu Resep', index=False)

print("SUCCESS_CAFE_EXCEL")
