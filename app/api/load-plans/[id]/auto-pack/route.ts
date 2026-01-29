import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { autoPack, PackingItem } from '@/lib/packing/auto-pack'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const body = await request.json()

    const loadPlan = await prisma.loadPlan.findFirst({
      where: {
        id: params.id,
        companyId,
      },
      include: {
        trailer: true,
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    // Get cargo items to pack
    const cargoItems = await prisma.cargoItem.findMany({
      where: {
        id: { in: body.cargoItemIds || [] },
        companyId,
      },
    })

    if (cargoItems.length === 0) {
      return NextResponse.json({ error: 'No cargo items provided' }, { status: 400 })
    }

    // Convert to packing items
    const packingItems: PackingItem[] = cargoItems.map((item) => ({
      id: item.id,
      cargoItem: {
        id: item.id,
        isStackable: item.isStackable,
        maxStackWeight: item.maxStackWeight ?? undefined,
        maxStackHeight: item.maxStackHeight ?? undefined,
        isFragile: item.isFragile,
        temperatureMin: item.temperatureMin ?? undefined,
        temperatureMax: item.temperatureMax ?? undefined,
        adrClass: item.adrClass ?? undefined,
        thisSideUp: item.thisSideUp,
      },
      dimensions: {
        length: item.length,
        width: item.width,
        height: item.height,
      },
      weight: item.weight,
      quantity: body.quantities?.[item.id] || 1,
    }))

    // Run auto-pack
    const boxes = autoPack(packingItems, {
      length: loadPlan.trailer.internalLength,
      width: loadPlan.trailer.internalWidth,
      height: loadPlan.trailer.internalHeight,
      maxPayload: loadPlan.trailer.maxPayload,
    })

    // Clear existing items (optional - you might want to keep them)
    if (body.clearExisting) {
      await prisma.loadPlanItem.deleteMany({
        where: { loadPlanId: params.id },
      })
    }

    // Create load plan items
    const items = await Promise.all(
      boxes.map((box, index) => {
        const cargoItemId = box.id.split('-')[0] // Extract original cargo item ID
        return prisma.loadPlanItem.create({
          data: {
            loadPlanId: params.id,
            cargoItemId,
            quantity: 1,
            positionX: box.position.x,
            positionY: box.position.y,
            positionZ: box.position.z,
            rotation: box.rotation,
            stackLevel: Math.floor(box.position.z / 1000), // Simple stack level calculation
          },
          include: {
            cargoItem: true,
          },
        })
      })
    )

    // Update totals
    const totalWeight = items.reduce((sum, item) => sum + item.cargoItem.weight * item.quantity, 0)
    const totalVolume = items.reduce(
      (sum, item) =>
        sum +
        item.cargoItem.length *
          item.cargoItem.width *
          item.cargoItem.height *
          item.quantity,
      0
    )

    const trailerVolume =
      loadPlan.trailer.internalLength *
      loadPlan.trailer.internalWidth *
      loadPlan.trailer.internalHeight

    const utilization = trailerVolume > 0 ? (totalVolume / trailerVolume) * 100 : 0

    await prisma.loadPlan.update({
      where: { id: params.id },
      data: {
        totalWeight,
        totalVolume,
        utilization,
      },
    })

    return NextResponse.json({ items, boxes })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


