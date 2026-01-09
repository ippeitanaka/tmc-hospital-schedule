"use server"

import { cookies } from "next/headers"
import { getSupabaseServerClient } from "./supabase/server"

export async function verifyViewerPassword(password: string): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase
    .from("auth_settings")
    .select("setting_value")
    .eq("setting_key", "viewer_password")
    .single()

  return data?.setting_value === password
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const supabase = getSupabaseServerClient()
  const { data } = await supabase
    .from("auth_settings")
    .select("setting_value")
    .eq("setting_key", "admin_password")
    .single()

  return data?.setting_value === password
}

export async function setViewerAuth() {
  const cookieStore = await cookies()
  cookieStore.set("viewer_auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function setAdminAuth() {
  const cookieStore = await cookies()
  cookieStore.set("admin_auth", "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearAuth() {
  const cookieStore = await cookies()
  cookieStore.delete("viewer_auth")
  cookieStore.delete("admin_auth")
}

export async function isViewerAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("viewer_auth")?.value === "true"
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.get("admin_auth")?.value === "true"
}

export async function updatePasswords(viewerPassword: string, adminPassword: string) {
  const supabase = getSupabaseServerClient()

  await supabase
    .from("auth_settings")
    .update({ setting_value: viewerPassword, updated_at: new Date().toISOString() })
    .eq("setting_key", "viewer_password")

  await supabase
    .from("auth_settings")
    .update({ setting_value: adminPassword, updated_at: new Date().toISOString() })
    .eq("setting_key", "admin_password")
}
