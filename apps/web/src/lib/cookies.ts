type CookieOptions = {
  path?: string
  maxAge?: number
  sameSite?: "lax" | "strict" | "none"
}

const DEFAULT_COOKIE_PATH = "/"
const DEFAULT_COOKIE_SAME_SITE: NonNullable<CookieOptions["sameSite"]> = "lax"

const isBrowser = () => typeof document !== "undefined"

export function readCookie(name: string): string | null {
  if (!isBrowser()) {
    return null
  }

  const encodedName = encodeURIComponent(name)
  const prefix = `${encodedName}=`
  const cookie = document.cookie
    .split("; ")
    .find((entry) => entry.startsWith(prefix))
    ?.slice(prefix.length)

  if (!cookie) {
    return null
  }

  return decodeURIComponent(cookie)
}

export function writeCookie(
  name: string,
  value: string,
  options: CookieOptions = {}
) {
  if (!isBrowser()) {
    return
  }

  const parts = [
    `${encodeURIComponent(name)}=${encodeURIComponent(value)}`,
    `path=${options.path ?? DEFAULT_COOKIE_PATH}`,
    `samesite=${options.sameSite ?? DEFAULT_COOKIE_SAME_SITE}`,
  ]

  if (typeof options.maxAge === "number") {
    parts.push(`max-age=${options.maxAge}`)
  }

  document.cookie = parts.join("; ")
}

export function clearCookie(name: string, options: CookieOptions = {}) {
  writeCookie(name, "", { ...options, maxAge: 0 })
}
