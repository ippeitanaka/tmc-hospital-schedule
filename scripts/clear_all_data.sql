-- Supabaseのすべてのデータをクリアするスクリプト
-- 外部キー制約に対応するため、CASCADE オプションを使用します

-- hospital_visits テーブルのデータを削除
TRUNCATE TABLE hospital_visits CASCADE;

-- schedules テーブルのデータを削除
TRUNCATE TABLE schedules CASCADE;

-- students テーブルのデータを削除
TRUNCATE TABLE students CASCADE;

-- 削除完了メッセージ
SELECT 'すべてのデータが正常に削除されました' AS result;
