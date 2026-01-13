"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { importUnifiedCSV } from "@/app/actions/import-unified-csv"
import { FileUp, Loader2 } from "lucide-react"

export function UnifiedCSVImportDialog() {
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<string>("")
  const [error, setError] = useState<string>("")

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setMessage("")
      setError("")
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError("ファイルを選択してください")
      return
    }

    setImporting(true)
    setMessage("")
    setError("")

    try {
      const text = await file.text()
      const result = await importUnifiedCSV(text)

      if (result.success) {
        setMessage(result.message || "インポートが完了しました")
        setFile(null)
        // Reset file input
        const fileInput = document.getElementById(
          "unified-csv-file"
        ) as HTMLInputElement
        if (fileInput) fileInput.value = ""
        
        // ページをリロードしてデータを更新
        setTimeout(() => {
          window.location.reload()
        }, 1500)
      } else {
        setError(result.error || "インポートに失敗しました")
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "インポート中にエラーが発生しました"
      )
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileUp className="h-4 w-4" />
          統合CSVインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>統合CSVファイルをインポート</DialogTitle>
          <DialogDescription>
            学生情報とスケジュールを含む統合CSVファイルを選択してください。
            <br />
            形式: 学籍番号,氏名,ふりがな,性別,生年月日,年齢,病院,クラス,班,日付,記号,説明
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label htmlFor="unified-csv-file" className="text-sm font-medium">
              CSVファイル
            </label>
            <Input
              id="unified-csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
            />
          </div>

          {file && (
            <div className="text-sm text-muted-foreground">
              選択: {file.name} ({(file.size / 1024).toFixed(2)} KB)
            </div>
          )}

          {message && (
            <div className="rounded-lg bg-green-50 p-3 text-sm text-green-800">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <p className="font-medium mb-2">⚠️ 注意事項</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>既存のすべてのデータが削除されます</li>
              <li>CSV形式はUTF-8エンコーディングである必要があります</li>
              <li>1行目はヘッダー行として無視されます</li>
              <li>同じ学生番号で複数のスケジュールを登録できます</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                インポート中...
              </>
            ) : (
              "インポート"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
