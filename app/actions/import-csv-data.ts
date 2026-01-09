"use server"

import { createClient } from "@/lib/supabase/server"

interface StudentRecord {
  student_number: string
  name: string
  furigana: string
  gender: string
  birth_date: string
  age: number
  hospital_name: string
  group_name: string
  class_type: string
  team_number: number
}

interface ScheduleRecord {
  student_number: string
  schedule_date: string
  schedule_type: string
  period: number
}

export async function importCSVData() {
  try {
    const supabase = await createClient()

    console.log("[v0] Starting CSV import...")

    const csvModule = await import("@/user_read_only_context/text_attachments/病院実習期間日程表-DLJn3.csv")
    const csvContent = csvModule.default || ""

    const lines = csvContent.split("\n")

    // Extract date headers from row 3 (index 2)
    const dateRow = lines[2].split(",")
    const dates: string[] = []
    for (let i = 12; i < dateRow.length && dateRow[i]; i++) {
      const dateStr = dateRow[i].trim()
      if (dateStr && dateStr.match(/\d+\/\d+/)) {
        const [month, day] = dateStr.split("/")
        dates.push(`2026-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
      }
    }

    console.log(`[v0] Found ${dates.length} dates`)

    const students: StudentRecord[] = []
    const schedules: ScheduleRecord[] = []

    // Parse student data starting from row 23 (index 22)
    for (let i = 22; i < 206; i++) {
      const cols = lines[i].split(",")

      if (cols.length < 12 || !cols[6] || cols[6].trim() === "") continue

      const studentNumber = cols[6].trim()
      if (!studentNumber.match(/^\d{7}$/)) continue

      const name = cols[7]?.trim() || ""
      const furigana = cols[8]?.trim() || ""
      const gender = cols[9]?.trim() || ""
      const birthDate = cols[10]?.trim() || ""
      const age = Number.parseInt(cols[11]?.trim() || "0")
      const hospitalName = cols[3]?.trim() || ""
      const classType = cols[4]?.trim() || ""
      const teamNumber = Number.parseInt(cols[5]?.trim() || "0")

      students.push({
        student_number: studentNumber,
        name,
        furigana,
        gender,
        birth_date: birthDate,
        age,
        hospital_name: hospitalName,
        group_name: `${classType}班${teamNumber}`,
        class_type: classType,
        team_number: teamNumber,
      })

      // Parse schedule for each date
      for (let dateIdx = 0; dateIdx < dates.length && 12 + dateIdx < cols.length; dateIdx++) {
        const scheduleValue = cols[12 + dateIdx]?.trim()
        if (scheduleValue && scheduleValue !== "" && scheduleValue !== "0") {
          schedules.push({
            student_number: studentNumber,
            schedule_date: dates[dateIdx],
            schedule_type: scheduleValue,
            period: 1,
          })
        }
      }
    }

    console.log(`[v0] Parsed ${students.length} students and ${schedules.length} schedule entries`)

    // Insert students
    const { error: studentError } = await supabase.from("students").upsert(students, { onConflict: "student_number" })

    if (studentError) {
      console.error("[v0] Student insert error:", studentError)
      throw studentError
    }

    // Delete existing schedules
    await supabase.from("schedules").delete().neq("id", 0)

    // Insert schedules in batches
    if (schedules.length > 0) {
      for (let i = 0; i < schedules.length; i += 1000) {
        const batch = schedules.slice(i, i + 1000)
        const { error: scheduleError } = await supabase.from("schedules").insert(batch)

        if (scheduleError) {
          console.error(`[v0] Schedule insert error (batch ${i}):`, scheduleError)
          throw scheduleError
        }
      }
    }

    console.log("[v0] CSV import completed successfully")

    return { success: true, students: students.length, schedules: schedules.length }
  } catch (error) {
    console.error("[v0] Import error:", error)
    return { success: false, error: String(error) }
  }
}
