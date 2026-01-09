import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 巡回記録を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")

    const supabase = await getSupabaseServerClient()

    let query = supabase.from("hospital_visits").select("*").order("visited_at", { ascending: false })

    if (date) {
      query = query.eq("visit_date", date)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return NextResponse.json({ visits: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching visits:", error)
    return NextResponse.json({ visits: [] })
  }
}

// 巡回記録を追加・更新
export async function POST(request: Request) {
  try {
    const { hospital, date, comments, visitedBy } = await request.json()

    if (!hospital || !date) {
      return NextResponse.json({ error: "Hospital and date are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("hospital_visits")
      .upsert(
        {
          hospital,
          visit_date: date,
          comments: comments || null,
          visited_by: visitedBy || null,
          visited_at: new Date().toISOString(),
        },
        {
          onConflict: "hospital,visit_date",
        },
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ visit: data })
  } catch (error) {
    console.error("Error creating/updating visit:", error)
    return NextResponse.json({ error: "Failed to save visit" }, { status: 500 })
  }
}

// 巡回記録を削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const hospital = searchParams.get("hospital")
    const date = searchParams.get("date")

    if (!hospital || !date) {
      return NextResponse.json({ error: "Hospital and date are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { error } = await supabase.from("hospital_visits").delete().eq("hospital", hospital).eq("visit_date", date)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting visit:", error)
    return NextResponse.json({ error: "Failed to delete visit" }, { status: 500 })
  }
}
