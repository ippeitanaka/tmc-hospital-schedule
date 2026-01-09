import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 巡回記録を取得
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("hospital_visits")
      .select("hospital, visit_date")
      .order("visited_at", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ visits: data || [] })
  } catch (error) {
    console.error("[v0] Error fetching visits:", error)
    return NextResponse.json({ visits: [] })
  }
}

// 巡回記録を追加
export async function POST(request: Request) {
  try {
    const { hospital, date } = await request.json()

    if (!hospital || !date) {
      return NextResponse.json({ error: "Hospital and date are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("hospital_visits")
      .insert({
        hospital,
        visit_date: date,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ visit: data })
  } catch (error) {
    console.error("Error creating visit:", error)
    return NextResponse.json({ error: "Failed to create visit" }, { status: 500 })
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
