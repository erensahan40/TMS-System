import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function ShipmentsPage() {
  const companyId = await getCompanyId()

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
          <p className="mt-2 text-gray-600">No company data available</p>
        </div>
      </div>
    )
  }

  const shipments = await prisma.shipment.findMany({
    where: { companyId },
    include: {
      truck: true,
      trailer: true,
      stops: {
        orderBy: { sequence: 'asc' },
      },
      _count: {
        select: { loadPlans: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  type ShipmentWithRelations = typeof shipments[0]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Shipments</h1>
          <p className="mt-2 text-gray-600">Manage your transport shipments</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Shipment
        </Button>
      </div>

      <div className="space-y-4">
        {shipments.map((shipment: ShipmentWithRelations) => (
          <Card key={shipment.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{shipment.reference}</CardTitle>
                  <CardDescription>
                    {shipment.truck?.name} • {shipment.trailer?.name}
                  </CardDescription>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    shipment.status === 'CONFIRMED'
                      ? 'bg-green-100 text-green-800'
                      : shipment.status === 'IN_TRANSIT'
                      ? 'bg-blue-100 text-blue-800'
                      : shipment.status === 'DELIVERED'
                      ? 'bg-gray-100 text-gray-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {shipment.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {shipment.plannedDate && (
                  <div className="text-sm text-gray-600">
                    Planned: {format(new Date(shipment.plannedDate), 'PPp')}
                  </div>
                )}
                <div className="text-sm">
                  <span className="font-medium">Stops:</span>{' '}
                  {shipment.stops.length} ({shipment.stops.filter((s: ShipmentWithRelations['stops'][0]) => s.type === 'PICKUP').length}{' '}
                  pickup, {shipment.stops.filter((s: ShipmentWithRelations['stops'][0]) => s.type === 'DELIVERY').length} delivery)
                </div>
                <div className="text-sm">
                  <span className="font-medium">Load Plans:</span> {shipment._count.loadPlans}
                </div>
                <div className="mt-4 flex gap-2">
                  <Link href={`/dashboard/shipments/${shipment.id}`}>
                    <Button {...({ variant: 'outline', size: 'sm' } as any)}>
                      View Details
                    </Button>
                  </Link>
                  {shipment._count.loadPlans === 0 && (
                    <Link href={`/dashboard/load-plans/new?shipmentId=${shipment.id}`}>
                      <Button {...({ size: 'sm' } as any)}>Create Load Plan</Button>
                    </Link>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

