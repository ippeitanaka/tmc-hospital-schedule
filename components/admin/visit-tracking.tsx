"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Search, CheckCircle2, MessageSquare } from "lucide-react"

type Student = {
  id: number
  student_number: string
  name: string
  kana: string
  hospital: string
}

type Visit = {
  hospital: string
  visit_date: string
  comments: string | null
  visited_by: string | null
  visited_at: string
}

export default function VisitTracking() {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [hospitalStudents, setHospitalStudents] = useState<Student[]>([])
  const [visits, setVisits] = useState<Visit[]>([])
  const [loading, setLoading] = useState(false)
  const [editingComment, setEditingComment] = useState<string | null>(null)
  const [commentText, setCommentText] = useState("")
  const [visitedBy, setVisitedBy] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      // 病院実習者を取得
      const studentsResponse = await fetch(`/api/attendance?date=${date}&period=1`)
      const studentsData = await studentsResponse.json()
      setHospitalStudents(studentsData.hospitalStudents || [])

      // 巡回記録を取得
      const visitsResponse = await fetch(`/api/visits?date=${date}`)
      const visitsData = await visitsResponse.json()
      setVisits(visitsData.visits || [])
    } catch (error) {
      console.error("データの取得に失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  const markVisited = async (hospital: string) => {
    try {
      await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital,
          date,
          visitedBy: visitedBy || "教員",
        }),
      })
      fetchData()
    } catch (error) {
      console.error("巡回記録の保存に失敗しました:", error)
    }
  }

  const saveComment = async (hospital: string) => {
    try {
      await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hospital,
          date,
          comments: commentText,
          visitedBy: visitedBy || "教員",
        }),
      })
      setEditingComment(null)
      setCommentText("")
      fetchData()
    } catch (error) {
      console.error("コメントの保存に失敗しました:", error)
    }
  }

  const openCommentEdit = (hospital: string, existingComment?: string) => {
    setEditingComment(hospital)
    setCommentText(existingComment || "")
  }

  useEffect(() => {
    if (date) {
      fetchData()
    }
  }, [])

  const isVisited = (hospital: string) => {
    return visits.some((v) => v.hospital === hospital && v.visit_date === date)
  }

  const getVisitInfo = (hospital: string) => {
    return visits.find((v) => v.hospital === hospital && v.visit_date === date)
  }

  // 病院ごとにグループ化
  const hospitalGroups = hospitalStudents.reduce(
    (acc, student) => {
      if (!acc[student.hospital]) {
        acc[student.hospital] = []
      }
      acc[student.hospital].push(student)
      return acc
    },
    {} as Record<string, Student[]>,
  )

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-blue-50">巡回記録管理</CardTitle>
        <CardDescription className="text-slate-400">病院実習の巡回状況を記録し、コメントを共有します</CardDescription>
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
          <div className="space-y-2 flex-1 min-w-[200px]">
            <label className="text-sm font-medium text-slate-300">訪問者名（任意）</label>
            <Input
              type="text"
              value={visitedBy}
              onChange={(e) => setVisitedBy(e.target.value)}
              placeholder="例：田中教員"
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>
          <Button onClick={fetchData} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <Search className="w-4 h-4 mr-2" />
            検索
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">読み込み中...</div>
        ) : Object.keys(hospitalGroups).length === 0 ? (
          <div className="text-center py-8 text-slate-400">該当する病院実習者がいません</div>
        ) : (
          <div className="space-y-4">
            {Object.entries(hospitalGroups).map(([hospital, students]) => {
              const visitInfo = getVisitInfo(hospital)
              const visited = isVisited(hospital)
              const isEditing = editingComment === hospital

              return (
                <div key={hospital} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 space-y-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-blue-50 mb-2">{hospital}</h3>
                      <div className="flex flex-wrap gap-2">
                        {students.map((student) => (
                          <span key={student.id} className="text-sm px-2 py-1 rounded bg-slate-700/50 text-slate-300">
                            {student.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={visited ? "default" : "outline"}
                        className={
                          visited
                            ? "bg-green-600 hover:bg-green-700"
                            : "border-slate-700 bg-transparent hover:bg-slate-700"
                        }
                        onClick={() => markVisited(hospital)}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {visited ? "巡回済" : "巡回OK"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-slate-700 bg-transparent hover:bg-slate-700"
                        onClick={() => openCommentEdit(hospital, visitInfo?.comments || "")}
                      >
                        <MessageSquare className="w-4 h-4 mr-1" />
                        コメント
                      </Button>
                    </div>
                  </div>

                  {visitInfo && visitInfo.comments && !isEditing && (
                    <div className="mt-2 p-3 rounded bg-slate-700/30 border border-slate-600">
                      <p className="text-sm text-slate-300 whitespace-pre-wrap">{visitInfo.comments}</p>
                      {visitInfo.visited_by && (
                        <p className="text-xs text-slate-500 mt-1">記録者: {visitInfo.visited_by}</p>
                      )}
                    </div>
                  )}

                  {isEditing && (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="巡回時のコメントを入力してください"
                        className="bg-slate-800 border-slate-700 text-slate-100"
                        rows={3}
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveComment(hospital)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          保存
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingComment(null)
                            setCommentText("")
                          }}
                          className="border-slate-700 bg-transparent hover:bg-slate-700"
                        >
                          キャンセル
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
