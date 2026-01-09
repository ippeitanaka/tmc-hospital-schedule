"""
CSVデータをSupabaseデータベースにインポートするスクリプト

使い方:
1. Supabaseのテーブルを作成（01_create_tables.sql実行後）
2. このスクリプトを実行してCSVデータをインポート

必要なパッケージ:
pip install supabase pandas
"""

import os
import csv
from supabase import create_client, Client

SUPABASE_URL = "https://tiqthmafycmywqbppwfg.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcXRobWFmeWNteXdxYnBwd2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzM2OTYsImV4cCI6MjA4MzUwOTY5Nn0.qF-dLoAW9V8_qGnPFFD2i8Uy8NW1nBJ5OUCNBo7o76Q"

print(f"Supabase URL: {SUPABASE_URL}")
print(f"Supabase Key: {'設定済み' if SUPABASE_KEY else '未設定'}")

# Supabaseクライアント初期化
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("✓ Supabaseクライアント初期化成功")
except Exception as e:
    print(f"エラー: Supabaseクライアントの初期化に失敗: {e}")
    exit(1)

def parse_csv_data():
    """CSVファイルを解析して学生データとスケジュールを抽出"""
    csv_path = "user_read_only_context/text_attachments/病院実習期間日程表-M6YqZ.csv"
    
    print(f"CSVファイルを読み込み中: {csv_path}")
    
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.reader(f)
            rows = list(reader)
        print(f"✓ CSVファイル読み込み完了: {len(rows)}行")
    except Exception as e:
        print(f"エラー: CSVファイルの読み込みに失敗: {e}")
        return [], []
    
    date_row_idx = 2  # 0-indexed で3行目
    dates = []
    
    if len(rows) > date_row_idx:
        for idx, cell in enumerate(rows[date_row_idx]):
            if idx >= 11 and cell and '/' in str(cell):  # 日付列は11列目から
                dates.append(cell.strip())
    
    print(f"✓ 日付を取得: {len(dates)}日分")
    if dates:
        print(f"  期間: {dates[0]} ~ {dates[-1]}")
    
    student_start_idx = 21  # 0-indexed で22行目
    
    students = []
    schedules = []
    
    # 学生データを解析
    print(f"\n学生データを解析中...")
    for row_idx in range(student_start_idx, len(rows)):
        row = rows[row_idx]
        if len(row) < 12:
            continue
        
        # 実習施設名は列2、昼夜は列3、班は列4、学籍番号は列5、氏名は列6、フリガナは列7
        hospital = row[2].strip() if len(row) > 2 and row[2] else ""
        day_night = row[3].strip() if len(row) > 3 and row[3] else ""
        group_name = row[4].strip() if len(row) > 4 and row[4] else ""
        student_number = row[5].strip() if len(row) > 5 and row[5] else ""
        name = row[6].strip() if len(row) > 6 and row[6] else ""
        kana = row[7].strip() if len(row) > 7 and row[7] else ""
        gender = row[8].strip() if len(row) > 8 and row[8] else ""
        birth_date = row[9].strip() if len(row) > 9 and row[9] else ""
        age_str = row[10].strip() if len(row) > 10 and row[10] else ""
        
        # 学籍番号と氏名がない場合はスキップ
        if not student_number or not name:
            continue
        
        # 年齢を整数に変換
        try:
            age = int(age_str) if age_str else 20
        except:
            age = 20
        
        student = {
            "hospital": hospital,
            "day_night": day_night,
            "group_name": group_name,
            "student_number": student_number,
            "name": name,
            "kana": kana,
            "gender": gender,
            "birth_date": birth_date if birth_date else None,
            "age": age
        }
        
        students.append(student)
        
        for date_idx, date in enumerate(dates):
            col_idx = 11 + date_idx  # 11列目から日付データ開始
            if col_idx < len(row):
                symbol = row[col_idx].strip() if row[col_idx] else ""
                if symbol and symbol != "0":  # "0"は無視
                    description = get_symbol_description(symbol)
                    schedules.append({
                        "student_number": student_number,
                        "schedule_date": date,
                        "symbol": symbol,
                        "description": description
                    })
    
    print(f"✓ 解析完了: {len(students)}名の学生, {len(schedules)}件のスケジュール")
    return students, schedules

def get_symbol_description(symbol):
    """記号の説明を取得"""
    symbol_map = {
        "学": "学校登校日",
        "数": "数学セミナー",
        "〇": "病院実習当日",
        "半": "半日実習",
        "オリ": "オリエンテーション",
        "実研": "実習研究",
        "SPI": "SPI試験",
        "ME": "ME機器講習",
        "試験": "試験",
        "文検": "文章検定"
    }
    return symbol_map.get(symbol, symbol)

def import_to_supabase():
    """CSVデータをSupabaseにインポート"""
    print("\n" + "="*60)
    print("CSVデータをSupabaseにインポート開始")
    print("="*60 + "\n")
    
    students, schedules = parse_csv_data()
    
    if not students:
        print("エラー: インポートする学生データがありません")
        return
    
    # 既存データをクリア
    print("\n既存データをクリア中...")
    try:
        supabase.table("schedules").delete().neq("id", 0).execute()
        print("  ✓ schedulesテーブルをクリア")
    except Exception as e:
        print(f"  警告: schedulesテーブルのクリア中にエラー: {e}")
    
    try:
        supabase.table("hospital_visits").delete().neq("id", 0).execute()
        print("  ✓ hospital_visitsテーブルをクリア")
    except Exception as e:
        print(f"  警告: hospital_visitsテーブルのクリア中にエラー: {e}")
    
    try:
        supabase.table("students").delete().neq("id", 0).execute()
        print("  ✓ studentsテーブルをクリア")
    except Exception as e:
        print(f"  警告: studentsテーブルのクリア中にエラー: {e}")
    
    # 学生データをインポート
    print(f"\n{len(students)}名の学生データをインポート中...")
    try:
        result = supabase.table("students").insert(students).execute()
        print(f"✓ {len(result.data)}名の学生をインポートしました")
        
        # 学生IDマップを作成
        student_id_map = {}
        for student_record in result.data:
            student_id_map[student_record["student_number"]] = student_record["id"]
        
        # サンプル表示
        if result.data:
            print(f"\nサンプル学生データ:")
            sample = result.data[0]
            print(f"  ID: {sample['id']}")
            print(f"  氏名: {sample['name']}")
            print(f"  実習施設: {sample['hospital']}")
        
    except Exception as e:
        print(f"エラー: 学生データのインポートに失敗: {e}")
        import traceback
        traceback.print_exc()
        return
    
    # スケジュールデータをインポート
    print(f"\n{len(schedules)}件のスケジュールをインポート中...")
    
    # スケジュールにstudent_idを追加
    schedule_records = []
    for schedule in schedules:
        student_number = schedule["student_number"]
        if student_number in student_id_map:
            schedule_records.append({
                "student_id": student_id_map[student_number],
                "schedule_date": schedule["schedule_date"],
                "symbol": schedule["symbol"],
                "description": schedule["description"]
            })
    
    print(f"  学生IDマッピング完了: {len(schedule_records)}件")
    
    # バッチでインポート（Supabaseの制限に対応）
    batch_size = 500
    imported_count = 0
    
    for i in range(0, len(schedule_records), batch_size):
        batch = schedule_records[i:i + batch_size]
        try:
            result = supabase.table("schedules").insert(batch).execute()
            imported_count += len(result.data)
            print(f"  ✓ {imported_count}/{len(schedule_records)} 件処理完了")
        except Exception as e:
            print(f"  エラー: スケジュールのインポートに失敗 (バッチ {i//batch_size + 1}): {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "="*60)
    print("✅ データインポートが完了しました！")
    print("="*60)
    print(f"   - 学生: {len(students)}名")
    print(f"   - スケジュール: {imported_count}件")
    print("\nアプリをリロードしてデータを確認してください。")

if __name__ == "__main__":
    import_to_supabase()
