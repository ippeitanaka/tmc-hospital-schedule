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
import { exportDataAsCSV, exportUnifiedCSV } from "@/app/actions/export-data"
import { generateTemplateCSV } from "@/app/actions/generate-template-csv"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { AttendanceExportDialog } from "@/components/attendance-export-dialog"
import { CSVDataImportDialog } from "@/components/csv-data-import-dialog"
import { UnifiedCSVImportDialog } from "@/components/unified-csv-import-dialog"

interface Student {
  id: number
  student_number: string
  studentNumber?: string  // APIからのレスポンスではキャメルケース
  name: string
  kana: string
  hospital: string
  day_night: string
  group: string
  gender?: string
  birth_date?: string
  age?: number
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
  const [bulkAttendanceStatus, setBulkAttendanceStatus] = useState<number>(1)
  const [isBulkRegistering, setIsBulkRegistering] = useState(false)
  const [pendingAttendance, setPendingAttendance] = useState<Record<string, number>>({})

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
      // 日付や時限が変わったら一時選択状態をクリア
      setPendingAttendance({})
    }
  }, [authenticated, selectedDate, selectedPeriod])

  const handleAuth = () => {
    setAuthCookie("admin_auth", "true")
    setAuthenticated(true)
  }

  const handleLogout = () => {
    removeAuthCookie("admin_auth")
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

  const selectAttendance = (studentNumber: string, status: number) => {
    // 一時的に選択状態を保存（データベースにはまだ保存しない）
    console.log('個別選択:', studentNumber, 'ステータス:', status)
    setPendingAttendance((prev) => {
      const updated = {
        ...prev,
        [studentNumber]: status,
      }
      console.log('更新後のpendingAttendance:', updated)
      return updated
    })
  }

  const applyBulkSelection = () => {
    // 一括選択を一時状態に反映
    const newPending = { ...pendingAttendance }
    schoolStudents.forEach((student) => {
      const studentNum = student.student_number || student.studentNumber || ''
      if (studentNum) {
        newPending[studentNum] = bulkAttendanceStatus
      }
    })
    console.log('一括選択後:', newPending)
    setPendingAttendance(newPending)
  }

  const saveAllAttendance = async () => {
    if (Object.keys(pendingAttendance).length === 0) {
      alert("登録する出席情報がありません")
      return
    }

    if (!confirm(`${Object.keys(pendingAttendance).length}名の出席情報を登録しますか？`)) {
      return
    }

    setIsBulkRegistering(true)
    try {
      const bulkRecords = Object.entries(pendingAttendance).map(([studentNumber, status]) => ({
        studentNumber,
        date: selectedDate,
        period: selectedPeriod,
        status,
      }))

      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkRecords }),
      })

      if (response.ok) {
        // ローカルステートを更新
        const newRecords = { ...attendanceRecords }
        Object.entries(pendingAttendance).forEach(([studentNumber, status]) => {
          newRecords[studentNumber] = {
            student_number: studentNumber,
            attendance_date: selectedDate,
            period: selectedPeriod,
            status,
          }
        })
        setAttendanceRecords(newRecords)
        setPendingAttendance({}) // 一時状態をクリア
        alert(`${Object.keys(pendingAttendance).length}名の出席を登録しました`)
      } else {
        throw new Error("登録に失敗しました")
      }
    } catch (error) {
      console.error("出席登録エラー:", error)
      alert("出席登録に失敗しました")
    } finally {
      setIsBulkRegistering(false)
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



  const handleExportData = async () => {
    try {
      const result = await exportDataAsCSV()

      if (result.success && result.csv) {
        // UTF-8エンコーディングを明示的に処理
        const encoder = new TextEncoder()
        const utf8Data = encoder.encode(result.csv)
        const blob = new Blob([utf8Data], { type: "text/csv;charset=utf-8;" })
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

  const handleExportUnifiedCSV = async () => {
    try {
      const result = await exportUnifiedCSV()

      if (result.success && result.csv) {
        // UTF-8エンコーディングを明示的に処理
        const encoder = new TextEncoder()
        const utf8Data = encoder.encode(result.csv)
        const blob = new Blob([utf8Data], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `統合データ_${new Date().toISOString().split("T")[0]}.csv`
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

  const handleDownloadTemplate = async () => {
    try {
      const result = await generateTemplateCSV()

      if (result.success && result.csv) {
        // UTF-8エンコーディングを明示的に処理
        const encoder = new TextEncoder()
        const utf8Data = encoder.encode(result.csv)
        const blob = new Blob([utf8Data], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.href = url
        link.download = `統合CSV_テンプレート.csv`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
      } else {
        alert(`テンプレートの生成に失敗しました: ${result.error}`)
      }
    } catch (error) {
      alert(`テンプレートの生成に失敗しました: ${error instanceof Error ? error.message : "不明なエラー"}`)
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
    // 一時選択があればそれを優先、なければ保存済みのデータ
    return pendingAttendance[studentNumber] ?? attendanceRecords[studentNumber]?.status
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
                      <AttendanceExportDialog>
                        <Button variant="outline" className="w-full">
                          <Download className="h-4 w-4 mr-2" />
                          出欠CSVエクスポート
                        </Button>
                      </AttendanceExportDialog>
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
                  <div className="space-y-4">
                    {/* 一括選択コントロール */}
                    <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="text-sm font-semibold text-blue-900">一括選択:</label>
                        <Select
                          value={bulkAttendanceStatus.toString()}
                          onValueChange={(value) => setBulkAttendanceStatus(parseInt(value))}
                        >
                          <SelectTrigger className="w-32 bg-white text-gray-900 border-2 border-blue-300">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white">
                            <SelectItem value="1" className="cursor-pointer hover:bg-green-50">出席</SelectItem>
                            <SelectItem value="2" className="cursor-pointer hover:bg-red-50">欠席</SelectItem>
                            <SelectItem value="3" className="cursor-pointer hover:bg-yellow-50">遅刻</SelectItem>
                            <SelectItem value="4" className="cursor-pointer hover:bg-orange-50">早退</SelectItem>
                            <SelectItem value="5" className="cursor-pointer hover:bg-blue-50">公欠</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={applyBulkSelection}
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                        >
                          全員を選択 ({schoolStudents.length}名)
                        </Button>
                        <span className="text-sm text-blue-700">
                          ※ 選択後、個別に変更してから「登録」ボタンで保存
                        </span>
                      </div>
                    </div>

                    {/* 登録ボタン */}
                    <div className="flex justify-end">
                      <Button
                        onClick={saveAllAttendance}
                        disabled={isBulkRegistering || Object.keys(pendingAttendance).length === 0}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold px-8 py-2"
                        size="lg"
                      >
                        {isBulkRegistering ? "登録中..." : `登録 (${Object.keys(pendingAttendance).length}名)`}
                      </Button>
                    </div>

                    {/* 個別の出席管理 */}
                    <div className="space-y-3">
                      {schoolStudents.map((student) => {
                        const studentNum = student.student_number || student.studentNumber || ''
                        return (
                        <div key={student.id} className="border rounded-lg p-4 space-y-3">
                          <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.kana} - {studentNum}</p>
                          </div>
                          <div className="text-sm font-medium">
                            現在: {getAttendanceStatusLabel(getAttendanceStatus(studentNum))}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(studentNum, 1)}
                            onClick={() => selectAttendance(studentNum, 1)}
                          >
                            出席
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(studentNum, 2)}
                            onClick={() => selectAttendance(studentNum, 2)}
                          >
                            欠席
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(studentNum, 3)}
                            onClick={() => selectAttendance(studentNum, 3)}
                          >
                            遅刻
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(studentNum, 4)}
                            onClick={() => selectAttendance(studentNum, 4)}
                          >
                            早退
                          </Button>
                          <Button
                            size="sm"
                            className={getAttendanceButtonClass(studentNum, 5)}
                            onClick={() => selectAttendance(studentNum, 5)}
                          >
                            公欠
                          </Button>
                        </div>
                      </div>
                      )
                      })}
                    </div>
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
                <CardTitle>学生情報管理</CardTitle>
                <CardDescription>学生の基本情報を編集・管理</CardDescription>
              </CardHeader>
              <CardContent>
                <StudentManagement />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>スケジュール編集</CardTitle>
                <CardDescription>各学生の病院実習スケジュールを編集（日程変更・欠席登録）</CardDescription>
              </CardHeader>
              <CardContent>
                <ScheduleManagement />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>データインポート</CardTitle>
                <CardDescription>CSVファイルから学生情報またはスケジュールをインポート</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">統合CSVフォーマット（推奨）</h3>
                  <div className="flex gap-2 flex-wrap">
                    <UnifiedCSVImportDialog />
                    <Button variant="outline" onClick={handleDownloadTemplate}>
                      <Download className="h-4 w-4 mr-2" />
                      テンプレートダウンロード
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    学生情報とスケジュールを1つのCSVファイルで管理できます
                  </p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">従来形式（互換性維持）</h3>
                  <CSVDataImportDialog onImportComplete={() => window.location.reload()}>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      2セクション形式でインポート
                    </Button>
                  </CSVDataImportDialog>
                  <p className="text-xs text-muted-foreground mt-2">
                    学生情報とスケジュール情報が分かれた従来形式
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>データエクスポート</CardTitle>
                <CardDescription>現在のデータをCSV形式でエクスポート</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">統合CSVフォーマット（推奨）</h3>
                  <Button onClick={handleExportUnifiedCSV}>
                    <Download className="h-4 w-4 mr-2" />
                    統合CSVエクスポート
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    1つのファイルで学生とスケジュールをまとめてエクスポート
                  </p>
                </div>
                
                <div className="border-t pt-4">
                  <h3 className="text-sm font-medium mb-2">従来形式（互換性維持）</h3>
                  <Button variant="outline" onClick={handleExportData}>
                    <Download className="h-4 w-4 mr-2" />
                    2セクション形式でエクスポート
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    学生情報とスケジュール情報が分かれた従来形式
                  </p>
                </div>
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
                          .map((visit, idx) => {
                            // その日に実習している学生を抽出
                            console.log("Visit date:", visit.visit_date)
                            console.log("Hospital students:", hospitalStudents.length)
                            if (hospitalStudents.length > 0) {
                              console.log("Sample student schedule:", hospitalStudents[0].schedule)
                            }
                            
                            const studentsOnThisDate = hospitalStudents.filter((student) => {
                              const hasMatch = student.schedule.some((sch: any) => {
                                const scheduleDate = sch.date
                                const visitDate = visit.visit_date
                                // 日付の形式を柔軟に比較
                                const match = scheduleDate.includes(visitDate) || scheduleDate.endsWith(visitDate)
                                console.log(`Comparing: ${scheduleDate} with ${visitDate} = ${match}, symbol: ${sch.symbol}`)
                                return sch.symbol === "〇" && match
                              })
                              return hasMatch
                            })
                            
                            console.log("Students on this date:", studentsOnThisDate.length)
                            
                            return (
                              <div
                                key={idx}
                                className="border rounded-lg p-4 bg-card hover:bg-accent/10 transition-colors"
                              >
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="h-4 w-4 text-blue-500" />
                                      <span className="font-medium">{visit.visit_date}</span>
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                      <span className="text-sm text-green-600 font-medium">巡回実施済</span>
                                    </div>
                                    {studentsOnThisDate.length > 0 && (
                                      <div className="flex items-start gap-2 ml-6">
                                        <Users className="h-4 w-4 text-muted-foreground mt-0.5" />
                                        <div className="flex flex-wrap gap-2">
                                          {studentsOnThisDate.map((student) => (
                                            <span
                                              key={student.id}
                                              className="inline-flex items-center px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-sm"
                                            >
                                              {student.name}
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
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
                            )
                          })}
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

// 学生情報管理コンポーネント
function StudentManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/students")
      const data = await res.json()
      setStudents(data.students || [])
      setLoading(false)
    } catch (error) {
      console.error("学生データの読み込みに失敗:", error)
      setLoading(false)
    }
  }

  const saveStudent = async () => {
    if (!editingStudent) return

    try {
      const response = await fetch(`/api/students?id=${editingStudent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          updates: {
            student_number: editingStudent.studentNumber || editingStudent.student_number,
            name: editingStudent.name,
            kana: editingStudent.kana,
            hospital: editingStudent.hospital,
            gender: editingStudent.gender || "",
            birth_date: editingStudent.birth_date || "",
            age: editingStudent.age || 0,
            day_night: editingStudent.day_night,
            group_name: editingStudent.group || "",
          },
        }),
      })

      if (response.ok) {
        alert("学生情報を更新しました")
        setEditingStudent(null)
        loadStudents()
      } else {
        throw new Error("更新に失敗しました")
      }
    } catch (error) {
      console.error("学生情報の更新に失敗:", error)
      alert("学生情報の更新に失敗しました")
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchTerm) ||
      s.kana.includes(searchTerm) ||
      (s.student_number && s.student_number.includes(searchTerm)) ||
      (s.studentNumber && s.studentNumber.includes(searchTerm)) ||
      s.hospital.includes(searchTerm)
  )

  if (loading) {
    return <div className="text-center py-4">読み込み中...</div>
  }

  return (
    <div className="space-y-4">
      <div>
        <Input
          placeholder="学生名、ふりがな、学籍番号、病院名で検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredStudents.map((student) => (
          <div key={student.id} className="border rounded-lg p-4">
            {editingStudent?.id === student.id ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium">学籍番号</label>
                    <Input
                      value={editingStudent.studentNumber || editingStudent.student_number}
                      onChange={(e) =>
                        setEditingStudent({ 
                          ...editingStudent, 
                          student_number: e.target.value,
                          studentNumber: e.target.value 
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">氏名</label>
                    <Input
                      value={editingStudent.name}
                      onChange={(e) => setEditingStudent({ ...editingStudent, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">ふりがな</label>
                    <Input
                      value={editingStudent.kana}
                      onChange={(e) => setEditingStudent({ ...editingStudent, kana: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">病院名</label>
                    <Input
                      value={editingStudent.hospital}
                      onChange={(e) => setEditingStudent({ ...editingStudent, hospital: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium">クラス</label>
                    <Select
                      value={editingStudent.day_night}
                      onValueChange={(value) => setEditingStudent({ ...editingStudent, day_night: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">Aクラス</SelectItem>
                        <SelectItem value="B">Bクラス</SelectItem>
                        <SelectItem value="N">Nクラス</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">班</label>
                    <Input
                      value={editingStudent.group}
                      onChange={(e) => setEditingStudent({ ...editingStudent, group: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={saveStudent} size="sm" className="bg-green-600 hover:bg-green-700">
                    保存
                  </Button>
                  <Button onClick={() => setEditingStudent(null)} size="sm" variant="outline">
                    キャンセル
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {student.name} ({student.kana})
                  </p>
                  <p className="text-sm text-muted-foreground">
                    学籍番号: {student.studentNumber || student.student_number} | 病院: {student.hospital} | クラス: {student.day_night} |
                    班: {student.group}
                  </p>
                </div>
                <Button onClick={() => setEditingStudent(student)} size="sm" variant="outline">
                  編集
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// スケジュール管理コンポーネント
function ScheduleManagement() {
  const [students, setStudents] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadStudents()
  }, [])

  const loadStudents = async () => {
    try {
      const res = await fetch("/api/students")
      const data = await res.json()
      setStudents(data.students || [])
      setLoading(false)
    } catch (error) {
      console.error("学生データの読み込みに失敗:", error)
      setLoading(false)
    }
  }

  const loadSchedules = async (student: Student) => {
    try {
      // APIからのレスポンスではstudentNumber（キャメルケース）、内部ではstudent_number（スネークケース）
      const studentNumber = student.studentNumber || student.student_number
      console.log('Loading schedules for student:', student.name, 'studentNumber:', studentNumber)
      const res = await fetch(`/api/schedules?studentNumber=${studentNumber}`)
      const data = await res.json()
      console.log('Schedules loaded:', data.schedules?.length || 0)
      setSchedules(data.schedules || [])
    } catch (error) {
      console.error("スケジュールの読み込みに失敗:", error)
    }
  }

  const selectStudent = (student: Student) => {
    setSelectedStudent(student)
    loadSchedules(student)
  }

  const updateScheduleType = async (scheduleId: number, newType: string) => {
    try {
      const response = await fetch("/api/schedules", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: scheduleId,
          symbol: newType,
        }),
      })

      if (response.ok) {
        alert("スケジュールを更新しました")
        if (selectedStudent) {
          loadSchedules(selectedStudent)
        }
      } else {
        throw new Error("更新に失敗しました")
      }
    } catch (error) {
      console.error("スケジュールの更新に失敗:", error)
      alert("スケジュールの更新に失敗しました")
    }
  }

  const markAsAbsent = async (scheduleId: number) => {
    if (!confirm("このスケジュールを欠席として記録しますか?")) return

    try {
      const response = await fetch(`/api/schedules?id=${scheduleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        alert("欠席として記録しました")
        if (selectedStudent) {
          loadSchedules(selectedStudent)
        }
      } else {
        throw new Error("記録に失敗しました")
      }
    } catch (error) {
      console.error("欠席記録に失敗:", error)
      alert("欠席記録に失敗しました")
    }
  }

  const filteredStudents = students.filter(
    (s) =>
      s.name.includes(searchTerm) ||
      s.kana.includes(searchTerm) ||
      (s.student_number && s.student_number.includes(searchTerm)) ||
      (s.studentNumber && s.studentNumber.includes(searchTerm))
  )

  const getScheduleTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "〇": "病院実習",
      学: "学校登校",
      欠: "欠席",
      休: "休み",
    }
    return labels[type] || type
  }

  const getScheduleTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      "〇": "bg-green-100 text-green-700 border-green-300",
      学: "bg-blue-100 text-blue-700 border-blue-300",
      欠: "bg-red-100 text-red-700 border-red-300",
      休: "bg-gray-100 text-gray-700 border-gray-300",
    }
    return colors[type] || "bg-gray-100 text-gray-700 border-gray-300"
  }

  if (loading) {
    return <div className="text-center py-4">読み込み中...</div>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 学生リスト */}
      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">学生を選択</label>
          <Input
            placeholder="学生名、ふりがな、学籍番号で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {filteredStudents.map((student) => (
            <div
              key={student.id}
              className={`border rounded-lg p-3 cursor-pointer hover:bg-accent/50 transition-colors ${
                selectedStudent?.id === student.id ? "bg-accent border-primary" : ""
              }`}
              onClick={() => selectStudent(student)}
            >
              <p className="font-medium">{student.name}</p>
              <p className="text-sm text-muted-foreground">
                {student.kana} - {student.studentNumber || student.student_number}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* スケジュール編集 */}
      <div>
        {selectedStudent ? (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="font-semibold text-lg text-gray-900">{selectedStudent.name}</p>
              <p className="text-sm text-gray-700">
                学籍番号: {selectedStudent.studentNumber || selectedStudent.student_number} | 病院: {selectedStudent.hospital}
              </p>
            </div>

            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {schedules.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">スケジュールがありません</p>
              ) : (
                schedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{schedule.schedule_date}</p>
                        <span
                          className={`inline-block px-2 py-1 rounded text-xs font-medium border ${getScheduleTypeColor(schedule.symbol)}`}
                        >
                          {getScheduleTypeLabel(schedule.symbol)}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <Select
                          value={schedule.symbol}
                          onValueChange={(value) => updateScheduleType(schedule.id, value)}
                        >
                          <SelectTrigger className="w-24 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="〇">実習</SelectItem>
                            <SelectItem value="学">登校</SelectItem>
                            <SelectItem value="欠">欠席</SelectItem>
                            <SelectItem value="休">休み</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => markAsAbsent(schedule.id)}
                          className="h-8"
                        >
                          欠席
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-12">
            左から学生を選択してください
          </div>
        )}
      </div>
    </div>
  )
}
