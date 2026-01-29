'use client'

import { CargoItem } from '@prisma/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDimension, formatWeight } from '@/lib/utils'
import { Package, Snowflake, AlertTriangle } from 'lucide-react'

interface CargoListProps {
  cargoItems: CargoItem[]
  selectedCargo: CargoItem | null
  onSelectCargo: (cargo: CargoItem | null) => void
}

export function CargoList({ cargoItems, selectedCargo, onSelectCargo }: CargoListProps) {
  return (
    <div className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">Cargo Items</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto">
        <div className="space-y-2">
          {cargoItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onSelectCargo(item === selectedCargo ? null : item)}
              className={`cursor-pointer rounded-lg border p-3 transition-colors ${
                selectedCargo?.id === item.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
                <div className="flex gap-1">
                  {item.isFragile && (
                    <span title="Fragile">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    </span>
                  )}
                  {item.temperatureMin !== null && (
                    <span title="Temperature controlled">
                      <Snowflake className="h-4 w-4 text-blue-500" />
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Size:</span>{' '}
                  {formatDimension(item.length)} × {formatDimension(item.width)} ×{' '}
                  {formatDimension(item.height)}
                </div>
                <div>
                  <span className="font-medium">Weight:</span> {formatWeight(item.weight)}
                </div>
                {item.palletType && (
                  <div className="col-span-2">
                    <span className="font-medium">Pallet:</span> {item.palletType}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </div>
  )
}


