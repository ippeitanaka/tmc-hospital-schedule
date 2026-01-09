"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  GraduationCap,
  Settings,
  Upload,
  Download,
  Users,
  Calendar,
  Building2,
  LogOut,
  CheckCircle2,
  MessageSquare,
} from "lucide-react"
import { AuthDialog } from "@/components/auth-dialog"
import { setAuthCookie, removeAuthCookie, isTeacherAuthenticated } from "@/lib/auth"
import { importCSVData } from "@/app/actions/import-csv-data"
import { exportDataAsCSV } from "@/app/actions/export-data"
import { CSVImportDialog } from "@/components/csv-import-dialog"

interface Student {
  id: number
  student_number: string
  name: string
  kana: string
  hospital: string
  day_night: string
  group: string
  schedule: Array<{
    date: string
    symbol: string
    description: string
  }>
}

interface AttendanceRecord {
  student_number: string
  attendance_date: string
  period: number
  status: number
}

export default function TeacherPage() {
  const router = useRouter()
  const [authenticated, setAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState("")
  const [selectedPeriod, setSelectedPeriod] = useState<number>(1)
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["A", "B", "N"])
  const [students, setStudents] = useState<Student[]>([])
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({})
  const [visitComments, setVisitComments] = useState<Record<string, string>>({})
  const [appPassword, setAppPassword] = useState("")
  const [teacherPassword, setTeacherPassword] = useState("")
  const [importing, setImporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = () => {
      const isAuth = isTeacherAuthenticated()
      setAuthenticated(isAuth)
      setLoading(false)
    }

    checkAuth()

    // 今日の日付をデフォルトに設定（YYYYMMDD形式）
    const today = new Date()
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, "0")}${String(today.getDate()).padStart(2, "0")}`
    setSelectedDate(dateStr)
  }, [])

  useEffect(() => {
    if (authenticated && selectedDate) {
      loadStudentsAndAttendance()
    }
  }, [authenticated, selectedDate, selectedPeriod])

  const handleAuth = () => {
    setAuthCookie("tmc_teacher_auth", "true")
    setAuthenticated(true)
  }

  const handleLogout = () => {
    removeAuthCookie("tmc_teacher_auth")
    setAuthenticated(false)
    router.push("/")
  }

  const toggleClass = (classValue: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classValue)
        ? prev.filter((c) => c !== classValue)
        : [...prev, classValue]
    )
  }

  const loadStudentsAndAttendance = async () => {
    try {
      // 日付をYYYY/MM/DD形式に変換してAPIに渡す
      const year = selectedDate.substring(0, 4)
      const month = selectedDate.substring(4, 6)
      const day = selectedDate.substring(6, 8)
      const dateForApi = `${year}/${month}/${day}`

      const res = await fetch(`/api/students?date=${encodeURIComponent(dateForApi)}`)
      const data = await res.json()
      setStudents(data.students || [])

      // 出席記録を取得
      const attendanceRes = await fetch(
        `/api/attendance?date=${selectedDate}&period=${selectedPeriod}`,
      )
      const attendanceData = await attendanceRes.json()

      const recordsMap: Record<string, AttendanceRecord> = {}
      attendanceData.records?.forEach((record: AttendanceRecord) => {
        recordsMap[record.student_number] = record
      })
      setAttendanceRecords(recordsMap)

      // 巡回記録とコメントを取得
      const visitsRes = await fetch("/api/visits")
      const visitsData = await visitsRes.json()

      const commentsMap: Record<string, string> = {}
      visitsData.visits?.forEach((visit: any) => {
        if (visit.visit_date === dateForApi) {
          commentsMap[visit.hospital] = visit.comment || ""
        }
      })
      setVisitComments(commentsMap)
    } catch (error) {
      console.error("データの読み込みに失敗:", error)
    }
  }

  const updateAttendance = async (studentNumber: string, status: number) => {
    try {
      await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentNumber,
          date: selectedDate,
          period: selectedPeriod,
          status,
        }),
      })

      // ローカルステートを更新
      setAttendanceRecords((prev) => ({
        ...prev,
        [studentNumber]: {
          student_number: studentNumber,
          attendance_date: selectedDate,
          period: selectedPeriod,
          status,
        },
      }))
    } catch (error) {
      console.error("出席記録の更新に失敗:", error)
      alert("出席記録の更新に失敗しました")
    }
  }

  const toggleVisitRecord = async (hospital: string) => {
    const month = parseInt(selectedDate.substring(4, 6))
    const day = parseInt(selectedDate.substring(6, 8))
    const dateForApi = `${month}/${day}`

    try {
      const response = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital, date: dateForApi }),
      })

      if (response.ok) {
        // 成功時の視覚的フィードバック
        const button = document.querySelector(`[data-visit-hospital="${hospital}"]`) as HTMLElement
        if (button) {
          const originalText = button.textContent
          button.textContent = "✓ 記録しました"
          button.style.backgroundColor = "rgb(34 197 94)"
          setTimeout(() => {
            if (button.textContent === "✓ 記録しました") {
              button.textContent = originalText
              button.style.backgroundColor = ""
            }
          }, 1500)
        }
        await loadStudentsAndAttendance()
      }
    } catch (error) {
      console.error("巡回記録の更新に失敗:", error)
      alert("巡回記録の更新に失敗しました")
    }
  }

  const updateVisitComment = async (hospital: string, comment: string) => {
    const month = parseInt(selectedDate.substring(4, 6))
    const day = parseInt(selectedDate.substring(6, 8))
    const dateForApi = `${month}/${day}`

    try {
      const response = await fetch("/api/visits", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital, date: dateForApi, comment }),
      })

      if (response.ok) {
        setVisitComments((prev) => ({ ...prev, [hospital]: comment }))
        // 成功時の視覚的フィードバック
        const button = document.querySelector(`[data-comment-hospital="${hospital}"]`) as HTMLElement
        if (button) {
          const originalText = button.textContent
          button.textContent = "✓ 保存完了"
          button.style.backgroundColor = "rgb(34 197 94)"
          button.style.color = "white"
          setTimeout(() => {
            if (button.textContent === "✓ 保存完了") {
              button.textContent = originalText
              button.style.backgroundColor = ""
              button.style.color = ""
            }
          }, 1500)
        }
      }
    } catch (error) {
      console.error("コメントの更新に失敗:", error)
      alert("コメントの更新に失敗しました")
    }
  }

  const handleExportAttendance = async () => {
    try {
      const url = `/api/attendance/export?date=${selectedDate}&period=${selectedPeriod}`
      window.open(url, "_blank")
    } catch (error) {
      console.error("エクスポートに失敗:", error)
      alert("エクスポートに失敗しました")
    }
  }

  const handleImport = async () => {
    setImporting(true)
    setImportMessage(null)

    try {
      const result = await importCSVData()

      if (result.success) {
        setImportMessage(
          `✓ インポート成功: ${result.students}名の学生と${result.schedules}件のスケジュールをインポートしました`,
        )
        setTimeout(() => window.location.reload(), 2000)
      } else {
        setImportMessage(`✗ エラー: ${result.error}`)
      }
    } catch (error) {
      setImportMessage(`✗ エラー: ${error instanceof Error ? error.message : "インポートに失敗しました"}`)
    } finally {
      setImporting(false)
    }
  }

  const handleExportData = async () => {
    try {
      const result = await exportDataAsCSV()

      if (result.success && result.csv) {
        const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `病院実習データ_${new Date().toISOString().split("T")[0]}.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert(`エクスポートに失敗しました: ${result.error}`)
      }
    } catch (error) {
      alert(`エクスポートに失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
    }
  }

  const updatePassword = async (type: "app" | "teacher", newPassword: string) => {
    try {
      const key = type === "app" ? "app_password" : "teacher_password"
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: newPassword }),
      })

      alert("パスワードを更新しました")

      if (type === "app") setAppPassword("")
      else setTeacherPassword("")
    } catch (error) {
      alert("パスワードの更新に失敗しました")
    }
  }

  const getAttendanceStatus = (studentNumber: string) => {
    return attendanceRecords[studentNumber]?.status
  }

  const getAttendanceStatusLabel = (status: number | undefined) => {
    if (status === undefined) return "未記録"
    const labels: Record<number, string> = {
      1: "出席",
      2: "欠席",
      3: "遅刻",
      4: "早退",
      5: "公欠",
    }
    return labels[status] || "未記録"
  }

  const getAttendanceButtonClass = (studentNumber: string, targetStatus: number) => {
    const currentStatus = getAttendanceStatus(studentNumber)
    if (currentStatus === targetStatus) {
      const colors: Record<number, string> = {
        1: "bg-green-500 text-white hover:bg-green-600 font-bold",
        2: "bg-red-500 text-white hover:bg-red-600 font-bold",
        3: "bg-yellow-500 text-white hover:bg-yellow-600 font-bold",
        4: "bg-orange-500 text-white hover:bg-orange-600 font-bold",
        5: "bg-blue-500 text-white hover:bg-blue-600 font-bold",
      }
      return colors[targetStatus] || ""
    }
    // 未選択時も色を付けて見やすくする
    const defaultColors: Record<number, string> = {
      1: "bg-green-100 text-green-700 hover:bg-green-200 border-2 border-green-300",
      2: "bg-red-100 text-red-700 hover:bg-red-200 border-2 border-red-300",
      3: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-2 border-yellow-300",
      4: "bg-orange-100 text-orange-700 hover:bg-orange-200 border-2 border-orange-300",
      5: "bg-blue-100 text-blue-700 hover:bg-blue-200 border-2 border-blue-300",
    }
    return defaultColors[targetStatus] || "bg-gray-100 hover:bg-gray-200 border-2 border-gray-300"
  }

  // 学校登校者と病院実習者に分類（クラスフィルター適用）
  const schoolStudents = students.filter((s) =>
    s.schedule.some((sch) => sch.symbol === "学") &&
    selectedClasses.includes(s.day_night || "")
  )

  const hospitalStudents = students.filter((s) =>
    s.schedule.some((sch) => sch.symbol === "〇") &&
    selectedClasses.includes(s.day_night || "")
  )

  // 病院ごとにグループ化
  const hospitalGroups: Record<string, Student[]> = {}
  hospitalStudents.forEach((student) => {
    if (!hospitalGroups[student.hospital]) {
      hospitalGroups[student.hospital] = []
    }
    hospitalGroups[student.hospital].push(student)
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) {
    return <AuthDialog open={true} onSuccess={handleAuth} type="teacher" title="教員用ページ" description="教員用パスワードを入力してください" />
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">教員用管理ページ</h1>
                <p className="text-sm text-muted-foreground">病院実習スケジュール管理システム</p>
              </div>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="attendance" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="attendance">
              <Calendar className="h-4 w-4 mr-2" />
              出席管理
            </TabsTrigger>
            <TabsTrigger value="visits">
              <Building2 className="h-4 w-4 mr-2" />
              病院巡回一覧
            </TabsTrigger>
            <TabsTrigger value="data">
              <Upload className="h-4 w-4 mr-2" />
              データ管理
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />
              設定
            </TabsTrigger>
          </TabsList>

          {/* 出席管理タブ */}
          <TabsContent value="attendance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>日付・時限選択</CardTitle>
                <CardDescription>出席を確認する日付と時限を選択してください</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">日付</label>
                      <Input
                        type="date"
                        value={`${selectedDate.substring(0, 4)}-${selectedDate.substring(4, 6)}-${selectedDate.substring(6, 8)}`}
                        onChange={(e) => {
                          const dateValue = e.target.value.replace(/-/g, "")
                          setSelectedDate(dateValue)
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">時限</label>
                      <Select
                        value={selectedPeriod.toString()}
                        onValueChange={(value) => setSelectedPeriod(parseInt(value))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6].map((period) => (
                            <SelectItem key={period} value={period.toString()}>
                              {period}時限
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <Button onClick={handleExportAttendance} variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        出欠CSVエクスポート
                      </Button>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">クラス絞り込み</label>
                    <div className="flex gap-4">
                      {["A", "B", "N"].map((classValue) => (
                        <div key={classValue} className="flex items-center space-x-2">
                          <Checkbox
                            id={`class-${classValue}`}
                            checked={selectedClasses.includes(classValue)}
                            onCheckedChange={() => toggleClass(classValue)}
                          />
                          <label
                            htmlFor={`class-${classValue}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                          >
                            {classValue}クラス
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 学校登校者の出席管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-500" />
                  学校登校者（{schoolStudents.length}名）
                </CardTitle>
                <CardDescription>
                  {selectedDate.substring(0, 4)}年{selectedDate.substring(4, 6)}月{selectedDate.substring(6, 8)}日 {selectedPeriod}時限
                </CardDescription>
              </CardHeader>
              <CardContent>
                {schoolStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">該当する学生がいません</p>
                ) : (
                  <div className="space-y-3">
                    {schoolStudents.map((student) => (
                      <div key={student.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.kana} - {student.studentNumber}</p>
                          </div>
                          <div className="text-sm font-medium">
                            現在: {getAttendanceStatusLabel(getAttendanceStatus(student.studentNumber))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(student.studentNumber, 1)}
                            onClick={() => updateAttendance(student.studentNumber, 1)}
                          >
                            出席
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(student.studentNumber, 2)}
                            onClick={() => updateAttendance(student.studentNumber, 2)}
                          >
                            欠席
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(student.studentNumber, 3)}
                            onClick={() => updateAttendance(student.studentNumber, 3)}
                          >
                            遅刻
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(student.studentNumber, 4)}
                            onClick={() => updateAttendance(student.studentNumber, 4)}
                          >
                            早退
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(student.studentNumber, 5)}
                            onClick={() => updateAttendance(student.studentNumber, 5)}
                          >
                            公欠
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 病院実習者の巡回管理 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  病院実習者（{hospitalStudents.length}名）
                </CardTitle>
                <CardDescription>病院ごとの実習生一覧と巡回記録</CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(hospitalGroups).length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">該当する学生がいません</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(hospitalGroups).map(([hospital, students]) => (
                      <div key={hospital} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg mb-2">{hospital}</h3>
                            <div className="space-y-2">
                              {students.map((student) => (
                                <div key={student.id} className="flex items-center gap-2 text-sm">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span>{student.name}</span>
                                  <span className="text-muted-foreground">({student.kana})</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0"
                            onClick={() => toggleVisitRecord(hospital)}
                            data-visit-hospital={hospital}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            巡回OK
                          </Button>
                          <div className="flex-1 flex gap-2">
                            <Textarea
                              placeholder="コメントを入力..."
                              value={visitComments[hospital] || ""}
                              onChange={(e) =>
                                setVisitComments((prev) => ({ ...prev, [hospital]: e.target.value }))
                              }
                              className="flex-1"
                              rows={2}
                            />
                            <Button
                              size="sm"
                              onClick={() => updateVisitComment(hospital, visitComments[hospital] || "")}
                              data-comment-hospital={hospital}
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              保存
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 病院巡回一覧タブ */}
          <TabsContent value="visits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-green-500" />
                  病院巡回実施状況一覧
                </CardTitle>
                <CardDescription>実習施設ごとの巡回記録とコメント</CardDescription>
              </CardHeader>
              <CardContent>
                <VisitsOverview />
              </CardContent>
            </Card>
          </TabsContent>

          {/* データ管理タブ */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>データインポート</CardTitle>
                <CardDescription>CSVファイルから学生データとスケジュールをインポート</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <CSVImportDialog />
                  <Button onClick={handleImport} disabled={importing}>
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? "インポート中..." : "データをインポート"}
                  </Button>
                </div>
                {importMessage && (
                  <div
                    className={`p-3 rounded ${importMessage.startsWith("✓") ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}
                  >
                    {importMessage}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>データエクスポート</CardTitle>
                <CardDescription>現在のデータをCSV形式でエクスポート</CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={handleExportData}>
                  <Download className="h-4 w-4 mr-2" />
                  CSVエクスポート
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 設定タブ */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>パスワード変更</CardTitle>
                <CardDescription>アプリのアクセスパスワードを変更します</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  <label className="text-sm font-medium">アプリ全体のパスワード</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="新しいパスワード"
                      value={appPassword}
                      onChange={(e) => setAppPassword(e.target.value)}
                    />
                    <Button
                      onClick={() => appPassword && updatePassword("app", appPassword)}
                      disabled={!appPassword}
                    >
                      更新
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-medium">教員用ページのパスワード</label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      placeholder="新しいパスワード"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                    />
                    <Button
                      onClick={() => teacherPassword && updatePassword("teacher", teacherPassword)}
                      disabled={!teacherPassword}
                    >
                      更新
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

// 病院巡回一覧コンポーネント
function VisitsOverview() {
  const [visits, setVisits] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        // 全ての訪問記録を取得
        const visitsRes = await fetch("/api/visits")
        const visitsData = await visitsRes.json()
        
        // 全ての学生データを取得
        const studentsRes = await fetch("/api/students")
        const studentsData = await studentsRes.json()
        
        setVisits(visitsData.visits || [])
        setStudents(studentsData.students || [])
        setLoading(false)
      } catch (error) {
        console.error("データの読み込みに失敗:", error)
        setLoading(false)
      }
    }

    loadData()
  }, [])

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  // 病院ごとに巡回記録をグループ化
  const hospitalVisits: Record<string, any[]> = {}
  visits.forEach((visit) => {
    if (!hospitalVisits[visit.hospital]) {
      hospitalVisits[visit.hospital] = []
    }
    hospitalVisits[visit.hospital].push(visit)
  })

  // 各病院の学生を取得
  const getStudentsForHospital = (hospital: string) => {
    return students.filter((s) => s.hospital === hospital)
  }

  return (
    <div className="space-y-6">
      {Object.keys(hospitalVisits).length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-lg font-medium text-foreground mb-2">巡回記録がありません</p>
          <p className="text-muted-foreground">出席管理タブから巡回記録を追加してください</p>
        </div>
      ) : (
        Object.entries(hospitalVisits)
          .sort(([a], [b]) => a.localeCompare(b, "ja"))
          .map(([hospital, hospitalVisitList]) => {
            const hospitalStudents = getStudentsForHospital(hospital)
            return (
              <Card key={hospital} className="border-2">
                <CardHeader className="bg-accent/30">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-green-500" />
                    {hospital}
                  </CardTitle>
                  <CardDescription>
                    実習生: {hospitalStudents.map((s) => s.name).join("、")} ({hospitalStudents.length}名)
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-sm text-muted-foreground">巡回実施記録</h4>
                    {hospitalVisitList.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4">まだ巡回記録がありません</p>
                    ) : (
                      <div className="space-y-3">
                        {hospitalVisitList
                          .sort((a, b) => {
                            // 日付でソート（新しい順）
                            const dateA = a.visit_date.split("/").map((n: string) => parseInt(n))
                            const dateB = b.visit_date.split("/").map((n: string) => parseInt(n))
                            if (dateA[0] !== dateB[0]) return dateB[0] - dateA[0] // 月
                            return dateB[1] - dateA[1] // 日
                          })
                          .map((visit, idx) => (
                            <div
                              key={idx}
                              className="border rounded-lg p-4 bg-card hover:bg-accent/10 transition-colors"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-blue-500" />
                                  <span className="font-medium">{visit.visit_date}</span>
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600 font-medium">巡回実施済</span>
                                </div>
                              </div>
                              {visit.comment && (
                                <div className="mt-3 pt-3 border-t">
                                  <div className="flex items-start gap-2">
                                    <MessageSquare className="h-4 w-4 text-muted-foreground mt-0.5" />
                                    <div className="flex-1">
                                      <p className="text-xs text-muted-foreground mb-1">コメント:</p>
                                      <p className="text-sm whitespace-pre-wrap">{visit.comment}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
      )}
    </div>
  )
}
