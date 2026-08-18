import * as React from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import type { AddPropertyInput, PropertyConstructionTypeObject } from "@/types"

const EMPTY: AddPropertyInput = {
  name: "",
  address: "",
  city: "",
  state: "",
  zipCode: "",
  constructionType: "",
  landInAcres: 0,
}

interface Props {
  constructionTypes: PropertyConstructionTypeObject[]
  onAdded: () => void
}

export function AddPropertyDialog({ constructionTypes, onAdded }: Props) {
  const [open, setOpen] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [form, setForm] = React.useState<AddPropertyInput>(EMPTY)

  function set<K extends keyof AddPropertyInput>(key: K, value: AddPropertyInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const result = await api.addProperty(form)
      if (result.created) {
        toast.success(result.message)
        setForm(EMPTY)
        setOpen(false)
        onAdded()
      } else {
        toast.error(result.message)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add property")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Add Property
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add Property</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-1.5">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                required
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="city">City</Label>
                <Input id="city" value={form.city} onChange={(e) => set("city", e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  value={form.state}
                  onChange={(e) => set("state", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="zip">ZIP Code</Label>
                <Input
                  id="zip"
                  value={form.zipCode}
                  onChange={(e) => set("zipCode", e.target.value)}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="constructionType">Construction Type</Label>
              <select
                id="constructionType"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm"
                value={form.constructionType}
                onChange={(e) => set("constructionType", e.target.value)}
              >
                <option value="">Select...</option>
                {constructionTypes.map((ct) => (
                  <option key={ct.id} value={ct.constructionTypeName}>
                    {ct.constructionTypeName}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="landInAcres">Land (acres)</Label>
              <Input
                id="landInAcres"
                type="number"
                step="0.01"
                value={form.landInAcres}
                onChange={(e) => set("landInAcres", Number(e.target.value))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
