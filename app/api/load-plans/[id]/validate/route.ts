import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, getCompanyId } from '@/lib/api/middleware'
import { validateLoadPlan, ValidationContext } from '@/lib/validation/rules'

export async function POST(
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
        items: {
          include: {
            cargoItem: true,
          },
        },
      },
    })

    if (!loadPlan) {
      return NextResponse.json({ error: 'Load plan not found' }, { status: 404 })
    }

    // Convert to validation context
    const context: ValidationContext = {
      boxes: loadPlan.items.map((item) => ({
        id: item.id,
        position: {
          x: item.positionX,
          y: item.positionY,
          z: item.positionZ,
        },
        dimensions: {
          length: item.cargoItem.length,
          width: item.cargoItem.width,
          height: item.cargoItem.height,
        },
        rotation: item.rotation,
        weight: item.cargoItem.weight * item.quantity,
        cargoItem: {
          id: item.cargoItem.id,
          isStackable: item.cargoItem.isStackable,
          maxStackWeight: item.cargoItem.maxStackWeight ?? undefined,
          maxStackHeight: item.cargoItem.maxStackHeight ?? undefined,
          isFragile: item.cargoItem.isFragile,
          temperatureMin: item.cargoItem.temperatureMin ?? undefined,
          temperatureMax: item.cargoItem.temperatureMax ?? undefined,
          adrClass: item.cargoItem.adrClass ?? undefined,
        },
        stackLevel: item.stackLevel,
      })),
      trailer: {
        length: loadPlan.trailer.internalLength,
        width: loadPlan.trailer.internalWidth,
        height: loadPlan.trailer.internalHeight,
        maxPayload: loadPlan.trailer.maxPayload,
        maxAxleLoad: loadPlan.trailer.maxAxleLoad ?? undefined,
        temperatureZones: (loadPlan.trailer.temperatureZones as any) ?? undefined,
      },
    }

    // Run validation
    const validations = validateLoadPlan(context)

    // Save validations to database
    await prisma.loadPlanValidation.deleteMany({
      where: { loadPlanId: params.id },
    })

    if (validations.length > 0) {
      await prisma.loadPlanValidation.createMany({
        data: validations.map((v) => ({
          loadPlanId: params.id,
          type: v.type as any,
          severity: v.severity,
          message: v.message,
          itemId: v.itemId,
        })),
      })
    }

    return NextResponse.json({
      validations,
      hasErrors: validations.some((v) => v.severity === 'ERROR'),
      hasWarnings: validations.some((v) => v.severity === 'WARNING'),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}


