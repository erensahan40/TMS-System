'use client'

import dynamic from 'next/dynamic'
import type { RouteStopInput } from '@/lib/route-eta'

interface RouteMapProps {
  stops: RouteStopInput[]
  className?: string
}

// react-leaflet vereist browser; laad kaart alleen client-side (ssr: false)
const RouteMapInner = dynamic(
  () => import('./route-map-inner').then((m) => m.RouteMapInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex min-h-[280px] items-center justify-center bg-slate-100">
        <div className="flex flex-col items-center gap-3 text-slate-600">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
          <p className="text-sm font-medium">Kaart wordt geladen...</p>
        </div>
      </div>
    ),
  }
)

export function RouteMap({ stops, className = '' }: RouteMapProps) {
  const stopsWithCoords = stops.filter(
    (s): s is RouteStopInput & { lat: number; lng: number } =>
      typeof s.lat === 'number' && typeof s.lng === 'number'
  )

  return (
    <div className={className}>
      <RouteMapInner stops={stopsWithCoords} />
    </div>
  )
}
