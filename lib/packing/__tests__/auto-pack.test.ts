import { autoPack, PackingItem } from '../auto-pack'

describe('autoPack', () => {
  const trailer = {
    length: 13600, // 13.6m
    width: 2450, // 2.45m
    height: 2700, // 2.7m
    maxPayload: 24000, // 24 ton
  }

  it('should place items within trailer bounds', () => {
    const items: PackingItem[] = [
      {
        id: 'item1',
        cargoItem: {
          id: 'item1',
          isStackable: true,
          thisSideUp: false,
        },
        dimensions: {
          length: 1200,
          width: 800,
          height: 1440,
        },
        weight: 1200,
        quantity: 1,
      },
    ]

    const boxes = autoPack(items, trailer)

    expect(boxes.length).toBe(1)
    expect(boxes[0].position.x).toBeGreaterThanOrEqual(0)
    expect(boxes[0].position.y).toBeGreaterThanOrEqual(0)
    expect(boxes[0].position.z).toBeGreaterThanOrEqual(0)
    expect(boxes[0].position.x + boxes[0].dimensions.length).toBeLessThanOrEqual(trailer.length)
    expect(boxes[0].position.y + boxes[0].dimensions.width).toBeLessThanOrEqual(trailer.width)
  })

  it('should handle multiple items', () => {
    const items: PackingItem[] = [
      {
        id: 'item1',
        cargoItem: {
          id: 'item1',
          isStackable: true,
          thisSideUp: false,
        },
        dimensions: { length: 1200, width: 800, height: 1440 },
        weight: 1200,
        quantity: 5,
      },
    ]

    const boxes = autoPack(items, trailer)

    expect(boxes.length).toBe(5)
  })

  it('should respect non-stackable items', () => {
    const items: PackingItem[] = [
      {
        id: 'item1',
        cargoItem: {
          id: 'item1',
          isStackable: false,
          thisSideUp: false,
        },
        dimensions: { length: 1200, width: 800, height: 1440 },
        weight: 1200,
        quantity: 1,
      },
    ]

    const boxes = autoPack(items, trailer)

    expect(boxes[0].position.z).toBe(0) // Should be on floor
  })
})


