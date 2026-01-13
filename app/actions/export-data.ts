"use server"

import { createClient } from "@/lib/supabase/server"

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

    // Create CSV header for students
    let csv = "=== 学生情報 ===\n"
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
