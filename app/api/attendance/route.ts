import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"

// 出席記録を取得
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get("date") // YYYYMMDD形式
    const period = searchParams.get("period")
    const studentNumber = searchParams.get("studentNumber")

    const supabase = await getSupabaseServerClient()
    let query = supabase.from("attendance_records").select("*")

    if (date) {
      query = query.eq("attendance_date", date)
    }

    if (period) {
      query = query.eq("period", parseInt(period))
    }

    if (studentNumber) {
      query = query.eq("student_number", studentNumber)
    }

    const { data, error } = await query.order("attendance_date", { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json({ records: data || [] })
  } catch (error) {
    console.error("Error fetching attendance records:", error)
    return NextResponse.json({ records: [] })
  }
}

// 出席記録を追加・更新
export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log("=== POST /api/attendance ===")
    console.log("Received body:", body)
    
    const { studentNumber, date, period, status } = body

    if (!studentNumber || !date || period === undefined || status === undefined) {
      console.log("Missing parameters:", {
        hasStudentNumber: !!studentNumber,
        hasDate: !!date,
        hasPeriod: period !== undefined,
        hasStatus: status !== undefined,
      })
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    // upsert（存在すれば更新、なければ挿入）
    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(
        {
          student_number: studentNumber,
          attendance_date: date,
          period: period,
          status: status,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "student_number,attendance_date,period",
        },
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ record: data })
  } catch (error) {
    console.error("Error creating/updating attendance record:", error)
    return NextResponse.json({ error: "出席記録の保存に失敗しました" }, { status: 500 })
  }
}

// 出席記録を削除
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const studentNumber = searchParams.get("studentNumber")
    const date = searchParams.get("date")
    const period = searchParams.get("period")

    if (!studentNumber || !date || !period) {
      return NextResponse.json({ error: "必須パラメータが不足しています" }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()

    const { error } = await supabase
      .from("attendance_records")
      .delete()
      .eq("student_number", studentNumber)
      .eq("attendance_date", date)
      .eq("period", parseInt(period))

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting attendance record:", error)
    return NextResponse.json({ error: "出席記録の削除に失敗しました" }, { status: 500 })
  }
}
