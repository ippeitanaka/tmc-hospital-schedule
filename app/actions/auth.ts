"use server"

import {
  verifyViewerPassword,
  verifyAdminPassword,
  setViewerAuth,
  setAdminAuth,
  clearAuth,
  updatePasswords,
} from "@/lib/auth"

export async function loginViewer(password: string) {
  const isValid = await verifyViewerPassword(password)
  if (isValid) {
    await setViewerAuth()
    return { success: true }
  }
  return { success: false, error: "パスワードが正しくありません" }
}

export async function loginAdmin(password: string) {
  const isValid = await verifyAdminPassword(password)
  if (isValid) {
    await setAdminAuth()
    return { success: true }
  }
  return { success: false, error: "パスワードが正しくありません" }
}

export async function logout() {
  await clearAuth()
  return { success: true }
}

export async function changePasswords(viewerPassword: string, adminPassword: string) {
  try {
    await updatePasswords(viewerPassword, adminPassword)
    return { success: true }
  } catch (error) {
    return { success: false, error: "パスワードの更新に失敗しました" }
  }
}
