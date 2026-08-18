import type {
  AddClassMappingResult,
  AddPropertyInput,
  AddPropertyResult,
  BatchDto,
  ClassMappingDto,
  ClassMappingInput,
  NamedOption,
  PropertyConstructionTypeObject,
  PropertyDto,
  UpdateBatchInput,
  UploadRentRollResult,
  UserClaims,
} from "@/types"

export const BASE = import.meta.env.VITE_API_BASE_URL || "/api"

let authToken: string | null = null
let onUnauthorized: (() => void) | null = null

/** Called by AuthProvider whenever the signed-in token changes (including to null on sign-out). */
export function setAuthToken(token: string | null) {
  authToken = token
}

/** Called by AuthProvider once, to be notified whenever any request comes back 401. */
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      if (body?.error) message = body.error
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  return res.json() as Promise<T>
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (authToken) headers.set("Authorization", `Bearer ${authToken}`)

  const res = await fetch(`${BASE}${path}`, { ...init, headers })
  if (res.status === 401) {
    onUnauthorized?.()
    throw new Error("Your session has expired. Please sign in again.")
  }
  return handle<T>(res)
}

export const api = {
  getMe(): Promise<UserClaims> {
    return request<UserClaims>("/auth/me")
  },

  getProperties(showAll: boolean): Promise<PropertyDto[]> {
    return request<PropertyDto[]>(`/properties?showAll=${showAll}`)
  },

  getConstructionTypes(): Promise<PropertyConstructionTypeObject[]> {
    return request<PropertyConstructionTypeObject[]>("/properties/construction-types")
  },

  addProperty(input: AddPropertyInput): Promise<AddPropertyResult> {
    return request<AddPropertyResult>("/properties", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  getBatches(propertyId: string, showAll: boolean): Promise<BatchDto[]> {
    return request<BatchDto[]>(
      `/batches?propertyId=${encodeURIComponent(propertyId)}&showAll=${showAll}`
    )
  },

  updateBatch(batchId: number, input: UpdateBatchInput): Promise<{ updated: boolean }> {
    return request<{ updated: boolean }>(`/batches/${batchId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  getUploadTypes(): Promise<string[]> {
    return request<string[]>("/upload/types")
  },

  uploadRentRoll(params: {
    file: File
    propertyId: string
    uploadType: string
    rentRollDate: string | null
  }): Promise<UploadRentRollResult> {
    const form = new FormData()
    form.append("file", params.file)
    form.append("propertyId", params.propertyId)
    form.append("uploadType", params.uploadType)
    if (params.rentRollDate) form.append("rentRollDate", params.rentRollDate)
    // Do not set Content-Type manually — the browser needs to add the multipart boundary itself.
    return request<UploadRentRollResult>("/upload", { method: "POST", body: form })
  },

  getClassMappings(propertyId: string): Promise<ClassMappingDto[]> {
    return request<ClassMappingDto[]>(`/class-mapping?propertyId=${encodeURIComponent(propertyId)}`)
  },

  getUnmatchedClassMapping(
    propertyId: string,
    batchId: number
  ): Promise<{ unmatchedClassMapping: unknown[]; unmatchedUniqueMapping: unknown[] }> {
    return request(
      `/class-mapping/unmatched?propertyId=${encodeURIComponent(propertyId)}&batchId=${batchId}`
    )
  },

  getModifiers(): Promise<NamedOption[]> {
    return request<NamedOption[]>("/class-mapping/modifiers")
  },

  getRenovationStatuses(): Promise<NamedOption[]> {
    return request<NamedOption[]>("/class-mapping/renovation-statuses")
  },

  getMruBmrOptions(): Promise<NamedOption[]> {
    return request<NamedOption[]>("/class-mapping/mru-bmr-options")
  },

  addClassMapping(input: ClassMappingInput): Promise<AddClassMappingResult> {
    return request<AddClassMappingResult>("/class-mapping", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  updateClassMapping(
    mappingId: number,
    input: Omit<ClassMappingInput, "propertyId">
  ): Promise<{ updated: boolean }> {
    return request<{ updated: boolean }>(`/class-mapping/${mappingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  deleteClassMapping(mappingId: number): Promise<{ deleted: boolean }> {
    return request<{ deleted: boolean }>(`/class-mapping/${mappingId}`, { method: "DELETE" })
  },

  syncClassMapping(batchId: number, propertyId: string): Promise<{ synced: boolean }> {
    return request<{ synced: boolean }>("/class-mapping/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, propertyId }),
    })
  },
}
