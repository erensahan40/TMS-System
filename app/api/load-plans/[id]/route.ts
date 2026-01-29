import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { z } from 'zod'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const companyId = await getCompanyId(session)
    const loadPlan = await prisma.loadPlan.findFirst({
      where: {
        id: params.id,
        companyId,
      },
      include: {
        trailer: true,
        shipment: {
          include: {
            stops: true,
          },
        },
        items: {
          include: {
            cargoItem: true,
          },
          orderBy: [
            { stackLevel: 'asc' },
            { positionZ: 'asc' },
            { positionX: 'asc' },
          ],
        },
        validations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    return NextResponse.json(loadPlan)
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

    const loadPlan = await prisma.loadPlan.findFirst({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    const updated = await prisma.loadPlan.update({
      where: { id: params.id },
      data: {
        name: body.name,
        notes: body.notes,
        status: body.status,
      },
      include: {
        trailer: true,
        items: {
          include: {
            cargoItem: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error: any) {
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
    const loadPlan = await prisma.loadPlan.deleteMany({
      where: {
        id: params.id,
        companyId,
      },
    })

    if (loadPlan.count === 0) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


