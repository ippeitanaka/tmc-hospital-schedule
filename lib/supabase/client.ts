import { createBrowserClient } from "@supabase/ssr"
import { SUPABASE_CONFIG } from "./config"

let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseBrowserClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  const supabaseUrl = SUPABASE_CONFIG.url
  const supabaseAnonKey = SUPABASE_CONFIG.anonKey

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase環境変数が設定されていません。")
  }

  supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)

  return supabaseClient
}
