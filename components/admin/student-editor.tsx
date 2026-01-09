"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Edit2, Save, X } from "lucide-react"

type Student = {
  id: number
  student_number: string
  name: string
  kana: string
  hospital: string
  gender: string
  birth_date: string
  age: string
  day_night: string
  group_name: string
}

export default function StudentEditor() {
  const [students, setStudents] = useState<Student[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState<Partial<Student>>({})
  const [loading, setLoading] = useState(false)

  const fetchStudents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append("name", searchTerm)
      const response = await fetch(`/api/students?${params}`)
      const data = await response.json()
      setStudents(data.students || [])
    } catch (error) {
      console.error("学生データの取得に失敗しました:", error)
    } finally {
      setLoading(false)
    }
  }

  const startEditing = (student: Student) => {
    setEditingId(student.id)
    setEditForm(student)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditForm({})
  }

  const saveStudent = async () => {
    if (!editingId) return

    try {
      const response = await fetch("/api/students", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      })

      if (response.ok) {
        fetchStudents()
        cancelEditing()
      }
    } catch (error) {
      console.error("学生データの保存に失敗しました:", error)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-blue-50">学生データ編集</CardTitle>
        <CardDescription className="text-slate-400">学生の基本情報を編集します</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="学生氏名で検索..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-800 border-slate-700 text-slate-100"
          />
          <Button onClick={fetchStudents} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            <Search className="w-4 h-4 mr-2" />
            検索
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-slate-400">読み込み中...</div>
        ) : students.length === 0 ? (
          <div className="text-center py-8 text-slate-400">学生データがありません</div>
        ) : (
          <div className="space-y-2">
            {students.map((student) => (
              <div key={student.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                {editingId === student.id ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-400">学籍番号</label>
                        <Input
                          value={editForm.student_number || ""}
                          onChange={(e) => setEditForm({ ...editForm, student_number: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-slate-100 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">氏名</label>
                        <Input
                          value={editForm.name || ""}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-slate-100 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">ふりがな</label>
                        <Input
                          value={editForm.kana || ""}
                          onChange={(e) => setEditForm({ ...editForm, kana: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-slate-100 text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400">実習施設</label>
                        <Input
                          value={editForm.hospital || ""}
                          onChange={(e) => setEditForm({ ...editForm, hospital: e.target.value })}
                          className="bg-slate-700 border-slate-600 text-slate-100 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveStudent} className="bg-green-600 hover:bg-green-700">
                        <Save className="w-4 h-4 mr-1" />
                        保存
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={cancelEditing}
                        className="border-slate-700 bg-transparent hover:bg-slate-700"
                      >
                        <X className="w-4 h-4 mr-1" />
                        キャンセル
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium text-slate-100">
                        {student.name} ({student.kana})
                      </p>
                      <p className="text-sm text-slate-400">
                        {student.student_number} - {student.hospital}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(student)}
                      className="border-slate-700 bg-transparent hover:bg-slate-700"
                    >
                      <Edit2 className="w-4 h-4 mr-1" />
                      編集
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
