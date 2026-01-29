import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const trailerSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['BACHE', 'FRIGO', 'STUKGOED', 'CONTAINER_20', 'CONTAINER_40', 'MEGA', 'DUBBELDEK', 'LZV']).optional(),
  model: z.string().optional(),
  licensePlate: z.string().optional(),
  internalLength: z.number().positive().optional(),
  internalWidth: z.number().positive().optional(),
  internalHeight: z.number().positive().optional(),
  doorWidth: z.number().positive().optional(),
  doorHeight: z.number().positive().optional(),
  maxPayload: z.number().positive().optional(),
  maxAxleLoad: z.number().positive().optional(),
  maxStackHeight: z.number().positive().optional(),
  hasWheelArches: z.boolean().optional(),
  wheelArchHeight: z.number().positive().optional(),
  wheelArchWidth: z.number().positive().optional(),
  hasRails: z.boolean().optional(),
  railSpacing: z.number().positive().optional(),
  temperatureMin: z.number().optional(),
  temperatureMax: z.number().optional(),
  temperatureZones: z.any().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const trailer = await prisma.trailer.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!trailer) {
      return NextResponse.json({ error: 'Trailer not found' }, { status: 404 })
    }

    return NextResponse.json(trailer)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const body = await request.json()
    const data = trailerSchema.parse(body)

    const trailer = await prisma.trailer.updateMany({
      where: {
        id: params.id,
        companyId,
      },
      data,
    })

    if (trailer.count === 0) {
      return NextResponse.json({ error: 'Trailer not found' }, { status: 404 })
    }

    const updated = await prisma.trailer.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const trailer = await prisma.trailer.deleteMany({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (trailer.count === 0) {
      return NextResponse.json({ error: 'Trailer not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


