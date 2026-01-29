'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadPlanCanvas2D } from './load-plan-canvas-2d'
import { CargoList } from './cargo-list'
import { LoadPlanProperties } from './load-plan-properties'
import { LoadPlanToolbar } from './load-plan-toolbar'
import { LoadPlanStats } from './load-plan-stats'
import { Trailer, CargoItem, LoadPlan } from '@prisma/client'

type LoadPlanWithItems = LoadPlan & {
  trailer: Trailer
  items: Array<{
    id: string
    cargoItem: CargoItem
    positionX: number
    positionY: number
    positionZ: number
    rotation: number
    stackLevel: number
    quantity: number
  }>
  validations?: Array<{
    id: string
    type: string
    severity: string
    message: string
    itemId?: string | null
  }>
}

interface LoadPlanEditorProps {
  loadPlan?: LoadPlanWithItems
  trailers: Trailer[]
  cargoItems: CargoItem[]
}

export function LoadPlanEditor({ loadPlan, trailers, cargoItems }: LoadPlanEditorProps) {
  const router = useRouter()
  const [selectedTrailer, setSelectedTrailer] = useState<Trailer | null>(
    loadPlan?.trailer || trailers[0] || null
  )
  const [selectedCargo, setSelectedCargo] = useState<CargoItem | null>(null)
  const [items, setItems] = useState<LoadPlanWithItems['items']>(
    loadPlan?.items || []
  )
  const [currentLoadPlanId, setCurrentLoadPlanId] = useState<string | null>(
    loadPlan?.id || null
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Auto-save every 30 seconds
  useEffect(() => {
    if (currentLoadPlanId && items.length > 0) {
      const interval = setInterval(() => {
        handleSave()
      }, 30000)

      return () => clearInterval(interval)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentLoadPlanId, items.length])

  const handleSave = async () => {
    if (!selectedTrailer) return

    setSaving(true)
    try {
      if (currentLoadPlanId) {
        // Update existing
        await fetch(`/api/load-plans/${currentLoadPlanId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: loadPlan?.name || 'Load Plan',
            trailerId: selectedTrailer.id,
          }),
        })
      } else {
        // Create new
        const response = await fetch('/api/load-plans', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'New Load Plan',
            trailerId: selectedTrailer.id,
          }),
        })

        const data = await response.json()
        setCurrentLoadPlanId(data.id)
        router.replace(`/dashboard/load-plans/${data.id}`)
      }

      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleAddItem = async (cargoItem: CargoItem, position: { x: number; y: number }) => {
    if (!selectedTrailer) return
    if (!currentLoadPlanId) {
      // Create load plan first
      const response = await fetch('/api/load-plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Load Plan',
          trailerId: selectedTrailer.id,
        }),
      })

      const data = await response.json()
      setCurrentLoadPlanId(data.id)
      router.replace(`/dashboard/load-plans/${data.id}`)

      // Add item after creating plan
      const itemResponse = await fetch(`/api/load-plans/${data.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargoItemId: cargoItem.id,
          quantity: 1,
          positionX: position.x,
          positionY: position.y,
          positionZ: 0,
          rotation: 0,
          stackLevel: 0,
        }),
      })

      const itemData = await itemResponse.json()
      setItems([...items, itemData])
      return
    }

    try {
      const response = await fetch(`/api/load-plans/${currentLoadPlanId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargoItemId: cargoItem.id,
          quantity: 1,
          positionX: position.x,
          positionY: position.y,
          positionZ: 0,
          rotation: 0,
          stackLevel: 0,
        }),
      })

      const data = await response.json()
      setItems([...items, data])
    } catch (error) {
      console.error('Failed to add item:', error)
    }
  }

  const handleValidate = async () => {
    if (!currentLoadPlanId) return

    try {
      const response = await fetch(`/api/load-plans/${currentLoadPlanId}/validate`, {
        method: 'POST',
      })

      const data = await response.json()
      // Show validations in UI
      console.log('Validations:', data)
      alert(`Validation complete: ${data.validations.length} issues found`)
    } catch (error) {
      console.error('Failed to validate:', error)
    }
  }

  const handleAutoPack = async () => {
    if (!currentLoadPlanId || !selectedTrailer) return

    try {
      const cargoItemIds = cargoItems.map((item) => item.id)
      const quantities: Record<string, number> = {}
      cargoItems.forEach((item) => {
        quantities[item.id] = 1
      })

      const response = await fetch(`/api/load-plans/${currentLoadPlanId}/auto-pack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cargoItemIds,
          quantities,
          clearExisting: true,
        }),
      })

      const data = await response.json()
      setItems(data.items)
    } catch (error) {
      console.error('Failed to auto-pack:', error)
    }
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <LoadPlanToolbar
        trailers={trailers}
        selectedTrailer={selectedTrailer}
        onTrailerChange={setSelectedTrailer}
        onSave={handleSave}
        onValidate={handleValidate}
        onAutoPack={handleAutoPack}
        saving={saving}
        saved={saved}
      />

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left sidebar - Cargo list */}
        <div className="w-64 border-r bg-white">
          <CargoList
            cargoItems={cargoItems}
            selectedCargo={selectedCargo}
            onSelectCargo={setSelectedCargo}
          />
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-hidden">
          {selectedTrailer ? (
            <LoadPlanCanvas2D
              trailer={selectedTrailer}
              items={items}
              selectedCargo={selectedCargo}
              onAddItem={handleAddItem}
              onItemUpdate={(itemId, updates) => {
                setItems(
                  items.map((item) =>
                    item.id === itemId ? { ...item, ...updates } : item
                  )
                )
              }}
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <p className="text-gray-500">Select a trailer to start</p>
            </div>
          )}
        </div>

        {/* Right sidebar - Properties & Stats */}
        <div className="w-80 border-l bg-white">
          <div className="flex h-full flex-col">
            <LoadPlanStats
              trailer={selectedTrailer}
              items={items}
            />
            {selectedCargo && (
              <LoadPlanProperties
                cargoItem={selectedCargo}
                onClose={() => setSelectedCargo(null)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

