"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 統合CSVフォーマットでデータをエクスポート
 * フォーマット: 学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明
 */
export async function exportUnifiedCSV() {
  try {
    const supabase = await createClient()

    // Get students data
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .order("student_number")

    if (studentsError) throw studentsError

    // Get schedules data with student info
    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("*")
      .order("student_id, schedule_date")

    if (schedulesError) throw schedulesError

    // スケジュールを学生ごとにグループ化
    const schedulesByStudent = new Map<number, any[]>()
    schedules?.forEach((schedule) => {
      const studentId = schedule.student_id
      if (!schedulesByStudent.has(studentId)) {
        schedulesByStudent.set(studentId, [])
      }
      schedulesByStudent.get(studentId)?.push(schedule)
    })

    // Create CSV content with BOM
    let csv = "\ufeff" // BOM for UTF-8
    csv += "学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明\n"

    // 各学生のデータを出力
    students?.forEach((student) => {
      const studentSchedules = schedulesByStudent.get(student.id) || []
      
      if (studentSchedules.length === 0) {
        // スケジュールがない場合は学生情報のみ
        csv += `${student.student_number},${student.name},${student.kana},${student.gender || ""},${student.birth_date || ""},${student.age || ""},${student.hospital},${student.day_night},${student.group_name},,,,\n`
      } else {
        // スケジュールごとに1行
        studentSchedules.forEach((schedule) => {
          csv += `${student.student_number},${student.name},${student.kana},${student.gender || ""},${student.birth_date || ""},${student.age || ""},${student.hospital},${student.day_night},${student.group_name},${schedule.schedule_date},${schedule.symbol},${schedule.description || ""}\n`
        })
      }
    })

    return { success: true, csv }
  } catch (error) {
    console.error("[Export Unified] Error:", error)
    return { success: false, error: String(error) }
  }
}

/**
 * 既存フォーマット（2セクション形式）でデータをエクスポート
 * 互換性維持のため残しておく
 */
export async function exportDataAsCSV() {
  try {
    const supabase = await createClient()

    // Fetch all students
    const { data: students, error: studentsError } = await supabase
      .from("students")
      .select("*")
      .order("student_number")

    if (studentsError) throw studentsError

    // Fetch all schedules with student info
    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("*, students!inner(student_number)")
      .order("schedule_date")

    if (schedulesError) throw schedulesError

    // Create CSV header for students with BOM
    let csv = "\ufeff" // BOM for UTF-8
    csv += "=== 学生情報 ===\n"
    csv += "学籍番号,氏名,ふりがな,性別,生年月日,年齢,実習施設名,クラス,班\n"

    // Add student rows
    for (const student of students || []) {
      csv += `${student.student_number || ""},${student.name || ""},${student.kana || ""},${student.gender || ""},${student.birth_date || ""},${student.age || ""},${student.hospital || ""},${student.day_night || ""},${student.group_name || ""}\n`
    }

    // Add schedule section
    csv += "\n=== スケジュール情報 ===\n"
    csv += "学籍番号,日付,記号,説明\n"

    // Add schedule rows
    for (const schedule of schedules || []) {
      const studentNumber = (schedule.students as any)?.student_number || ""
      csv += `${studentNumber},${schedule.schedule_date || ""},${schedule.symbol || ""},${schedule.description || ""}\n`
    }

    return { success: true, csv }
  } catch (error) {
    console.error("[Export] Error:", error)
    return { success: false, error: String(error) }
  }
}
