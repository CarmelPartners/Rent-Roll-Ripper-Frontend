import * as React from "react"
import { Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import type { PropertyDto } from "@/types"

interface Props {
  property: PropertyDto
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploaded: () => void
}

/** Ports Upload.razor: pick an upload type + file + rent roll date, upload to
 *  POST /api/upload. Both Yardi types are implemented on the backend; "One Site" isn't
 *  yet (see backend/shared/rentroll_upload.py) but is still offered, since the backend
 *  is the source of truth for what's supported and returns a clear error rather than
 *  silently doing nothing if picked. */
export function UploadRentRollDialog({ property, open, onOpenChange, onUploaded }: Props) {
  const [uploadTypes, setUploadTypes] = React.useState<string[]>([])
  const [uploadType, setUploadType] = React.useState("")
  const [rentRollDate, setRentRollDate] = React.useState("")
  const [file, setFile] = React.useState<File | null>(null)
  const [uploading, setUploading] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    api
      .getUploadTypes()
      .then((types) => {
        setUploadTypes(types)
        setUploadType((current) => current || types[types.indexOf("Yardi Single Line")] || types[0] || "")
      })
      .catch(() => setUploadTypes([]))
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      toast.error("Choose a file to upload.")
      return
    }
    setUploading(true)
    try {
      const result = await api.uploadRentRoll({
        file,
        propertyId: property.propertyID,
        uploadType,
        rentRollDate: rentRollDate || null,
      })
      toast.success(result.message)
      setFile(null)
      onOpenChange(false)
      onUploaded()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Upload New Rent Roll</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label>Property</Label>
              <Input value={property.name} disabled />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="uploadType">Upload Type</Label>
              <select
                id="uploadType"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={uploadType}
                onChange={(e) => setUploadType(e.target.value)}
              >
                {uploadTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="rentRollDate">RentRoll Date</Label>
              <Input
                id="rentRollDate"
                type="date"
                required
                value={rentRollDate}
                onChange={(e) => setRentRollDate(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="file">File (.xlsx, .xlsm)</Label>
              <input
                id="file"
                type="file"
                accept=".xlsx,.xlsm"
                className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={uploading}>
              <Upload />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
