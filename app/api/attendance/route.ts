import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date")
    const period = searchParams.get("period")

    console.log("[v0] Attendance API called with date:", date, "period:", period)

    if (!date || !period) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const [year, month, day] = date.split("-")
    const dbDate = `${year}/${Number.parseInt(month)}/${Number.parseInt(day)}`

    console.log("[v0] Searching for date:", dbDate)

    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("*")
      .eq("schedule_date", dbDate)

    console.log("[v0] Schedules found:", schedules?.length || 0)
    if (schedules && schedules.length > 0) {
      console.log("[v0] First schedule sample:", JSON.stringify(schedules[0]))
      console.log("[v0] Schedule keys:", Object.keys(schedules[0]))
    }

    if (schedulesError) {
      console.error("[v0] Schedules query error:", schedulesError)
      throw schedulesError
    }

    if (!schedules || schedules.length === 0) {
      console.log("[v0] No schedules found for date:", dbDate)
      return NextResponse.json({
        schoolStudents: [],
        hospitalStudents: [],
      })
    }

    const studentSymbolMap = new Map()
    schedules.forEach((schedule: any) => {
      const studentNum = schedule.student_number
      const symbol = schedule.symbol
      console.log("[v0] Processing schedule - student_number:", studentNum, "symbol:", symbol)
      if (studentNum) {
        studentSymbolMap.set(studentNum, symbol)
      }
    })

    console.log("[v0] Unique students:", studentSymbolMap.size)
    console.log("[v0] Student numbers:", Array.from(studentSymbolMap.keys()).slice(0, 5))

    const studentNumbers = Array.from(studentSymbolMap.keys())

    if (studentNumbers.length === 0) {
      console.log("[v0] No valid student numbers found")
      return NextResponse.json({
        schoolStudents: [],
        hospitalStudents: [],
      })
    }

    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .in("student_number", studentNumbers)

    if (studentsError) {
      console.error("[v0] Students query error:", studentsError)
      throw studentsError
    }

    console.log("[v0] Students data retrieved:", students?.length || 0)

    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .eq("attendance_date", date)
      .eq("period", Number.parseInt(period))

    if (attendanceError) {
      console.error("[v0] Attendance query error:", attendanceError)
    }

    const attendanceMap = new Map()
    attendanceRecords?.forEach((record: any) => {
      attendanceMap.set(record.student_number, record.status)
    })

    const schoolStudents: any[] = []
    const hospitalStudents: any[] = []

    students?.forEach((student: any) => {
      const symbol = studentSymbolMap.get(student.student_number)
      const studentWithAttendance = {
        ...student,
        symbol,
        attendance: attendanceMap.get(student.student_number) || null,
      }

      if (["学", "数", "半", "オリ"].includes(symbol)) {
        schoolStudents.push(studentWithAttendance)
      } else if (symbol === "〇") {
        hospitalStudents.push(studentWithAttendance)
      }
    })

    console.log("[v0] Final counts - School:", schoolStudents.length, "Hospital:", hospitalStudents.length)

    return NextResponse.json({
      schoolStudents,
      hospitalStudents,
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

    const supabase = await getSupabaseServerClient()

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
