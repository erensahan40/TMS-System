'use client'

import { useEffect, useState, useMemo } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import type { RouteStopInput } from '@/lib/route-eta'

import 'leaflet/dist/leaflet.css'

const NETHERLANDS_CENTER: [number, number] = [52.1326, 5.2913]

const ROUTE_LINE_COLOR = '#0d9488'
const ROUTE_LINE_WEIGHT = 6

/** Genummerde marker voor op de kaart: start (groen) of stop (teal met nummer). */
function createNumberedIcon(sequence: number, isFirst: boolean): L.DivIcon {
  const bg = isFirst ? '#059669' : '#0d9488'
  const size = 36
  return L.divIcon({
    className: 'route-marker',
    html: `
      <div style="
        width: ${size}px; height: ${size}px;
        background: ${bg};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 14px;
        color: white;
        font-family: system-ui, sans-serif;
      ">${sequence}</div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

interface RouteMapInnerProps {
  stops: Array<RouteStopInput & { lat: number; lng: number }>
}

function FitBounds({ stops }: { stops: Array<{ lat: number; lng: number }> }) {
  const map = useMap()
  useEffect(() => {
    if (stops.length < 2) return
    const bounds = L.latLngBounds(stops.map((s) => [s.lat, s.lng] as [number, number]))
    map.fitBounds(bounds.pad(0.15))
  }, [map, stops])
  return null
}

export function RouteMapInner({ stops }: RouteMapInnerProps) {
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][] | null>(null)
  const straightLine = useMemo(
    () => stops.map((s) => [s.lat, s.lng] as [number, number]),
    [stops]
  )

  useEffect(() => {
    if (stops.length < 2) {
      setRouteCoordinates(null)
      return
    }
    let cancelled = false
    fetch('/api/route-geometry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.coordinates?.length) {
          setRouteCoordinates(data.coordinates)
        } else {
          setRouteCoordinates(null)
        }
      })
      .catch(() => {
        if (!cancelled) setRouteCoordinates(null)
      })
    return () => {
      cancelled = true
    }
  }, [stops])

  const linePositions = routeCoordinates ?? straightLine

  return (
    <div className="route-map-container h-[280px] w-full overflow-hidden">
      <MapContainer
        center={NETHERLANDS_CENTER}
        zoom={7}
        className="h-full w-full rounded-b-xl"
        scrollWheelZoom
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {stops.length >= 2 && (
          <Polyline
            positions={linePositions}
            color={ROUTE_LINE_COLOR}
            weight={ROUTE_LINE_WEIGHT}
            opacity={0.95}
          />
        )}
        {stops.map((stop, index) => (
          <Marker
            key={stop.id}
            position={[stop.lat, stop.lng]}
            icon={createNumberedIcon(stop.sequence, index === 0)}
          >
            <Popup>
              <strong>
                {stop.sequence}. {stop.name || `Stop ${stop.sequence}`}
              </strong>
              <br />
              {stop.type === 'PICKUP' ? 'Laden' : 'Lossen'}
              {(stop.address || stop.city) && (
                <>
                  <br />
                  {[stop.address, stop.city, stop.postalCode].filter(Boolean).join(', ')}
                </>
              )}
            </Popup>
          </Marker>
        ))}
        {stops.length >= 2 && <FitBounds stops={stops} />}
      </MapContainer>
    </div>
  )
}
