// 認証ユーティリティ

export const AUTH_COOKIE_NAME = 'tmc_app_auth'
export const TEACHER_AUTH_COOKIE_NAME = 'tmc_teacher_auth'

// クッキーに認証状態を保存
export function setAuthCookie(name: string, value: string) {
  if (typeof document !== 'undefined') {
    // 30日間有効
    const expires = new Date()
    expires.setDate(expires.getDate() + 30)
    document.cookie = `${name}=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Strict`
  }
}

// クッキーから認証状態を取得
export function getAuthCookie(name: string): string | null {
  if (typeof document === 'undefined') return null
  
  const cookies = document.cookie.split(';')
  for (const cookie of cookies) {
    const [key, value] = cookie.trim().split('=')
    if (key === name) {
      return value
    }
  }
  return null
}

// クッキーを削除
export function removeAuthCookie(name: string) {
  if (typeof document !== 'undefined') {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`
  }
}

// アプリ認証チェック
export function isAppAuthenticated(): boolean {
  return getAuthCookie(AUTH_COOKIE_NAME) === 'true'
}

// 教員認証チェック
export function isTeacherAuthenticated(): boolean {
  return getAuthCookie(TEACHER_AUTH_COOKIE_NAME) === 'true'
}
