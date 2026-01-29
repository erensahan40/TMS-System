import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const loadPlanSchema = z.object({
  name: z.string().min(1),
  shipmentId: z.string().optional(),
  trailerId: z.string().min(1),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const loadPlans = await prisma.loadPlan.findMany({
      where: { companyId },
      include: {
        trailer: true,
        shipment: true,
        items: {
          include: {
            cargoItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(loadPlans)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const body = await request.json()
    const data = loadPlanSchema.parse(body)

    // Verify trailer belongs to company
    const trailer = await prisma.trailer.findFirst({
      where: {
        id: data.trailerId,
        companyId,
      },
    })

    if (!trailer) {
      return NextResponse.json({ error: 'Trailer not found' }, { status: 404 })
    }

    const loadPlan = await prisma.loadPlan.create({
      data: {
        ...data,
        companyId,
        createdById: session.user.id,
      },
      include: {
        trailer: true,
        items: true,
      },
    })

    return NextResponse.json(loadPlan, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


