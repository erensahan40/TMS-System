import { Box, TrailerBounds } from '../geometry/types'
import { isWithinBounds, detectCollisions, calculateCenterOfGravity } from '../geometry/collision'

export interface ValidationRule {
  type: string
  severity: 'ERROR' | 'WARNING' | 'INFO'
  message: string
  itemId?: string
}

export interface CargoItem {
  id: string
  isStackable: boolean
  maxStackWeight?: number
  maxStackHeight?: number
  isFragile: boolean
  temperatureMin?: number
  temperatureMax?: number
  adrClass?: string
  thisSideUp?: boolean
}

export interface LoadPlanItem extends Box {
  cargoItem: CargoItem
  stackLevel: number
}

export interface ValidationContext {
  boxes: LoadPlanItem[]
  trailer: TrailerBounds & {
    maxPayload: number
    maxAxleLoad?: number
    temperatureZones?: Array<{
      x: number
      y: number
      width: number
      height: number
      tempMin: number
      tempMax: number
    }>
  }
}

/**
 * Validate all rules for a load plan
 */
export function validateLoadPlan(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []

  // Boundary checks
  rules.push(...validateBoundaries(context))

  // Collision detection
  rules.push(...validateCollisions(context))

  // Weight constraints
  rules.push(...validateWeight(context))

  // Stacking rules
  rules.push(...validateStacking(context))

  // Temperature zones
  rules.push(...validateTemperatureZones(context))

  // Center of gravity
  rules.push(...validateCenterOfGravity(context))

  // ADR conflicts (simplified)
  rules.push(...validateADR(context))

  return rules
}

function validateBoundaries(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes, trailer } = context

  for (const box of boxes) {
    if (!isWithinBounds(box, trailer)) {
      rules.push({
        type: 'BOUNDARY_EXCEEDED',
        severity: 'ERROR',
        message: `Item ${box.id} exceeds trailer boundaries`,
        itemId: box.id,
      })
    }
  }

  return rules
}

function validateCollisions(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes } = context

  const collisionResult = detectCollisions(boxes)

  if (collisionResult.hasCollision) {
    for (const itemId of collisionResult.collidingBoxes) {
      rules.push({
        type: 'COLLISION',
        severity: 'ERROR',
        message: `Item ${itemId} collides with another item`,
        itemId,
      })
    }
  }

  return rules
}

function validateWeight(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes, trailer } = context

  const totalWeight = boxes.reduce((sum, box) => sum + box.weight, 0)

  if (totalWeight > trailer.maxPayload) {
    rules.push({
      type: 'WEIGHT_EXCEEDED',
      severity: 'ERROR',
      message: `Total weight ${totalWeight}kg exceeds max payload ${trailer.maxPayload}kg`,
    })
  } else if (totalWeight > trailer.maxPayload * 0.9) {
    rules.push({
      type: 'WEIGHT_EXCEEDED',
      severity: 'WARNING',
      message: `Total weight ${totalWeight}kg is close to max payload ${trailer.maxPayload}kg`,
    })
  }

  // Simple axle load warning (center of gravity check)
  if (trailer.maxAxleLoad) {
    const cog = calculateCenterOfGravity(boxes)
    const rearAxlePosition = trailer.length * 0.7 // Assume rear axle at 70% of length

    if (cog.x > rearAxlePosition) {
      rules.push({
        type: 'AXLE_LOAD_WARNING',
        severity: 'WARNING',
        message: `Center of gravity is behind rear axle position`,
      })
    }
  }

  return rules
}

function validateStacking(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes } = context

  // Group boxes by stack level
  const stacks = new Map<number, LoadPlanItem[]>()
  for (const box of boxes) {
    if (!stacks.has(box.stackLevel)) {
      stacks.set(box.stackLevel, [])
    }
    stacks.get(box.stackLevel)!.push(box)
  }

  // Check each stack
  for (const [level, levelBoxes] of stacks) {
    if (level === 0) continue // Floor level

    // Find boxes below this level
    const belowBoxes = boxes.filter((b) => b.stackLevel < level)

    for (const box of levelBoxes) {
      // Check if box is stackable
      if (!box.cargoItem.isStackable) {
        rules.push({
          type: 'STACKING_VIOLATION',
          severity: 'ERROR',
          message: `Item ${box.id} is not stackable but is placed on level ${level}`,
          itemId: box.id,
        })
        continue
      }

      // Find the box below this one
      const boxBelow = findBoxBelow(box, belowBoxes)

      if (boxBelow) {
        // Check max stack weight
        if (boxBelow.cargoItem.maxStackWeight) {
          const weightAbove = calculateWeightAbove(box, boxes)
          if (weightAbove > boxBelow.cargoItem.maxStackWeight) {
            rules.push({
              type: 'STACKING_VIOLATION',
              severity: 'ERROR',
              message: `Weight above item ${boxBelow.id} exceeds max stack weight`,
              itemId: boxBelow.id,
            })
          }
        }

        // Check max stack height
        if (boxBelow.cargoItem.maxStackHeight) {
          const heightAbove = calculateHeightAbove(box, boxes)
          if (heightAbove > boxBelow.cargoItem.maxStackHeight) {
            rules.push({
              type: 'STACKING_VIOLATION',
              severity: 'ERROR',
              message: `Stack height above item ${boxBelow.id} exceeds max stack height`,
              itemId: boxBelow.id,
            })
          }
        }

        // Fragile items should not have heavy items on top
        if (boxBelow.cargoItem.isFragile && box.weight > 500) {
          rules.push({
            type: 'FRAGILE_PLACEMENT',
            severity: 'WARNING',
            message: `Heavy item ${box.id} placed on fragile item ${boxBelow.id}`,
            itemId: box.id,
          })
        }
      }
    }
  }

  return rules
}

function findBoxBelow(box: LoadPlanItem, belowBoxes: LoadPlanItem[]): LoadPlanItem | null {
  // Simple check: box is directly above if x,y overlap and z is just above
  for (const below of belowBoxes) {
    const xOverlap =
      box.position.x < below.position.x + below.dimensions.length &&
      box.position.x + box.dimensions.length > below.position.x

    const yOverlap =
      box.position.y < below.position.y + below.dimensions.width &&
      box.position.y + box.dimensions.width > below.position.y

    if (xOverlap && yOverlap) {
      return below
    }
  }

  return null
}

function calculateWeightAbove(box: LoadPlanItem, allBoxes: LoadPlanItem[]): number {
  return allBoxes
    .filter((b) => b.stackLevel > box.stackLevel && boxesOverlapXY(box, b))
    .reduce((sum, b) => sum + b.weight, 0)
}

function calculateHeightAbove(box: LoadPlanItem, allBoxes: LoadPlanItem[]): number {
  const boxesAbove = allBoxes.filter(
    (b) => b.stackLevel > box.stackLevel && boxesOverlapXY(box, b)
  )

  if (boxesAbove.length === 0) return 0

  const maxZ = Math.max(...boxesAbove.map((b) => b.position.z + b.dimensions.height))
  return maxZ - (box.position.z + box.dimensions.height)
}

function boxesOverlapXY(box1: LoadPlanItem, box2: LoadPlanItem): boolean {
  return (
    box1.position.x < box2.position.x + box2.dimensions.length &&
    box1.position.x + box1.dimensions.length > box2.position.x &&
    box1.position.y < box2.position.y + box2.dimensions.width &&
    box1.position.y + box1.dimensions.width > box2.position.y
  )
}

function validateTemperatureZones(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes, trailer } = context

  if (!trailer.temperatureZones || trailer.temperatureZones.length === 0) {
    return rules
  }

  for (const box of boxes) {
    if (box.cargoItem.temperatureMin === undefined) continue

    const boxCenterX = box.position.x + box.dimensions.length / 2
    const boxCenterY = box.position.y + box.dimensions.width / 2

    // Find matching zone
    const matchingZone = trailer.temperatureZones.find((zone) => {
      return (
        boxCenterX >= zone.x &&
        boxCenterX <= zone.x + zone.width &&
        boxCenterY >= zone.y &&
        boxCenterY <= zone.y + zone.height
      )
    })

    if (!matchingZone) {
      rules.push({
        type: 'TEMPERATURE_ZONE_MISMATCH',
        severity: 'ERROR',
        message: `Item ${box.id} requires temperature ${box.cargoItem.temperatureMin}-${box.cargoItem.temperatureMax}°C but is not in a matching zone`,
        itemId: box.id,
      })
    } else {
      // Check if temperature range matches
      if (
        box.cargoItem.temperatureMin < matchingZone.tempMin ||
        box.cargoItem.temperatureMax! > matchingZone.tempMax
      ) {
        rules.push({
          type: 'TEMPERATURE_ZONE_MISMATCH',
          severity: 'ERROR',
          message: `Item ${box.id} temperature range does not match zone temperature`,
          itemId: box.id,
        })
      }
    }
  }

  return rules
}

function validateCenterOfGravity(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes, trailer } = context

  const cog = calculateCenterOfGravity(boxes)

  // Warn if center of gravity is too far back or forward
  const rearThreshold = trailer.length * 0.75
  const frontThreshold = trailer.length * 0.25

  if (cog.x > rearThreshold) {
    rules.push({
      type: 'CENTER_OF_GRAVITY_WARNING',
      severity: 'WARNING',
      message: `Center of gravity is too far back (${(cog.x / 1000).toFixed(2)}m from front)`,
    })
  } else if (cog.x < frontThreshold) {
    rules.push({
      type: 'CENTER_OF_GRAVITY_WARNING',
      severity: 'WARNING',
      message: `Center of gravity is too far forward (${(cog.x / 1000).toFixed(2)}m from front)`,
    })
  }

  return rules
}

function validateADR(context: ValidationContext): ValidationRule[] {
  const rules: ValidationRule[] = []
  const { boxes } = context

  // Simplified ADR validation: check if incompatible classes are adjacent
  const adrBoxes = boxes.filter((b) => b.cargoItem.adrClass)

  for (let i = 0; i < adrBoxes.length; i++) {
    for (let j = i + 1; j < adrBoxes.length; j++) {
      const box1 = adrBoxes[i]
      const box2 = adrBoxes[j]

      // Check if boxes are adjacent (simplified: within 1m)
      const distance = Math.sqrt(
        Math.pow(box1.position.x - box2.position.x, 2) +
          Math.pow(box1.position.y - box2.position.y, 2)
      )

      if (distance < 1000) {
        // Some ADR classes cannot be adjacent (simplified rule)
        if (box1.cargoItem.adrClass === '3' && box2.cargoItem.adrClass === '8') {
          rules.push({
            type: 'ADR_CONFLICT',
            severity: 'ERROR',
            message: `ADR class 3 and 8 items cannot be adjacent`,
            itemId: box1.id,
          })
        }
      }
    }
  }

  return rules
}

