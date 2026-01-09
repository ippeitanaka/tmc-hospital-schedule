"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginAdmin } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Image from "next/image"

export default function AdminLoginPage() {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await loginAdmin(password)

    if (result.success) {
      router.push("/admin")
    } else {
      setError(result.error || "ログインに失敗しました")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/50 backdrop-blur">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image src="/images/7.png" alt="マスコット" width={120} height={120} className="drop-shadow-lg" />
          </div>
          <CardTitle className="text-2xl text-blue-50">教員用管理ページ</CardTitle>
          <CardDescription className="text-slate-400">管理者パスワードを入力してください</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium text-slate-300">
                管理者パスワード
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="管理者パスワードを入力してください"
                className="bg-slate-800 border-slate-700 text-slate-100"
                required
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={loading}>
              {loading ? "ログイン中..." : "管理者ログイン"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full border-slate-700 hover:bg-slate-800 bg-transparent"
              onClick={() => router.push("/")}
            >
              学生用ページに戻る
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
