import openpyxl

wb = openpyxl.load_workbook('public/- Esfihas.xlsx', data_only=True)

print('='*80)
print('=== ANALISE DETALHADA DAS PLANILHAS ===')
print('='*80)

for sheet_name in wb.sheetnames:
    print(f'\n{"="*80}')
    print(f'ABA: {sheet_name}')
    print(f'{"="*80}')
    
    sheet = wb[sheet_name]
    rows = list(sheet.rows)
    
    if len(rows) < 2:
        print('(Aba vazia)')
        continue
    
    # Headers
    headers = [cell.value for cell in rows[0] if cell.value]
    
    print(f'\nESTRUTURA:')
    print(f'Colunas: {headers}')
    
    # Mostrar dados
    print(f'\nDADOS (amostra):')
    
    if sheet_name == 'Pedidos':
        for i, row in enumerate(rows[1:10], 1):
            data = [cell.value for cell in row if cell.value]
            print(f'  {i}. {data}')
    
    elif sheet_name == 'Faturamento':
        for i, row in enumerate(rows[1:15], 1):
            data = [cell.value for cell in row if cell.value]
            if data:
                print(f'  {i}. {data}')
    
    elif sheet_name == 'Custo Esfiha Carne':
        for i, row in enumerate(rows[1:20], 1):
            data = [cell.value for cell in row if cell.value]
            if data:
                print(f'  {i}. {data[:8]}')
    
    elif sheet_name == 'LISTA DE COMPRAS':
        for i, row in enumerate(rows[1:25], 1):
            data = [cell.value for cell in row if cell.value]
            if data and len(data) >= 3:
                print(f'  {i}. QTD: {data[0]} {data[1]} - {data[2]}')
    
    elif sheet_name == 'ENTREGA':
        for i, row in enumerate(rows[1:12], 1):
            data = [cell.value for cell in row if cell.value]
            if data:
                print(f'  {i}. {data}')
    
    elif sheet_name == 'Planilha1':
        for i, row in enumerate(rows[1:15], 1):
            data = [cell.value for cell in row if cell.value]
            if data:
                print(f'  {i}. Cliente: {data[0]}, Origem: {data[1] if len(data) > 1 else "N/A"}')
    
    elif sheet_name == 'Planilha2':
        for i, row in enumerate(rows[1:12], 1):
            data = [cell.value for cell in row if cell.value]
            if data:
                print(f'  {i}. {data}')

print(f'\n{"="*80}')
print('ANALISE COMPLETA')
print('='*80)
