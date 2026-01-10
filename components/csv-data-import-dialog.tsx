"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, FileText, AlertCircle } from "lucide-react"

interface CSVDataImportDialogProps {
  children?: React.ReactNode
  onImportComplete?: () => void
}

export function CSVDataImportDialog({ children, onImportComplete }: CSVDataImportDialogProps) {
  const [open, setOpen] = useState(false)
  const [importType, setImportType] = useState<"students" | "schedules">("students")
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      if (!selectedFile.name.endsWith(".csv")) {
        setMessage({ type: "error", text: "CSVファイルを選択してください" })
        return
      }
      setFile(selectedFile)
      setMessage(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setMessage({ type: "error", text: "ファイルを選択してください" })
      return
    }

    setImporting(true)
    setMessage(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("type", importType)

      const response = await fetch("/api/import-csv", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (result.success) {
        setMessage({
          type: "success",
          text: importType === "students" 
            ? `✓ ${result.count}名の学生をインポートしました`
            : `✓ ${result.count}件のスケジュールをインポートしました`,
        })
        setFile(null)
        if (onImportComplete) {
          setTimeout(() => {
            onImportComplete()
            setOpen(false)
          }, 2000)
        }
      } else {
        setMessage({ type: "error", text: `✗ エラー: ${result.error}` })
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: `✗ エラー: ${error instanceof Error ? error.message : "インポートに失敗しました"}`,
      })
    } finally {
      setImporting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            CSVデータをインポート
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>CSVデータをインポート</DialogTitle>
          <DialogDescription>
            学生情報またはスケジュール情報のCSVファイルをアップロードしてください。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="import-type" className="text-sm font-medium">
              インポートタイプ
            </label>
            <Select value={importType} onValueChange={(value: "students" | "schedules") => setImportType(value)}>
              <SelectTrigger id="import-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="students">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    学生情報 (csv-template-students.csv)
                  </div>
                </SelectItem>
                <SelectItem value="schedules">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    スケジュール情報 (csv-template-schedules.csv)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label htmlFor="csv-file" className="text-sm font-medium">
              CSVファイル
            </label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              disabled={importing}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                選択中: {file.name} ({(file.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-950 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">テンプレートについて</p>
                {importType === "students" ? (
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li>学籍番号、氏名、ふりがな、性別、生年月日、年齢、実習施設名、昼夜、班名</li>
                    <li>UTF-8エンコーディングで保存してください</li>
                  </ul>
                ) : (
                  <ul className="text-xs space-y-1 ml-4 list-disc">
                    <li>学籍番号、日付(YYYY-MM-DD)、記号(〇/明/学/数/半/オリ)、備考</li>
                    <li>学籍番号は学生情報に存在するものを指定してください</li>
                  </ul>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div
              className={`rounded-lg p-3 ${
                message.type === "success"
                  ? "bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200"
                  : "bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200"
              }`}
            >
              {message.text}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={importing}>
            キャンセル
          </Button>
          <Button onClick={handleImport} disabled={!file || importing}>
            {importing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                インポート中...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                インポート
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
