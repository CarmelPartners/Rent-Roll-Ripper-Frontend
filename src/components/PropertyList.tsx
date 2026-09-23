import * as React from "react"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import type { PropertyDto } from "@/types"

interface Props {
  properties: PropertyDto[]
  onOpenHistory: (property: PropertyDto) => void
  onOpenClassMapping: (property: PropertyDto) => void
  onUploadNew: (property: PropertyDto) => void
  onDeleted: () => void
}

const PAGE_SIZE_OPTIONS = [25, 50, 100, 250]

// Client-side pagination over the already-fetched list, same pattern as
// YardiReceivableInvoiceExport/frontend's InvoiceGrid.tsx (page size selector,
// first/prev/next/last, "X–Y of Z" range) so the two apps behave consistently.
export function PropertyList({
  properties,
  onOpenHistory,
  onOpenClassMapping,
  onUploadNew,
  onDeleted,
}: Props) {
  const [pageSize, setPageSize] = React.useState(50)
  const [page, setPage] = React.useState(0)
  const [deletingId, setDeletingId] = React.useState<string | null>(null)

  // Ports PropertyStageController.PostDelete. The backend refuses while batches still
  // reference the property, rather than orphaning them — see properties.delete_property.
  async function remove(p: PropertyDto) {
    if (!confirm(`Delete property "${p.name}"? This cannot be undone.`)) return
    setDeletingId(p.propertyID)
    try {
      const result = await api.deleteProperty(p.propertyID, p.propertyPK)
      if (result.deleted) {
        toast.success(result.message)
        onDeleted()
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete property")
    } finally {
      setDeletingId(null)
    }
  }

  const pageCount = Math.max(1, Math.ceil(properties.length / pageSize))

  // Keep the current page valid when the data set or page size changes.
  React.useEffect(() => {
    setPage((p) => Math.min(p, Math.max(0, Math.ceil(properties.length / pageSize) - 1)))
  }, [properties.length, pageSize])

  const start = page * pageSize
  const pageRows = properties.slice(start, start + pageSize)
  const rangeStart = properties.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + pageSize, properties.length)

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>City</TableHead>
            <TableHead>State</TableHead>
            <TableHead>Region</TableHead>
            <TableHead>Construction Type</TableHead>
            <TableHead className="text-right">Distinct Units</TableHead>
            <TableHead>Upload New RR</TableHead>
            <TableHead>Property History</TableHead>
            <TableHead>Edit Class Mapping</TableHead>
            <TableHead className="w-20">Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {properties.length === 0 && (
            <TableRow>
              <TableCell colSpan={11} className="h-24 text-center text-muted-foreground">
                No properties found.
              </TableCell>
            </TableRow>
          )}
          {pageRows.map((p) => (
            <TableRow
              key={p.propertyID}
              className={deletingId === p.propertyID ? "opacity-60" : undefined}
            >
              <TableCell className="font-medium">{p.propertyID}</TableCell>
              <TableCell>{p.name}</TableCell>
              <TableCell>{p.city}</TableCell>
              <TableCell>{p.state}</TableCell>
              <TableCell>{p.region}</TableCell>
              <TableCell>{p.constructionType || "—"}</TableCell>
              <TableCell className="text-right tabular-nums">{p.distinctUnitCount}</TableCell>
              <TableCell>
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                  onClick={() => onUploadNew(p)}
                >
                  Upload New RR
                </button>
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                  onClick={() => onOpenHistory(p)}
                >
                  Property History
                </button>
              </TableCell>
              <TableCell>
                <button
                  type="button"
                  className="text-primary underline underline-offset-2 hover:no-underline"
                  onClick={() => onOpenClassMapping(p)}
                >
                  Edit Class Mapping
                </button>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => remove(p)}
                  disabled={deletingId === p.propertyID}
                  aria-label={`Delete ${p.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
        {properties.length > 0 && (
          <TableFooter>
            <TableRow>
              <TableCell colSpan={11}>{properties.length} properties</TableCell>
            </TableRow>
          </TableFooter>
        )}
      </Table>

      {properties.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t px-3 py-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Rows per page</span>
            <select
              className="h-8 rounded-md border border-input bg-background px-2 text-sm"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setPage(0)
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {rangeStart}&ndash;{rangeEnd} of {properties.length}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(0)}
                disabled={page === 0}
                aria-label="First page"
              >
                <ChevronsLeft />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                aria-label="Previous page"
              >
                <ChevronLeft />
              </Button>
              <span className="min-w-[6rem] text-center text-muted-foreground">
                Page {page + 1} of {pageCount}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                disabled={page >= pageCount - 1}
                aria-label="Next page"
              >
                <ChevronRight />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={() => setPage(pageCount - 1)}
                disabled={page >= pageCount - 1}
                aria-label="Last page"
              >
                <ChevronsRight />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
