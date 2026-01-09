import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 設定を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")

    const supabase = await getSupabaseServerClient()

    if (key) {
      const { data, error } = await supabase.from("app_settings").select("*").eq("key", key).single()

      if (error) {
        return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
      }

      return NextResponse.json({ setting: data })
    } else {
      const { data, error } = await supabase.from("app_settings").select("*")

      if (error) {
        return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
      }

      return NextResponse.json({ settings: data })
    }
  } catch (error) {
    console.error("Error fetching settings:", error)
    return NextResponse.json({ error: "設定の取得に失敗しました" }, { status: 500 })
  }
}

// 設定を更新
export async function PUT(request: Request) {
  try {
    const { key, value } = await request.json()

    if (!key || !value) {
      return NextResponse.json({ error: "キーと値が必要です" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("app_settings")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("key", key)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 })
    }

    return NextResponse.json({ setting: data })
  } catch (error) {
    console.error("Error updating setting:", error)
    return NextResponse.json({ error: "設定の更新に失敗しました" }, { status: 500 })
  }
}
