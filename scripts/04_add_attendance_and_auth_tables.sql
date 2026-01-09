-- 認証設定テーブル
CREATE TABLE IF NOT EXISTS auth_settings (
  id BIGSERIAL PRIMARY KEY,
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value VARCHAR(200) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 初期パスワード設定
INSERT INTO auth_settings (setting_key, setting_value) VALUES 
  ('viewer_password', 'toyo25'),
  ('admin_password', 'TOYOqq01')
ON CONFLICT (setting_key) DO NOTHING;

-- 出席管理テーブル
CREATE TABLE IF NOT EXISTS attendance (
  id BIGSERIAL PRIMARY KEY,
  student_number VARCHAR(50) NOT NULL,
  attendance_date DATE NOT NULL,
  period INTEGER NOT NULL CHECK (period >= 1 AND period <= 6),
  status VARCHAR(20) NOT NULL CHECK (status IN ('出席', '欠席', '遅刻', '早退', '公欠')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_number, attendance_date, period)
);

-- 巡回コメントテーブル（既存のhospital_visitsテーブルを拡張）
ALTER TABLE hospital_visits ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE hospital_visits ADD COLUMN IF NOT EXISTS visited_by VARCHAR(100);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_number);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_period ON attendance(period);

-- Row Level Security (RLS) を有効化
ALTER TABLE auth_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- 全ユーザーに読み取り権限を付与
CREATE POLICY "Allow public read access on auth_settings" ON auth_settings FOR SELECT USING (true);
CREATE POLICY "Allow public read access on attendance" ON attendance FOR SELECT USING (true);

-- 全ユーザーに書き込み権限を付与
CREATE POLICY "Allow public insert on auth_settings" ON auth_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on auth_settings" ON auth_settings FOR UPDATE USING (true);
CREATE POLICY "Allow public insert on attendance" ON attendance FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on attendance" ON attendance FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on attendance" ON attendance FOR DELETE USING (true);
CREATE POLICY "Allow public update on hospital_visits" ON hospital_visits FOR UPDATE USING (true);
