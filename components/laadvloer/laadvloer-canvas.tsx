'use client'

import { useRef, useState } from 'react'
import { Stage, Layer, Rect, Group, Line, Text } from 'react-konva'
import type Konva from 'konva'
import type { PlacedPallet } from './types'

const SCALE = 0.4 // px per cm
const GRID_CM = 20

interface LaadvloerCanvasProps {
  trailerLengthCm: number
  trailerWidthCm: number
  placedPallets: PlacedPallet[]
  onUpdatePlaced: (itemId: string, updates: Partial<PlacedPallet>) => void
}

function getRotatedDims(p: PlacedPallet) {
  if (p.rotation === 90 || p.rotation === 270) {
    return { length: p.widthCm, width: p.lengthCm }
  }
  return { length: p.lengthCm, width: p.widthCm }
}

export function LaadvloerCanvas({
  trailerLengthCm,
  trailerWidthCm,
  placedPallets,
  onUpdatePlaced,
}: LaadvloerCanvasProps) {
  const stageRef = useRef<Konva.Stage>(null)
  const [scale, setScale] = useState(SCALE)
  const [draggedId, setDraggedId] = useState<string | null>(null)

  const trailerW = trailerLengthCm * scale
  const trailerH = trailerWidthCm * scale
  const padding = 40
  const canvasW = Math.max(700, trailerW + padding * 2)
  const canvasH = Math.max(500, trailerH + padding * 2)

  const handleDragEnd = (item: PlacedPallet, e: Konva.KonvaEventObject<DragEvent>) => {
    setDraggedId(null)
    const pos = e.target.position()
    let newX = (pos.x - padding) / scale
    let newY = (pos.y - padding) / scale
    newX = Math.round(newX / GRID_CM) * GRID_CM
    newY = Math.round(newY / GRID_CM) * GRID_CM
    const dims = getRotatedDims(item)
    if (
      newX >= 0 &&
      newY >= 0 &&
      newX + dims.length <= trailerLengthCm &&
      newY + dims.width <= trailerWidthCm
    ) {
      onUpdatePlaced(item.id, { positionX: newX, positionY: newY })
    } else {
      e.target.position({
        x: item.positionX * scale + padding,
        y: item.positionY * scale + padding,
      })
    }
  }

  const handleRotate = (item: PlacedPallet) => {
    const newRot = (item.rotation + 90) % 360
    onUpdatePlaced(item.id, { rotation: newRot })
  }

  return (
    <div className="flex flex-col bg-gray-100">
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <span className="text-sm text-gray-600">
          Laadvloer: {trailerLengthCm} × {trailerWidthCm} cm | Raster: {GRID_CM} cm
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setScale((s) => Math.min(s * 1.2, 1.2))}
            className="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
          >
            Inzoomen
          </button>
          <button
            type="button"
            onClick={() => setScale((s) => Math.max(s / 1.2, 0.15))}
            className="rounded bg-gray-200 px-2 py-1 text-sm hover:bg-gray-300"
          >
            Uitzoomen
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        <Stage
          width={canvasW}
          height={canvasH}
          ref={stageRef}
          onWheel={(e) => {
            e.evt.preventDefault()
            const dir = e.evt.deltaY > 0 ? -1 : 1
            setScale((s) => Math.max(0.15, Math.min(1.2, s + dir * 0.05)))
          }}
        >
          <Layer>
            {Array.from({ length: Math.ceil(trailerLengthCm / GRID_CM) + 1 }).map((_, i) => (
              <Line
                key={`v-${i}`}
                points={[
                  padding + i * GRID_CM * scale,
                  padding,
                  padding + i * GRID_CM * scale,
                  padding + trailerH,
                ]}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
            ))}
            {Array.from({ length: Math.ceil(trailerWidthCm / GRID_CM) + 1 }).map((_, i) => (
              <Line
                key={`h-${i}`}
                points={[
                  padding,
                  padding + i * GRID_CM * scale,
                  padding + trailerW,
                  padding + i * GRID_CM * scale,
                ]}
                stroke="#e5e7eb"
                strokeWidth={0.5}
              />
            ))}
            <Rect
              x={padding}
              y={padding}
              width={trailerW}
              height={trailerH}
              fill="#f9fafb"
              stroke="#374151"
              strokeWidth={2}
              dash={[4, 4]}
            />
            {placedPallets.map((item) => {
              const dims = getRotatedDims(item)
              const color = '#10b981'
              return (
                <Group
                  key={item.id}
                  x={padding + item.positionX * scale}
                  y={padding + item.positionY * scale}
                  draggable
                  onDragStart={() => setDraggedId(item.id)}
                  onDragEnd={(e) => handleDragEnd(item, e)}
                  onClick={() => handleRotate(item)}
                >
                  <Rect
                    width={dims.length * scale}
                    height={dims.width * scale}
                    fill={color}
                    stroke={draggedId === item.id ? '#2563eb' : '#059669'}
                    strokeWidth={draggedId === item.id ? 3 : 1}
                    opacity={0.85}
                    cornerRadius={2}
                  />
                  <Text
                    x={4}
                    y={4}
                    text={item.label || `${item.lengthCm}×${item.widthCm}`}
                    fontSize={Math.max(10, 10 * scale)}
                    fill="#1f2937"
                    fontStyle="bold"
                    listening={false}
                  />
                  {item.rotation !== 0 && (
                    <Text
                      x={dims.length * scale - 28}
                      y={2}
                      text={`${item.rotation}°`}
                      fontSize={9}
                      fill="#6b7280"
                      listening={false}
                    />
                  )}
                </Group>
              )
            })}
          </Layer>
        </Stage>
      </div>
      <p className="border-t bg-white px-4 py-2 text-xs text-gray-500">
        Sleep palletten om ze te verplaatsen. Klik op een pallet om 90° te roteren.
      </p>
    </div>
  )
}
