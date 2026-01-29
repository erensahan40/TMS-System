import { NextRequest, NextResponse } from 'next/server'

/**
 * Geocoding via server: voorkomt CORS-problemen met Nominatim in de browser.
 * GET /api/geocode?address=...&city=...&postalCode=...&country=Nederland
 */
export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get('address') ?? ''
  const city = request.nextUrl.searchParams.get('city') ?? ''
  const postalCode = request.nextUrl.searchParams.get('postalCode') ?? ''
  const country = request.nextUrl.searchParams.get('country') ?? 'Nederland'

  const parts = [address, city, postalCode, country].filter(Boolean)
  if (parts.length === 0) {
    return NextResponse.json({ error: 'Geen adres opgegeven' }, { status: 400 })
  }

  const query = encodeURIComponent(parts.join(', '))
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'nl',
        'User-Agent': 'TMS-Platform/1.0 (https://github.com/tms-platform)',
      },
    })
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'Adres niet gevonden' }, { status: 404 })
    }
    const first = data[0]
    return NextResponse.json({
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    })
  } catch (err) {
    console.error('Geocode error:', err)
    return NextResponse.json(
      { error: 'Geocoding mislukt. Probeer het later opnieuw.' },
      { status: 500 }
    )
  }
}
