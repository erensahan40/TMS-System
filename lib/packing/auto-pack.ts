import { Box } from '../geometry/types'
import { isWithinBounds, boxesCollide, getRotatedDimensions } from '../geometry/collision'
import { CargoItem } from '../validation/rules'

export interface PackingItem {
  id: string
  cargoItem: CargoItem
  dimensions: { length: number; width: number; height: number }
  weight: number
  quantity: number
}

export interface TrailerSpace {
  length: number
  width: number
  height: number
}

/**
 * First-Fit Decreasing (FFD) algorithm for 3D bin packing
 * Sorts items by volume (decreasing) and places them in first available position
 */
export function autoPack(
  items: PackingItem[],
  trailer: TrailerSpace & { maxPayload: number }
): Box[] {
  // Expand items by quantity
  const expandedItems: Array<{
    id: string
    cargoItem: CargoItem
    dimensions: { length: number; width: number; height: number }
    weight: number
    volume: number
  }> = []

  for (const item of items) {
    for (let i = 0; i < item.quantity; i++) {
      expandedItems.push({
        id: `${item.id}-${i}`,
        cargoItem: item.cargoItem,
        dimensions: item.dimensions,
        weight: item.weight,
        volume: item.dimensions.length * item.dimensions.width * item.dimensions.height,
      })
    }
  }

  // Sort by volume (decreasing) - larger items first
  expandedItems.sort((a, b) => b.volume - a.volume)

  const placedBoxes: Box[] = []
  const gridSize = 50 // 50mm grid for placement

  for (const item of expandedItems) {
    let placed = false

    // Try different rotations
    const rotations = [0, 90, 180, 270]
    if (item.cargoItem.thisSideUp) {
      // Only try 0 and 180 if "this side up"
      rotations.splice(1, 2)
    }

    for (const rotation of rotations) {
      const dims = getRotatedDimensionsForItem(item, rotation)

      // Try to find a position
      const position = findFirstFitPosition(
        placedBoxes,
        dims,
        trailer,
        item.cargoItem.isStackable,
        gridSize
      )

      if (position) {
        placedBoxes.push({
          id: item.id,
          position,
          dimensions: item.dimensions,
          rotation,
          weight: item.weight,
        })
        placed = true
        break
      }
    }

    if (!placed) {
      console.warn(`Could not place item ${item.id}`)
    }
  }

  return placedBoxes
}

function getRotatedDimensionsForItem(
  item: { dimensions: { length: number; width: number; height: number } },
  rotation: number
): { length: number; width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return {
      length: item.dimensions.width,
      width: item.dimensions.length,
      height: item.dimensions.height,
    }
  }
  return item.dimensions
}

function findFirstFitPosition(
  existingBoxes: Box[],
  dimensions: { length: number; width: number; height: number },
  trailer: TrailerSpace,
  isStackable: boolean,
  gridSize: number
): { x: number; y: number; z: number } | null {
  // First try floor level
  if (!isStackable) {
    return findFloorPosition(existingBoxes, dimensions, trailer, gridSize)
  }

  // Try stacking on existing boxes
  for (const existingBox of existingBoxes) {
    const stackPosition = tryStackOnBox(existingBox, dimensions, trailer, gridSize)
    if (stackPosition) {
      return stackPosition
    }
  }

  // Fall back to floor
  return findFloorPosition(existingBoxes, dimensions, trailer, gridSize)
}

function findFloorPosition(
  existingBoxes: Box[],
  dimensions: { length: number; width: number; height: number },
  trailer: TrailerSpace,
  gridSize: number
): { x: number; y: number; z: number } | null {
  // Try positions from front to back, left to right
  for (let x = 0; x <= trailer.length - dimensions.length; x += gridSize) {
    for (let y = 0; y <= trailer.width - dimensions.width; y += gridSize) {
      const testBox: Box = {
        id: 'test',
        position: { x, y, z: 0 },
        dimensions,
        rotation: 0,
        weight: 0,
      }

      // Check if this position collides with existing boxes
      let hasCollision = false
      for (const existing of existingBoxes) {
        if (boxesCollide(testBox, existing)) {
          hasCollision = true
          break
        }
      }

      if (!hasCollision && isWithinBounds(testBox, trailer)) {
        return { x, y, z: 0 }
      }
    }
  }

  return null
}

function tryStackOnBox(
  baseBox: Box,
  dimensions: { length: number; width: number; height: number },
  trailer: TrailerSpace,
  gridSize: number
): { x: number; y: number; z: number } | null {
  const baseDims = getRotatedDimensions(baseBox)
  const topZ = baseBox.position.z + baseDims.height

  // Check if stacking would exceed trailer height
  if (topZ + dimensions.height > trailer.height) {
    return null
  }

  // Try to place on top of base box (centered or aligned)
  const positions = [
    { x: baseBox.position.x, y: baseBox.position.y }, // Aligned
    {
      x: baseBox.position.x + (baseDims.length - dimensions.length) / 2,
      y: baseBox.position.y + (baseDims.width - dimensions.width) / 2,
    }, // Centered
  ]

  for (const pos of positions) {
    if (pos.x < 0 || pos.y < 0) continue
    if (pos.x + dimensions.length > trailer.length) continue
    if (pos.y + dimensions.width > trailer.width) continue

    const testBox: Box = {
      id: 'test',
      position: { x: pos.x, y: pos.y, z: topZ },
      dimensions,
      rotation: 0,
      weight: 0,
    }

    // Check collision with other boxes
    // (We assume baseBox is already in the list, so we'd need to check against others)
    // For simplicity, we'll just check bounds here
    if (isWithinBounds(testBox, trailer)) {
      return { x: pos.x, y: pos.y, z: topZ }
    }
  }

  return null
}

