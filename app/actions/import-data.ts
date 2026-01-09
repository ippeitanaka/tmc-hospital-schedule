"use server"

import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://tiqthmafycmywqbppwfg.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRpcXRobWFmeWNteXdxYnBwd2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc5MzM2OTYsImV4cCI6MjA4MzUwOTY5Nn0.qF-dLoAW9V8_qGnPFFD2i8Uy8NW1nBJ5OUCNBo7o76Q"

export async function importCSVData() {
  let studentCount = 0
  let scheduleCount = 0

  try {
    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log("[v0] Starting CSV import...")

    const studentsData = [
      {
        hospital: "堺市消防局",
        day_night: "夜間部",
        group_name: "A",
        student_number: "0500101",
        name: "川畑　雅之",
        kana: "かわばた　まさゆき",
        gender: "男",
        birth_date: "2003/11/20",
        age: "21",
      },
      {
        hospital: "堺市消防局",
        day_night: "昼間部",
        group_name: "A",
        student_number: "0300114",
        name: "橋本　知哉",
        kana: "はしもと　ともや",
        gender: "男",
        birth_date: "2005/7/19",
        age: "19",
      },
      {
        hospital: "近畿大学病院（高度救命救急センター）",
        day_night: "昼間部",
        group_name: "A",
        student_number: "0300105",
        name: "笹本　晃大",
        kana: "ささもと　こうだい",
        gender: "男",
        birth_date: "2005/12/15",
        age: "19",
      },
      {
        hospital: "近畿大学病院（高度救命救急センター）",
        day_night: "昼間部",
        group_name: "B",
        student_number: "0300148",
        name: "佐野　拓弥",
        kana: "さの　たくや",
        gender: "男",
        birth_date: "2005/5/13",
        age: "19",
      },
      {
        hospital: "堺市立総合医療センター",
        day_night: "昼間部",
        group_name: "A",
        student_number: "2420027",
        name: "川畑　瑛太",
        kana: "ｶﾜﾊﾞﾀ ｴｲﾀ",
        gender: "男",
        birth_date: "2006/1/31",
        age: "19",
      },
      {
        hospital: "堺市立総合医療センター",
        day_night: "昼間部",
        group_name: "A",
        student_number: "2420017",
        name: "大野　瑞季",
        kana: "ｵｵﾉ ﾐｽﾞｷ",
        gender: "女",
        birth_date: "2005/12/10",
        age: "20",
      },
      {
        hospital: "堺市立総合医療センター",
        day_night: "昼間部",
        group_name: "A",
        student_number: "2420072",
        name: "益田　篤",
        kana: "ﾏｽﾀﾞ ｱﾂｼ",
        gender: "男",
        birth_date: "2005/6/11",
        age: "20",
      },
      {
        hospital: "堺市立総合医療センター",
        day_night: "昼間部",
        group_name: "A",
        student_number: "2420020",
        name: "小川　叶翔",
        kana: "ｵｶﾞﾜ ｶﾅﾄ",
        gender: "男",
        birth_date: "2005/12/16",
        age: "20",
      },
    ]

    const schedules = [
      { student_number: "0500101", date: "1/20", symbol: "学" },
      { student_number: "0500101", date: "1/24", symbol: "数" },
      { student_number: "0500101", date: "1/27", symbol: "学" },
      { student_number: "0500101", date: "2/3", symbol: "学" },
      { student_number: "0500101", date: "2/4", symbol: "半" },
      { student_number: "0500101", date: "2/7", symbol: "数" },
      { student_number: "0500101", date: "2/10", symbol: "〇" },
      { student_number: "0500101", date: "2/11", symbol: "オリ" },
      { student_number: "0500101", date: "2/12", symbol: "〇" },
      { student_number: "0500101", date: "2/13", symbol: "〇" },
      { student_number: "0500101", date: "2/14", symbol: "明" },
      { student_number: "0300114", date: "1/20", symbol: "学" },
      { student_number: "0300114", date: "2/4", symbol: "半" },
      { student_number: "0300114", date: "2/10", symbol: "〇" },
      { student_number: "2420027", date: "1/27", symbol: "半" },
      { student_number: "2420027", date: "2/10", symbol: "〇" },
      { student_number: "2420027", date: "2/14", symbol: "学" },
      { student_number: "2420027", date: "2/21", symbol: "学" },
      { student_number: "2420027", date: "2/24", symbol: "〇" },
      { student_number: "2420027", date: "2/28", symbol: "学" },
      { student_number: "2420027", date: "3/3", symbol: "〇" },
    ]

    // 学生データをインポート
    console.log("[v0] Importing students...")
    for (const student of studentsData) {
      const { error: studentError } = await supabase.from("students").insert(student)

      if (studentError) {
        console.error("学生データ挿入エラー:", studentError.message)
        continue
      }

      studentCount++
    }

    console.log(`[v0] Imported ${studentCount} students`)

    // スケジュールデータをインポート
    console.log("[v0] Importing schedules...")
    for (const schedule of schedules) {
      // 学生IDを取得
      const { data: student } = await supabase
        .from("students")
        .select("id")
        .eq("student_number", schedule.student_number)
        .single()

      if (!student) continue

      const scheduleData = {
        student_id: student.id,
        schedule_date: schedule.date,
        symbol: schedule.symbol,
        description: getSymbolDescription(schedule.symbol),
      }

      const { error: scheduleError } = await supabase.from("schedules").insert(scheduleData)

      if (scheduleError) {
        console.error("スケジュールデータ挿入エラー:", scheduleError.message)
      } else {
        scheduleCount++
      }
    }

    console.log(`[v0] Import completed: ${studentCount} students, ${scheduleCount} schedules`)

    return {
      success: true,
      message: `データインポート完了: ${studentCount}名の学生、${scheduleCount}件のスケジュール`,
      studentCount,
      scheduleCount,
    }
  } catch (error) {
    console.error("[v0] Import error:", error)
    return {
      success: false,
      message: error instanceof Error ? error.message : "インポートに失敗しました",
      studentCount,
      scheduleCount,
    }
  }
}

function getSymbolDescription(symbol: string): string {
  const descriptions: Record<string, string> = {
    学: "学校登校日",
    数: "数学セミナー",
    〇: "病院実習当日",
    半: "半日実習",
    オリ: "オリエンテーション",
    明: "実習明け",
  }
  return descriptions[symbol] || symbol
}
