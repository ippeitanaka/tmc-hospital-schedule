import os
import csv
from datetime import datetime
from supabase import create_client, Client

# Supabase接続情報（直接設定）
SUPABASE_URL = "https://tiqthmafycmywqbppwfg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcXRobWFmeWNteXdxYnBwd2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzM2OTYsImV4cCI6MjA4MzUwOTY5Nn0.qF-dLoAW9V8_qGnPFFD2i8Uy8NW1nBJ5OUCNBo7o76Q"

print(f"[v0] Connecting to Supabase: {SUPABASE_URL}")

# Supabaseクライアント作成
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("[v0] Supabase client created successfully")

# CSVファイルパス
csv_path = "data/病院実習期間日程表.csv"

print(f"[v0] Reading CSV file: {csv_path}")

# CSVファイルを読み込み
with open(csv_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"[v0] Total lines in CSV: {len(lines)}")

# スケジュールデータ（上部）と学生データ（下部）を分離
schedule_lines = []
student_lines = []

# 空行で分離
in_schedule = True
for line in lines:
    if line.strip() == '':
        in_schedule = False
        continue
    if in_schedule:
        schedule_lines.append(line)
    else:
        student_lines.append(line)

print(f"[v0] Schedule lines: {len(schedule_lines)}")
print(f"[v0] Student lines: {len(student_lines)}")

# スケジュール解析
schedule_reader = csv.reader(schedule_lines)
schedule_rows = list(schedule_reader)

# 日付行を取得（1行目）
date_row = schedule_rows[0]
dates = []
for i, cell in enumerate(date_row):
    if i > 0 and cell.strip():  # 最初の列はラベル
        try:
            # 日付をパース（例: "12/9"）
            date_str = cell.strip()
            if '/' in date_str:
                month, day = date_str.split('/')
                year = 2024  # 年度を仮定
                dates.append({
                    'index': i,
                    'date': f"{year}-{int(month):02d}-{int(day):02d}"
                })
        except:
            pass

print(f"[v0] Parsed {len(dates)} dates")

# スケジュールデータを取得（2-7行目: 1-6時限）
schedule_data = {}
for row_idx in range(1, min(7, len(schedule_rows))):
    period = row_idx  # 時限
    row = schedule_rows[row_idx]
    
    for date_info in dates:
        col_idx = date_info['index']
        if col_idx < len(row):
            symbol = row[col_idx].strip()
            if symbol:
                key = f"{date_info['date']}_{period}"
                schedule_data[key] = symbol

print(f"[v0] Parsed {len(schedule_data)} schedule entries")

# 学生データ解析
student_reader = csv.reader(student_lines)
student_rows = list(student_reader)

# ヘッダー行をスキップ（最初の行）
students = []
for row in student_rows[1:]:
    if len(row) >= 4:  # 最小限の列数チェック
        hospital = row[0].strip() if row[0] else ""
        group = row[1].strip() if row[1] else ""
        student_id = row[2].strip() if row[2] else ""
        name = row[3].strip() if row[3] else ""
        furigana = row[4].strip() if len(row) > 4 and row[4] else ""
        
        if student_id and name:  # 学籍番号と名前がある場合のみ
            students.append({
                'hospital_name': hospital,
                'group_name': group,
                'student_id': student_id,
                'name': name,
                'furigana': furigana
            })

print(f"[v0] Parsed {len(students)} students")

# データベースに学生データを挿入
print("[v0] Inserting students into database...")
try:
    # 既存データを削除
    supabase.table('students').delete().neq('id', 0).execute()
    print("[v0] Cleared existing students")
    
    # 学生データを挿入
    if students:
        result = supabase.table('students').insert(students).execute()
        print(f"[v0] Inserted {len(students)} students successfully")
except Exception as e:
    print(f"[v0] Error inserting students: {str(e)}")

# データベースにスケジュールデータを挿入
print("[v0] Inserting schedules into database...")
try:
    # 既存データを削除
    supabase.table('schedules').delete().neq('id', 0).execute()
    print("[v0] Cleared existing schedules")
    
    # スケジュールデータを挿入
    schedule_records = []
    for key, symbol in schedule_data.items():
        date_str, period_str = key.split('_')
        schedule_records.append({
            'date': date_str,
            'period': int(period_str),
            'symbol': symbol
        })
    
    if schedule_records:
        # バッチサイズで分割して挿入
        batch_size = 100
        for i in range(0, len(schedule_records), batch_size):
            batch = schedule_records[i:i+batch_size]
            result = supabase.table('schedules').insert(batch).execute()
            print(f"[v0] Inserted batch {i//batch_size + 1}: {len(batch)} records")
        
        print(f"[v0] Inserted {len(schedule_records)} schedule entries successfully")
except Exception as e:
    print(f"[v0] Error inserting schedules: {str(e)}")

print("[v0] Data import completed!")
print(f"[v0] Summary: {len(students)} students, {len(schedule_records)} schedule entries")
