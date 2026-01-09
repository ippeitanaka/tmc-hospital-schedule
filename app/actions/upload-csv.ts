"use server"

import { createClient } from "@/lib/supabase/server"

export async function uploadAndImportCSV(studentsCSV: string, schedulesCSV: string) {
  try {
    const supabase = await createClient()

    console.log("[v0] Starting CSV upload import...")

    // Parse students CSV
    const studentLines = studentsCSV.trim().split("\n")
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

    // Skip header row
    for (let i = 1; i < studentLines.length; i++) {
      const line = studentLines[i].trim()
      if (!line) continue

      const cols = line.split(",").map((c) => c.trim())
      if (cols.length < 9) continue

      students.push({
        student_number: cols[0],
        name: cols[1],
        kana: cols[2],
        gender: cols[3],
        birth_date: cols[4],
        age: cols[5],
        hospital: cols[6],
        day_night: cols[7],
        group_name: cols[8],
      })
    }

    console.log(`[v0] Parsed ${students.length} students`)

    // Insert students
    if (students.length > 0) {
      const { error: studentError } = await supabase.from("students").upsert(students, { onConflict: "student_number" })

      if (studentError) {
        console.error("[v0] Student insert error:", studentError)
        throw studentError
      }
    }

    // Get student IDs for schedule linking
    const { data: insertedStudents, error: fetchError } = await supabase.from("students").select("id, student_number")

    if (fetchError) {
      console.error("[v0] Failed to fetch students:", fetchError)
      throw fetchError
    }

    const studentMap = new Map(insertedStudents?.map((s) => [s.student_number, s.id]) || [])

    // Parse schedules CSV
    const scheduleLines = schedulesCSV.trim().split("\n")
    const schedules: Array<{
      student_id: number
      schedule_date: string
      symbol: string
      description: string
    }> = []

    // Skip header row
    for (let i = 1; i < scheduleLines.length; i++) {
      const line = scheduleLines[i].trim()
      if (!line) continue

      const cols = line.split(",").map((c) => c.trim())
      if (cols.length < 3) continue

      const studentNumber = cols[0]
      const studentId = studentMap.get(studentNumber)
      if (!studentId) {
        console.log(`[v0] Student not found: ${studentNumber}`)
        continue
      }

      schedules.push({
        student_id: studentId,
        schedule_date: cols[1],
        symbol: cols[2],
        description: cols[3] || "",
      })
    }

    console.log(`[v0] Parsed ${schedules.length} schedules`)

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

    console.log("[v0] CSV upload import completed successfully")

    return { success: true, students: students.length, schedules: schedules.length }
  } catch (error) {
    console.error("[v0] Upload import error:", error)
    return { success: false, error: String(error) }
  }
}
