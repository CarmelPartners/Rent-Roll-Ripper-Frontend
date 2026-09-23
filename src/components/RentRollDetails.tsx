import * as React from "react"
import { ArrowLeft, RefreshCw, Save, Trash2, Undo2 } from "lucide-react"
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
import type { NamedOption, PropertyDto, RentRollDetailDto } from "@/types"

interface Props {
  property: PropertyDto
  batchId: number
  onBack: () => void
}

const PAGE_SIZE = 100

/** Text columns edited as free text, in grid order. Bed/Bath are Editable="false" in the
 *  legacy grid and stay read-only here. */
const TEXT_COLUMNS = [
  ["unit", "Unit"],
  ["unitType", "UnitType"],
  ["floorPlan", "FloorPlan"],
  ["mruBmr", "MRU/BMR"],
  ["sqFt", "SqFt"],
  ["status", "Status"],
  ["residentID", "ResidentID"],
  ["viewvsNonview", "View/Nonview"],
  ["category1", "Category1"],
  ["chargeCode", "ChargeCode"],
] as const

const MONEY_COLUMNS = [
  ["marketRent", "MarketRent"],
  ["actualRent", "ActualRent"],
  ["chargeAmount", "ChargeAmount"],
  ["deposit", "Deposit"],
  ["balance", "Balance"],
] as const

type Dirty = Record<number, Partial<RentRollDetailDto>>

function money(value: number | null): string {
  if (value == null) return ""
  return Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Ports RentRollDetailsList.razor — the "Review RR" grid for one batch.
 *
 *  The legacy page never worked: its only query calls dbo.sp_GetRentRollDetails and its save
 *  calls dbo.sp_CreateRentRollDetails / dbo.sp_UpdateRentRollDetails, none of which exist in
 *  the database, and the load swallows its exception, so the grid always rendered empty. See
 *  backend/shared/rentroll_details.py.
 *
 *  Edits are staged locally and saved in one PATCH, which is the legacy grid's own "Update
 *  Page" model and the right shape here — a multi-line batch is ~1,500 rows, so per-keystroke
 *  saving would mean a request per cell. */
export function RentRollDetails({ property, batchId, onBack }: Props) {
  const [rows, setRows] = React.useState<RentRollDetailDto[]>([])
  const [modifiers, setModifiers] = React.useState<NamedOption[]>([])
  const [dirty, setDirty] = React.useState<Dirty>({})
  const [filter, setFilter] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [details, mods] = await Promise.all([
        api.getRentRollDetails(batchId, property.propertyID),
        api.getModifiers(),
      ])
      setRows(details)
      setModifiers(mods)
      setDirty({})
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load rent roll details")
    } finally {
      setLoading(false)
    }
  }, [batchId, property.propertyID])

  React.useEffect(() => {
    load()
  }, [load])

  function edit(recordID: number, patch: Partial<RentRollDetailDto>) {
    setDirty((d) => ({ ...d, [recordID]: { ...d[recordID], ...patch } }))
  }

  function valueOf<K extends keyof RentRollDetailDto>(
    row: RentRollDetailDto,
    field: K
  ): RentRollDetailDto[K] {
    const staged = dirty[row.recordID]
    return staged && field in staged ? (staged[field] as RentRollDetailDto[K]) : row[field]
  }

  const dirtyCount = Object.keys(dirty).length

  async function saveAll() {
    if (!dirtyCount) return
    setSaving(true)
    try {
      const payload = Object.entries(dirty).map(([recordID, patch]) => ({
        recordID: Number(recordID),
        ...patch,
      }))
      const { updated } = await api.updateRentRollDetails(payload)
      toast.success(`Saved ${updated} row${updated === 1 ? "" : "s"}.`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save changes")
    } finally {
      setSaving(false)
    }
  }

  async function remove(row: RentRollDetailDto) {
    if (!confirm(`Delete detail row ${row.recordID} (unit ${row.unit ?? "?"})?`)) return
    try {
      await api.deleteRentRollDetail(row.recordID)
      setRows((rs) => rs.filter((r) => r.recordID !== row.recordID))
      toast.success("Row deleted.")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete row")
    }
  }

  async function sync() {
    setSyncing(true)
    try {
      await api.syncRentRollDetails(batchId, property.propertyID)
      toast.success("Rent roll detail re-synced.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync")
    } finally {
      setSyncing(false)
    }
  }

  const visible = React.useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) =>
      [r.unit, r.unitType, r.status, r.chargeCode, r.residentID]
        .some((v) => (v ?? "").toLowerCase().includes(needle))
    )
  }, [rows, filter])

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const pageRows = visible.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE)

  React.useEffect(() => {
    setPage(0)
  }, [filter])

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to properties">
            <ArrowLeft />
          </Button>
          <div>
            <CardTitle className="text-lg">Review RR</CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.name} &middot; batch {batchId} &middot; {rows.length} rows
              {dirtyCount ? ` · ${dirtyCount} unsaved` : ""}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Filter unit, status, charge code…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-56"
          />
          {dirtyCount > 0 && (
            <Button variant="ghost" onClick={() => setDirty({})}>
              <Undo2 className="mr-2 h-4 w-4" />
              Discard
            </Button>
          )}
          <Button onClick={saveAll} disabled={saving || dirtyCount === 0}>
            <Save className="mr-2 h-4 w-4" />
            Save {dirtyCount || ""}
          </Button>
          <Button variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Re-sync ETL
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-20">Record</TableHead>
                    {TEXT_COLUMNS.map(([field, label]) => (
                      <TableHead key={field}>{label}</TableHead>
                    ))}
                    <TableHead>Modifier</TableHead>
                    {MONEY_COLUMNS.map(([field, label]) => (
                      <TableHead key={field} className="text-right">
                        {label}
                      </TableHead>
                    ))}
                    <TableHead className="w-20">Bed</TableHead>
                    <TableHead className="w-20">Bath</TableHead>
                    <TableHead className="w-24">Exclude?</TableHead>
                    <TableHead className="w-20">Delete</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pageRows.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={TEXT_COLUMNS.length + MONEY_COLUMNS.length + 6}
                        className="h-24 text-center text-muted-foreground"
                      >
                        {rows.length === 0
                          ? "No detail rows for this batch."
                          : "No rows match that filter."}
                      </TableCell>
                    </TableRow>
                  )}
                  {pageRows.map((r) => {
                    const isDirty = r.recordID in dirty
                    return (
                      <TableRow key={r.recordID} className={cn(isDirty && "bg-amber-50/60")}>
                        <TableCell className="font-medium">{r.recordID}</TableCell>
                        {TEXT_COLUMNS.map(([field]) => (
                          <TableCell key={field}>
                            <Input
                              className="h-8 min-w-28"
                              value={(valueOf(r, field) as string) ?? ""}
                              onChange={(e) => edit(r.recordID, { [field]: e.target.value })}
                            />
                          </TableCell>
                        ))}
                        <TableCell>
                          <select
                            className="h-8 w-32 rounded-md border border-input bg-background px-2 text-sm"
                            value={valueOf(r, "modifier1") ?? 0}
                            onChange={(e) =>
                              edit(r.recordID, { modifier1: Number(e.target.value) })
                            }
                          >
                            <option value={0}>—</option>
                            {modifiers.map((m) => (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            ))}
                          </select>
                        </TableCell>
                        {MONEY_COLUMNS.map(([field]) => (
                          <TableCell key={field} className="text-right">
                            <Input
                              className="h-8 w-28 text-right"
                              defaultValue={money(r[field])}
                              onBlur={(e) => {
                                const raw = e.target.value.replace(/[,$\s]/g, "")
                                const parsed = raw === "" ? null : Number(raw)
                                if (parsed !== null && Number.isNaN(parsed)) {
                                  toast.error(`"${e.target.value}" isn't a number.`)
                                  e.target.value = money(r[field])
                                  return
                                }
                                if (parsed !== r[field]) edit(r.recordID, { [field]: parsed })
                              }}
                            />
                          </TableCell>
                        ))}
                        <TableCell className="text-muted-foreground">{r.bed}</TableCell>
                        <TableCell className="text-muted-foreground">{r.bath}</TableCell>
                        <TableCell>
                          <input
                            type="checkbox"
                            className="h-4 w-4 rounded border-input"
                            checked={Boolean(valueOf(r, "excludeLine"))}
                            onChange={(e) => edit(r.recordID, { excludeLine: e.target.checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => remove(r)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>
                  Showing {safePage * PAGE_SIZE + 1}–
                  {Math.min((safePage + 1) * PAGE_SIZE, visible.length)} of {visible.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    Previous
                  </Button>
                  <span>
                    Page {safePage + 1} of {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                    disabled={safePage >= pageCount - 1}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
