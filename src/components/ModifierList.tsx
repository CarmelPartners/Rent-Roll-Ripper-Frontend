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
import type { ModifierDto } from "@/types"

interface Props {
  onBack: () => void
}

/** Ports ModifierList.razor: the modifier lookup list that Class Mapping and Review RR pick
 *  from. Note the legacy page could never save — it reads RentRoll.Modifier but writes
 *  RentRoll.Modifier1, which doesn't exist (see backend/shared/modifiers.py). */
export function ModifierList({ onBack }: Props) {
  const [rows, setRows] = React.useState<ModifierDto[]>([])
  const [newName, setNewName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setRows(await api.getModifierList())
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load modifiers")
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    load()
  }, [load])

  async function save(row: ModifierDto, name: string) {
    const updated = { ...row, modifierName: name }
    setRows((rs) => rs.map((r) => (r.modifierID === row.modifierID ? updated : r)))
    setSavingId(row.modifierID)
    try {
      await api.updateModifier(row.modifierID, name)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save modifier")
      setRows((rs) => rs.map((r) => (r.modifierID === row.modifierID ? row : r)))
    } finally {
      setSavingId(null)
    }
  }

  async function add() {
    const name = newName.trim()
    if (!name) {
      toast.error("Enter a modifier name.")
      return
    }
    try {
      const result = await api.addModifier(name)
      toast[result.added ? "success" : "info"](
        result.added ? `Added "${name}".` : `"${name}" already exists.`
      )
      setNewName("")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add modifier")
    }
  }

  async function remove(row: ModifierDto) {
    if (
      !confirm(
        `Delete modifier "${row.modifierName}"?\n\nClass mapping and rent roll detail rows ` +
          `referencing it will keep the raw ID but lose the name.`
      )
    )
      return
    try {
      await api.deleteModifier(row.modifierID)
      setRows((rs) => rs.filter((r) => r.modifierID !== row.modifierID))
      toast.success(`Deleted "${row.modifierName}".`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete modifier")
    }
  }

  async function sync() {
    setSyncing(true)
    try {
      await api.syncModifiers()
      toast.success("Modifiers synced.")
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to sync modifiers")
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
            <CardTitle className="text-lg">Modifiers</CardTitle>
            <p className="text-sm text-muted-foreground">{rows.length} modifiers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={sync} disabled={syncing}>
            <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
            Sync
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            placeholder="New modifier name"
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
                  <TableHead>Modifier</TableHead>
                  <TableHead className="w-20">Delete</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                      No modifiers found.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((r) => (
                  <TableRow
                    key={r.modifierID}
                    className={cn(savingId === r.modifierID && "opacity-60")}
                  >
                    <TableCell className="font-medium">{r.modifierID}</TableCell>
                    <TableCell>
                      <Input
                        className="h-8 max-w-sm"
                        defaultValue={r.modifierName ?? ""}
                        onBlur={(e) => {
                          const value = e.target.value.trim()
                          if (value && value !== r.modifierName) save(r, value)
                        }}
                      />
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
