"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { logout } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Settings, Upload, Users, ClipboardCheck, LogOut, Building2 } from "lucide-react"
import Image from "next/image"
import AttendanceManagement from "@/components/admin/attendance-management"
import VisitTracking from "@/components/admin/visit-tracking"
import DataManagement from "@/components/admin/data-management"
import StudentEditor from "@/components/admin/student-editor"
import SettingsPanel from "@/components/admin/settings-panel"

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("attendance")
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image src="/images/7.png" alt="教員マスコット" width={60} height={60} className="drop-shadow-lg" />
              <div>
                <h1 className="text-2xl font-bold text-blue-50">教員用管理ページ</h1>
                <p className="text-sm text-slate-400">TMC救急救命士学科 病院実習管理システム</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-slate-700 hover:bg-slate-800 bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              ログアウト
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-slate-800 p-1 grid grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="attendance" className="data-[state=active]:bg-blue-600">
              <ClipboardCheck className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">出席管理</span>
            </TabsTrigger>
            <TabsTrigger value="visits" className="data-[state=active]:bg-blue-600">
              <Building2 className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">巡回記録</span>
            </TabsTrigger>
            <TabsTrigger value="data" className="data-[state=active]:bg-blue-600">
              <Upload className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">データ管理</span>
            </TabsTrigger>
            <TabsTrigger value="students" className="data-[state=active]:bg-blue-600">
              <Users className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">学生編集</span>
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-blue-600">
              <Settings className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">設定</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="attendance" className="space-y-4">
            <AttendanceManagement />
          </TabsContent>

          <TabsContent value="visits" className="space-y-4">
            <VisitTracking />
          </TabsContent>

          <TabsContent value="data" className="space-y-4">
            <DataManagement />
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <StudentEditor />
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <SettingsPanel />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
