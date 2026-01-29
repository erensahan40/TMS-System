import { Box, CollisionResult } from './types'

/**
 * Check if two boxes collide in 3D space
 */
export function boxesCollide(box1: Box, box2: Box): boolean {
  // Get actual dimensions after rotation
  const dims1 = getRotatedDimensions(box1)
  const dims2 = getRotatedDimensions(box2)

  // Check overlap in X axis
  const xOverlap =
    box1.position.x < box2.position.x + dims2.length &&
    box1.position.x + dims1.length > box2.position.x

  // Check overlap in Y axis
  const yOverlap =
    box1.position.y < box2.position.y + dims2.width &&
    box1.position.y + dims1.width > box2.position.y

  // Check overlap in Z axis (height)
  const zOverlap =
    box1.position.z < box2.position.z + dims2.height &&
    box1.position.z + dims1.height > box2.position.z

  return xOverlap && yOverlap && zOverlap
}

/**
 * Get effective dimensions after rotation
 */
export function getRotatedDimensions(box: Box): { length: number; width: number; height: number } {
  const { rotation, dimensions } = box

  // Only 90° rotations are allowed
  if (rotation === 90 || rotation === 270) {
    return {
      length: dimensions.width,
      width: dimensions.length,
      height: dimensions.height,
    }
  }

  return dimensions
}

/**
 * Check if a box is within trailer bounds
 */
export function isWithinBounds(
  box: Box,
  bounds: { length: number; width: number; height: number }
): boolean {
  const dims = getRotatedDimensions(box)

  return (
    box.position.x >= 0 &&
    box.position.y >= 0 &&
    box.position.z >= 0 &&
    box.position.x + dims.length <= bounds.length &&
    box.position.y + dims.width <= bounds.width &&
    box.position.z + dims.height <= bounds.height
  )
}

/**
 * Check all boxes for collisions
 */
export function detectCollisions(boxes: Box[]): CollisionResult {
  const collidingBoxes: string[] = []

  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      if (boxesCollide(boxes[i], boxes[j])) {
        if (!collidingBoxes.includes(boxes[i].id)) {
          collidingBoxes.push(boxes[i].id)
        }
        if (!collidingBoxes.includes(boxes[j].id)) {
          collidingBoxes.push(boxes[j].id)
        }
      }
    }
  }

  return {
    hasCollision: collidingBoxes.length > 0,
    collidingBoxes,
  }
}

/**
 * Calculate center of gravity for a set of boxes
 */
export function calculateCenterOfGravity(boxes: Box[]): {
  x: number
  y: number
  z: number
  totalWeight: number
} {
  if (boxes.length === 0) {
    return { x: 0, y: 0, z: 0, totalWeight: 0 }
  }

  let totalWeight = 0
  let weightedX = 0
  let weightedY = 0
  let weightedZ = 0

  for (const box of boxes) {
    const dims = getRotatedDimensions(box)
    const weight = box.weight

    // Center point of the box
    const centerX = box.position.x + dims.length / 2
    const centerY = box.position.y + dims.width / 2
    const centerZ = box.position.z + dims.height / 2

    weightedX += centerX * weight
    weightedY += centerY * weight
    weightedZ += centerZ * weight
    totalWeight += weight
  }

  return {
    x: totalWeight > 0 ? weightedX / totalWeight : 0,
    y: totalWeight > 0 ? weightedY / totalWeight : 0,
    z: totalWeight > 0 ? weightedZ / totalWeight : 0,
    totalWeight,
  }
}

