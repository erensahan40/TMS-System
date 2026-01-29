/**
 * Frontend types for load-plan components and auth.
 * Mirror Prisma models/enums so we don't depend on @prisma/client exports (not available on Vercel build).
 */

export type UserRole = 'ADMIN' | 'PLANNER' | 'WAREHOUSE' | 'READ_ONLY'

export type PalletType = 'EURO_1200x800' | 'BLOCK_1200x1000' | 'CUSTOM' | 'NO_PALLET'

export type TrailerType =
  | 'BACHE'
  | 'FRIGO'
  | 'STUKGOED'
  | 'CONTAINER_20'
  | 'CONTAINER_40'
  | 'MEGA'
  | 'DUBBELDEK'
  | 'LZV'

export interface CargoItem {
  id: string
  companyId: string
  name: string
  description: string | null
  palletType: PalletType | null
  length: number
  width: number
  height: number
  weight: number
  isStackable: boolean
  maxStackWeight: number | null
  maxStackHeight: number | null
  isFragile: boolean
  adrClass: string | null
  temperatureMin: number | null
  temperatureMax: number | null
  thisSideUp: boolean
  noClamp: boolean
  barcode: string | null
  sku: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Trailer {
  id: string
  companyId: string
  name: string
  type: TrailerType
  model: string | null
  licensePlate: string | null
  internalLength: number
  internalWidth: number
  internalHeight: number
  doorWidth: number | null
  doorHeight: number | null
  maxPayload: number
  maxAxleLoad: number | null
  maxStackHeight: number | null
  hasWheelArches: boolean
  wheelArchHeight: number | null
  wheelArchWidth: number | null
  hasRails: boolean
  railSpacing: number | null
  temperatureMin: number | null
  temperatureMax: number | null
  temperatureZones: unknown
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export type LoadPlanStatus = 'DRAFT' | 'PLANNED' | 'CONFIRMED' | 'EXECUTED'

export interface LoadPlan {
  id: string
  companyId: string
  shipmentId: string | null
  trailerId: string
  name: string
  version: number
  status: LoadPlanStatus
  notes: string | null
  totalWeight: number
  totalVolume: number
  utilization: number
  centerOfGravityX: number | null
  centerOfGravityY: number | null
  centerOfGravityZ: number | null
  createdAt: Date
  updatedAt: Date
  createdById: string | null
}
