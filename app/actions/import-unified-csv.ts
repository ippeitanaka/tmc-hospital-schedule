"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * 統合CSVフォーマットからデータをインポート
 * フォーマット: 学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明
 */
export async function importUnifiedCSV(csvContent: string) {
  try {
    const supabase = await createClient()
    
    console.log("[Import] Starting unified CSV import...")
    
    const lines = csvContent.split("\n").filter(line => line.trim())
    if (lines.length < 2) {
      throw new Error("CSVファイルが空か、ヘッダー行のみです")
    }
    
    // ヘッダー行をスキップ
    const dataLines = lines.slice(1)
    
    // 学生情報を収集（重複を避ける）
    const studentsMap = new Map<string, any>()
    const schedulesList: any[] = []
    
    for (const line of dataLines) {
      if (!line.trim()) continue
      
      const cols = line.split(",").map(col => col.trim())
      if (cols.length < 10) continue
      
      const [
        studentNumber,
        name,
        kana,
        gender,
        birthDate,
        age,
        hospital,
        dayNight,
        groupName,
        scheduleDate,
        symbol,
        description
      ] = cols
      
      if (!studentNumber) continue
      
      // 学生情報を保存（初回のみ）
      if (!studentsMap.has(studentNumber)) {
        studentsMap.set(studentNumber, {
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
      
      // スケジュール情報を保存
      if (scheduleDate && symbol) {
        schedulesList.push({
          student_number: studentNumber,
          schedule_date: scheduleDate,
          symbol: symbol,
          description: description || "",
        })
      }
    }
    
    const students = Array.from(studentsMap.values())
    
    console.log(`[Import] Found ${students.length} students, ${schedulesList.length} schedules`)
    
    if (students.length === 0) {
      throw new Error("有効な学生データが見つかりませんでした")
    }
    
    // 既存データを削除
    console.log("[Import] Clearing existing data...")
    await supabase.from("schedules").delete().neq("id", 0)
    await supabase.from("students").delete().neq("id", 0)
    
    // 学生データを挿入
    console.log("[Import] Inserting students...")
    const { data: insertedStudents, error: studentsError } = await supabase
      .from("students")
      .insert(students)
      .select()
    
    if (studentsError) {
      console.error("[Import] Students error:", studentsError)
      throw studentsError
    }
    
    console.log(`[Import] Inserted ${insertedStudents?.length || 0} students`)
    
    // 学籍番号とIDのマッピングを作成
    const studentIdMap = new Map<string, number>()
    insertedStudents?.forEach((student: any) => {
      studentIdMap.set(student.student_number, student.id)
    })
    
    // スケジュールデータにstudent_idを追加
    const schedulesWithId = schedulesList
      .map((schedule) => {
        const studentId = studentIdMap.get(schedule.student_number)
        if (!studentId) return null
        
        return {
          student_id: studentId,
          schedule_date: schedule.schedule_date,
          symbol: schedule.symbol,
          description: schedule.description,
        }
      })
      .filter((s): s is NonNullable<typeof s> => s !== null)
    
    if (schedulesWithId.length === 0) {
      console.warn("[Import] No valid schedules to insert")
      return {
        success: true,
        message: `${students.length}名の学生をインポートしました（スケジュールなし）`,
        studentsCount: students.length,
        schedulesCount: 0,
      }
    }
    
    // スケジュールデータを挿入
    console.log("[Import] Inserting schedules...")
    const { data: insertedSchedules, error: schedulesError } = await supabase
      .from("schedules")
      .insert(schedulesWithId)
      .select()
    
    if (schedulesError) {
      console.error("[Import] Schedules error:", schedulesError)
      throw schedulesError
    }
    
    console.log(`[Import] Inserted ${insertedSchedules?.length || 0} schedules`)
    console.log("[Import] Import completed successfully!")
    
    return {
      success: true,
      message: `${students.length}名の学生と${insertedSchedules?.length || 0}件のスケジュールをインポートしました`,
      studentsCount: students.length,
      schedulesCount: insertedSchedules?.length || 0,
    }
  } catch (error) {
    console.error("[Import] Error:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}
