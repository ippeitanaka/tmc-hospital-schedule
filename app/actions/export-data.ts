"use server"

import { createClient } from "@/lib/supabase/server"

export async function exportDataAsCSV() {
  try {
    const supabase = await createClient()

    // Fetch all students with their schedules
    const { data: students, error: studentsError } = await supabase.from("students").select("*").order("student_number")

    if (studentsError) throw studentsError

    const { data: schedules, error: schedulesError } = await supabase
      .from("schedules")
      .select("*")
      .order("schedule_date")

    if (schedulesError) throw schedulesError

    // Create CSV header
    let csv = "学籍番号,氏名,ふりがな,性別,生年月日,年齢,実習施設名,班,昼夜,班番号\n"

    // Add student rows
    for (const student of students || []) {
      csv += `${student.student_number},${student.name},${student.furigana},${student.gender},${student.birth_date},${student.age},${student.hospital_name},${student.group_name},${student.class_type},${student.team_number}\n`
    }

    csv += "\n学籍番号,日付,スケジュールタイプ,時限\n"

    // Add schedule rows
    for (const schedule of schedules || []) {
      csv += `${schedule.student_number},${schedule.schedule_date},${schedule.schedule_type},${schedule.period}\n`
    }

    return { success: true, csv }
  } catch (error) {
    console.error("[v0] Export error:", error)
    return { success: false, error: String(error) }
  }
}
