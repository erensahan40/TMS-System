import { NextRequest, NextResponse } from 'next/server'

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY

/**
 * Rij-afstand (km) tussen twee punten.
 * Met OPENROUTESERVICE_API_KEY: vrachtwagenrouting (HGV) via OpenRouteService.
 * Zonder key: personenauto-routing via OSRM.
 * POST body: { from: { lat, lng }, to: { lat, lng } }
 */
export async function POST(request: NextRequest) {
  let body: { from?: { lat: number; lng: number }; to?: { lat: number; lng: number } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige body' }, { status: 400 })
  }

  const from = body.from
  const to = body.to
  if (
    !from ||
    !to ||
    typeof from.lat !== 'number' ||
    typeof from.lng !== 'number' ||
    typeof to.lat !== 'number' ||
    typeof to.lng !== 'number'
  ) {
    return NextResponse.json(
      { error: 'from en to met lat/lng zijn verplicht' },
      { status: 400 }
    )
  }

  // OpenRouteService: vrachtwagenrouting (HGV) – gewicht/hoogte-restricties
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
            coordinates: [
              [from.lng, from.lat],
              [to.lng, to.lat],
            ],
          }),
        }
      )
      const data = await res.json()
      if (!res.ok) {
        console.error('ORS error:', data)
        return NextResponse.json(
          { error: 'Route niet gevonden (ORS)', distanceKm: null },
          { status: 200 }
        )
      }
      const distM = data.features?.[0]?.properties?.summary?.distance
      if (typeof distM !== 'number') {
        return NextResponse.json(
          { error: 'Geen route gevonden', distanceKm: null },
          { status: 200 }
        )
      }
      const distanceKm = Math.round((distM / 1000) * 10) / 10
      return NextResponse.json({ distanceKm, profile: 'driving-hgv' })
    } catch (err) {
      console.error('ORS route distance error:', err)
      return NextResponse.json(
        { error: 'Afstandsberekening mislukt', distanceKm: null },
        { status: 500 }
      )
    }
  }

  // OSRM: personenauto (geen vrachtwagenprofiel op publieke server)
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) {
      return NextResponse.json(
        { error: 'Geen route gevonden', distanceKm: null },
        { status: 200 }
      )
    }
    const distanceMeters = data.routes[0].distance
    const distanceKm = Math.round((distanceMeters / 1000) * 10) / 10
    return NextResponse.json({ distanceKm, profile: 'driving-car' })
  } catch (err) {
    console.error('Route distance error:', err)
    return NextResponse.json(
      { error: 'Afstandsberekening mislukt', distanceKm: null },
      { status: 500 }
    )
  }
}
