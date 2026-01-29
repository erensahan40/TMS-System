import { NextRequest, NextResponse } from 'next/server'

/** Nominatim address details (subset we use). */
type AddressDetails = {
  house_number?: string
  road?: string
  village?: string
  town?: string
  city?: string
  municipality?: string
  postcode?: string
  country?: string
}

/**
 * Bouwt één korte adresregel uit address-details (geen dubbele steden zoals Lanaken, Tongeren).
 * Straat + nummer, postcode + één plaats, land.
 */
function buildShortDisplayName(addr: AddressDetails | undefined, fallback: string): string {
  if (!addr) return fallback
  const road = [addr.road, addr.house_number].filter(Boolean).join(' ')
  const place = addr.city || addr.town || addr.village || addr.municipality || ''
  const postcode = addr.postcode || ''
  const postPlace = [postcode, place].filter(Boolean).join(' ')
  const country = addr.country || ''
  const parts = [road, postPlace, country].filter(Boolean)
  return parts.length > 0 ? parts.join(', ') : fallback
}

/**
 * Adres-suggesties voor autocomplete (Nominatim).
 * GET /api/geocode/suggest?q=...
 * Retourneert: [{ displayName, lat, lng, country }, ...]
 * displayName is kort en zonder dubbele plaatsnamen (één stad per suggestie).
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 3) {
    return NextResponse.json([])
  }

  const encoded = encodeURIComponent(q)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=6&addressdetails=1`

  try {
    const res = await fetch(url, {
      headers: {
        'Accept-Language': 'nl',
        'User-Agent': 'TMS-Platform/1.0 (https://github.com/tms-platform)',
      },
    })
    const data = await res.json()
    if (!Array.isArray(data)) return NextResponse.json([])
    return NextResponse.json(
      data.slice(0, 6).map((item: {
        lat: string
        lon: string
        display_name: string
        address?: AddressDetails
      }) => ({
        displayName: buildShortDisplayName(item.address, item.display_name),
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        country: item.address?.country || '',
      }))
    )
  } catch (err) {
    console.error('Geocode suggest error:', err)
    return NextResponse.json([])
  }
}
