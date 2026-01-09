"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CSVImportDialog } from "@/components/csv-import-dialog"
import { CSVUploadDialog } from "@/components/csv-upload-dialog"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"
import { exportDataAsCSV } from "@/app/actions/export-data"
import { useState } from "react"

export default function DataManagement() {
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      await exportDataAsCSV()
    } catch (error) {
      console.error("エクスポートに失敗しました:", error)
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-900/50">
      <CardHeader>
        <CardTitle className="text-blue-50">データ管理</CardTitle>
        <CardDescription className="text-slate-400">
          CSVファイルのインポート・エクスポート、テンプレートのダウンロードを行います
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-base text-blue-50">CSVテンプレート</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                データベースに適合したCSV形式のテンプレートをダウンロード
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVImportDialog />
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-base text-blue-50">データインポート</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                CSVファイルをアップロードしてデータベースにインポート
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CSVUploadDialog />
            </CardContent>
          </Card>

          <Card className="border-slate-700 bg-slate-800/50">
            <CardHeader>
              <CardTitle className="text-base text-blue-50">データエクスポート</CardTitle>
              <CardDescription className="text-xs text-slate-400">
                データベースのデータをCSV形式でエクスポート
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="sm" onClick={handleExport} disabled={exporting} className="w-full">
                <Download className="w-4 h-4 mr-2" />
                {exporting ? "エクスポート中..." : "CSVエクスポート"}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="p-4 rounded-lg bg-amber-900/20 border border-amber-700/50">
          <p className="text-sm text-amber-200 font-medium mb-2">注意事項</p>
          <ul className="text-xs text-amber-100/70 space-y-1 list-disc list-inside">
            <li>CSVインポート時は既存のデータが上書きされます</li>
            <li>大量のデータをインポートする場合は時間がかかることがあります</li>
            <li>エクスポートしたCSVファイルはバックアップとして保存してください</li>
            <li>CSVファイルはUTF-8エンコーディングで保存してください</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
