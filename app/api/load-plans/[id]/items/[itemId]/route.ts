import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const updateItemSchema = z.object({
  positionX: z.number().min(0).optional(),
  positionY: z.number().min(0).optional(),
  positionZ: z.number().min(0).optional(),
  rotation: z.number().optional(),
  stackLevel: z.number().int().min(0).optional(),
  quantity: z.number().int().positive().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const body = await request.json()
    const data = updateItemSchema.parse(body)

    // Verify load plan belongs to company
    const loadPlan = await prisma.loadPlan.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    const item = await prisma.loadPlanItem.update({
      where: { id: params.itemId },
      data,
      include: {
        cargoItem: true,
      },
    })

    // Update load plan totals
    const items = await prisma.loadPlanItem.findMany({
      where: { loadPlanId: params.id },
      include: { cargoItem: true },
    })

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

    const trailer = await prisma.trailer.findUnique({
      where: { id: loadPlan.trailerId },
    })

    if (trailer) {
      const trailerVolume =
        trailer.internalLength * trailer.internalWidth * trailer.internalHeight
      const utilization = trailerVolume > 0 ? (totalVolume / trailerVolume) * 100 : 0

      await prisma.loadPlan.update({
        where: { id: params.id },
        data: {
          totalWeight,
          totalVolume,
          utilization,
        },
      })
    }

    return NextResponse.json(item)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)

    // Verify load plan belongs to company
    const loadPlan = await prisma.loadPlan.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    await prisma.loadPlanItem.delete({
      where: { id: params.itemId },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


