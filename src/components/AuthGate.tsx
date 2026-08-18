import * as React from "react"
import { LogIn, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuth } from "@/lib/auth"

/** Gates its children behind the backend's Okta/SAML sign-in. Renders a spinner while the
 *  existing session cookie is being checked, a sign-in prompt if unauthenticated, or the
 *  app itself once authenticated. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, signIn } = useAuth()

  if (status === "checking") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (status === "unauthenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="items-center text-center">
            <ShieldCheck className="mb-2 h-10 w-10 text-primary" />
            <CardTitle>RentRoll</CardTitle>
            <CardDescription>Sign in with your Carmel Partners Okta account.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={signIn}>
              <LogIn />
              Sign in with Okta
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
