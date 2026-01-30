import { NextRequest, NextResponse } from 'next/server'

const ORS_API_KEY = process.env.OPENROUTESERVICE_API_KEY

/** OpenRouteService/Pelias GeoJSON feature (subset we use). */
type ORSFeature = {
  type: string
  geometry?: { type: string; coordinates: [number, number] }
  properties?: {
    id?: string
    gid?: string
    layer?: string
    name?: string
    label?: string
    country?: string
    country_a?: string
    region?: string
    locality?: string
    postalcode?: string
    street?: string
    housenumber?: string
    [key: string]: unknown
  }
}

/** Response-item voor suggest: displayName altijd; name alleen bij venue/bedrijf. */
type SuggestItem = {
  displayName: string
  lat: number
  lng: number
  country: string
  name?: string
}

const ORS_BASE = 'https://api.openrouteservice.org/geocode'

/** Haalt features op van één ORS-endpoint en mapt naar SuggestItem[]. */
async function fetchOrsFeatures(
  endpoint: 'search' | 'autocomplete',
  q: string,
  size: number
): Promise<SuggestItem[]> {
  const params = new URLSearchParams({
    api_key: ORS_API_KEY!,
    text: q,
    size: String(size),
    'boundary.country': 'NL',
  })
  const url = `${ORS_BASE}/${endpoint}?${params.toString()}`
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    next: { revalidate: 0 },
  })
  if (!res.ok) return []
  const data = (await res.json()) as { type?: string; features?: ORSFeature[] }
  const features = Array.isArray(data.features) ? data.features : []
  return features
    .filter((f): f is ORSFeature & { geometry: { coordinates: [number, number] } } =>
      Array.isArray(f.geometry?.coordinates) && f.geometry.coordinates.length >= 2
    )
    .map((f): SuggestItem => {
      const [lng, lat] = f.geometry.coordinates
      const props = f.properties ?? {}
      const layer = typeof props.layer === 'string' ? props.layer : ''
      const name = typeof props.name === 'string' ? props.name.trim() : ''
      const label = typeof props.label === 'string' ? props.label : ''
      const addressParts = [props.street, props.housenumber, props.locality, props.postalcode].filter(Boolean) as string[]
      const addressLine = addressParts.length > 0 ? addressParts.join(', ') : label
      const country = typeof props.country === 'string' ? props.country : (props.country_a ?? '') || ''

      if ((layer === 'venue' || layer === 'address') && name) {
        const address = addressLine || label.replace(new RegExp(`^${escapeRegExp(name)}[,\\s–-]*`, 'i'), '').trim() || label
        const displayName = address ? `${name} – ${address}` : name
        return { displayName, lat, lng, country, name }
      }

      const displayName = label || addressLine || name
      return { displayName, lat, lng, country }
    })
}

/**
 * Adres- en bedrijfs-suggesties via OpenRouteService Geocode (Pelias).
 * Roept zowel search (full-text, goed voor bedrijfsnamen) als autocomplete (partial match) aan
 * en voegt resultaten samen; dedupe op coördinaten. Bij weinig ORS-resultaten vullen we aan met Nominatim.
 * GET /api/geocode/suggest?q=...
 */
async function suggestOpenRouteService(q: string): Promise<SuggestItem[]> {
  const [searchResults, autocompleteResults] = await Promise.all([
    fetchOrsFeatures('search', q, 10),
    fetchOrsFeatures('autocomplete', q, 8),
  ])

  const seen = new Set<string>()
  const merged: SuggestItem[] = []
  const add = (item: SuggestItem) => {
    const key = `${Math.round(item.lat * 1e5)}_${Math.round(item.lng * 1e5)}_${item.displayName}`
    if (seen.has(key)) return
    seen.add(key)
    merged.push(item)
  }
  searchResults.forEach(add)
  autocompleteResults.forEach(add)

  if (merged.length < 4) {
    const nominatim = await suggestNominatim(q)
    nominatim.forEach((item) => {
      const key = `${Math.round(item.lat * 1e5)}_${Math.round(item.lng * 1e5)}_${item.displayName}`
      if (seen.has(key)) return
      seen.add(key)
      merged.push(item)
    })
  }

  return merged.slice(0, 12)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Nominatim address details (fallback). */
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

/** Fallback: Nominatim (zonder API-key). */
async function suggestNominatim(q: string): Promise<Array<{ displayName: string; lat: number; lng: number; country: string }>> {
  const encoded = encodeURIComponent(q)
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=6&addressdetails=1`
  const res = await fetch(url, {
    headers: {
      'Accept-Language': 'nl',
      'User-Agent': 'TMS-Platform/1.0 (https://github.com/tms-platform)',
    },
  })
  const data = await res.json()
  if (!Array.isArray(data)) return []
  return data.slice(0, 6).map((item: {
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
}

/**
 * Adres- en bedrijfs-suggesties voor autocomplete.
 * Gebruikt OpenRouteService Geocode (Pelias) als OPENROUTESERVICE_API_KEY gezet is;
 * anders Nominatim. ORS zoekt op adressen (incl. huisnummer), straten, plaatsen en venues (bedrijven).
 * GET /api/geocode/suggest?q=...
 */
export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (q.length < 2) {
    return NextResponse.json([])
  }

  try {
    if (ORS_API_KEY) {
      const results = await suggestOpenRouteService(q)
      return NextResponse.json(results)
    }
    if (q.length < 3) return NextResponse.json([])
    const results = await suggestNominatim(q)
    return NextResponse.json(results)
  } catch (err) {
    console.error('Geocode suggest error:', err)
    return NextResponse.json([])
  }
}
