import * as React from "react"
import { Building2, LogOut, RefreshCw } from "lucide-react"
import { Toaster } from "sonner"
import { AddPropertyDialog } from "@/components/AddPropertyDialog"
import { ClassMapping } from "@/components/ClassMapping"
import { PropertyHistory } from "@/components/PropertyHistory"
import { PropertyList } from "@/components/PropertyList"
import { UploadRentRollDialog } from "@/components/UploadRentRollDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import type { PropertyConstructionTypeObject, PropertyDto } from "@/types"

// No router yet — there are only a few views today, so a small union state
// machine is simpler than pulling in react-router for this pass.
type View =
  | { name: "properties" }
  | { name: "history"; property: PropertyDto }
  | { name: "classMapping"; property: PropertyDto; batchId: number | null }

export default function App() {
  const { user, signOut } = useAuth()
  const [properties, setProperties] = React.useState<PropertyDto[]>([])
  const [constructionTypes, setConstructionTypes] = React.useState<
    PropertyConstructionTypeObject[]
  >([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  // PropertyStageList.razor's "Show All Properties" checkbox defaults to checked
  // (ShowAll = true), i.e. inactive/archived properties are included by default.
  const [showAll, setShowAll] = React.useState(true)
  const [view, setView] = React.useState<View>({ name: "properties" })
  const [uploadProperty, setUploadProperty] = React.useState<PropertyDto | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [props, types] = await Promise.all([
        api.getProperties(showAll),
        api.getConstructionTypes(),
      ])
      setProperties(props)
      setConstructionTypes(types)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load properties")
    } finally {
      setLoading(false)
    }
  }, [showAll])

  React.useEffect(() => {
    load()
  }, [load])

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-right" richColors />
      <div className="container py-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">RentRoll</h1>
              <p className="text-sm text-muted-foreground">Properties</p>
            </div>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{user.displayName}</span>
              <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
                <LogOut />
              </Button>
            </div>
          )}
        </header>

        {view.name === "history" ? (
          <PropertyHistory
            property={view.property}
            onBack={() => setView({ name: "properties" })}
            onOpenClassMapping={(property, batchId) =>
              setView({ name: "classMapping", property, batchId })
            }
            onUploadNew={(property) => setUploadProperty(property)}
          />
        ) : view.name === "classMapping" ? (
          <ClassMapping
            property={view.property}
            batchId={view.batchId}
            onBack={() => setView({ name: "properties" })}
          />
        ) : (
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
              <CardTitle className="text-lg">Properties</CardTitle>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input"
                    checked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                  />
                  Show All Properties
                </label>
                <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
                  <RefreshCw className={loading ? "animate-spin" : ""} />
                </Button>
                <AddPropertyDialog constructionTypes={constructionTypes} onAdded={load} />
              </div>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                  {error}
                </div>
              ) : (
                <div className="rounded-md border">
                  <PropertyList
                    properties={properties}
                    onOpenHistory={(property) => setView({ name: "history", property })}
                    onOpenClassMapping={(property) =>
                      setView({ name: "classMapping", property, batchId: property.maxBatchID })
                    }
                    onUploadNew={(property) => setUploadProperty(property)}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {uploadProperty && (
        <UploadRentRollDialog
          property={uploadProperty}
          open={!!uploadProperty}
          onOpenChange={(open) => !open && setUploadProperty(null)}
          onUploaded={load}
        />
      )}
    </div>
  )
}
