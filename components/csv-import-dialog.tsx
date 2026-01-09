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
import { Download, FileText } from "lucide-react"

export function CSVImportDialog() {
  const [isOpen, setIsOpen] = useState(false)

  const downloadTemplate = (type: "students" | "schedules" | "readme") => {
    let filename = ""
    let content = ""

    if (type === "students") {
      filename = "csv-template-students.csv"
      content = `\uFEFF学籍番号,氏名,ふりがな,性別,生年月日,年齢,実習施設名,昼夜,班名
2420001,山田 太郎,ヤマダ タロウ,男,2005/4/1,20,大阪市立総合医療センター,A,A班1
2420002,佐藤 花子,サトウ ハナコ,女,2005/6/15,20,近畿大学病院,B,B班1
2420003,鈴木 次郎,スズキ ジロウ,男,2005/8/20,20,堺市立総合医療センター,A,A班2`
    } else if (type === "schedules") {
      filename = "csv-template-schedules.csv"
      content = `\uFEFF学籍番号,日付,記号,備考
2420001,2026-01-20,〇,病院実習当日
2420001,2026-01-21,明,
2420001,2026-01-22,学,学校登校日
2420001,2026-01-23,数,数学セミナー
2420001,2026-01-26,半,午後のみ登校
2420002,2026-01-20,学,学校登校日
2420002,2026-01-21,〇,病院実習当日
2420002,2026-01-22,明,
2420003,2026-01-20,半,午後のみ登校
2420003,2026-01-21,学,学校登校日
2420003,2026-01-22,〇,病院実習当日`
    } else {
      filename = "CSV-TEMPLATE-README.txt"
      content = `CSVテンプレート利用ガイド

このファイルには、病院実習スケジュール管理システムにデータをインポートするためのCSVテンプレートの使用方法が記載されています。

【ファイル構成】

1. csv-template-students.csv (学生情報)
   - 学籍番号: 7桁の数字（例: 2420001）
   - 氏名: 学生の氏名（例: 山田 太郎）
   - ふりがな: 全角カタカナ表記（例: ヤマダ タロウ）
   - 性別: 男 または 女
   - 生年月日: YYYY/M/D形式（例: 2005/4/1）
   - 年齢: 数字（例: 20）
   - 実習施設名: 実習先の病院名
   - 昼夜: A または B
   - 班名: 班の名称（例: A班1）

2. csv-template-schedules.csv (スケジュール情報)
   - 学籍番号: 学生情報と紐付ける7桁の数字
   - 日付: YYYY-MM-DD形式（例: 2026-01-20）
   - 記号: スケジュールの種類
     〇: 病院実習当日
     明: 実習明け
     学: 学校登校日
     数: 数学セミナー
     半: 午後のみ登校
     オリ: オリエンテーション
   - 備考: 任意のメモ

【使用方法】
1. テンプレートファイルをダウンロード
2. Excelで開いてデータを入力
3. CSV形式（UTF-8）で保存
4. アプリで「データをインポート」からアップロード

【注意事項】
- 文字コードは必ずUTF-8で保存してください
- ふりがなは全角カタカナで入力してください（半角カタカナは文字化けします）
- 学籍番号は両ファイルで一致させてください
- 日付はYYYY-MM-DD形式で統一してください
- 記号は定義されたもののみ使用してください`
    }

    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = filename
    link.click()
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <FileText className="h-4 w-4 mr-2" />
          CSVテンプレート
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>CSVインポート用テンプレート</DialogTitle>
          <DialogDescription>
            データベースに適合したCSVフォーマットのテンプレートをダウンロードできます。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold">テンプレートファイル</h3>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Download className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">学生情報テンプレート</h4>
                <p className="text-sm text-muted-foreground mt-1">学籍番号、氏名、実習施設名などの基本情報を登録</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => downloadTemplate("students")}>
                  csv-template-students.csv をダウンロード
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <Download className="h-5 w-5 text-green-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">スケジュールテンプレート</h4>
                <p className="text-sm text-muted-foreground mt-1">学生ごとの日付と記号（〇、学、数、半など）を登録</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => downloadTemplate("schedules")}>
                  csv-template-schedules.csv をダウンロード
                </Button>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 border rounded-lg">
              <FileText className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium">利用ガイド</h4>
                <p className="text-sm text-muted-foreground mt-1">CSVテンプレートの使い方、カラム説明、注意事項</p>
                <Button size="sm" variant="secondary" className="mt-2" onClick={() => downloadTemplate("readme")}>
                  README.txt をダウンロード
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-muted p-4 rounded-lg space-y-2">
            <h3 className="text-sm font-semibold">記号の意味</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="font-medium">〇:</span> 病院実習当日
              </div>
              <div>
                <span className="font-medium">明:</span> 実習明け
              </div>
              <div>
                <span className="font-medium">学:</span> 学校登校日
              </div>
              <div>
                <span className="font-medium">数:</span> 数学セミナー
              </div>
              <div>
                <span className="font-medium">半:</span> 午後のみ登校
              </div>
              <div>
                <span className="font-medium">オリ:</span> オリエンテーション
              </div>
            </div>
          </div>

          <div className="text-sm text-muted-foreground space-y-1">
            <p className="font-medium">インポート手順:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>テンプレートをダウンロードしてExcelで開く</li>
              <li>実際のデータを入力（ヘッダー行は削除しない）</li>
              <li>CSV形式（UTF-8）で保存</li>
              <li>アプリで「データをインポート」からアップロード</li>
            </ol>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
