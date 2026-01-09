import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const period = searchParams.get("period")

    if (!date || !period) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()

    // Get attendance records with student info
    const { data: attendanceRecords, error } = await supabase
      .from("attendance")
      .select("*, students!inner(student_number, name)")
      .eq("attendance_date", date)
      .eq("period", Number.parseInt(period))
      .order("student_number")

    if (error) throw error

    // Status code mapping (出席=1, 欠席=2, 遅刻=3, 早退=4, 公欠=5)
    const statusMap: { [key: string]: number } = {
      出席: 1,
      欠席: 2,
      遅刻: 3,
      早退: 4,
      公欠: 5,
    }

    // Convert to CSV format matching template
    const csvRows = [["学籍番号", "日付", "時限", "出欠区分"]]
    attendanceRecords?.forEach((record: any) => {
      csvRows.push([record.student_number, date.replace(/-/g, ""), period, statusMap[record.status]?.toString() || "1"])
    })

    const csv = csvRows.map((row) => row.join(",")).join("\n")
    const bom = "\uFEFF"

    return new NextResponse(bom + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="出欠記録_${date}_${period}時限.csv"`,
      },
    })
  } catch (error) {
    console.error("[v0] Attendance export error:", error)
    return NextResponse.json({ error: "Failed to export attendance" }, { status: 500 })
  }
}
