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

    // 出席記録を取得
    let query = supabase.from("attendance_records").select("*").order("student_number")

    if (date) {
      query = query.eq("attendance_date", date)
    }

    if (period) {
      query = query.eq("period", parseInt(period))
    }

    const { data: attendanceData, error: attendanceError } = await query

    if (attendanceError) {
      throw attendanceError
    }

    let filteredData = attendanceData || []

    // クラスフィルタがある場合は、学生情報を取得してフィルタリング
    if (classes && filteredData.length > 0) {
      const classArray = classes.split(",")
      
      // 学生情報を取得
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select("student_number, day_night")
        .in("day_night", classArray)

      if (studentsError) {
        throw studentsError
      }

      // クラスに該当する学生の学籍番号セットを作成
      const studentNumbers = new Set(studentsData?.map((s) => s.student_number) || [])

      // 出席記録をフィルタリング
      filteredData = filteredData.filter((record) => studentNumbers.has(record.student_number))
    }

    // CSVヘッダー（BOM付きUTF-8）
    let csv = "\uFEFF学籍番号,日付,時限,出欠区分\n"

    // データ行を追加
    filteredData.forEach((record) => {
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
