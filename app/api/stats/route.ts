import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()

    // 統計情報を取得
    const [{ count: studentCount }, { data: hospitals }, { data: schedules }, { count: visitCount }] =
      await Promise.all([
        supabase.from("students").select("*", { count: "exact", head: true }),
        supabase.from("students").select("hospital"),
        supabase.from("schedules").select("schedule_date, symbol"),
        supabase.from("hospital_visits").select("*", { count: "exact", head: true }),
      ])

    const uniqueHospitals = new Set(hospitals?.map((h) => h.hospital) || [])

    let dateRangeCount = 0
    if (schedules && schedules.length > 0) {
      const dates = schedules
        .map((s) => new Date(s.schedule_date))
        .filter((d) => !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime())

      if (dates.length > 0) {
        const firstDate = dates[0]
        const lastDate = dates[dates.length - 1]
        const diffTime = Math.abs(lastDate.getTime() - firstDate.getTime())
        dateRangeCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      }
    }

    const symbols = {
      学: "学校登校日",
      数: "数学セミナー",
      〇: "病院実習当日",
      半: "午後のみ登校",
      オリ: "オリエンテーション",
    }

    return NextResponse.json({
      studentCount: studentCount || 0,
      hospitalCount: uniqueHospitals.size,
      dateCount: dateRangeCount,
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
        半: "午後のみ登校",
        オリ: "オリエンテーション",
      },
    })
  }
}
