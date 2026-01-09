"use server"

import { createClient } from "@/lib/supabase/server"

export async function deleteAllData() {
  try {
    const supabase = await createClient()

    console.log("[v0] Starting data deletion...")

    // Delete in correct order: first child tables, then parent tables
    // 1. Delete schedules first (child table)
    const { error: scheduleError } = await supabase.from("schedules").delete().neq("id", 0)

    if (scheduleError) {
      console.error("[v0] Schedule delete error:", scheduleError)
      throw scheduleError
    }

    // 2. Delete hospital_visits
    const { error: visitError } = await supabase.from("hospital_visits").delete().neq("id", 0)

    if (visitError) {
      console.error("[v0] Visit delete error:", visitError)
      throw visitError
    }

    // 3. Delete students last (parent table)
    const { error: studentError } = await supabase.from("students").delete().neq("id", 0)

    if (studentError) {
      console.error("[v0] Student delete error:", studentError)
      throw studentError
    }

    console.log("[v0] All data deleted successfully")

    return { success: true }
  } catch (error) {
    console.error("[v0] Delete error:", error)
    return { success: false, error: String(error) }
  }
}
