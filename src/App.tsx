import * as React from "react"
import { Building2, LogOut, RefreshCw } from "lucide-react"
import { Toaster } from "sonner"
import { AddPropertyDialog } from "@/components/AddPropertyDialog"
import { ChargeCodeList } from "@/components/ChargeCodeList"
import { ClassMapping } from "@/components/ClassMapping"
import { ExportPreview } from "@/components/ExportPreview"
import { ModifierList } from "@/components/ModifierList"
import { PropertyHistory } from "@/components/PropertyHistory"
import { PropertyList } from "@/components/PropertyList"
import { RentRollDetails } from "@/components/RentRollDetails"
import { RentRollUniqueList } from "@/components/RentRollUniqueList"
import { StandardClassList } from "@/components/StandardClassList"
import { UploadRentRollDialog } from "@/components/UploadRentRollDialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { cn } from "@/lib/utils"
import type { PropertyConstructionTypeObject, PropertyDto } from "@/types"

// No router yet — a small union state machine is still simpler than pulling in
// react-router for this pass.
type View =
  | { name: "properties" }
  | { name: "history"; property: PropertyDto }
  | { name: "classMapping"; property: PropertyDto; batchId: number | null }
  | { name: "details"; property: PropertyDto; batchId: number }
  | { name: "export"; property: PropertyDto; batchId: number }
  | { name: "unique"; property: PropertyDto; batchId: number | null }
  | { name: "chargeCodes" }
  | { name: "modifiers" }
  | { name: "standardClasses" }

/** The reference-data pages, which aren't scoped to a property — the legacy nav links
 *  (chargecodelist / modifierlist / carmelstandardclass) with their /{PropertyID}/{BatchID}
 *  route params, which those three pages never actually read. */
const GLOBAL_TABS: Array<{ view: View["name"]; label: string }> = [
  { view: "properties", label: "Properties" },
  { view: "chargeCodes", label: "Charge Codes" },
  { view: "modifiers", label: "Modifiers" },
  { view: "standardClasses", label: "Carmel Standard Class" },
]

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

  const backToProperties = () => setView({ name: "properties" })

  return (
    <div className="min-h-screen bg-muted/30">
      <Toaster position="top-right" richColors />
      <div className="container py-8">
        <header className="mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Building2 className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">RentRoll</h1>
              <p className="text-sm text-muted-foreground">Properties &amp; reference data</p>
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

        <nav className="mb-6 flex flex-wrap gap-2">
          {GLOBAL_TABS.map((tab) => (
            <button
              key={tab.view}
              type="button"
              onClick={() => setView({ name: tab.view } as View)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm",
                view.name === tab.view
                  ? "bg-primary text-primary-foreground"
                  : "bg-background hover:bg-muted"
              )}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {view.name === "history" ? (
          <PropertyHistory
            property={view.property}
            onBack={backToProperties}
            onOpenClassMapping={(property, batchId) =>
              setView({ name: "classMapping", property, batchId })
            }
            onOpenDetails={(property, batchId) =>
              setView({ name: "details", property, batchId })
            }
            onOpenExport={(property, batchId) => setView({ name: "export", property, batchId })}
            onOpenUnique={(property, batchId) => setView({ name: "unique", property, batchId })}
            onUploadNew={(property) => setUploadProperty(property)}
          />
        ) : view.name === "classMapping" ? (
          <ClassMapping
            property={view.property}
            batchId={view.batchId}
            onBack={backToProperties}
          />
        ) : view.name === "details" ? (
          <RentRollDetails
            property={view.property}
            batchId={view.batchId}
            onBack={backToProperties}
          />
        ) : view.name === "export" ? (
          <ExportPreview
            property={view.property}
            batchId={view.batchId}
            onBack={backToProperties}
          />
        ) : view.name === "unique" ? (
          <RentRollUniqueList
            property={view.property}
            batchId={view.batchId}
            onBack={backToProperties}
          />
        ) : view.name === "chargeCodes" ? (
          <ChargeCodeList onBack={backToProperties} />
        ) : view.name === "modifiers" ? (
          <ModifierList onBack={backToProperties} />
        ) : view.name === "standardClasses" ? (
          <StandardClassList onBack={backToProperties} />
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
                    onDeleted={load}
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
