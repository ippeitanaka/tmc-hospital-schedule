import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // 統計情報を取得
    const [{ count: studentCount }, { data: hospitals }, { data: dates }, { count: visitCount }] = await Promise.all([
      supabase.from("students").select("*", { count: "exact", head: true }),
      supabase.from("students").select("hospital"),
      supabase.from("schedules").select("schedule_date"),
      supabase.from("hospital_visits").select("*", { count: "exact", head: true }),
    ])

    const uniqueHospitals = new Set(hospitals?.map((h) => h.hospital) || [])
    const uniqueDates = new Set(dates?.map((d) => d.schedule_date) || [])

    const symbols = {
      学: "学校登校日",
      数: "数学セミナー",
      〇: "病院実習当日",
      半: "半日実習",
      オリ: "オリエンテーション",
    }

    return NextResponse.json({
      studentCount: studentCount || 0,
      hospitalCount: uniqueHospitals.size,
      dateCount: uniqueDates.size,
      visitCount: visitCount || 0,
      symbols,
    })
  } catch (error) {
    console.error("[v0] Error fetching stats:", error)
    return NextResponse.json({
      studentCount: 0,
      hospitalCount: 0,
      dateCount: 0,
      visitCount: 0,
      symbols: {
        学: "学校登校日",
        数: "数学セミナー",
        〇: "病院実習当日",
        半: "半日実習",
        オリ: "オリエンテーション",
      },
    })
  }
}
