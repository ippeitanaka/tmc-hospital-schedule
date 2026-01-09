-- 学生テーブル
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  student_number VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  kana VARCHAR(100) NOT NULL,
  gender VARCHAR(10),
  birth_date VARCHAR(20),
  age VARCHAR(10),
  hospital VARCHAR(200) NOT NULL,
  day_night VARCHAR(50),
  group_name VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- スケジュールテーブル
CREATE TABLE IF NOT EXISTS schedules (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  schedule_date VARCHAR(20) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  description VARCHAR(200),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 巡回記録テーブル
CREATE TABLE IF NOT EXISTS hospital_visits (
  id BIGSERIAL PRIMARY KEY,
  hospital VARCHAR(200) NOT NULL,
  visit_date VARCHAR(20) NOT NULL,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(hospital, visit_date)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_students_hospital ON students(hospital);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(name);
CREATE INDEX IF NOT EXISTS idx_schedules_student_id ON schedules(student_id);
CREATE INDEX IF NOT EXISTS idx_schedules_date ON schedules(schedule_date);
CREATE INDEX IF NOT EXISTS idx_hospital_visits_hospital ON hospital_visits(hospital);
CREATE INDEX IF NOT EXISTS idx_hospital_visits_date ON hospital_visits(visit_date);

-- Row Level Security (RLS) を有効化
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospital_visits ENABLE ROW LEVEL SECURITY;

-- 全ユーザーに読み取り権限を付与
CREATE POLICY "Allow public read access on students" ON students FOR SELECT USING (true);
CREATE POLICY "Allow public read access on schedules" ON schedules FOR SELECT USING (true);
CREATE POLICY "Allow public read access on hospital_visits" ON hospital_visits FOR SELECT USING (true);

-- 全ユーザーに書き込み権限を付与（開発環境用、本番では適切に制限してください）
CREATE POLICY "Allow public insert on students" ON students FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on schedules" ON schedules FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public insert on hospital_visits" ON hospital_visits FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on hospital_visits" ON hospital_visits FOR DELETE USING (true);
