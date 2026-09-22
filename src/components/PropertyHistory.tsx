import * as React from "react"
import { ArrowLeft, RefreshCw, Star } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
import type { BatchDto, PropertyDto } from "@/types"

interface Props {
  property: PropertyDto
  onBack: () => void
  onOpenClassMapping: (property: PropertyDto, batchId: number) => void
  onOpenDetails: (property: PropertyDto, batchId: number) => void
  onOpenExport: (property: PropertyDto, batchId: number) => void
  onOpenUnique: (property: PropertyDto, batchId: number) => void
  onUploadNew: (property: PropertyDto) => void
}

function RowLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="text-primary underline underline-offset-2 hover:no-underline"
      onClick={onClick}
    >
      {label}
    </button>
  )
}

function toDateInputValue(value: string | null): string {
  if (!value) return ""
  return value.slice(0, 10)
}

/** Ports PropertyHistoryList.razor: the batch/upload history for one property, with the
 *  "king batch" star/rank flags editable in place (see backend/shared/batches.py). */
export function PropertyHistory({
  property,
  onBack,
  onOpenClassMapping,
  onOpenDetails,
  onOpenExport,
  onOpenUnique,
  onUploadNew,
}: Props) {
  const [batches, setBatches] = React.useState<BatchDto[]>([])
  const [showAll, setShowAll] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [savingId, setSavingId] = React.useState<number | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setBatches(await api.getBatches(property.propertyID, showAll))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load batch history")
    } finally {
      setLoading(false)
    }
  }, [property.propertyID, showAll])

  React.useEffect(() => {
    load()
  }, [load])

  async function saveBatch(batch: BatchDto, patch: Partial<BatchDto>) {
    const updated = { ...batch, ...patch }
    setBatches((rows) => rows.map((r) => (r.batchID === batch.batchID ? updated : r)))
    setSavingId(batch.batchID)
    try {
      await api.updateBatch(batch.batchID, {
        rentRollDate: updated.rentRollDate,
        source: updated.source,
        excludeFromList: updated.excludeFromList,
        kingOfPropertyBatchList: updated.kingOfPropertyBatchList,
        rankOfPropertyBatchList: updated.rankOfPropertyBatchList,
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save batch")
      setBatches((rows) => rows.map((r) => (r.batchID === batch.batchID ? batch : r)))
    } finally {
      setSavingId(null)
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
            <CardTitle className="text-lg">Property History</CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.name} &middot; {property.distinctUnitCount} distinct units
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input"
              checked={showAll}
              onChange={(e) => setShowAll(e.target.checked)}
            />
            Show All Batches for Property
          </label>
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
                  <TableHead>Batch</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Upload Date</TableHead>
                  <TableHead>RentRoll Date</TableHead>
                  <TableHead>King</TableHead>
                  <TableHead>Rank</TableHead>
                  <TableHead>Delete?</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Review RR</TableHead>
                  <TableHead>Export</TableHead>
                  <TableHead>Class Mapping</TableHead>
                  <TableHead>RR Unique</TableHead>
                  <TableHead>Upload New</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {batches.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                      No batches found for this property.
                    </TableCell>
                  </TableRow>
                )}
                {batches.map((b) => (
                  <TableRow
                    key={b.batchID}
                    className={cn(savingId === b.batchID && "opacity-60")}
                  >
                    <TableCell className="font-medium">{b.batchID}</TableCell>
                    <TableCell>{b.source}</TableCell>
                    <TableCell>{b.batchDate?.slice(0, 10)}</TableCell>
                    <TableCell>
                      <input
                        type="date"
                        className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                        value={toDateInputValue(b.rentRollDate)}
                        onChange={(e) => saveBatch(b, { rentRollDate: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        title="Priority Mapping"
                        onClick={() =>
                          saveBatch(b, { kingOfPropertyBatchList: !b.kingOfPropertyBatchList })
                        }
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            b.kingOfPropertyBatchList
                              ? "fill-amber-400 text-amber-500"
                              : "text-muted-foreground"
                          )}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <input
                        type="number"
                        className="h-8 w-16 rounded-md border border-input bg-background px-2 text-sm"
                        value={b.rankOfPropertyBatchList}
                        onChange={(e) =>
                          saveBatch(b, { rankOfPropertyBatchList: Number(e.target.value) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-input"
                        checked={b.excludeFromList}
                        onChange={(e) => saveBatch(b, { excludeFromList: e.target.checked })}
                      />
                    </TableCell>
                    <TableCell>{b.username}</TableCell>
                    <TableCell>
                      <RowLink label="Review RR" onClick={() => onOpenDetails(property, b.batchID)} />
                    </TableCell>
                    <TableCell>
                      <RowLink label="Export" onClick={() => onOpenExport(property, b.batchID)} />
                    </TableCell>
                    <TableCell>
                      <RowLink
                        label="Class Mapping"
                        onClick={() => onOpenClassMapping(property, b.batchID)}
                      />
                    </TableCell>
                    <TableCell>
                      <RowLink
                        label="RR Unique"
                        onClick={() => onOpenUnique(property, b.batchID)}
                      />
                    </TableCell>
                    <TableCell>
                      <RowLink label="Upload New" onClick={() => onUploadNew(property)} />
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
