import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get("name") || ""
    const hospital = searchParams.get("hospital") || ""
    const date = searchParams.get("date") || ""

    const supabase = await getSupabaseServerClient()

    // デバッグ: schedulesテーブルの最初の5件を確認
    let sampleDates: string[] = []
    if (!name && !hospital && !date) {
      const { data: sampleSchedules } = await supabase.from("schedules").select("schedule_date").limit(10)
      sampleDates = sampleSchedules?.map(s => s.schedule_date) || []
      console.log('[API] Sample schedule dates from DB:', sampleDates)
      
      // スケジュールテーブルの総件数も確認
      const { count } = await supabase.from("schedules").select("*", { count: 'exact', head: true })
      console.log('[API] Total schedules in DB:', count)
    }

    // 学生データを取得
    let studentsQuery = supabase.from("students").select("*").order("id")

    if (name) {
      console.log('[API] Searching for name:', name)
      studentsQuery = studentsQuery.or(`name.ilike.%${name}%,kana.ilike.%${name}%`)
    }

    if (hospital) {
      studentsQuery = studentsQuery.ilike("hospital", `%${hospital}%`)
    }

    const { data: students, error: studentsError } = await studentsQuery

    if (studentsError) {
      throw studentsError
    }

    console.log('[API] Students found:', students?.length || 0)
    if (students && students.length > 0) {
      const dayNightCounts = students.reduce((acc: any, s: any) => {
        acc[s.day_night || 'unknown'] = (acc[s.day_night || 'unknown'] || 0) + 1
        return acc
      }, {})
      console.log('[API] Students by day_night:', dayNightCounts)
      if (name) {
        console.log('[API] First 3 matching students:', students.slice(0, 3).map(s => ({
          id: s.id,
          name: s.name,
          kana: s.kana,
          day_night: s.day_night
        })))
      }
    }

    // 各学生のスケジュールを取得
    const studentIds = students?.map((s) => s.id) || []

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] })
    }

    let schedulesQuery = supabase.from("schedules").select("*").in("student_id", studentIds).order("schedule_date")

    if (date) {
      // 複数の日付形式に対応
      // 入力: YYYY-MM-DD (例: 2026-02-11)
      const dateParts = date.split(/[-/]/)
      const year = dateParts[0]
      const month = dateParts[1]
      const day = dateParts[2]
      
      // データベースの実際の形式: YYYY/M/D (例: 2026/2/11)
      // 変換候補:
      const formats = [
        `${year}/${parseInt(month)}/${parseInt(day)}`, // 2026/2/11 (正解)
        `${year}/${month}/${day}`,                     // 2026/02/11
        `${year}-${month}-${day}`,                     // 2026-02-11
        `${parseInt(month)}/${parseInt(day)}`,         // 2/11
        `${month}/${day}`,                             // 02/11
      ]
      
      console.log('[API] Date search formats:', formats)
      
      // まず、日付フィルターなしでスケジュールがあるか確認
      const { count: totalCount } = await supabase
        .from("schedules")
        .select("*", { count: 'exact', head: true })
        .in("student_id", studentIds)
      console.log('[API] Total schedules for these students:', totalCount)
      
      schedulesQuery = schedulesQuery.in("schedule_date", formats)
    }

    const { data: schedules, error: schedulesError } = await schedulesQuery

    if (schedulesError) {
      console.error('[API] Schedules error:', schedulesError)
      throw schedulesError
    }

    console.log('[API] Schedules found:', schedules?.length || 0, 'Date filter:', date || 'none')

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

    console.log('[API] Returning students:', filteredStudents.length, 'Total schedules:', schedules?.length || 0)

    // デバッグ情報を含める（開発環境のみ）
    const response: any = { students: filteredStudents }
    if (sampleDates.length > 0) {
      response.sampleDates = sampleDates
    }
    if (date) {
      const dateParts = date.split(/[-/]/)
      const formats = [
        `${dateParts[0]}/${dateParts[1]}/${dateParts[2]}`,
        `${dateParts[0]}-${dateParts[1]}-${dateParts[2]}`,
        `${parseInt(dateParts[1])}/${parseInt(dateParts[2])}`,
        `${dateParts[1]}/${dateParts[2]}`,
      ]
      response.debug = {
        searchFormats: formats,
        schedulesFound: schedules?.length || 0,
        studentsReturned: filteredStudents.length,
        sampleScheduleDates: schedules?.slice(0, 3).map(s => s.schedule_date) || []
      }
    }

    return NextResponse.json(response)
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
