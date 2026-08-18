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
