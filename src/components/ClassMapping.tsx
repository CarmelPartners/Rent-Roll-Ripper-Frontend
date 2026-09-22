import * as React from "react"
import { ArrowLeft, ArrowDownToLine, Plus, RefreshCw, Trash2 } from "lucide-react"
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
import type { ClassMappingDto, NamedOption, PropertyDto } from "@/types"

interface Props {
  property: PropertyDto
  batchId: number | null
  onBack: () => void
}

const NEW_ROW_DEFAULTS = {
  unitClass: "_New",
  mruBmr: "MRU",
  bed: "0",
  bath: "0",
  modifier1: 0,
  modifier2: 0,
  renovationStatus: 0,
  category1: "",
  category2: "",
  category3: "",
}

/** Ports ClassMapping.razor: the per-property unit-class taxonomy grid. Row edits save
 *  immediately (see backend/shared/class_mapping.py) — a deliberate simplification of the
 *  legacy grid's "stage locally, then click Update Page" bulk-save pattern, matching the
 *  same per-field-save UX already used on the Property History page. */
export function ClassMapping({ property, batchId, onBack }: Props) {
  const [rows, setRows] = React.useState<ClassMappingDto[]>([])
  const [modifiers, setModifiers] = React.useState<NamedOption[]>([])
  const [renovationStatuses, setRenovationStatuses] = React.useState<NamedOption[]>([])
  const [mruBmrOptions, setMruBmrOptions] = React.useState<NamedOption[]>([])
  const [loading, setLoading] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)
  const [applyingId, setApplyingId] = React.useState<number | null>(null)

  /** Ports PostEtlToDetail. Pushes this mapping's MRU/BMR, Modifier and Categories onto every
   *  rent roll detail row whose FloorPlan matches the unit class — scoped to this batch when
   *  the page was opened from one, otherwise every batch for the property. It overwrites
   *  detail data, so it confirms first. */
  async function applyToDetail(row: ClassMappingDto) {
    const scope =
      batchId == null
        ? `every batch for ${property.name}`
        : `batch ${batchId}`
    if (
      !confirm(
        `Apply mapping "${row.unitClass}" to the rent roll detail rows in ${scope}?

` +
          `This overwrites MRU/BMR, Modifier and Categories on every detail row whose ` +
          `FloorPlan matches "${row.unitClass}".`
      )
    )
      return
    setApplyingId(row.mappingID)
    try {
      const result = await api.applyClassMappingToDetail(
        row.mappingID,
        batchId == null ? { allBatches: true } : { batchId }
      )
      if (result.warning) {
        toast.warning(result.warning)
      } else if (result.rowsTargeted === 0) {
        toast.info(
          `No detail rows have FloorPlan "${result.unitClass}" in ${scope}, so nothing changed.`
        )
      } else {
        toast.success(
          `Applied ${result.applied.join(", ")} to ${result.rowsTargeted} detail row` +
            `${result.rowsTargeted === 1 ? "" : "s"}.`
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to apply to detail")
    } finally {
      setApplyingId(null)
    }
  }

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [mappings, mods, renos, mrus] = await Promise.all([
        api.getClassMappings(property.propertyID),
        api.getModifiers(),
        api.getRenovationStatuses(),
        api.getMruBmrOptions(),
      ])
      setRows(mappings)
      setModifiers(mods)
      setRenovationStatuses(renos)
      setMruBmrOptions(mrus)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load class mapping")
    } finally {
      setLoading(false)
    }
  }, [property.propertyID])

  React.useEffect(() => {
    load()
  }, [load])

  async function saveRow(row: ClassMappingDto, patch: Partial<ClassMappingDto>) {
    const updated = { ...row, ...patch }
    setRows((r) => r.map((x) => (x.mappingID === row.mappingID ? updated : x)))
    setSavingId(row.mappingID)
    try {
      await api.updateClassMapping(row.mappingID, {
        unitClass: updated.unitClass ?? "",
        mruBmr: updated.mruBmr ?? "",
        bed: updated.bed ?? "",
        bath: updated.bath ?? "",
        modifier1: updated.modifier1 ?? 0,
        modifier2: updated.modifier2 ?? 0,
        renovationStatus: updated.renovationStatus ?? 0,
        category1: updated.category1 ?? "",
        category2: updated.category2 ?? "",
        category3: updated.category3 ?? "",
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save class mapping")
      setRows((r) => r.map((x) => (x.mappingID === row.mappingID ? row : x)))
    } finally {
      setSavingId(null)
    }
  }

  async function addRow() {
    try {
      const result = await api.addClassMapping({ propertyId: property.propertyID, ...NEW_ROW_DEFAULTS })
      if (result.created) {
        toast.success(result.message)
        load()
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add class mapping")
    }
  }

  async function deleteRow(row: ClassMappingDto) {
    try {
      await api.deleteClassMapping(row.mappingID)
      setRows((r) => r.filter((x) => x.mappingID !== row.mappingID))
      toast.success(`Removed "${row.unitClass}"`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete class mapping")
    }
  }

  async function syncFromBatch() {
    if (!batchId) {
      toast.error("No batch to sync from for this property.")
      return
    }
    setSyncing(true)
    try {
      await api.syncClassMapping(batchId, property.propertyID)
      toast.success(`Synced class mapping from batch ${batchId}`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back">
            <ArrowLeft />
          </Button>
          <div>
            <CardTitle className="text-lg">Edit Class Mapping</CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.name} &middot; {property.distinctUnitCount} distinct units
              {batchId ? ` · batch ${batchId}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
          <Button variant="outline" onClick={syncFromBatch} disabled={syncing || !batchId}>
            {syncing ? "Syncing..." : "Sync from Batch"}
          </Button>
          <Button onClick={addRow}>
            <Plus />
            Add an Item
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
                  <TableHead>Unit Class</TableHead>
                  <TableHead>MRU/BMR</TableHead>
                  <TableHead>Bed</TableHead>
                  <TableHead>Bath</TableHead>
                  <TableHead>Modifier 1</TableHead>
                  <TableHead>Modifier 2</TableHead>
                  <TableHead>Renovation Status</TableHead>
                  <TableHead>Category 1</TableHead>
                  <TableHead className="text-right">Unit Count</TableHead>
                  <TableHead className="text-right">Avg SqFt</TableHead>
                  <TableHead></TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={12} className="h-24 text-center text-muted-foreground">
                      No class mappings for this property yet.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((row) => (
                  <TableRow key={row.mappingID} className={cn(savingId === row.mappingID && "opacity-60")}>
                    <TableCell>
                      <Input
                        className="h-8 w-32"
                        value={row.unitClass ?? ""}
                        onChange={(e) => saveRow(row, { unitClass: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.mruBmr ?? ""}
                        onChange={(e) => saveRow(row, { mruBmr: e.target.value })}
                      >
                        {mruBmrOptions.map((o) => (
                          <option key={o.id} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-14"
                        value={row.bed ?? ""}
                        onChange={(e) => saveRow(row, { bed: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-14"
                        value={row.bath ?? ""}
                        onChange={(e) => saveRow(row, { bath: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.modifier1 ?? 0}
                        onChange={(e) => saveRow(row, { modifier1: Number(e.target.value) })}
                      >
                        <option value={0}>—</option>
                        {modifiers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.modifier2 ?? 0}
                        onChange={(e) => saveRow(row, { modifier2: Number(e.target.value) })}
                      >
                        <option value={0}>—</option>
                        {modifiers.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <select
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={row.renovationStatus ?? 0}
                        onChange={(e) => saveRow(row, { renovationStatus: Number(e.target.value) })}
                        disabled={renovationStatuses.length === 0}
                      >
                        <option value={0}>—</option>
                        {renovationStatuses.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 w-28"
                        value={row.category1 ?? ""}
                        onChange={(e) => saveRow(row, { category1: e.target.value })}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.tally ?? 0}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.avgSquareFeet ? Number(row.avgSquareFeet).toFixed(0) : "—"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => applyToDetail(row)}
                        disabled={applyingId === row.mappingID}
                        title="Apply this mapping to the rent roll detail rows"
                      >
                        <ArrowDownToLine className="h-4 w-4" />
                      </Button>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => deleteRow(row)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
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
