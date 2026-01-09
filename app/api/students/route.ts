import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name") || ""
    const hospital = searchParams.get("hospital") || ""
    const date = searchParams.get("date") || ""

    const supabase = await getSupabaseServerClient()

    // 学生データを取得
    let studentsQuery = supabase.from("students").select("*").order("id")

    if (name) {
      studentsQuery = studentsQuery.or(`name.ilike.%${name}%,kana.ilike.%${name}%`)
    }

    if (hospital) {
      studentsQuery = studentsQuery.ilike("hospital", `%${hospital}%`)
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      throw studentsError
    }

    // 各学生のスケジュールを取得
    const studentIds = students?.map((s) => s.id) || []

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] })
    }

    let schedulesQuery = supabase.from("schedules").select("*").in("student_id", studentIds).order("schedule_date")

    if (date) {
      schedulesQuery = schedulesQuery.ilike("schedule_date", `%${date}%`)
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery

    if (schedulesError) {
      throw schedulesError
    }

    // 学生データとスケジュールを結合
    const studentsWithSchedules =
      students?.map((student) => {
        const studentSchedules = schedules?.filter((s) => s.student_id === student.id) || []
        return {
          id: student.id,
          hospital: student.hospital,
          dayNight: student.day_night,
          group: student.group_name,
          studentNumber: student.student_number,
          name: student.name,
          kana: student.kana,
          gender: student.gender,
          birthDate: student.birth_date,
          age: student.age,
          schedule: studentSchedules.map((s) => ({
            date: s.schedule_date,
            symbol: s.symbol,
            description: s.description,
          })),
        }
      }) || []

    // 日付フィルタリングが指定されている場合、該当する学生のみ返す
    const filteredStudents = date ? studentsWithSchedules.filter((s) => s.schedule.length > 0) : studentsWithSchedules

    return NextResponse.json({ students: filteredStudents })
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json({ students: [] })
  }
}
