"use client"

import { useState, useEffect, Suspense } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Hospital, Calendar, Users, CheckCircle2, Upload, Download, Building2, Clock } from "lucide-react"
import { importCSVData } from "./actions/import-csv-data"
import { exportDataAsCSV } from "./actions/export-data"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVUploadDialog } from "@/components/csv-upload-dialog"

interface Student {
  id: number
  hospital: string
  dayNight: string
  group: string
  studentNumber: string
  name: string
  kana: string
  gender: string
  birthDate: string
  age: string
  schedule: Array<{
    date: string
    symbol: string
    description: string
  }>
}

interface Stats {
  studentCount: number
  hospitalCount: number
  dateCount: number
  visitCount: number
  symbols: Record<string, string>
}

function HospitalInternshipManagerContent() {
  const [students, setStudents] = useState<Student[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchName, setSearchName] = useState("")
  const [searchHospital, setSearchHospital] = useState("")
  const [searchDate, setSearchDate] = useState("")
  const [visitRecords, setVisitRecords] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const [todayInternships, setTodayInternships] = useState<
    Record<string, Array<{ name: string; kana: string; id: number }>>
  >({})
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    async function loadData() {
      try {
        console.log("[v0] Loading initial data...")
        const statsRes = await fetch("/api/stats")
        if (!statsRes.ok) {
          throw new Error(`Stats API returned ${statsRes.status}`)
        }
        const statsData = await statsRes.json()
        console.log("[v0] Stats data loaded:", statsData)
        setStats(statsData)

        const visitsRes = await fetch("/api/visits")
        if (!visitsRes.ok) {
          throw new Error(`Visits API returned ${visitsRes.status}`)
        }
        const visitsData = await visitsRes.json()
        console.log("[v0] Visits data loaded:", visitsData)

        const visitSet = new Set((visitsData.visits || []).map((v: any) => `${v.hospital}|${v.visit_date}`))
        setVisitRecords(visitSet)

        setLoading(false)
      } catch (error) {
        console.error("[v0] データの読み込みに失敗:", error)
        setError(error instanceof Error ? error.message : "データの読み込みに失敗しました")
        setLoading(false)
      }
    }

    loadData()
  }, [])

  useEffect(() => {
    async function fetchStudents() {
      try {
        const params = new URLSearchParams()
        if (searchName) params.append("name", searchName)
        if (searchHospital) params.append("hospital", searchHospital)
        if (searchDate) params.append("date", searchDate)

        console.log("[v0] Fetching students with params:", params.toString())
        const res = await fetch(`/api/students?${params}`)
        if (!res.ok) {
          throw new Error(`Students API returned ${res.status}`)
        }
        const data = await res.json()
        console.log("[v0] Students data loaded:", data)
        setStudents(data.students || [])

        setShowDetails(Boolean(searchName || searchHospital || searchDate))
      } catch (error) {
        console.error("学生データの取得に失敗:", error)
        setStudents([])
      }
    }

    if (!loading) {
      fetchStudents()
    }
  }, [searchName, searchHospital, searchDate, loading])

  useEffect(() => {
    async function fetchTodayInternships() {
      if (showDetails) return

      try {
        const today = new Date()
        const month = today.getMonth() + 1
        const day = today.getDate()
        const todayStr = `${month}/${day}`

        const res = await fetch(`/api/students?date=${encodeURIComponent(todayStr)}`)
        if (!res.ok) throw new Error(`API returned ${res.status}`)

        const data = await res.json()
        const students = data.students || []

        const grouped: Record<string, Array<{ name: string; kana: string; id: number }>> = {}

        students.forEach((student: any) => {
          const todaySchedule = student.schedule.find((s: any) => s.symbol === "〇" && s.date.includes(todayStr))
          if (todaySchedule) {
            if (!grouped[student.hospital]) {
              grouped[student.hospital] = []
            }
            grouped[student.hospital].push({
              name: student.name,
              kana: student.kana,
              id: student.id,
            })
          }
        })

        setTodayInternships(grouped)
      } catch (error) {
        console.error("本日の実習データの取得に失敗:", error)
      }
    }

    if (!loading) {
      fetchTodayInternships()
    }
  }, [loading, showDetails])

  const toggleVisitRecord = async (hospital: string, date: string) => {
    const key = `${hospital}|${date}`
    const isCurrentlyVisited = visitRecords.has(key)

    try {
      if (isCurrentlyVisited) {
        await fetch(`/api/visits?hospital=${encodeURIComponent(hospital)}&date=${encodeURIComponent(date)}`, {
          method: "DELETE",
        })
        const newRecords = new Set(visitRecords)
        newRecords.delete(key)
        setVisitRecords(newRecords)
      } else {
        await fetch("/api/visits", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hospital, date }),
        })
        const newRecords = new Set(visitRecords)
        newRecords.add(key)
        setVisitRecords(newRecords)
      }

      const statsRes = await fetch("/api/stats")
      const statsData = await statsRes.json()
      setStats(statsData)
    } catch (error) {
      console.error("巡回記録の更新に失敗:", error)
    }
  }

  const isVisited = (hospital: string, date: string) => {
    return visitRecords.has(`${hospital}|${date}`)
  }

  const getSymbolColor = (symbol: string) => {
    switch (symbol) {
      case "学":
        return "bg-blue-500"
      case "数":
        return "bg-purple-500"
      case "〇":
        return "bg-green-500"
      case "半":
        return "bg-teal-500"
      case "オリ":
        return "bg-orange-500"
      default:
        return "bg-gray-500"
    }
  }

  const getSymbolDescription = (symbol: string) => {
    const descriptions: Record<string, string> = {
      学: "学校登校日",
      数: "数学セミナー日",
      〇: "病院実習当日",
      半: "午後のみ登校",
      オリ: "オリエンテーション",
    }
    return descriptions[symbol] || symbol
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

  const handleExport = async () => {
    setExporting(true)

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
    } finally {
      setExporting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">データを読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>データベース接続エラー</CardTitle>
            <CardDescription>{error || "データが見つかりません"}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <p className="font-semibold">セットアップ手順:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>Supabase環境変数が設定されていることを確認</li>
                <li>SQLスクリプト (01_create_tables.sql) を実行してテーブルを作成</li>
                <li>下のボタンをクリックしてCSVデータをインポート</li>
              </ol>
              {importMessage && (
                <div
                  className={`p-3 rounded ${importMessage.startsWith("✓") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {importMessage}
                </div>
              )}
              <Button onClick={handleImport} className="w-full" disabled={importing}>
                <Upload className="h-4 w-4 mr-2" />
                {importing ? "インポート中..." : "CSVデータをインポート"}
              </Button>
              <Button onClick={() => window.location.reload()} className="w-full" variant="outline">
                再読み込み
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">救急救命士学科 病院実習管理システム</h1>
              <p className="text-muted-foreground">23期生 実習スケジュール・巡回記録管理（Supabase版）</p>
            </div>
            <div className="flex gap-2">
              {importMessage && (
                <div
                  className={`text-sm p-2 rounded max-w-md ${importMessage.startsWith("✓") ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}
                >
                  {importMessage}
                </div>
              )}
              <CSVImportDialog />
              <CSVUploadDialog />
              <Button
                onClick={handleExport}
                disabled={exporting || stats.studentCount === 0}
                size="sm"
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" />
                {exporting ? "エクスポート中..." : "CSVエクスポート"}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">学生総数</p>
                  <p className="text-2xl font-bold text-foreground">{stats.studentCount}</p>
                </div>
                <Users className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">実習施設数</p>
                  <p className="text-2xl font-bold text-foreground">{stats.hospitalCount}</p>
                </div>
                <Hospital className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">実習期間</p>
                  <p className="text-2xl font-bold text-foreground">{stats.dateCount}日</p>
                </div>
                <Calendar className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">巡回実施済み</p>
                  <p className="text-2xl font-bold text-foreground">{stats.visitCount}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              検索・フィルター
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">学生氏名・ふりがな</label>
                <Input
                  placeholder="例: 田中 または ﾀﾅｶ"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">実習施設名</label>
                <Input
                  placeholder="例：済生会"
                  value={searchHospital}
                  onChange={(e) => setSearchHospital(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">日付（部分一致）</label>
                <Input
                  placeholder="例: 1/23 または 2/15"
                  value={searchDate}
                  onChange={(e) => setSearchDate(e.target.value)}
                />
              </div>
            </div>
            {(searchName || searchHospital || searchDate) && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{students.length}件の結果が見つかりました</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchName("")
                    setSearchHospital("")
                    setSearchDate("")
                  }}
                >
                  フィルターをクリア
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>記号の凡例</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              {Object.entries(stats.symbols).map(([symbol, description]) => (
                <div key={symbol} className="flex items-center gap-2">
                  <Badge className={getSymbolColor(symbol)}>{symbol}</Badge>
                  <span className="text-sm text-muted-foreground">{getSymbolDescription(symbol)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {!showDetails ? (
          <div>
            <Card className="mb-6 border-primary/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-2xl">
                  <Clock className="h-6 w-6 text-primary" />
                  本日の病院実習状況
                </CardTitle>
                <CardDescription>
                  {new Date().toLocaleDateString("ja-JP", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    weekday: "long",
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {Object.keys(todayInternships).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(todayInternships).map(([hospital, students]) => (
                      <Card key={hospital} className="border-2 hover:border-primary/50 transition-colors">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-green-500" />
                            {hospital}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <p className="text-xs text-muted-foreground mb-2">実習生 ({students.length}名)</p>
                            {students.map((student) => (
                              <div key={student.id} className="flex items-center gap-2 p-2 rounded bg-accent/50">
                                <Users className="h-4 w-4 text-blue-500" />
                                <div>
                                  <p className="font-medium text-sm">{student.name}</p>
                                  <p className="text-xs text-muted-foreground">{student.kana}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`today-visit-${hospital}`}
                                checked={isVisited(hospital, `${new Date().getMonth() + 1}/${new Date().getDate()}`)}
                                onCheckedChange={() =>
                                  toggleVisitRecord(hospital, `${new Date().getMonth() + 1}/${new Date().getDate()}`)
                                }
                              />
                              <label
                                htmlFor={`today-visit-${hospital}`}
                                className="text-sm cursor-pointer flex items-center gap-1"
                              >
                                <CheckCircle2 className="h-4 w-4" />
                                巡回実施済み
                              </label>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-lg font-medium text-foreground mb-2">本日の実習はありません</p>
                    <p className="text-muted-foreground">検索フィルターを使用して学生や施設の情報を確認できます</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-4">
            {searchHospital && !searchName ? (
              <Card className="border-2">
                <CardHeader>
                  <CardTitle className="text-xl flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-green-500" />
                    {searchHospital} の実習スケジュール
                  </CardTitle>
                  <CardDescription>日付ごとの実習生一覧</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b-2 border-border">
                          <th className="p-3 text-left font-semibold bg-accent/50">日付</th>
                          <th className="p-3 text-left font-semibold bg-accent/50">実習生</th>
                          <th className="p-3 text-center font-semibold bg-accent/50 w-32">巡回記録</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const dateMap: Record<
                            string,
                            Array<{ name: string; kana: string; id: number; hospital: string }>
                          > = {}

                          students.forEach((student) => {
                            student.schedule
                              .filter((s) => s.symbol === "〇")
                              .forEach((entry) => {
                                if (!dateMap[entry.date]) {
                                  dateMap[entry.date] = []
                                }
                                dateMap[entry.date].push({
                                  name: student.name,
                                  kana: student.kana,
                                  id: student.id,
                                  hospital: student.hospital,
                                })
                              })
                          })

                          const sortedDates = Object.keys(dateMap).sort((a, b) => {
                            const [aMonth, aDay] = a.split("/").map(Number)
                            const [bMonth, bDay] = b.split("/").map(Number)
                            if (aMonth !== bMonth) return aMonth - bMonth
                            return aDay - bDay
                          })

                          return sortedDates.map((date) => (
                            <tr key={date} className="border-b border-border hover:bg-accent/30 transition-colors">
                              <td className="p-3 font-medium">{date}</td>
                              <td className="p-3">
                                <div className="flex flex-wrap gap-2">
                                  {dateMap[date].map((student) => (
                                    <div
                                      key={student.id}
                                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
                                    >
                                      <Users className="h-3 w-3 text-blue-500" />
                                      <span className="text-sm font-medium">{student.name}</span>
                                      <span className="text-xs text-muted-foreground">({student.kana})</span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-2">
                                  <Checkbox
                                    id={`visit-hospital-${date}`}
                                    checked={isVisited(dateMap[date][0].hospital, date)}
                                    onCheckedChange={() => toggleVisitRecord(dateMap[date][0].hospital, date)}
                                  />
                                  <label
                                    htmlFor={`visit-hospital-${date}`}
                                    className="text-sm cursor-pointer flex items-center gap-1"
                                  >
                                    {isVisited(dateMap[date][0].hospital, date) ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                                    )}
                                  </label>
                                </div>
                              </td>
                            </tr>
                          ))
                        })()}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            ) : (
              students.map((student) => (
                <Card key={student.id} className="border-2">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-xl">
                          {student.name}
                          <span className="text-sm font-normal text-muted-foreground ml-3">({student.kana})</span>
                        </CardTitle>
                        <CardDescription className="mt-2">
                          <span className="inline-block mr-4">
                            <Hospital className="inline h-4 w-4 mr-1" />
                            {student.hospital}
                          </span>
                          <span className="inline-block mr-4">学籍番号: {student.studentNumber}</span>
                          <span className="inline-block mr-4">
                            {student.dayNight} {student.group}班
                          </span>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {student.schedule.length > 0 ? (
                        <div className="space-y-2">
                          <h4 className="font-semibold text-sm text-muted-foreground mb-3">実習スケジュール</h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                            {student.schedule.map((entry, idx) => (
                              <div
                                key={idx}
                                className="border-2 rounded-lg p-3 hover:bg-accent/50 transition-all hover:shadow-md"
                              >
                                <div className="text-xs font-medium text-muted-foreground mb-2">{entry.date}</div>
                                <Badge className={`${getSymbolColor(entry.symbol)} text-white w-full justify-center`}>
                                  {entry.symbol}
                                </Badge>
                                <div className="text-xs mt-2 text-muted-foreground">
                                  {getSymbolDescription(entry.symbol)}
                                </div>

                                {entry.symbol === "〇" && (
                                  <div className="flex items-center gap-2 mt-3 pt-2 border-t">
                                    <Checkbox
                                      id={`visit-${student.id}-${idx}`}
                                      checked={isVisited(student.hospital, entry.date)}
                                      onCheckedChange={() => toggleVisitRecord(student.hospital, entry.date)}
                                    />
                                    <label htmlFor={`visit-${student.id}-${idx}`} className="text-xs cursor-pointer">
                                      巡回済み
                                    </label>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">スケジュールデータがありません</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {students.length === 0 && showDetails && (
          <Card>
            <CardContent className="py-12 text-center">
              <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground mb-2">該当する学生が見つかりません</p>
              <p className="text-muted-foreground">検索条件を変更するか、データをインポートしてください</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

export default function HospitalInternshipManager() {
  return (
    <Suspense fallback={null}>
      <HospitalInternshipManagerContent />
    </Suspense>
  )
}
