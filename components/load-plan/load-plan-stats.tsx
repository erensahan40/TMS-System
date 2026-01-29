'use client'

import type { Trailer, CargoItem } from '@/types/load-plan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDimension, formatWeight, calculateVolume, volumeToCubicMeters } from '@/lib/utils'

interface LoadPlanStatsProps {
  trailer: Trailer | null
  items: Array<{
    cargoItem: CargoItem
    quantity: number
  }>
}

export function LoadPlanStats({ trailer, items }: LoadPlanStatsProps) {
  if (!trailer) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-gray-500">
          Select a trailer to see statistics
        </CardContent>
      </Card>
    )
  }

  const totalWeight = items.reduce(
    (sum: number, item: (typeof items)[number]) =>
      sum + item.cargoItem.weight * item.quantity,
    0
  )
  const totalVolume = items.reduce(
    (sum: number, item: (typeof items)[number]) =>
      sum +
      calculateVolume(
        item.cargoItem.length,
        item.cargoItem.width,
        item.cargoItem.height
      ) *
        item.quantity,
    0
  )

  const trailerVolume = calculateVolume(
    trailer.internalLength,
    trailer.internalWidth,
    trailer.internalHeight
  )

  const utilization = trailerVolume > 0 ? (totalVolume / trailerVolume) * 100 : 0
  const weightUtilization = (totalWeight / trailer.maxPayload) * 100

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="text-lg">Statistics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Items:</span>
            <span className="font-medium">{items.length}</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Weight:</span>
            <span className="font-medium">{formatWeight(totalWeight)}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${
                weightUtilization > 100
                  ? 'bg-red-500'
                  : weightUtilization > 90
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(weightUtilization, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {weightUtilization.toFixed(1)}% of {formatWeight(trailer.maxPayload)}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Volume:</span>
            <span className="font-medium">
              {volumeToCubicMeters(totalVolume).toFixed(2)} m³
            </span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`h-full ${
                utilization > 100
                  ? 'bg-red-500'
                  : utilization > 90
                  ? 'bg-yellow-500'
                  : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(utilization, 100)}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {utilization.toFixed(1)}% of {volumeToCubicMeters(trailerVolume).toFixed(2)} m³
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="text-xs text-gray-600">
            <div className="mb-2 font-medium">Trailer Dimensions:</div>
            <div>
              {formatDimension(trailer.internalLength, 'm')} ×{' '}
              {formatDimension(trailer.internalWidth, 'm')} ×{' '}
              {formatDimension(trailer.internalHeight, 'm')}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}


