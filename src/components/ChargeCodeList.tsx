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
import type { ChargeCodeDto } from "@/types"

interface Props {
  onBack: () => void
}

/** Ports ChargeCodeList.razor: the charge code list with its Include toggle.
 *
 *  Include is the flag that matters — rent roll reporting sums the charge codes flagged
 *  Include and ignores the rest. A Yardi Multi Line upload registers every code it finds with
 *  Include off unless the code is literally "rent"/"rentres" (see
 *  backend/shared/rentroll_upload.py's register_charge_codes), so this page is where a newly
 *  uploaded property's codes get turned on. Edits save immediately, matching the rest of
 *  this app rather than the legacy grid's "click Update Page" bulk save. */
export function ChargeCodeList({ onBack }: Props) {
  const [rows, setRows] = React.useState<ChargeCodeDto[]>([])
  const [filter, setFilter] = React.useState("")
  const [newName, setNewName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.getChargeCodes())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load charge codes")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  async function save(row: ChargeCodeDto, patch: Partial<ChargeCodeDto>) {
    const updated = { ...row, ...patch }
    setRows((rs) => rs.map((r) => (r.chargeCodeID === row.chargeCodeID ? updated : r)))
    setSavingId(row.chargeCodeID)
    try {
      await api.updateChargeCode(row.chargeCodeID, updated.chargeCodeName, updated.include)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save charge code")
      setRows((rs) => rs.map((r) => (r.chargeCodeID === row.chargeCodeID ? row : r)))
    } finally {
      setSavingId(null)
    }
  }

  async function add() {
    const name = newName.trim()
    if (!name) {
      toast.error("Enter a charge code name.")
      return
    }
    try {
      const result = await api.addChargeCode(name, false)
      if (!result.added) {
        toast.info(`"${name}" already exists.`)
      } else {
        toast.success(`Added "${name}".`)
      }
      setNewName("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add charge code")
    }
  }

  async function remove(row: ChargeCodeDto) {
    if (!confirm(`Delete charge code "${row.chargeCodeName}"?`)) return
    try {
      await api.deleteChargeCode(row.chargeCodeID)
      setRows((rs) => rs.filter((r) => r.chargeCodeID !== row.chargeCodeID))
      toast.success(`Deleted "${row.chargeCodeName}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete charge code")
    }
  }

  async function sync() {
    setSyncing(true)
    try {
      await api.syncChargeCodes()
      toast.success("Charge codes synced from rent roll detail.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync charge codes")
    } finally {
      setSyncing(false)
    }
  }

  const visible = React.useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((r) => (r.chargeCodeName || "").toLowerCase().includes(needle))
  }, [rows, filter])

  const includedCount = rows.filter((r) => r.include).length

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to properties">
            <ArrowLeft />
          </Button>
          <div>
            <CardTitle className="text-lg">Charge Codes</CardTitle>
            <p className="text-sm text-muted-foreground">
              {rows.length} codes &middot; {includedCount} included in rent
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter codes…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-9 w-48"
          />
          <Button variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sync from detail
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="New charge code name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") add()
            }}
            className="h-9 max-w-xs"
          />
          <Button onClick={add}>
            <Plus className="mr-2 h-4 w-4" />
            Add
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">ID</TableHead>
                  <TableHead>Charge Code</TableHead>
                  <TableHead className="w-32">Include?</TableHead>
                  <TableHead className="w-20">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                      {rows.length === 0 ? "No charge codes found." : "No codes match that filter."}
                    </TableCell>
                  </TableRow>
                )}
                {visible.map((r) => (
                  <TableRow
                    key={r.chargeCodeID}
                    className={cn(savingId === r.chargeCodeID && "opacity-60")}
                  >
                    <TableCell className="font-medium">{r.chargeCodeID}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8"
                        defaultValue={r.chargeCodeName ?? ""}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && value !== r.chargeCodeName) {
                            save(r, { chargeCodeName: value })
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-input"
                          checked={r.include}
                          onChange={(e) => save(r, { include: e.target.checked })}
                        />
                        {r.include ? "Included" : "Excluded"}
                      </label>
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
