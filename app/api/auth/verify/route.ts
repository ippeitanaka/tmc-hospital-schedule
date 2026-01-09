import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function POST(request: Request) {
  try {
    const { password, type } = await request.json()

    // typeがない場合はviewer（一般ユーザー）として扱う
    const authType = type || "app"

    if (!password) {
      return NextResponse.json({ error: "パスワードが必要です" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // パスワードを取得
    const settingKey = authType === "app" ? "app_password" : "teacher_password"
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", settingKey).single()

    if (error || !data) {
      return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
    }

    // パスワードを検証
    const isValid = password === data.value

    if (!isValid) {
      return NextResponse.json({ error: "パスワードが正しくありません" }, { status: 401 })
    }

    // 認証成功 - Cookieを設定
    const response = NextResponse.json({ valid: true })
    
    // viewer_authまたはadmin_authのCookieを設定
    const cookieName = authType === "app" ? "viewer_auth" : "admin_auth"
    response.cookies.set(cookieName, "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 30, // 30日
      path: "/",
    })

    return response
  } catch (error) {
    console.error("Error verifying password:", error)
    return NextResponse.json({ error: "認証エラー" }, { status: 500 })
  }
}
