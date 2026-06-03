import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TMC救急救命士学科 病院実習スケジュール",
  description: "TMC病院実習スケジュール・巡回記録管理システム",
  generator: "v0.app",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/病院実習.png", type: "image/png" }],
    shortcut: "/病院実習.png",
    apple: [{ url: "/病院実習.png", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <body className={`font-sans antialiased dark`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
