import * as React from "react"
import { AlertTriangle, ArrowLeft, Download, RefreshCw } from "lucide-react"
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
import type {
  ExportPreviewRow,
  ExportReportName,
  ExportReportRow,
  PropertyDto,
} from "@/types"

interface Props {
  property: PropertyDto
  batchId: number
  onBack: () => void
}

const REPORTS: Array<{ id: ExportReportName; label: string; blurb: string }> = [
  {
    id: "duplicate-units",
    label: "Duplicate units",
    blurb: "Units appearing more than once in the export — usually a class-mapping collision.",
  },
  {
    id: "missing-units",
    label: "Missing units",
    blurb:
      "Units in the raw rent roll that never reached the export — dropped somewhere in the class-mapping/ETL chain.",
  },
  {
    id: "missing-market-rent",
    label: "Missing market rent",
    blurb: "Units in the export with no market rent set.",
  },
]

type Tab = "preview" | ExportReportName

function cellText(value: string | number | boolean | null): string {
  if (value == null) return ""
  if (typeof value === "boolean") return value ? "Yes" : "No"
  return String(value)
}

function toCsv(rows: Array<Record<string, unknown>>): string {
  if (!rows.length) return ""
  const columns = Object.keys(rows[0])
  const escape = (v: unknown) => {
    const s = v == null ? "" : String(v)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [
    columns.join(","),
    ...rows.map((r) => columns.map((c) => escape(r[c])).join(",")),
  ].join("\r\n")
}

function downloadCsv(filename: string, rows: Array<Record<string, unknown>>) {
  const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/** Ports Rentrolldetailslist_Preview.razor — the export preview plus its three
 *  data-quality reports.
 *
 *  The preview is RentRoll.spExportRentRollDetails_Preview's own result set, rendered
 *  dynamically: the procedure owns the column list, so pinning it to a fixed interface here
 *  would silently drop columns whenever the procedure changes. */
export function ExportPreview({ property, batchId, onBack }: Props) {
  const [tab, setTab] = React.useState<Tab>("preview")
  const [preview, setPreview] = React.useState<ExportPreviewRow[]>([])
  const [reports, setReports] = React.useState<Partial<Record<ExportReportName, ExportReportRow[]>>>(
    {}
  )
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const load = React.useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [previewRows, ...reportRows] = await Promise.all([
        api.getExportPreview(batchId),
        ...REPORTS.map((r) => api.getExportReport(r.id, batchId, property.propertyID)),
      ])
      setPreview(previewRows)
      setReports(
        Object.fromEntries(REPORTS.map((r, i) => [r.id, reportRows[i]])) as Partial<
          Record<ExportReportName, ExportReportRow[]>
        >
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the export preview")
    } finally {
      setLoading(false)
    }
  }, [batchId, property.propertyID])

  React.useEffect(() => {
    load()
  }, [load])

  const activeRows: Array<Record<string, string | number | boolean | null>> =
    tab === "preview" ? preview : reports[tab] ?? []
  const columns = activeRows.length ? Object.keys(activeRows[0]) : []
  const issueCount = REPORTS.reduce((n, r) => n + (reports[r.id]?.length ?? 0), 0)

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} title="Back to properties">
            <ArrowLeft />
          </Button>
          <div>
            <CardTitle className="text-lg">Export Preview</CardTitle>
            <p className="text-sm text-muted-foreground">
              {property.name} &middot; batch {batchId} &middot; {preview.length} export rows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (!activeRows.length) {
                toast.info("Nothing to export on this tab.")
                return
              }
              downloadCsv(`${tab}-batch-${batchId}.csv`, activeRows)
            }}
          >
            <Download className="mr-2 h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading}>
            <RefreshCw className={loading ? "animate-spin" : ""} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {issueCount > 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-400/60 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              {issueCount} data-quality issue{issueCount === 1 ? "" : "s"} found across the three
              reports below. Review them before treating this export as final.
            </span>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-b pb-2">
          <button
            type="button"
            onClick={() => setTab("preview")}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === "preview" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            )}
          >
            Preview ({preview.length})
          </button>
          {REPORTS.map((r) => {
            const count = reports[r.id]?.length ?? 0
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => setTab(r.id)}
                title={r.blurb}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm",
                  tab === r.id ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  count > 0 && tab !== r.id && "text-amber-700"
                )}
              >
                {r.label} ({count})
              </button>
            )
          })}
        </div>

        {tab !== "preview" && (
          <p className="text-sm text-muted-foreground">
            {REPORTS.find((r) => r.id === tab)?.blurb}
          </p>
        )}

        {error ? (
          <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.length === 0 ? (
                    <TableHead>&nbsp;</TableHead>
                  ) : (
                    columns.map((c) => <TableHead key={c}>{c}</TableHead>)
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeRows.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={Math.max(1, columns.length)}
                      className="h-24 text-center text-muted-foreground"
                    >
                      {loading
                        ? "Loading…"
                        : tab === "preview"
                          ? "The export preview returned no rows for this batch."
                          : "No issues found — nothing to report here."}
                    </TableCell>
                  </TableRow>
                )}
                {activeRows.slice(0, 500).map((row, i) => (
                  <TableRow key={i}>
                    {columns.map((c) => (
                      <TableCell key={c} className="whitespace-nowrap">
                        {cellText(row[c])}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {activeRows.length > 500 && (
          <p className="text-sm text-muted-foreground">
            Showing the first 500 of {activeRows.length} rows — use Download CSV for the full set.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
