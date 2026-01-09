"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Search } from "lucide-react"

type AttendanceStatus = "出席" | "欠席" | "遅刻" | "早退" | "公欠"

type Student = {
  id: number
  student_number: string
  name: string
  kana: string
  hospital: string
  attendance: AttendanceStatus | null
}

export default function AttendanceManagement() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [period, setPeriod] = useState("1")
  const [schoolStudents, setSchoolStudents] = useState<Student[]>([])
  const [hospitalStudents, setHospitalStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  const fetchAttendance = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/attendance?date=${date}&period=${period}`)
      const data = await response.json()
      setSchoolStudents(data.schoolStudents || [])
      setHospitalStudents(data.hospitalStudents || [])
    } catch (error) {
      console.error("出席データの取得に失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  const updateAttendance = async (studentNumber: string, status: AttendanceStatus) => {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentNumber, date, period, status }),
      })
      fetchAttendance()
    } catch (error) {
      console.error("出席データの保存に失敗しました:", error)
    }
  }

  const exportAttendance = async () => {
    window.open(`/api/attendance/export?date=${date}&period=${period}`, "_blank")
  }

  useEffect(() => {
    if (date && period) {
      fetchAttendance()
    }
  }, [])

  const statusButtons: AttendanceStatus[] = ["出席", "欠席", "遅刻", "早退", "公欠"]

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-blue-50">出席管理</CardTitle>
        <CardDescription className="text-slate-400">日付と時限を選択して、学生の出欠を記録します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-slate-300">日付</label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
          <div className="space-y-2 w-32">
            <label className="text-sm font-medium text-slate-300">時限</label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    {p}時限
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={fetchAttendance} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <Search className="w-4 h-4 mr-2" />
            検索
          </Button>
          <Button
            onClick={exportAttendance}
            variant="outline"
            className="border-slate-700 bg-transparent hover:bg-slate-800"
          >
            <Download className="w-4 h-4 mr-2" />
            CSVエクスポート
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">読み込み中...</div>
        ) : (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-blue-50 mb-4">学校登校者（{schoolStudents.length}名）</h3>
              {schoolStudents.length === 0 ? (
                <p className="text-slate-400">該当する学生がいません</p>
              ) : (
                <div className="space-y-2">
                  {schoolStudents.map((student) => (
                    <div
                      key={student.id}
                      className="flex flex-wrap items-center gap-2 p-3 rounded-lg bg-slate-800/50 border border-slate-700"
                    >
                      <div className="flex-1 min-w-[200px]">
                        <p className="font-medium text-slate-100">{student.name}</p>
                        <p className="text-sm text-slate-400">{student.kana}</p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {statusButtons.map((status) => (
                          <Button
                            key={status}
                            size="sm"
                            variant={student.attendance === status ? "default" : "outline"}
                            className={
                              student.attendance === status
                                ? "bg-blue-600 hover:bg-blue-700"
                                : "border-slate-700 bg-transparent hover:bg-slate-700"
                            }
                            onClick={() => updateAttendance(student.student_number, status)}
                          >
                            {status}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-lg font-semibold text-blue-50 mb-4">病院実習者（{hospitalStudents.length}名）</h3>
              {hospitalStudents.length === 0 ? (
                <p className="text-slate-400">該当する学生がいません</p>
              ) : (
                <div className="grid gap-2">
                  {hospitalStudents.map((student) => (
                    <div key={student.id} className="p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-slate-100">{student.name}</p>
                          <p className="text-sm text-slate-400">{student.hospital}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
