import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { prisma } from '@/lib/prisma'
import { getCompanyId } from '@/lib/utils'
import { formatDimension, formatWeight } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

export default async function FleetPage() {
  const companyId = await getCompanyId()

  if (!companyId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
          <p className="mt-2 text-gray-600">No company data available</p>
        </div>
      </div>
    )
  }

  const trailers = await prisma.trailer.findMany({
    where: { companyId },
    orderBy: { name: 'asc' },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Fleet Management</h1>
          <p className="mt-2 text-gray-600">Manage your trailers and trucks</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Trailer
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {trailers.map((trailer: typeof trailers[0]) => (
          <Card key={trailer.id}>
            <CardHeader>
              <CardTitle className="text-lg">{trailer.name}</CardTitle>
              <CardDescription>
                {trailer.type} • {trailer.licensePlate || 'No license plate'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Dimensions:</span>
                  <span className="font-medium">
                    {formatDimension(trailer.internalLength, 'm')} ×{' '}
                    {formatDimension(trailer.internalWidth, 'm')} ×{' '}
                    {formatDimension(trailer.internalHeight, 'm')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Payload:</span>
                  <span className="font-medium">{formatWeight(trailer.maxPayload)}</span>
                </div>
                {trailer.temperatureMin !== null && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Temperature:</span>
                    <span className="font-medium">
                      {trailer.temperatureMin}°C - {trailer.temperatureMax}°C
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span
                    className={`font-medium ${
                      trailer.isActive ? 'text-green-600' : 'text-gray-500'
                    }`}
                  >
                    {trailer.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

