import pandas as pd

csv1 = r"d:\Billiard_APPS\Data_Store_Stocks_Rokok.csv"
csv2 = r"d:\Billiard_APPS\Data_Menu_Resep_Rokok.csv"
out_excel = r"d:\Billiard_APPS\Data_Rokok_Lengkap.xlsx"

# Read CSVs
df1 = pd.read_csv(csv1, sep=';', encoding='utf-8-sig')
df2 = pd.read_csv(csv2, sep=';', encoding='utf-8-sig')

# Write to Excel
with pd.ExcelWriter(out_excel, engine='openpyxl') as writer:
    df1.to_excel(writer, sheet_name='Bahan Baku', index=False)
    df2.to_excel(writer, sheet_name='Menu Resep', index=False)

print("SUCCESS_EXCEL")
