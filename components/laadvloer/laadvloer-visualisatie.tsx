'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import { TRAILER_PRESETS, type TrailerType, type PalletItem, type PlacedPallet } from './types'
import { LaadvloerCanvas } from './laadvloer-canvas'

export function LaadvloerVisualisatie() {
  const [trailerType, setTrailerType] = useState<TrailerType>('BACHE')
  const [palletList, setPalletList] = useState<PalletItem[]>([])
  const [placedPallets, setPlacedPallets] = useState<PlacedPallet[]>([])
  const [newPallet, setNewPallet] = useState({ lengthCm: 120, widthCm: 80, heightCm: 144, label: '' })

  const trailer = TRAILER_PRESETS[trailerType]

  const addPallet = () => {
    const item: PalletItem = {
      id: crypto.randomUUID(),
      label: newPallet.label || `Pallet ${palletList.length + 1}`,
      lengthCm: newPallet.lengthCm,
      widthCm: newPallet.widthCm,
      heightCm: newPallet.heightCm,
    }
    setPalletList((prev) => [...prev, item])
  }

  const removeFromList = (id: string) => {
    setPalletList((prev) => prev.filter((p) => p.id !== id))
    setPlacedPallets((prev) => prev.filter((p) => p.id !== id))
  }

  const addToFloor = (item: PalletItem) => {
    const placed: PlacedPallet = {
      ...item,
      positionX: 0,
      positionY: 0,
      rotation: 0,
    }
    setPlacedPallets((prev) => [...prev, placed])
  }

  const updatePlaced = useCallback((itemId: string, updates: Partial<PlacedPallet>) => {
    setPlacedPallets((prev) =>
      prev.map((p) => (p.id === itemId ? { ...p, ...updates } : p))
    )
  }, [])

  const removeFromFloor = useCallback((itemId: string) => {
    setPlacedPallets((prev) => prev.filter((p) => p.id !== itemId))
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Vrachtwagetype</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(Object.keys(TRAILER_PRESETS) as TrailerType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTrailerType(type)}
                className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                  trailerType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className="font-medium">{TRAILER_PRESETS[type].name}</span>
                <span className="ml-2 text-gray-500">
                  {trailer.lengthCm} × {trailer.widthCm} × {trailer.heightCm} cm
                </span>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Pallet toevoegen</CardTitle>
            <p className="text-sm text-gray-500">Afmetingen in cm (bijv. EURO 120×80)</p>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <label className="text-xs text-gray-600">
                Lengte (cm)
                <input
                  type="number"
                  value={newPallet.lengthCm}
                  onChange={(e) => setNewPallet((p) => ({ ...p, lengthCm: Number(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Breedte (cm)
                <input
                  type="number"
                  value={newPallet.widthCm}
                  onChange={(e) => setNewPallet((p) => ({ ...p, widthCm: Number(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
              <label className="text-xs text-gray-600">
                Hoogte (cm)
                <input
                  type="number"
                  value={newPallet.heightCm}
                  onChange={(e) => setNewPallet((p) => ({ ...p, heightCm: Number(e.target.value) || 0 }))}
                  className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
                />
              </label>
            </div>
            <label className="block text-xs text-gray-600">
              Label (optioneel)
              <input
                type="text"
                value={newPallet.label}
                onChange={(e) => setNewPallet((p) => ({ ...p, label: e.target.value }))}
                placeholder="bijv. Pallet A"
                className="mt-1 w-full rounded border border-gray-300 px-2 py-1 text-sm"
              />
            </label>
            <Button type="button" onClick={addPallet} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Toevoegen aan lijst
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Palletten ({palletList.length + placedPallets.length})</CardTitle>
          </CardHeader>
          <CardContent className="max-h-64 space-y-2 overflow-y-auto">
            {palletList.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-gray-200 bg-gray-50 px-2 py-1.5 text-sm"
              >
                <span>
                  {p.label} — {p.lengthCm}×{p.widthCm}×{p.heightCm} cm
                </span>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1"
                    onClick={() => addToFloor(p)}
                  >
                    Op vloer
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-1 text-red-600"
                    onClick={() => removeFromList(p.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {placedPallets.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded border border-green-200 bg-green-50 px-2 py-1.5 text-sm"
              >
                <span>
                  {p.label} — op vloer @ {p.positionX},{p.positionY} cm
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-1 text-red-600"
                  onClick={() => removeFromFloor(p.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
            {palletList.length === 0 && placedPallets.length === 0 && (
              <p className="text-sm text-gray-500">Voeg palletten toe en zet ze op de laadvloer.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="min-h-[500px]">
        <CardContent className="p-0">
          <LaadvloerCanvas
            trailerLengthCm={trailer.lengthCm}
            trailerWidthCm={trailer.widthCm}
            placedPallets={placedPallets}
            onUpdatePlaced={updatePlaced}
          />
        </CardContent>
      </Card>
    </div>
  )
}
