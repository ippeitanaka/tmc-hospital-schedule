import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const type = formData.get("type") as "students" | "schedules"

    if (!file) {
      return NextResponse.json({ success: false, error: "ファイルがありません" }, { status: 400 })
    }

    const csvContent = await file.text()
    const lines = csvContent.split("\n").filter((line) => line.trim() !== "")

    if (lines.length === 0) {
      return NextResponse.json({ success: false, error: "CSVファイルが空です" }, { status: 400 })
    }

    const supabase = await createClient()

    if (type === "students") {
      return await importStudents(lines, supabase)
    } else if (type === "schedules") {
      return await importSchedules(lines, supabase)
    } else {
      return NextResponse.json({ success: false, error: "無効なインポートタイプです" }, { status: 400 })
    }
  } catch (error) {
    console.error("CSV import error:", error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "インポートに失敗しました" },
      { status: 500 }
    )
  }
}

async function importStudents(lines: string[], supabase: any) {
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1)
  const students: any[] = []

  for (const line of dataLines) {
    const cols = line.split(",").map((col) => col.trim().replace(/^"|"$/g, ""))

    if (cols.length < 9) continue

    const [studentNumber, name, kana, gender, birthDate, age, hospital, dayNight, groupName] = cols

    if (!studentNumber || !studentNumber.match(/^\d{7}$/)) continue

    students.push({
      student_number: studentNumber,
      name: name || "",
      kana: kana || "",
      gender: gender || "",
      birth_date: birthDate || "",
      age: age || "",
      hospital: hospital || "",
      day_night: dayNight || "",
      group_name: groupName || "",
    })
  }

  if (students.length === 0) {
    return NextResponse.json({ success: false, error: "有効な学生データがありません" }, { status: 400 })
  }

  // 既存の学生を削除して新規追加（upsert）
  const { error } = await supabase.from("students").upsert(students, {
    onConflict: "student_number",
    ignoreDuplicates: false,
  })

  if (error) {
    console.error("Student insert error:", error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: students.length })
}

async function importSchedules(lines: string[], supabase: any) {
  // ヘッダー行をスキップ
  const dataLines = lines.slice(1)
  const schedules: any[] = []

  for (const line of dataLines) {
    const cols = line.split(",").map((col) => col.trim().replace(/^"|"$/g, ""))

    if (cols.length < 3) continue

    const [studentNumber, scheduleDate, symbol, description] = cols

    if (!studentNumber || !scheduleDate || !symbol) continue

    // 日付の形式を検証
    if (!scheduleDate.match(/^\d{4}-\d{2}-\d{2}$/)) continue

    schedules.push({
      student_number: studentNumber,
      schedule_date: scheduleDate,
      symbol: symbol,
      description: description || "",
    })
  }

  if (schedules.length === 0) {
    return NextResponse.json({ success: false, error: "有効なスケジュールデータがありません" }, { status: 400 })
  }

  // まず学生IDを取得
  const studentNumbers = [...new Set(schedules.map((s) => s.student_number))]
  const { data: students, error: studentError } = await supabase
    .from("students")
    .select("id, student_number")
    .in("student_number", studentNumbers)

  if (studentError) {
    console.error("Student lookup error:", studentError)
    return NextResponse.json({ success: false, error: studentError.message }, { status: 500 })
  }

  const studentMap = new Map(students?.map((s: any) => [s.student_number, s.id]) || [])

  // student_idを追加
  const schedulesWithStudentId = schedules
    .map((schedule) => ({
      ...schedule,
      student_id: studentMap.get(schedule.student_number),
    }))
    .filter((s) => s.student_id) // student_idが存在するもののみ

  if (schedulesWithStudentId.length === 0) {
    return NextResponse.json(
      { success: false, error: "該当する学生が見つかりません。先に学生情報をインポートしてください" },
      { status: 400 }
    )
  }

  // 既存のスケジュールを削除
  const { error: deleteError } = await supabase
    .from("schedules")
    .delete()
    .in(
      "student_id",
      schedulesWithStudentId.map((s) => s.student_id)
    )

  if (deleteError) {
    console.error("Schedule delete error:", deleteError)
  }

  // 新しいスケジュールを挿入
  const { error: insertError } = await supabase.from("schedules").insert(schedulesWithStudentId)

  if (insertError) {
    console.error("Schedule insert error:", insertError)
    return NextResponse.json({ success: false, error: insertError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, count: schedulesWithStudentId.length })
}
