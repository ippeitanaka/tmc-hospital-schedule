import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { password, type } = await request.json()

    if (!password || !type) {
      return NextResponse.json({ error: "パスワードとタイプが必要です" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // パスワードを取得
    const settingKey = type === "app" ? "app_password" : "teacher_password"
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", settingKey).single()

    if (error || !data) {
      return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
    }

    // パスワードを検証
    const isValid = password === data.value

    return NextResponse.json({ valid: isValid })
  } catch (error) {
    console.error("Error verifying password:", error)
    return NextResponse.json({ error: "認証エラー" }, { status: 500 })
  }
}
