// Supabase接続設定
// 環境変数から読み込み、フォールバックとして直接設定も可能
export const SUPABASE_CONFIG = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "https://tiqthmafycmywqbppwfg.supabase.co",
  anonKey:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcXRobWFmeWNteXdxYnBwd2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzM2OTYsImV4cCI6MjA4MzUwOTY5Nn0.qF-dLoAW9V8_qGnPFFD2i8Uy8NW1nBJ5OUCNBo7o76Q",
}
