import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// スケジュールを取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get("studentId")
    const studentNumber = searchParams.get("studentNumber")

    const supabase = await getSupabaseServerClient()

    if (studentNumber) {
      // 学籍番号から学生IDを取得
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("student_number", studentNumber)
        .single()

      if (student) {
        const { data: schedules, error } = await supabase
          .from("schedules")
          .select("*")
          .eq("student_id", student.id)
          .order("schedule_date")

        if (error) throw error
        return NextResponse.json({ schedules: schedules || [] })
      }
    }

    if (studentId) {
      const { data: schedules, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("student_id", parseInt(studentId))
        .order("schedule_date")

      if (error) throw error
      return NextResponse.json({ schedules: schedules || [] })
    }

    return NextResponse.json({ schedules: [] })
  } catch (error) {
    console.error("Error fetching schedules:", error)
    return NextResponse.json({ error: "Failed to fetch schedules" }, { status: 500 })
  }
}

// スケジュールを更新
export async function PUT(request: Request) {
  try {
    const body = await request.json()
    const { id, symbol, description } = body

    if (!id || symbol === undefined) {
      return NextResponse.json(
        { error: "スケジュールIDと記号が必要です" },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()

    const updateData: any = {
      symbol,
      updated_at: new Date().toISOString(),
    }

    if (description !== undefined) {
      updateData.description = description
    }

    const { data, error } = await supabase
      .from("schedules")
      .update(updateData)
      .eq("id", id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ schedule: data, success: true })
  } catch (error) {
    console.error("Error updating schedule:", error)
    return NextResponse.json({ error: "Failed to update schedule" }, { status: 500 })
  }
}

// スケジュールを削除（欠席として記録）
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ error: "スケジュールIDが必要です" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // スケジュールを"欠"（欠席）に変更
    const { data, error } = await supabase
      .from("schedules")
      .update({
        symbol: "欠",
        description: "欠席",
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(id))
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ schedule: data, success: true })
  } catch (error) {
    console.error("Error marking schedule as absent:", error)
    return NextResponse.json({ error: "Failed to mark schedule as absent" }, { status: 500 })
  }
}
