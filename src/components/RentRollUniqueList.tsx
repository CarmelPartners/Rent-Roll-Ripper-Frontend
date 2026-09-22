import * as React from "react"
import { ArrowLeft, Plus, RefreshCw, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import type { PropertyDto, RentRollUniqueDto, RentRollUniqueInput } from "@/types"

interface Props {
  property: PropertyDto
  batchId: number | null
  onBack: () => void
}

const EDITABLE = [
  ["observedSequence", "Observed Sequence"],
  ["newSequence", "New Sequence"],
  ["countUnique", "Count Unique"],
  ["uniqueValue", "Unique"],
] as const

function toInput(row: RentRollUniqueDto): RentRollUniqueInput {
  return {
    observedSequence: row.observedSequence ?? "",
    newSequence: row.newSequence ?? "",
    countUnique: row.countUnique ?? "",
    uniqueValue: row.uniqueValue ?? "",
  }
}

/** Ports RentRollUniqueList.razor: the per-property "unique combination" sequence rows that
 *  Class Mapping and the export order unit classes by (RentRoll.RR_Unique).
 *
 *  All four value columns are varchar in the schema, not numbers, so they're free text here —
 *  matching the legacy DTO rather than imposing numeric inputs the database wouldn't enforce. */
export function RentRollUniqueList({ property, batchId, onBack }: Props) {
  const [rows, setRows] = React.useState<RentRollUniqueDto[]>([])
  const [loading, setLoading] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.getRentRollUnique(property.propertyID))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load RR unique rows")
    } finally {
      setLoading(false)
    }
  }, [property.propertyID])

  React.useEffect(() => {
    load()
  }, [load])

  async function save(row: RentRollUniqueDto, patch: Partial<RentRollUniqueDto>) {
    const updated = { ...row, ...patch }
    setRows((rs) => rs.map((r) => (r.id === row.id ? updated : r)))
    setSavingId(row.id)
    try {
      await api.updateRentRollUnique(row.id, toInput(updated))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save row")
      setRows((rs) => rs.map((r) => (r.id === row.id ? row : r)))
    } finally {
      setSavingId(null)
    }
  }

  async function add() {
    try {
      await api.addRentRollUnique(property.propertyID, {
        observedSequence: "",
        newSequence: "",
        countUnique: "",
        uniqueValue: "",
      })
      toast.success("Row added.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add row")
    }
  }

  async function remove(row: RentRollUniqueDto) {
    if (!confirm(`Delete unique row ${row.id}?`)) return
    try {
      await api.deleteRentRollUnique(row.id)
      setRows((rs) => rs.filter((r) => r.id !== row.id))
      toast.success("Row deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete row")
    }
  }

  async function sync() {
    if (batchId == null) {
      toast.error("Open this page from a batch to sync — a batch is required.")
      return
    }
    setSyncing(true)
    try {
      await api.syncRentRollUnique(batchId, property.propertyID)
      toast.success(`Unique rows recomputed from batch ${batchId}.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to properties">
            <ArrowLeft />
          </Button>
          <div>
            <CardTitle className="text-lg">RR Unique</CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.name} &middot; {rows.length} rows
              {batchId != null ? ` · batch ${batchId}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={add}>
            <Plus className="mr-2 h-4 w-4" />
            Add row
          </Button>
          <Button variant="outline" onClick={sync} disabled={syncing || batchId == null}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sync from batch
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">ID</TableHead>
                  {EDITABLE.map(([field, label]) => (
                    <TableHead key={field}>{label}</TableHead>
                  ))}
                  <TableHead className="w-20">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No unique rows for this property yet — use "Sync from batch".
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow key={r.id} className={cn(savingId === r.id && "opacity-60")}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    {EDITABLE.map(([field]) => (
                      <TableCell key={field}>
                        <Input
                          className="h-8"
                          defaultValue={r[field] ?? ""}
                          onBlur={(e) => {
                            const value = e.target.value
                            if (value !== (r[field] ?? "")) save(r, { [field]: value })
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => remove(r)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
