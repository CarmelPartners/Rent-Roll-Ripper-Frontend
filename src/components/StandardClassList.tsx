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
import type { StandardClassDto, StandardClassInput } from "@/types"

interface Props {
  onBack: () => void
}

const BLANK: StandardClassInput = {
  classID: "",
  classDescription: "",
  bedroom: "",
  bathroom: "",
  trafficClassOnly: false,
}

function toInput(row: StandardClassDto): StandardClassInput {
  return {
    classID: row.classID ?? "",
    classDescription: row.classDescription ?? "",
    bedroom: row.bedroom ?? "",
    bathroom: row.bathroom ?? "",
    trafficClassOnly: row.trafficClassOnly,
  }
}

/** Ports CarmelStandardClass.razor: the company-wide unit-class taxonomy that per-property
 *  Class Mapping rows map onto.
 *
 *  The legacy page was read-only in practice — its update SQL ends with an unreplaced
 *  `WHERE <Search Conditions,,>` template placeholder, and its delete targets the wrong
 *  table. Both are fixed in backend/shared/carmel_standard_class.py, so this page can edit. */
export function StandardClassList({ onBack }: Props) {
  const [rows, setRows] = React.useState<StandardClassDto[]>([])
  const [draft, setDraft] = React.useState<StandardClassInput>(BLANK)
  const [adding, setAdding] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingKey, setSavingKey] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.getStandardClasses())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load standard classes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  async function save(row: StandardClassDto, patch: Partial<StandardClassDto>) {
    const updated = { ...row, ...patch }
    setRows((rs) => rs.map((r) => (r.classKey === row.classKey ? updated : r)))
    setSavingKey(row.classKey)
    try {
      await api.updateStandardClass(row.classKey, toInput(updated))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save standard class")
      setRows((rs) => rs.map((r) => (r.classKey === row.classKey ? row : r)))
    } finally {
      setSavingKey(null)
    }
  }

  async function add() {
    const missing = (["classID", "classDescription", "bedroom", "bathroom"] as const).filter(
      (f) => !draft[f].trim()
    )
    if (missing.length) {
      toast.error(`Required: ${missing.join(", ")}.`)
      return
    }
    try {
      await api.addStandardClass(draft)
      toast.success(`Added "${draft.classID}".`)
      setDraft(BLANK)
      setAdding(false)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add standard class")
    }
  }

  async function remove(row: StandardClassDto) {
    if (!confirm(`Delete standard class "${row.classID}"?`)) return
    try {
      await api.deleteStandardClass(row.classKey)
      setRows((rs) => rs.filter((r) => r.classKey !== row.classKey))
      toast.success(`Deleted "${row.classID}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete standard class")
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
            <CardTitle className="text-lg">Carmel Standard Class</CardTitle>
            <p className="text-sm text-muted-foreground">{rows.length} standard classes</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAdding((v) => !v)}>
            <Plus className="mr-2 h-4 w-4" />
            {adding ? "Cancel" : "New class"}
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {adding && (
          <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/40 p-3">
            {(
              [
                ["classID", "Class ID"],
                ["classDescription", "Description"],
                ["bedroom", "Bedroom"],
                ["bathroom", "Bathroom"],
              ] as const
            ).map(([field, label]) => (
              <div key={field} className="space-y-1">
                <span className="text-xs text-muted-foreground">{label}</span>
                <Input
                  className="h-8 w-40"
                  value={draft[field]}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                />
              </div>
            ))}
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-input"
                checked={draft.trafficClassOnly}
                onChange={(e) => setDraft((d) => ({ ...d, trafficClassOnly: e.target.checked }))}
              />
              Traffic class only
            </label>
            <Button onClick={add}>Add</Button>
          </div>
        )}

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">Key</TableHead>
                  <TableHead>Class ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-24">Bedroom</TableHead>
                  <TableHead className="w-24">Bathroom</TableHead>
                  <TableHead className="w-32">Traffic only?</TableHead>
                  <TableHead className="w-28">Created</TableHead>
                  <TableHead className="w-20">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No standard classes found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow
                    key={r.classKey}
                    className={cn(savingKey === r.classKey && "opacity-60")}
                  >
                    <TableCell className="font-medium">{r.classKey}</TableCell>
                    {(
                      [
                        ["classID", "w-32"],
                        ["classDescription", "w-64"],
                        ["bedroom", "w-20"],
                        ["bathroom", "w-20"],
                      ] as const
                    ).map(([field, width]) => (
                      <TableCell key={field}>
                        <Input
                          className={cn("h-8", width)}
                          defaultValue={r[field] ?? ""}
                          onBlur={(e) => {
                            const value = e.target.value.trim()
                            if (value && value !== (r[field] ?? "").trim()) {
                              save(r, { [field]: value })
                            }
                          }}
                        />
                      </TableCell>
                    ))}
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={r.trafficClassOnly}
                        onChange={(e) => save(r, { trafficClassOnly: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.createDate?.slice(0, 10) ?? "—"}
                    </TableCell>
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
