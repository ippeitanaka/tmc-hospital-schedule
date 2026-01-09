import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { SUPABASE_CONFIG } from "./config"

export async function getSupabaseServerClient() {
  const supabaseUrl = SUPABASE_CONFIG.url
  const supabaseAnonKey = SUPABASE_CONFIG.anonKey

  console.log("[v0] Supabase URL:", supabaseUrl)
  console.log("[v0] Supabase Key exists:", !!supabaseAnonKey)

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[v0] Supabase environment variables not found")
    throw new Error("Supabase環境変数が設定されていません。")
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component内ではcookieの設定ができない場合がある
        }
      },
    },
  })
}

export const createClient = getSupabaseServerClient
