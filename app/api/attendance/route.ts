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

    // Get all students with their schedules for the date
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*, schedules!inner(schedule_date, symbol)")
      .eq("schedules.schedule_date", date)

    if (studentsError) throw studentsError

    // Get attendance records for this date and period
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("attendance_date", date)
      .eq("period", Number.parseInt(period))

    if (attendanceError) throw attendanceError

    // Separate into school attendance and hospital internship
    const schoolStudents = students?.filter((s: any) => s.schedules[0]?.symbol === "学") || []
    const hospitalStudents = students?.filter((s: any) => s.schedules[0]?.symbol === "〇") || []

    // Map attendance records
    const attendanceMap = new Map()
    attendanceRecords?.forEach((record: any) => {
      attendanceMap.set(record.student_number, record.status)
    })

    return NextResponse.json({
      schoolStudents: schoolStudents.map((s: any) => ({
        ...s,
        attendance: attendanceMap.get(s.student_number) || null,
      })),
      hospitalStudents: hospitalStudents.map((s: any) => ({
        ...s,
        schedules: s.schedules || [],
      })),
    })
  } catch (error) {
    console.error("[v0] Attendance fetch error:", error)
    return NextResponse.json({ error: "Failed to fetch attendance" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { studentNumber, date, period, status } = body

    const supabase = getSupabaseServerClient()

    const { error } = await supabase.from("attendance").upsert(
      {
        student_number: studentNumber,
        attendance_date: date,
        period: Number.parseInt(period),
        status,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_number,attendance_date,period",
      },
    )

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Attendance save error:", error)
    return NextResponse.json({ error: "Failed to save attendance" }, { status: 500 })
  }
}
