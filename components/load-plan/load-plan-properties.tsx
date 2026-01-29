'use client'

import type { CargoItem } from '@/types/load-plan'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatDimension, formatWeight } from '@/lib/utils'
import { X } from 'lucide-react'

interface LoadPlanPropertiesProps {
  cargoItem: CargoItem
  onClose: () => void
}

export function LoadPlanProperties({ cargoItem, onClose }: LoadPlanPropertiesProps) {
  return (
    <Card className="m-4">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Item Properties</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-medium">{cargoItem.name}</h3>
          {cargoItem.description && (
            <p className="text-sm text-gray-600">{cargoItem.description}</p>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-600">Dimensions:</span>
            <span className="font-medium">
              {formatDimension(cargoItem.length)} × {formatDimension(cargoItem.width)} ×{' '}
              {formatDimension(cargoItem.height)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Weight:</span>
            <span className="font-medium">{formatWeight(cargoItem.weight)}</span>
          </div>
          {cargoItem.palletType && (
            <div className="flex justify-between">
              <span className="text-gray-600">Pallet Type:</span>
              <span className="font-medium">{cargoItem.palletType}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-gray-600">Stackable:</span>
            <span className="font-medium">{cargoItem.isStackable ? 'Yes' : 'No'}</span>
          </div>
          {cargoItem.isFragile && (
            <div className="flex justify-between">
              <span className="text-gray-600">Fragile:</span>
              <span className="font-medium text-yellow-600">Yes</span>
            </div>
          )}
          {cargoItem.temperatureMin !== null && (
            <div className="flex justify-between">
              <span className="text-gray-600">Temperature:</span>
              <span className="font-medium">
                {cargoItem.temperatureMin}°C - {cargoItem.temperatureMax}°C
              </span>
            </div>
          )}
          {cargoItem.adrClass && (
            <div className="flex justify-between">
              <span className="text-gray-600">ADR Class:</span>
              <span className="font-medium text-red-600">{cargoItem.adrClass}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}


