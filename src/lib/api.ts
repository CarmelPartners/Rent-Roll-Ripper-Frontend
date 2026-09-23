import type {
  AddClassMappingResult,
  AddPropertyInput,
  AddPropertyResult,
  ApplyToDetailResult,
  BatchDto,
  ChargeCodeDto,
  ClassMappingDto,
  ClassMappingInput,
  ExportPreviewRow,
  ExportReportName,
  ExportReportRow,
  ModifierDto,
  NamedOption,
  PropertyConstructionTypeObject,
  PropertyDto,
  RentRollDetailDto,
  RentRollUniqueDto,
  RentRollUniqueInput,
  StandardClassDto,
  StandardClassInput,
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

  /** Ports PostEtlToDetail: push one mapping row onto the rent roll detail rows it covers.
   *  The scope is explicit — a batch id, or allBatches for the whole property. The API
   *  rejects an unscoped call, because this overwrites detail rows. */
  applyClassMappingToDetail(
    mappingId: number,
    scope: { batchId: number } | { allBatches: true }
  ): Promise<ApplyToDetailResult> {
    return request<ApplyToDetailResult>(`/class-mapping/${mappingId}/apply-to-detail`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scope),
    })
  },

  // --- properties: edit / delete (PropertyStageController PostUpdate / PostDelete) ---

  updateProperty(
    propertyId: string,
    input: Partial<PropertyDto> & { propertyPK: number }
  ): Promise<{ updated: boolean; propertyID: string }> {
    return request(`/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  deleteProperty(
    propertyId: string,
    propertyPK: number
  ): Promise<{ deleted: boolean; message: string }> {
    return request(`/properties/${propertyId}?propertyPK=${propertyPK}`, { method: "DELETE" })
  },

  // --- charge codes ---

  getChargeCodes(): Promise<ChargeCodeDto[]> {
    return request<ChargeCodeDto[]>("/charge-codes")
  },

  addChargeCode(chargeCodeName: string, include: boolean): Promise<{ added: boolean }> {
    return request("/charge-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeCodeName, include }),
    })
  },

  updateChargeCode(
    chargeCodeId: number,
    chargeCodeName: string,
    include: boolean
  ): Promise<{ updated: boolean }> {
    return request(`/charge-codes/${chargeCodeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chargeCodeName, include }),
    })
  },

  deleteChargeCode(chargeCodeId: number): Promise<{ deleted: boolean }> {
    return request(`/charge-codes/${chargeCodeId}`, { method: "DELETE" })
  },

  syncChargeCodes(): Promise<{ synced: boolean }> {
    return request("/charge-codes/sync", { method: "POST" })
  },

  // --- modifiers ---

  getModifierList(): Promise<ModifierDto[]> {
    return request<ModifierDto[]>("/modifiers")
  },

  addModifier(modifierName: string): Promise<{ added: boolean }> {
    return request("/modifiers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modifierName }),
    })
  },

  updateModifier(modifierId: number, modifierName: string): Promise<{ updated: boolean }> {
    return request(`/modifiers/${modifierId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modifierName }),
    })
  },

  deleteModifier(modifierId: number): Promise<{ deleted: boolean }> {
    return request(`/modifiers/${modifierId}`, { method: "DELETE" })
  },

  syncModifiers(): Promise<{ synced: boolean }> {
    return request("/modifiers/sync", { method: "POST" })
  },

  // --- carmel standard class ---

  getStandardClasses(): Promise<StandardClassDto[]> {
    return request<StandardClassDto[]>("/standard-classes")
  },

  addStandardClass(input: StandardClassInput): Promise<{ classKey: number }> {
    return request("/standard-classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  updateStandardClass(
    classKey: number,
    input: StandardClassInput
  ): Promise<{ updated: boolean }> {
    return request(`/standard-classes/${classKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  deleteStandardClass(classKey: number): Promise<{ deleted: boolean }> {
    return request(`/standard-classes/${classKey}`, { method: "DELETE" })
  },

  // --- RR unique ---

  getRentRollUnique(propertyId?: string): Promise<RentRollUniqueDto[]> {
    const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : ""
    return request<RentRollUniqueDto[]>(`/rentroll-unique${qs}`)
  },

  addRentRollUnique(
    propertyId: string,
    input: RentRollUniqueInput
  ): Promise<{ id: number }> {
    return request("/rentroll-unique", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...input, propertyId }),
    })
  },

  updateRentRollUnique(
    rowId: number,
    input: RentRollUniqueInput
  ): Promise<{ updated: boolean }> {
    return request(`/rentroll-unique/${rowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    })
  },

  deleteRentRollUnique(rowId: number): Promise<{ deleted: boolean }> {
    return request(`/rentroll-unique/${rowId}`, { method: "DELETE" })
  },

  syncRentRollUnique(batchId: number, propertyId: string): Promise<{ synced: boolean }> {
    return request("/rentroll-unique/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, propertyId }),
    })
  },

  // --- rent roll details (Review RR) ---

  getRentRollDetails(batchId: number, propertyId?: string): Promise<RentRollDetailDto[]> {
    const qs = new URLSearchParams({ batchId: String(batchId) })
    if (propertyId) qs.set("propertyId", propertyId)
    return request<RentRollDetailDto[]>(`/rentroll-details?${qs}`)
  },

  updateRentRollDetails(
    rows: Array<Partial<RentRollDetailDto> & { recordID: number }>
  ): Promise<{ updated: number }> {
    return request("/rentroll-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    })
  },

  deleteRentRollDetail(recordId: number): Promise<{ deleted: boolean }> {
    return request(`/rentroll-details/${recordId}`, { method: "DELETE" })
  },

  syncRentRollDetails(batchId: number, propertyId: string): Promise<{ synced: boolean }> {
    return request("/rentroll-details/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId, propertyId }),
    })
  },

  // --- export preview + data-quality reports ---

  getExportPreview(batchId: number): Promise<ExportPreviewRow[]> {
    return request<ExportPreviewRow[]>(`/export/preview?batchId=${batchId}`)
  },

  getExportReport(
    report: ExportReportName,
    batchId: number,
    propertyId?: string
  ): Promise<ExportReportRow[]> {
    const qs = new URLSearchParams({ batchId: String(batchId) })
    if (propertyId) qs.set("propertyId", propertyId)
    return request<ExportReportRow[]>(`/export/reports/${report}?${qs}`)
  },
}
