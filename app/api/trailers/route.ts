import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const trailerSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['BACHE', 'FRIGO', 'STUKGOED', 'CONTAINER_20', 'CONTAINER_40', 'MEGA', 'DUBBELDEK', 'LZV']),
  model: z.string().optional(),
  licensePlate: z.string().optional(),
  internalLength: z.number().positive(),
  internalWidth: z.number().positive(),
  internalHeight: z.number().positive(),
  doorWidth: z.number().positive().optional(),
  doorHeight: z.number().positive().optional(),
  maxPayload: z.number().positive(),
  maxAxleLoad: z.number().positive().optional(),
  maxStackHeight: z.number().positive().optional(),
  hasWheelArches: z.boolean().default(false),
  wheelArchHeight: z.number().positive().optional(),
  wheelArchWidth: z.number().positive().optional(),
  hasRails: z.boolean().default(false),
  railSpacing: z.number().positive().optional(),
  temperatureMin: z.number().optional(),
  temperatureMax: z.number().optional(),
  temperatureZones: z.any().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const trailers = await prisma.trailer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(trailers)
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
    const data = trailerSchema.parse(body)

    const trailer = await prisma.trailer.create({
      data: {
        ...data,
        companyId,
      },
    })

    return NextResponse.json(trailer, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


