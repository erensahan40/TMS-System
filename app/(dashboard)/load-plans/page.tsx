import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/utils'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { formatDimension, formatWeight } from '@/lib/utils'

export default async function LoadPlansPage() {
  const companyId = await getCompanyId()

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Load Plans</h1>
          <p className="mt-2 text-gray-600">No company data available</p>
        </div>
      </div>
    )
  }

  const loadPlans = await prisma.loadPlan.findMany({
    where: { companyId },
    include: {
      trailer: true,
      shipment: true,
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Load Plans</h1>
          <p className="mt-2 text-gray-600">Manage and create load plans for your shipments</p>
        </div>
        <Link href="/dashboard/load-plans/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Load Plan
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loadPlans.map((plan: typeof loadPlans[0]) => (
          <Link key={plan.id} href={`/dashboard/load-plans/${plan.id}`}>
            <Card className="cursor-pointer transition-shadow hover:shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg">{plan.name}</CardTitle>
                <CardDescription>
                  {plan.trailer.name} • {plan.status}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Items:</span>
                    <span className="font-medium">{plan._count.items}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Weight:</span>
                    <span className="font-medium">{formatWeight(plan.totalWeight)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Utilization:</span>
                    <span className="font-medium">{plan.utilization.toFixed(1)}%</span>
                  </div>
                  {plan.shipment && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipment:</span>
                      <span className="font-medium">{plan.shipment.reference}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {loadPlans.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500">No load plans yet. Create your first one!</p>
            <Link href="/dashboard/load-plans/new" className="mt-4 inline-block">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Load Plan
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

