import { prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/utils'
import { LoadPlanEditor } from '@/components/load-plan/load-plan-editor'
import { notFound } from 'next/navigation'

export default async function LoadPlanPage({ params }: { params: { id: string } }) {
  const companyId = await getCompanyId()

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Load Plan</h1>
          <p className="mt-2 text-gray-600">No company data available</p>
        </div>
      </div>
    )
  }

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
      validations: true,
    },
  })

  if (!loadPlan) {
    notFound()
  }

  const trailers = await prisma.trailer.findMany({
    where: {
      companyId,
      isActive: true,
    },
    orderBy: { name: 'asc' },
  })

  const cargoItems = await prisma.cargoItem.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  })

  return (
    <LoadPlanEditor
      loadPlan={loadPlan}
      trailers={trailers}
      cargoItems={cargoItems}
    />
  )
}

