'use client'

import { useRef, useState } from 'react'
import { Stage, Layer, Rect, Group, Text, Line } from 'react-konva'
import type Konva from 'konva'
import type { Trailer, CargoItem } from '@prisma/client'
import { formatDimension } from '@/lib/utils'

interface LoadPlanItem {
  id: string
  cargoItem: CargoItem
  positionX: number
  positionY: number
  positionZ: number
  rotation: number
  stackLevel: number
  quantity: number
}

interface LoadPlanCanvas2DProps {
  trailer: Trailer
  items: LoadPlanItem[]
  selectedCargo: CargoItem | null
  onAddItem: (cargo: CargoItem, position: { x: number; y: number }) => void
  onItemUpdate: (itemId: string, updates: Partial<LoadPlanItem>) => void
}

const SCALE = 0.01 // Convert mm to pixels (1mm = 0.01px, so 1000mm = 10px)
const GRID_SIZE = 100 // 100mm grid

export function LoadPlanCanvas2D({
  trailer,
  items,
  selectedCargo,
  onAddItem,
  onItemUpdate,
}: LoadPlanCanvas2DProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [scale, setScale] = useState(SCALE)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  const trailerWidth = trailer.internalLength * scale
  const trailerHeight = trailer.internalWidth * scale

  // Calculate canvas size with padding
  const padding = 50
  const canvasWidth = Math.max(800, trailerWidth + padding * 2)
  const canvasHeight = Math.max(600, trailerHeight + padding * 2)

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      // Clicked on empty space
      if (selectedCargo) {
        const stage = e.target.getStage()
        if (!stage) return

        const pointerPos = stage.getPointerPosition()
        if (!pointerPos) return

        // Convert screen coordinates to trailer coordinates
        const x = (pointerPos.x - padding) / scale
        const y = (pointerPos.y - padding) / scale

        // Snap to grid
        const snappedX = Math.round(x / GRID_SIZE) * GRID_SIZE
        const snappedY = Math.round(y / GRID_SIZE) * GRID_SIZE

        // Check if within trailer bounds
        if (
          snappedX >= 0 &&
          snappedY >= 0 &&
          snappedX + selectedCargo.length <= trailer.internalLength &&
          snappedY + selectedCargo.width <= trailer.internalWidth
        ) {
          onAddItem(selectedCargo, { x: snappedX, y: snappedY })
        }
      }
    }
  }

  const handleItemDragStart = (itemId: string, e: Konva.KonvaEventObject<DragEvent>) => {
    setDraggedItem(itemId)
    const pos = e.target.position()
    setDragStart({ x: pos.x, y: pos.y })
  }

  const handleItemDragEnd = (item: LoadPlanItem, e: Konva.KonvaEventObject<DragEvent>) => {
    setDraggedItem(null)
    setDragStart(null)

    const newPos = e.target.position()
    const newX = (newPos.x - padding) / scale
    const newY = (newPos.y - padding) / scale

    // Snap to grid
    const snappedX = Math.round(newX / GRID_SIZE) * GRID_SIZE
    const snappedY = Math.round(newY / GRID_SIZE) * GRID_SIZE

    // Check bounds
    const dims = getRotatedDimensions(item.cargoItem, item.rotation)
    if (
      snappedX >= 0 &&
      snappedY >= 0 &&
      snappedX + dims.length <= trailer.internalLength &&
      snappedY + dims.width <= trailer.internalWidth
    ) {
      onItemUpdate(item.id, {
        positionX: snappedX,
        positionY: snappedY,
      })
    } else {
      // Reset position
      e.target.position({
        x: item.positionX * scale + padding,
        y: item.positionY * scale + padding,
      })
    }
  }

  const handleItemRotate = (item: LoadPlanItem) => {
    const newRotation = (item.rotation + 90) % 360
    onItemUpdate(item.id, { rotation: newRotation })
  }

  return (
    <div className="flex h-full flex-col bg-gray-100">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            Scale: {(scale * 100).toFixed(0)}% | Grid: {GRID_SIZE}mm
          </span>
          <button
            onClick={() => setScale(scale * 1.2)}
            className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            Zoom In
          </button>
          <button
            onClick={() => setScale(scale / 1.2)}
            className="rounded px-2 py-1 text-sm hover:bg-gray-100"
          >
            Zoom Out
          </button>
        </div>
        <div className="text-sm text-gray-600">
          {selectedCargo
            ? `Click to place: ${selectedCargo.name}`
            : 'Select cargo item to place'}
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <Stage
          width={canvasWidth}
          height={canvasHeight}
          ref={stageRef}
          onClick={handleStageClick}
          onTap={handleStageClick}
        >
          <Layer>
            {/* Grid */}
            {Array.from({ length: Math.ceil(trailer.internalLength / GRID_SIZE) + 1 }).map(
              (_, i) => (
                <Line
                  key={`grid-v-${i}`}
                  points={[
                    padding + i * GRID_SIZE * scale,
                    padding,
                    padding + i * GRID_SIZE * scale,
                    padding + trailerHeight,
                  ]}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
              )
            )}
            {Array.from({ length: Math.ceil(trailer.internalWidth / GRID_SIZE) + 1 }).map(
              (_, i) => (
                <Line
                  key={`grid-h-${i}`}
                  points={[
                    padding,
                    padding + i * GRID_SIZE * scale,
                    padding + trailerWidth,
                    padding + i * GRID_SIZE * scale,
                  ]}
                  stroke="#e5e7eb"
                  strokeWidth={0.5}
                />
              )
            )}

            {/* Trailer outline */}
            <Rect
              x={padding}
              y={padding}
              width={trailerWidth}
              height={trailerHeight}
              stroke="#374151"
              strokeWidth={2}
              fill="#f9fafb"
              dash={[5, 5]}
            />

            {/* Wheel arches (if applicable) */}
            {trailer.hasWheelArches && trailer.wheelArchWidth && trailer.wheelArchHeight && (
              <>
                <Rect
                  x={padding + (trailer.internalLength * 0.3) * scale}
                  y={padding + (trailer.internalWidth - trailer.wheelArchWidth) * scale}
                  width={trailer.wheelArchHeight * scale}
                  height={trailer.wheelArchWidth * scale}
                  fill="#e5e7eb"
                  opacity={0.5}
                />
                <Rect
                  x={padding + (trailer.internalLength * 0.7) * scale}
                  y={padding + (trailer.internalWidth - trailer.wheelArchWidth) * scale}
                  width={trailer.wheelArchHeight * scale}
                  height={trailer.wheelArchWidth * scale}
                  fill="#e5e7eb"
                  opacity={0.5}
                />
              </>
            )}

            {/* Temperature zones (for frigo) */}
            {trailer.temperatureZones &&
              Array.isArray(trailer.temperatureZones) &&
              trailer.temperatureZones.map((zone: any, index: number) => (
                <Rect
                  key={`zone-${index}`}
                  x={padding + zone.x * scale}
                  y={padding + zone.y * scale}
                  width={zone.width * scale}
                  height={zone.height * scale}
                  fill="#dbeafe"
                  opacity={0.3}
                  stroke="#3b82f6"
                  strokeWidth={1}
                />
              ))}

            {/* Load plan items */}
            {items.map((item) => {
              const dims = getRotatedDimensions(item.cargoItem, item.rotation)
              const color = getItemColor(item.cargoItem)

              return (
                <Group
                  key={item.id}
                  x={padding + item.positionX * scale}
                  y={padding + item.positionY * scale}
                  draggable
                  onDragStart={(e) => handleItemDragStart(item.id, e)}
                  onDragEnd={(e) => handleItemDragEnd(item, e)}
                  onClick={(e) => {
                    e.cancelBubble = true
                  }}
                >
                  <Rect
                    width={dims.length * scale}
                    height={dims.width * scale}
                    fill={color}
                    stroke={draggedItem === item.id ? '#3b82f6' : '#6b7280'}
                    strokeWidth={draggedItem === item.id ? 3 : 1}
                    opacity={0.7}
                    cornerRadius={2}
                  />
                  <Text
                    x={5}
                    y={5}
                    text={item.cargoItem.name}
                    fontSize={10}
                    fill="#1f2937"
                    fontStyle="bold"
                  />
                  {item.stackLevel > 0 && (
                    <Text
                      x={5}
                      y={20}
                      text={`Level ${item.stackLevel}`}
                      fontSize={8}
                      fill="#6b7280"
                    />
                  )}
                  {item.rotation !== 0 && (
                    <Text
                      x={dims.length * scale - 30}
                      y={5}
                      text={`${item.rotation}°`}
                      fontSize={8}
                      fill="#6b7280"
                    />
                  )}
                </Group>
              )
            })}

            {/* Cursor preview when dragging cargo */}
            {selectedCargo && (
              <Group>
                <Rect
                  x={padding}
                  y={padding}
                  width={selectedCargo.length * scale}
                  height={selectedCargo.width * scale}
                  fill="#3b82f6"
                  opacity={0.3}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                />
              </Group>
            )}
          </Layer>
        </Stage>
      </div>
    </div>
  )
}

function getRotatedDimensions(
  cargoItem: CargoItem,
  rotation: number
): { length: number; width: number; height: number } {
  if (rotation === 90 || rotation === 270) {
    return {
      length: cargoItem.width,
      width: cargoItem.length,
      height: cargoItem.height,
    }
  }
  return {
    length: cargoItem.length,
    width: cargoItem.width,
    height: cargoItem.height,
  }
}

function getItemColor(cargoItem: CargoItem): string {
  if (cargoItem.adrClass) return '#ef4444' // Red for ADR
  if (cargoItem.isFragile) return '#f59e0b' // Orange for fragile
  if (cargoItem.temperatureMin !== null) return '#3b82f6' // Blue for temperature controlled
  return '#10b981' // Green for normal
}

