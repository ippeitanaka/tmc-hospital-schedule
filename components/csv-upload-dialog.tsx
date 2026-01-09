"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Upload, FileUp, CheckCircle, XCircle } from "lucide-react"
import { uploadAndImportCSV } from "@/app/actions/upload-csv"

export function CSVUploadDialog() {
  const [isOpen, setIsOpen] = useState(false)
  const [studentsFile, setStudentsFile] = useState<File | null>(null)
  const [schedulesFile, setSchedulesFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null)

  const handleImport = async () => {
    if (!studentsFile || !schedulesFile) {
      setImportResult({ success: false, message: "学生情報とスケジュール情報の両方のCSVファイルを選択してください" })
      return
    }

    setIsImporting(true)
    setImportResult(null)

    try {
      const studentsText = await studentsFile.text()
      const schedulesText = await schedulesFile.text()

      const result = await uploadAndImportCSV(studentsText, schedulesText)

      if (result.success) {
        setImportResult({
          success: true,
          message: `インポート完了: ${result.students}名の学生と${result.schedules}件のスケジュール`,
        })
        setTimeout(() => {
          window.location.reload()
        }, 2000)
      } else {
        setImportResult({ success: false, message: `エラー: ${result.error}` })
      }
    } catch (error) {
      setImportResult({ success: false, message: `エラー: ${String(error)}` })
    } finally {
      setIsImporting(false)
    }
  }

  const resetDialog = () => {
    setStudentsFile(null)
    setSchedulesFile(null)
    setImportResult(null)
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetDialog()
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Upload className="h-4 w-4 mr-2" />
          データをインポート
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>CSVファイルをインポート</DialogTitle>
          <DialogDescription>
            学生情報とスケジュール情報のCSVファイルをアップロードしてデータベースにインポートします。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6">
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-blue-500" />
                <div className="flex-1">
                  <h3 className="font-medium">学生情報CSV</h3>
                  <p className="text-sm text-muted-foreground">学籍番号、氏名、実習施設名など</p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setStudentsFile(e.target.files?.[0] || null)}
                className="mt-3 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {studentsFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {studentsFile.name}
                </div>
              )}
            </div>

            <div className="border-2 border-dashed rounded-lg p-6">
              <div className="flex items-center gap-3">
                <FileUp className="h-8 w-8 text-green-500" />
                <div className="flex-1">
                  <h3 className="font-medium">スケジュールCSV</h3>
                  <p className="text-sm text-muted-foreground">学籍番号、日付、記号（〇、学、数など）</p>
                </div>
              </div>
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setSchedulesFile(e.target.files?.[0] || null)}
                className="mt-3 w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              {schedulesFile && (
                <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  {schedulesFile.name}
                </div>
              )}
            </div>
          </div>

          {importResult && (
            <div
              className={`p-4 rounded-lg flex items-start gap-3 ${
                importResult.success ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
              }`}
            >
              {importResult.success ? (
                <CheckCircle className="h-5 w-5 mt-0.5" />
              ) : (
                <XCircle className="h-5 w-5 mt-0.5" />
              )}
              <p className="text-sm">{importResult.message}</p>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
            <p className="font-medium">注意事項:</p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
              <li>CSVファイルはUTF-8エンコーディングで保存してください</li>
              <li>ふりがなは全角カタカナで入力してください</li>
              <li>学生情報とスケジュール情報の学籍番号を一致させてください</li>
              <li>日付はYYYY-MM-DD形式で入力してください</li>
              <li>既存のデータは上書きされます</li>
            </ul>
          </div>

          <Button
            onClick={handleImport}
            disabled={!studentsFile || !schedulesFile || isImporting}
            className="w-full"
            size="lg"
          >
            {isImporting ? "インポート中..." : "インポート開始"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
