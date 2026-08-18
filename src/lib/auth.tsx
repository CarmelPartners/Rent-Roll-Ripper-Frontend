import * as React from "react"
import { api, BASE, setAuthToken, setUnauthorizedHandler } from "@/lib/api"
import type { UserClaims } from "@/types"

type AuthStatus = "checking" | "unauthenticated" | "authenticated"

interface AuthContextValue {
  status: AuthStatus
  user: UserClaims | null
  signIn: () => void
  signOut: () => void
}

const AuthContext = React.createContext<AuthContextValue | null>(null)

const TOKEN_STORAGE_KEY = "rentroll_auth_token"

// Local-dev-only escape hatch — see backend/local.settings.json. Must be paired with the
// backend's own LOCAL_DEV_BYPASS_AUTH=true to actually skip auth end to end.
const LOCAL_DEV_BYPASS_AUTH = import.meta.env.VITE_LOCAL_DEV_BYPASS_AUTH === "true"

/** Gates access on a bearer JWT issued by the Python backend after SAML/Okta login
 *  (see backend/shared/auth.py) — a stateless token this app stores itself, not a
 *  server-side session cookie (the old ASP.NET backend's model). */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>("checking")
  const [user, setUser] = React.useState<UserClaims | null>(null)

  const signOut = React.useCallback(() => {
    setAuthToken(null)
    sessionStorage.removeItem(TOKEN_STORAGE_KEY)
    setUser(null)
    setStatus(LOCAL_DEV_BYPASS_AUTH ? "authenticated" : "unauthenticated")
  }, [])

  const signIn = React.useCallback(() => {
    window.location.href = `${BASE}/auth/login`
  }, [])

  React.useEffect(() => {
    setUnauthorizedHandler(signOut)
  }, [signOut])

  React.useEffect(() => {
    // The ACS callback redirects here with the token in a URL fragment
    // (never a query param, so it's never sent to a server or logged).
    const hash = window.location.hash
    if (hash.startsWith("#auth=")) {
      const token = decodeURIComponent(hash.slice("#auth=".length))
      sessionStorage.setItem(TOKEN_STORAGE_KEY, token)
      // Scrub the token out of the address bar/history immediately.
      history.replaceState(null, "", window.location.pathname + window.location.search)
    }

    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY)
    setAuthToken(token)

    if (LOCAL_DEV_BYPASS_AUTH) {
      // Okta is disabled for local testing — never fall back to the sign-in screen,
      // even if the backend is unreachable or getMe() fails for any reason.
      setStatus("authenticated")
      api.getMe().then(setUser).catch(() => {})
      return
    }

    if (!token) {
      setStatus("unauthenticated")
      return
    }

    api
      .getMe()
      .then((claims) => {
        setUser(claims)
        setStatus("authenticated")
      })
      .catch(() => {
        setAuthToken(null)
        sessionStorage.removeItem(TOKEN_STORAGE_KEY)
        setStatus("unauthenticated")
      })
  }, [])

  const value = React.useMemo(
    () => ({ status, user, signIn, signOut }),
    [status, user, signIn, signOut]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider")
  return ctx
}
