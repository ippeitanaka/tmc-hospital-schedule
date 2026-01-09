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
      // YYYY-MM-DD形式をYYYY/MM/DDに変換して両方の形式で検索
      const dateWithSlash = date.replace(/-/g, "/")
      const dateWithHyphen = date.replace(/\//g, "-")
      schedulesQuery = schedulesQuery.or(`schedule_date.eq.${dateWithSlash},schedule_date.eq.${dateWithHyphen}`)
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
          day_night: student.day_night,
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

export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, ...updates } = body

    if (!id) {
      return NextResponse.json({ error: "Student ID is required" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // Update student data
    const { data, error } = await supabase
      .from("students")
      .update({
        student_number: updates.student_number,
        name: updates.name,
        kana: updates.kana,
        hospital: updates.hospital,
        gender: updates.gender,
        birth_date: updates.birth_date,
        age: updates.age,
        day_night: updates.day_night,
        group_name: updates.group_name,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ student: data, success: true })
  } catch (error) {
    console.error("Error updating student:", error)
    return NextResponse.json({ error: "Failed to update student" }, { status: 500 })
  }
}
