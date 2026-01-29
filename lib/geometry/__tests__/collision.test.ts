import { Box } from '../types'
import { boxesCollide, isWithinBounds, calculateCenterOfGravity } from '../collision'

describe('collision detection', () => {
  const box1: Box = {
    id: 'box1',
    position: { x: 0, y: 0, z: 0 },
    dimensions: { length: 1000, width: 800, height: 1000 },
    rotation: 0,
    weight: 1000,
  }

  it('should detect collision when boxes overlap', () => {
    const box2: Box = {
      id: 'box2',
      position: { x: 500, y: 400, z: 500 },
      dimensions: { length: 1000, width: 800, height: 1000 },
      rotation: 0,
      weight: 1000,
    }

    expect(boxesCollide(box1, box2)).toBe(true)
  })

  it('should not detect collision when boxes are separate', () => {
    const box2: Box = {
      id: 'box2',
      position: { x: 2000, y: 0, z: 0 },
      dimensions: { length: 1000, width: 800, height: 1000 },
      rotation: 0,
      weight: 1000,
    }

    expect(boxesCollide(box1, box2)).toBe(false)
  })

  it('should check if box is within bounds', () => {
    const bounds = { length: 5000, width: 2500, height: 3000 }

    expect(isWithinBounds(box1, bounds)).toBe(true)

    const boxOutside: Box = {
      ...box1,
      position: { x: 4000, y: 0, z: 0 },
    }

    expect(isWithinBounds(boxOutside, bounds)).toBe(false)
  })

  it('should calculate center of gravity', () => {
    const boxes: Box[] = [
      {
        id: 'box1',
        position: { x: 0, y: 0, z: 0 },
        dimensions: { length: 1000, width: 1000, height: 1000 },
        rotation: 0,
        weight: 1000,
      },
      {
        id: 'box2',
        position: { x: 2000, y: 0, z: 0 },
        dimensions: { length: 1000, width: 1000, height: 1000 },
        rotation: 0,
        weight: 2000,
      },
    ]

    const cog = calculateCenterOfGravity(boxes)

    // Center of box1 is at 500, box2 at 2500
    // Weighted average: (500*1000 + 2500*2000) / 3000 = 1833.33
    expect(cog.x).toBeCloseTo(1833.33, 1)
    expect(cog.totalWeight).toBe(3000)
  })
})


