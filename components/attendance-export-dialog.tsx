"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Download } from "lucide-react"

interface AttendanceExportDialogProps {
  children?: React.ReactNode
}

export function AttendanceExportDialog({ children }: AttendanceExportDialogProps) {
  const [open, setOpen] = useState(false)
  const [exportDate, setExportDate] = useState("")
  const [exportPeriod, setExportPeriod] = useState<number>(1)
  const [selectedClasses, setSelectedClasses] = useState<string[]>(["A", "B", "N"])

  // デフォルトで今日の日付を設定
  useState(() => {
    const today = new Date()
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`
    setExportDate(dateStr)
  })

  const toggleClass = (classValue: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classValue) ? prev.filter((c) => c !== classValue) : [...prev, classValue]
    )
  }

  const handleExport = () => {
    if (!exportDate) {
      alert("日付を選択してください")
      return
    }

    if (selectedClasses.length === 0) {
      alert("少なくとも1つのクラスを選択してください")
      return
    }

    // YYYY-MM-DD → YYYYMMDD に変換
    const dateFormatted = exportDate.replace(/-/g, "")
    const classParam = selectedClasses.join(",")
    const url = `/api/attendance/export?date=${dateFormatted}&period=${exportPeriod}&classes=${classParam}`
    window.open(url, "_blank")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            出欠CSVエクスポート
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>出欠データをエクスポート</DialogTitle>
          <DialogDescription>
            エクスポートする日付と時限を選択してください。選択した日付・時限の出欠データがCSV形式でダウンロードされます。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label htmlFor="export-date" className="text-sm font-medium">
              日付
            </label>
            <Input
              id="export-date"
              type="date"
              value={exportDate}
              onChange={(e) => setExportDate(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="export-period" className="text-sm font-medium">
              時限
            </label>
            <Select value={exportPeriod.toString()} onValueChange={(value) => setExportPeriod(parseInt(value))}>
              <SelectTrigger id="export-period">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 5, 6].map((period) => (
                  <SelectItem key={period} value={period.toString()}>
                    {period}時限
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">クラス絞り込み</label>
            <div className="flex gap-4">
              {["A", "B", "N"].map((classValue) => (
                <div key={classValue} className="flex items-center space-x-2">
                  <Checkbox
                    id={`export-class-${classValue}`}
                    checked={selectedClasses.includes(classValue)}
                    onCheckedChange={() => toggleClass(classValue)}
                  />
                  <label
                    htmlFor={`export-class-${classValue}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {classValue}クラス
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="pt-2">
            <p className="text-xs text-muted-foreground">
              ※ CSVには以下の情報が含まれます: 学籍番号、日付、時限、出欠区分（1=出席 2=欠席 3=遅刻 4=早退 5=公欠）
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setOpen(false)}>
            キャンセル
          </Button>
          <Button onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
