import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const itemSchema = z.object({
  cargoItemId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
  positionX: z.number().min(0),
  positionY: z.number().min(0),
  positionZ: z.number().min(0),
  rotation: z.number().default(0),
  stackLevel: z.number().int().min(0).default(0),
  stopSequence: z.number().int().optional(),
  batchLot: z.string().optional(),
  orderRef: z.string().optional(),
  notes: z.string().optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const body = await request.json()
    const data = itemSchema.parse(body)

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

    // Verify cargo item belongs to company
    const cargoItem = await prisma.cargoItem.findFirst({
      where: {
        id: data.cargoItemId,
        companyId,
      },
    })

    if (!cargoItem) {
      return NextResponse.json({ error: 'Cargo item not found' }, { status: 404 })
    }

    const item = await prisma.loadPlanItem.create({
      data: {
        ...data,
        loadPlanId: params.id,
      },
      include: {
        cargoItem: true,
      },
    })

    // Update load plan totals
    await updateLoadPlanTotals(params.id)

    return NextResponse.json(item, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function updateLoadPlanTotals(loadPlanId: string) {
  const items = await prisma.loadPlanItem.findMany({
    where: { loadPlanId },
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

  const loadPlan = await prisma.loadPlan.findUnique({
    where: { id: loadPlanId },
    include: { trailer: true },
  })

  if (!loadPlan) return

  const trailerVolume =
    loadPlan.trailer.internalLength *
    loadPlan.trailer.internalWidth *
    loadPlan.trailer.internalHeight

  const utilization = trailerVolume > 0 ? (totalVolume / trailerVolume) * 100 : 0

  await prisma.loadPlan.update({
    where: { id: loadPlanId },
    data: {
      totalWeight,
      totalVolume,
      utilization,
    },
  })
}


