// Geometry types for packing calculations

export interface Point3D {
  x: number // mm
  y: number // mm
  z: number // mm
}

export interface Dimensions {
  length: number // mm
  width: number // mm
  height: number // mm
}

export interface Box {
  id: string
  position: Point3D
  dimensions: Dimensions
  rotation: number // degrees (0, 90, 180, 270)
  weight: number // kg
}

export interface TrailerBounds {
  length: number // mm
  width: number // mm
  height: number // mm
  wheelArches?: {
    height: number // mm
    width: number // mm
    positionX?: number // mm from start
  }
}

export interface CollisionResult {
  hasCollision: boolean
  collidingBoxes: string[]
}

export interface CenterOfGravity {
  x: number // mm
  y: number // mm
  z: number // mm
  totalWeight: number // kg
}

