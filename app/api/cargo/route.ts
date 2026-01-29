import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

const cargoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  palletType: z.enum(['EURO_1200x800', 'BLOCK_1200x1000', 'CUSTOM', 'NO_PALLET']).optional(),
  length: z.number().positive(),
  width: z.number().positive(),
  height: z.number().positive(),
  weight: z.number().positive(),
  isStackable: z.boolean().default(true),
  maxStackWeight: z.number().positive().optional(),
  maxStackHeight: z.number().positive().optional(),
  isFragile: z.boolean().default(false),
  adrClass: z.string().optional(),
  temperatureMin: z.number().optional(),
  temperatureMax: z.number().optional(),
  thisSideUp: z.boolean().default(false),
  noClamp: z.boolean().default(false),
  barcode: z.string().optional(),
  sku: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const cargo = await prisma.cargoItem.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(cargo)
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
    const data = cargoSchema.parse(body)

    const cargo = await prisma.cargoItem.create({
      data: {
        ...data,
        companyId,
      },
    })

    return NextResponse.json(cargo, { status: 201 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


