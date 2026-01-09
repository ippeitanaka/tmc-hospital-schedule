"""
病院実習期間日程表CSVファイルを解析し、JSONに変換するスクリプト

使用方法:
このスクリプトはv0環境内で自動実行されます
"""

import csv
import json
import re
from datetime import datetime, timedelta

def parse_csv_to_json():
    """CSVファイルを読み込み、構造化されたJSONデータに変換"""
    
    csv_file = 'user_read_only_context/text_attachments/病院実習期間日程表-M6YqZ.csv'
    
    students = []
    dates = []
    schedule_symbols = {
        '学': '学校登校日',
        '数': '数学セミナー',
        '〇': '病院実習',
        '明': '実習翌日',
        '半': '半日実習',
        'オリ': 'オリエンテーション'
    }
    
    with open(csv_file, 'r', encoding='utf-8') as f:
        reader = list(csv.reader(f))
        
        # 日付行を解析（行3、0ベースインデックスで2）
        date_row = reader[2]
        for i, cell in enumerate(date_row):
            if cell and '/' in cell:
                dates.append({
                    'index': i,
                    'date': cell.strip()
                })
        
        # 学生データを解析（行22以降）
        for row_idx in range(21, len(reader)):
            row = reader[row_idx]
            
            # 基本情報が存在するかチェック
            if len(row) < 11:
                continue
                
            # 実習先を取得（複数行にまたがる場合がある）
            hospital = row[1] if len(row) > 1 else ''
            if not hospital.strip():
                continue
            
            # 学生基本情報
            student = {
                'id': row_idx - 21,
                'hospital': hospital.strip().replace('\n', ' '),
                'dayNight': row[3] if len(row) > 3 else '',
                'group': row[4] if len(row) > 4 else '',
                'studentNumber': row[5] if len(row) > 5 else '',
                'name': row[6] if len(row) > 6 else '',
                'kana': row[7] if len(row) > 7 else '',
                'gender': row[8] if len(row) > 8 else '',
                'birthDate': row[9] if len(row) > 9 else '',
                'age': row[10] if len(row) > 10 else '',
                'schedule': []
            }
            
            # 名前が空の場合はスキップ
            if not student['name'].strip():
                continue
            
            # 各日付のスケジュールを解析
            for date_info in dates:
                idx = date_info['index']
                if idx < len(row):
                    symbol = row[idx].strip()
                    if symbol:
                        schedule_entry = {
                            'date': date_info['date'],
                            'symbol': symbol,
                            'description': schedule_symbols.get(symbol, symbol)
                        }
                        student['schedule'].append(schedule_entry)
            
            students.append(student)
    
    # JSON出力
    output_data = {
        'students': students,
        'dates': [d['date'] for d in dates],
        'symbols': schedule_symbols,
        'generatedAt': datetime.now().isoformat()
    }
    
    with open('public/schedule-data.json', 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ {len(students)}名の学生データを解析しました")
    print(f"✓ {len(dates)}日分のスケジュールを処理しました")
    print(f"✓ schedule-data.jsonに出力しました")

if __name__ == '__main__':
    parse_csv_to_json()
