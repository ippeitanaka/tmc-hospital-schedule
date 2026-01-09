"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Save, Eye, EyeOff } from "lucide-react"
import { changePasswords } from "@/app/actions/auth"

const SYMBOL_DESCRIPTIONS = {
  〇: "病院実習当日",
  学: "学校登校日",
  数: "数学セミナー日",
  半: "午後のみ登校",
  明: "病院実習翌日",
}

export default function SettingsPanel() {
  const [viewerPassword, setViewerPassword] = useState("")
  const [adminPassword, setAdminPassword] = useState("")
  const [showPasswords, setShowPasswords] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleSave = async () => {
    if (!viewerPassword || !adminPassword) {
      setMessage({ type: "error", text: "両方のパスワードを入力してください" })
      return
    }

    setSaving(true)
    setMessage(null)

    try {
      const result = await changePasswords(viewerPassword, adminPassword)
      if (result.success) {
        setMessage({ type: "success", text: "パスワードが更新されました" })
        setViewerPassword("")
        setAdminPassword("")
      } else {
        setMessage({ type: "error", text: result.error || "パスワードの更新に失敗しました" })
      }
    } catch (error) {
      setMessage({ type: "error", text: "パスワードの更新に失敗しました" })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-blue-50">パスワード設定</CardTitle>
          <CardDescription className="text-slate-400">閲覧用と管理者用のパスワードを変更します</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">閲覧用パスワード（学生用ページ）</label>
            <div className="relative">
              <Input
                type={showPasswords ? "text" : "password"}
                value={viewerPassword}
                onChange={(e) => setViewerPassword(e.target.value)}
                placeholder="新しい閲覧用パスワード"
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">管理者用パスワード（教員用ページ）</label>
            <Input
              type={showPasswords ? "text" : "password"}
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="新しい管理者用パスワード"
              className="bg-slate-800 border-slate-700 text-slate-100"
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${
                message.type === "success"
                  ? "bg-green-500/10 text-green-400 border border-green-500/20"
                  : "bg-red-500/10 text-red-400 border border-red-500/20"
              }`}
            >
              {message.text}
            </div>
          )}

          <Button onClick={handleSave} disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700">
            <Save className="w-4 h-4 mr-2" />
            {saving ? "保存中..." : "パスワードを更新"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-blue-50">記号凡例</CardTitle>
          <CardDescription className="text-slate-400">スケジュール記号の意味</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(SYMBOL_DESCRIPTIONS).map(([symbol, description]) => (
              <div key={symbol} className="flex items-center gap-3 p-2 rounded bg-slate-800/50">
                <Badge
                  className={`${
                    symbol === "〇"
                      ? "bg-green-500/20 text-green-400"
                      : symbol === "学"
                        ? "bg-blue-500/20 text-blue-400"
                        : symbol === "数"
                          ? "bg-purple-500/20 text-purple-400"
                          : symbol === "半"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-500/20 text-slate-400"
                  }`}
                >
                  {symbol}
                </Badge>
                <span className="text-sm text-slate-300">{description}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
