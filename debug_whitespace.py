
path = r'd:\Billiard_APPS\backend\src\loyalty\loyalty.service.ts'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()
    for i in range(250, 310):
        if i < len(lines):
            line = lines[i].replace(' ', '.').replace('\t', '[T]')
            print(f"{i+1:3}: {line}", end='')
