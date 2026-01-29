import { NextRequest, NextResponse } from 'next/server'

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY

/**
 * Route-geometrie (wegverloop) voor op de kaart.
 * Met OPENROUTESERVICE_API_KEY: vrachtwagenrouting (HGV) via OpenRouteService.
 * Zonder key: personenauto-routing via OSRM.
 * POST body: { waypoints: [{ lat, lng }, ...] }
 * Retourneert: { coordinates: [[lat, lng], ...], profile?: 'driving-hgv' | 'driving-car' }
 */
export async function POST(request: NextRequest) {
  let body: { waypoints?: Array<{ lat: number; lng: number }> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige body' }, { status: 400 })
  }

  const waypoints = body.waypoints
  if (!Array.isArray(waypoints) || waypoints.length < 2) {
    return NextResponse.json(
      { error: 'Minimaal 2 waypoints nodig' },
      { status: 400 }
    )
  }

  const validWaypoints = waypoints.filter(
    (w): w is { lat: number; lng: number } =>
      typeof w?.lat === 'number' && typeof w?.lng === 'number'
  )
  if (validWaypoints.length < 2) {
    return NextResponse.json({ error: 'Ongeldige waypoints' }, { status: 400 })
  }

  // OpenRouteService: vrachtwagenrouting (HGV)
  if (ORS_API_KEY) {
    try {
      const res = await fetch(
        'https://api.openrouteservice.org/v2/directions/driving-hgv/geojson',
        {
          method: 'POST',
          headers: {
            Authorization: ORS_API_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            coordinates: validWaypoints.map((w) => [w.lng, w.lat]),
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        console.error('ORS geometry error:', data)
        return NextResponse.json(
          { error: 'Route niet gevonden', coordinates: null },
          { status: 200 }
        )
      }
      const coordsGeo = data.features?.[0]?.geometry?.coordinates
      if (!Array.isArray(coordsGeo) || coordsGeo.length === 0) {
        return NextResponse.json(
          { error: 'Geen route gevonden', coordinates: null },
          { status: 200 }
        )
      }
      // GeoJSON is [lng, lat]; Leaflet wil [lat, lng]
      const coordinates = coordsGeo.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number])
      return NextResponse.json({ coordinates, profile: 'driving-hgv' })
    } catch (err) {
      console.error('ORS route geometry error:', err)
      return NextResponse.json(
        { error: 'Route ophalen mislukt', coordinates: null },
        { status: 500 }
      )
    }
  }

  // OSRM: personenauto
  const coords = validWaypoints.map((w) => `${w.lng},${w.lat}`).join(';')
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]?.geometry?.coordinates) {
      return NextResponse.json(
        { error: 'Geen route gevonden', coordinates: null },
        { status: 200 }
      )
    }
    const coordsGeo = data.routes[0].geometry.coordinates as Array<[number, number]>
    const coordinates = coordsGeo.map(([lng, lat]) => [lat, lng] as [number, number])
    return NextResponse.json({ coordinates, profile: 'driving-car' })
  } catch (err) {
    console.error('Route geometry error:', err)
    return NextResponse.json(
      { error: 'Route ophalen mislukt', coordinates: null },
      { status: 500 }
    )
  }
}
