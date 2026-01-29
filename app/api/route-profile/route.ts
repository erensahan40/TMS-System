import { NextResponse } from 'next/server'

/**
 * Geeft aan welk routingprofiel actief is (voor UI-info).
 * GET /api/route-profile → { profile: 'driving-hgv' | 'driving-car' }
 */
export async function GET() {
  const hasOrs = !!process.env.OPENROUTESERVICE_API_KEY
  return NextResponse.json({
    profile: hasOrs ? 'driving-hgv' : 'driving-car',
    label: hasOrs
      ? 'Vrachtwagenroute (OpenRouteService HGV)'
      : 'Personenauto-route (OSRM). Voor vrachtwagen: voeg OPENROUTESERVICE_API_KEY toe.',
  })
}
