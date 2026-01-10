import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 出席記録をCSV形式でエクスポート
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") // YYYYMMDD形式
    const period = searchParams.get("period")
    const classes = searchParams.get("classes") // A,B,N形式

    const supabase = await getSupabaseServerClient()

    // クラスフィルタがある場合は、studentsテーブルと結合してフィルタリング
    let query
    if (classes) {
      const classArray = classes.split(",")
      query = supabase
        .from("attendance_records")
        .select("*, students!inner(class_type)")
        .in("students.class_type", classArray)
        .order("student_number")
    } else {
      query = supabase.from("attendance_records").select("*").order("student_number")
    }

    if (date) {
      query = query.eq("attendance_date", date)
    }

    if (period) {
      query = query.eq("period", parseInt(period))
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    // CSVヘッダー（BOM付きUTF-8）
    let csv = "\uFEFF学籍番号,日付,時限,出欠区分\n"

    // データ行を追加
    data?.forEach((record) => {
      csv += `${record.student_number},${record.attendance_date},${record.period},${record.status}\n`
    })

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="attendance_${date || "all"}_${period || "all"}.csv"`,
      },
    })
  } catch (error) {
    console.error("Error exporting attendance records:", error)
    return NextResponse.json({ error: "出席記録のエクスポートに失敗しました" }, { status: 500 })
  }
}
