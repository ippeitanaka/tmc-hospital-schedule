"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Lock } from "lucide-react"

interface AuthDialogProps {
  open: boolean
  onSuccess: () => void
  type: "app" | "teacher"
  title?: string
  description?: string
}

export function AuthDialog({ open, onSuccess, type, title, description }: AuthDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, type }),
      })

      const data = await response.json()

      if (data.valid) {
        onSuccess()
      } else {
        setError("パスワードが正しくありません")
      }
    } catch (error) {
      setError("認証エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {title || "パスワード認証"}
          </DialogTitle>
          <DialogDescription>
            {description || "続行するにはパスワードを入力してください"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "確認中..." : "ログイン"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
