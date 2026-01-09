import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 巡回記録を取得
export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("hospital_visits")
      .select("hospital, visit_date, comment")
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

// 巡回記録を追加・更新
export async function POST(request: Request) {
  try {
    const { hospital, date, comment } = await request.json()

    if (!hospital || !date) {
      return NextResponse.json({ error: "Hospital and date are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // upsertで既存レコードがあれば更新
    const { data, error } = await supabase
      .from("hospital_visits")
      .upsert(
        {
          hospital,
          visit_date: date,
          comment: comment || "",
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
    return NextResponse.json({ error: "Failed to create/update visit" }, { status: 500 })
  }
}

// 巡回コメントのみを更新
export async function PUT(request: Request) {
  try {
    const { hospital, date, comment } = await request.json()

    if (!hospital || !date) {
      return NextResponse.json({ error: "Hospital and date are required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { data, error } = await supabase
      .from("hospital_visits")
      .update({ comment: comment || "" })
      .eq("hospital", hospital)
      .eq("visit_date", date)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ visit: data })
  } catch (error) {
    console.error("Error updating visit comment:", error)
    return NextResponse.json({ error: "Failed to update comment" }, { status: 500 })
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
