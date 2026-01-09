-- 教員用機能を追加するスクリプト

-- 出席記録テーブル
CREATE TABLE IF NOT EXISTS attendance_records (
  id BIGSERIAL PRIMARY KEY,
  student_number VARCHAR(50) NOT NULL,
  attendance_date VARCHAR(8) NOT NULL,  -- YYYYMMDD形式
  period INTEGER NOT NULL,              -- 時限
  status INTEGER NOT NULL,              -- 1=出席 2=欠席 3=遅刻 4=早退 5=公欠
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_number, attendance_date, period)
);

-- 巡回記録にコメント列を追加
ALTER TABLE hospital_visits 
ADD COLUMN IF NOT EXISTS comment TEXT DEFAULT '';

-- アプリ設定テーブル（パスワード管理など）
CREATE TABLE IF NOT EXISTS app_settings (
  key VARCHAR(50) PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- デフォルトパスワードを設定
INSERT INTO app_settings (key, value) VALUES 
  ('app_password', 'toyo25'),
  ('teacher_password', 'TOYOqq01')
ON CONFLICT (key) DO NOTHING;

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_attendance_student_number ON attendance_records(student_number);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_date_period ON attendance_records(attendance_date, period);

-- Row Level Security (RLS) を有効化
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（エラー回避）
DROP POLICY IF EXISTS "Allow public read access on attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public read access on app_settings" ON app_settings;
DROP POLICY IF EXISTS "Allow public insert on attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public update on attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public delete on attendance_records" ON attendance_records;
DROP POLICY IF EXISTS "Allow public update on app_settings" ON app_settings;

-- 全ユーザーに読み取り権限を付与
CREATE POLICY "Allow public read access on attendance_records" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "Allow public read access on app_settings" ON app_settings FOR SELECT USING (true);

-- 全ユーザーに書き込み権限を付与（開発環境用、本番では適切に制限してください）
CREATE POLICY "Allow public insert on attendance_records" ON attendance_records FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on attendance_records" ON attendance_records FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on attendance_records" ON attendance_records FOR DELETE USING (true);

CREATE POLICY "Allow public update on app_settings" ON app_settings FOR UPDATE USING (true);
