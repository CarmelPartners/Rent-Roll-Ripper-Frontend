/** Claims from the Okta SAML assertion, as returned by GET /api/auth/me. Mirrors
 *  backend/shared/auth.py's CLAIM_ATTRIBUTES + the JWT's own "sub" claim. */
export interface UserClaims {
  sub: string
  email: string
  firstName?: string | null
  lastName?: string | null
  department?: string | null
  displayName?: string | null
}

/** Mirrors backend/shared/properties.py's list_properties(), which ports
 *  RentRoll.Shared/Model/PropertyDto.cs, as returned by GET /api/properties. */
export interface PropertyDto {
  propertyPK: number
  propertyID: string
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  submarket: string
  yearBuilt_LastRenovated: string
  commercialFlag: string
  noofBuildings: string
  noofStories_AboveGrade: string
  noofStories_BelowGrade: string
  constructionType: string
  landInAcres: number
  sellers: string
  partner: string
  source: string
  manager: string
  process: string
  region: string
  maxBatchID: number | null
  minBatchID: number | null
  distinctUnitCount: number
}

/** Mirrors backend/shared/properties.py's get_construction_types(), as returned by
 *  GET /api/properties/construction-types. */
export interface PropertyConstructionTypeObject {
  id: number
  constructionTypeName: string
}

/** Fields the Property Add form submits, matching backend/shared/properties.py's
 *  add_property() input dict (a subset of PropertyStageDto.cs's fields). */
export interface AddPropertyInput {
  name: string
  address: string
  city: string
  state: string
  zipCode: string
  constructionType: string
  landInAcres: number
}

/** POST /api/properties response — see properties.add_property()'s docstring for why
 *  this is a clean {created, propertyID, message} contract rather than the legacy
 *  ambiguous string return. */
export interface AddPropertyResult {
  created: boolean
  propertyID: string | null
  message: string
}

/** Mirrors backend/shared/batches.py's list_batches(), which ports
 *  HomeController.getbatches, as returned by GET /api/batches. One row per
 *  rent-roll upload for a property — the "Property History" page. */
export interface BatchDto {
  batchID: number
  batchDate: string | null
  fileName: string | null
  username: string | null
  rentRollDate: string | null
  source: string | null
  propertyPK: number
  propertyID: string
  excludeFromList: boolean
  kingOfPropertyBatchList: boolean
  rankOfPropertyBatchList: number
  propertyName: string | null
}

/** Fields PATCH /api/batches/{batchId} accepts — see batches.update_batch(). */
export interface UpdateBatchInput {
  rentRollDate: string | null
  source: string | null
  excludeFromList: boolean
  kingOfPropertyBatchList: boolean
  rankOfPropertyBatchList: number
}

/** POST /api/upload response — see backend/shared/rentroll_upload.py's upload_rent_roll(). */
export interface UploadRentRollResult {
  batchID: number
  rowsInserted: number
  rowsSkipped: number
  message: string
}

/** A dropdown option shared by /api/class-mapping/modifiers, /renovation-statuses, and
 *  /mru-bmr-options — see backend/shared/class_mapping.py. */
export interface NamedOption {
  id: number
  name: string
}

/** Mirrors backend/shared/class_mapping.py's list_class_mappings(), which queries the
 *  RentRoll.vw_ClassMappingDetails/vwClassMapping view directly, as returned by
 *  GET /api/class-mapping. */
export interface ClassMappingDto {
  mappingID: number
  propertyPK: number
  propertyID: string
  unitClass: string | null
  mruBmr: string | null
  bed: string | null
  bath: string | null
  modifier1: number | null
  modifier2: number | null
  renovationStatus: number | null
  category1: string | null
  category2: string | null
  category3: string | null
  newSequence: number | null
  uniqueCombinations: string | null
  propertyName: string | null
  tally: number | null
  avgSquareFeet: string | null
  maxSquareFeet: string | null
  minSquareFeet: string | null
  sqFt: string | null
  observedSequence: string | null
  countUnique: string | null
  uniqueValue: string | null
}

/** Fields POST/PATCH /api/class-mapping accept — see class_mapping.add_class_mapping()/
 *  update_class_mapping(). */
export interface ClassMappingInput {
  propertyId: string
  unitClass: string
  mruBmr: string
  bed: string
  bath: string
  modifier1: number
  modifier2: number
  renovationStatus: number
  category1: string
  category2: string
  category3: string
}

/** POST /api/class-mapping response. */
export interface AddClassMappingResult {
  created: boolean
  mappingID: number
  message: string
}

/** Mirrors backend/shared/charge_codes.py's list_charge_codes(), as returned by
 *  GET /api/charge-codes. `include` is the flag rent roll reporting sums on — a Yardi
 *  Multi Line upload registers new codes with it off. */
export interface ChargeCodeDto {
  chargeCodeID: number
  chargeCodeName: string
  include: boolean
}

/** Mirrors backend/shared/modifiers.py's list_modifiers(), as returned by GET /api/modifiers. */
export interface ModifierDto {
  modifierID: number
  modifierName: string
}

/** Mirrors backend/shared/carmel_standard_class.py's list_standard_classes(), as returned
 *  by GET /api/standard-classes. The company-wide unit-class taxonomy. */
export interface StandardClassDto {
  classKey: number
  classID: string
  classDescription: string
  bedroom: string
  bathroom: string
  createDate: string | null
  trafficClassOnly: boolean
}

/** Fields POST/PATCH /api/standard-classes accept. */
export interface StandardClassInput {
  classID: string
  classDescription: string
  bedroom: string
  bathroom: string
  trafficClassOnly: boolean
}

/** Mirrors backend/shared/rentroll_unique.py's list_unique(), as returned by
 *  GET /api/rentroll-unique. `uniqueValue` is the SQL `Unique` column, renamed because
 *  it's a reserved word. */
export interface RentRollUniqueDto {
  id: number
  observedSequence: string | null
  newSequence: string | null
  countUnique: string | null
  uniqueValue: string | null
  propertyID: string | null
}

/** Fields POST/PATCH /api/rentroll-unique accept. */
export interface RentRollUniqueInput {
  observedSequence: string
  newSequence: string
  countUnique: string
  uniqueValue: string
}

/** Mirrors backend/shared/rentroll_details.py's list_details(), as returned by
 *  GET /api/rentroll-details — one row per rent roll detail line for a batch. This is the
 *  "Review RR" grid. */
export interface RentRollDetailDto {
  recordID: number
  propertyPK: number
  propertyID: string
  propertyName: string | null
  batchID: number
  mruBmr: string | null
  floorPlan: string | null
  bed: string | null
  bath: string | null
  modifier1: number | null
  modifier2: number | null
  modifierName: string | null
  modifier2Name: string | null
  renovationStatus: number | null
  category1: string | null
  category2: string | null
  category3: string | null
  status: string | null
  viewvsNonview: string | null
  unit: string | null
  unitType: string | null
  sqFt: string | null
  residentID: string | null
  marketRent: number | null
  actualRent: number | null
  moveIn: string | null
  deposit: number | null
  otherDeposit: number | null
  moveOut: string | null
  leaseExpiration: string | null
  balance: number | null
  leaseRent: number | null
  source: string | null
  chargeCode: string | null
  chargeAmount: number | null
  summaryControl1: string | null
  summaryControl2: string | null
  summaryControl3: string | null
  excludeLine: boolean
  sourceRow: number | null
}

/** The three data-quality reports on the Export page. Each returns loosely-shaped rows
 *  straight out of SQL (the legacy reports are ad-hoc aggregates), so they're indexed
 *  rather than strongly typed. */
export type ExportReportName = "duplicate-units" | "missing-units" | "missing-market-rent"
export type ExportReportRow = Record<string, string | number | boolean | null>

/** GET /api/export/preview returns the raw result set of
 *  RentRoll.spExportRentRollDetails_Preview — column set is defined by the procedure, so
 *  it's rendered dynamically rather than mapped to a fixed interface. */
export type ExportPreviewRow = Record<string, string | number | boolean | null>

/** POST /api/class-mapping/{mappingId}/apply-to-detail response — see
 *  backend/shared/class_mapping.py's apply_to_detail(). `warning` is set when the mapping
 *  couldn't be fully applied (e.g. categories skipped because no Modifier is set). */
export interface ApplyToDetailResult {
  mappingID: number
  unitClass: string
  batchID: number | null
  rowsTargeted: number
  applied: string[]
  warning: string | null
}
