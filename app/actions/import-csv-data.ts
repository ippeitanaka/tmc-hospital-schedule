"use server"

import { createClient } from "@/lib/supabase/server"
import { promises as fs } from "fs"
import path from "path"

export async function importCSVData() {
  try {
    const supabase = await createClient()

    console.log("[v0] Starting CSV import...")

    const csvPath = path.join(process.cwd(), "data", "hospital-schedule.csv")
    const csvContent = await fs.readFile(csvPath, "utf-8")

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

    const students: Array<{
      student_number: string
      name: string
      kana: string
      gender: string
      birth_date: string
      age: string
      hospital: string
      day_night: string
      group_name: string
    }> = []

    const schedules: Array<{
      student_number: string
      schedule_date: string
      symbol: string
      description: string
    }> = []

    // Parse student data starting from row 23 (index 22)
    for (let i = 22; i < 206; i++) {
      const cols = lines[i].split(",")

      if (cols.length < 12 || !cols[6] || cols[6].trim() === "") continue

      const studentNumber = cols[6].trim()
      if (!studentNumber.match(/^\d{7}$/)) continue

      const name = cols[7]?.trim() || ""
      const kana = cols[8]?.trim() || ""
      const gender = cols[9]?.trim() || ""
      const birthDate = cols[10]?.trim() || ""
      const age = cols[11]?.trim() || ""
      const hospitalName = cols[3]?.trim() || ""
      const dayNight = cols[4]?.trim() || ""
      const teamNumber = cols[5]?.trim() || ""

      students.push({
        student_number: studentNumber,
        name,
        kana,
        gender,
        birth_date: birthDate,
        age,
        hospital: hospitalName,
        day_night: dayNight,
        group_name: `${dayNight}班${teamNumber}`,
      })

      // Parse schedule for each date
      for (let dateIdx = 0; dateIdx < dates.length && 12 + dateIdx < cols.length; dateIdx++) {
        const scheduleValue = cols[12 + dateIdx]?.trim()
        if (scheduleValue && scheduleValue !== "" && scheduleValue !== "0") {
          let description = ""
          if (scheduleValue === "学") description = "学校登校日"
          else if (scheduleValue === "数") description = "数学セミナー"
          else if (scheduleValue === "〇") description = "病院実習当日"
          else if (scheduleValue === "半") description = "半日実習"
          else if (scheduleValue === "オリ") description = "オリエンテーション"

          schedules.push({
            student_number: studentNumber,
            schedule_date: dates[dateIdx],
            symbol: scheduleValue,
            description,
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

    // Get student IDs for schedule linking
    const { data: insertedStudents, error: fetchError } = await supabase.from("students").select("id, student_number")

    if (fetchError) {
      console.error("[v0] Failed to fetch students:", fetchError)
      throw fetchError
    }

    const studentMap = new Map(insertedStudents?.map((s) => [s.student_number, s.id]) || [])

    // Delete existing schedules
    await supabase.from("schedules").delete().neq("id", 0)

    const schedulesWithStudentId = schedules
      .map((sch) => {
        const studentId = studentMap.get(sch.student_number)
        if (!studentId) return null
        return {
          student_id: studentId,
          schedule_date: sch.schedule_date,
          symbol: sch.symbol,
          description: sch.description,
        }
      })
      .filter((s) => s !== null)

    // Insert schedules in batches
    if (schedulesWithStudentId.length > 0) {
      for (let i = 0; i < schedulesWithStudentId.length; i += 1000) {
        const batch = schedulesWithStudentId.slice(i, i + 1000)
        const { error: scheduleError } = await supabase.from("schedules").insert(batch)

        if (scheduleError) {
          console.error(`[v0] Schedule insert error (batch ${i}):`, scheduleError)
          throw scheduleError
        }
      }
    }

    console.log("[v0] CSV import completed successfully")

    return { success: true, students: students.length, schedules: schedulesWithStudentId.length }
  } catch (error) {
    console.error("[v0] Import error:", error)
    return { success: false, error: String(error) }
  }
}
