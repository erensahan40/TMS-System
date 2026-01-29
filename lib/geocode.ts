/**
 * Geocoding via OpenStreetMap Nominatim (gratis, geen API-key).
 * Gebruik met mate: max 1 request per seconde (Nominatim usage policy).
 */

export interface GeocodeResult {
  lat: number
  lng: number
  displayName?: string
}

export async function geocodeAddress(
  address: string,
  city: string,
  postalCode: string,
  country: string = 'Nederland'
): Promise<GeocodeResult | null> {
  const parts = [address, city, postalCode, country].filter(Boolean)
  if (parts.length === 0) return null
  const query = encodeURIComponent(parts.join(', '))
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'Accept-Language': 'nl',
          'User-Agent': 'TMS-Platform/1.0 (contact@example.com)',
        },
      }
    )
    const data = await res.json()
    if (!Array.isArray(data) || data.length === 0) return null
    const first = data[0]
    return {
      lat: parseFloat(first.lat),
      lng: parseFloat(first.lon),
      displayName: first.display_name,
    }
  } catch {
    return null
  }
}
