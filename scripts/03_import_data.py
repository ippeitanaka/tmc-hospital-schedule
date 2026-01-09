import os
import csv
from datetime import datetime
from supabase import create_client, Client

# Supabase接続情報
url = os.environ.get("SUPABASE_URL") or os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or "https://tiqthmafycmywqbppwfg.supabase.co"
key = os.environ.get("SUPABASE_ANON_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcXRobWFmeWNteXdxYnBwd2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzM2OTYsImV4cCI6MjA4MzUwOTY5Nn0.qF-dLoAW9V8_qGnPFFD2i8Uy8NW1nBJ5OUCNBo7o76Q"

print(f"Connecting to Supabase: {url}")
supabase: Client = create_client(url, key)

# CSVファイルを読み込む
csv_file_path = "data/病院実習期間日程表.csv"
print(f"Reading CSV file: {csv_file_path}")

with open(csv_file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# 日付行を解析（3行目）
date_line = lines[2].strip().split(',')
dates = []
for i, cell in enumerate(date_line):
    if i >= 11 and cell and '/' in cell:  # 1/15から始まる
        try:
            # "1/15"形式を"2026-01-15"形式に変換
            parts = cell.split('/')
            if len(parts) == 2:
                month = int(parts[0])
                day = int(parts[1])
                # 1-3月は2026年、4月以降は2026年
                year = 2026
                date_str = f"{year}-{month:02d}-{day:02d}"
                dates.append(date_str)
        except:
            pass

print(f"Found {len(dates)} dates")

# 学生データを解析（22行目以降）
students_data = []
schedules_data = []

for line_idx in range(22, len(lines)):
    line = lines[line_idx].strip()
    if not line:
        continue
    
    cells = line.split(',')
    
    # 学生番号が空でない行のみ処理
    if len(cells) > 6 and cells[6]:  # 学籍番号がある
        student_id = cells[6]
        name = cells[7] if len(cells) > 7 else ""
        furigana = cells[8] if len(cells) > 8 else ""
        hospital = cells[3] if len(cells) > 3 else ""
        shift = cells[4] if len(cells) > 4 else ""
        group = cells[5] if len(cells) > 5 else ""
        
        # 学生データを追加
        if student_id and name:
            student = {
                "student_id": student_id,
                "name": name,
                "furigana": furigana,
                "hospital": hospital,
                "shift": shift,
                "group": group
            }
            students_data.append(student)
            print(f"Student: {name} ({hospital})")
            
            # スケジュールデータを解析
            for date_idx, date_str in enumerate(dates):
                cell_idx = 11 + date_idx  # 日付データは11列目から
                if cell_idx < len(cells):
                    symbol = cells[cell_idx].strip()
                    if symbol:  # 空でないセルのみ
                        schedule = {
                            "student_id": student_id,
                            "date": date_str,
                            "symbol": symbol,
                            "hospital": hospital
                        }
                        schedules_data.append(schedule)

print(f"\nTotal students: {len(students_data)}")
print(f"Total schedule entries: {len(schedules_data)}")

# Supabaseにデータを挿入
print("\n=== Inserting students into Supabase ===")
if students_data:
    try:
        # 既存データを削除
        supabase.table("students").delete().neq("student_id", "").execute()
        print("Cleared existing students")
        
        # 新しいデータを挿入
        result = supabase.table("students").insert(students_data).execute()
        print(f"✓ Inserted {len(students_data)} students")
    except Exception as e:
        print(f"✗ Error inserting students: {e}")

print("\n=== Inserting schedules into Supabase ===")
if schedules_data:
    try:
        # 既存データを削除
        supabase.table("schedules").delete().neq("student_id", "").execute()
        print("Cleared existing schedules")
        
        # バッチでデータを挿入（1000件ずつ）
        batch_size = 1000
        for i in range(0, len(schedules_data), batch_size):
            batch = schedules_data[i:i + batch_size]
            result = supabase.table("schedules").insert(batch).execute()
            print(f"✓ Inserted batch {i//batch_size + 1} ({len(batch)} records)")
        
        print(f"✓ Total {len(schedules_data)} schedule entries inserted")
    except Exception as e:
        print(f"✗ Error inserting schedules: {e}")

print("\n=== Import completed ===")
