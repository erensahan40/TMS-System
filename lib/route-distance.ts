/**
 * Rij-afstand tussen twee punten via OSRM (gratis, OpenStreetMap).
 * Retourneert afstand in km. Bij fout: null (fallback naar Haversine of handmatig).
 */

export async function getDrivingDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): Promise<number | null> {
  // OSRM: long,lat (lng,lat)
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=false`
  try {
    const res = await fetch(url, {
      headers: { 'Accept': 'application/json' },
    })
    const data = await res.json()
    if (data.code !== 'Ok' || !data.routes?.[0]) return null
    const distanceMeters = data.routes[0].distance
    return Math.round((distanceMeters / 1000) * 10) / 10 // 1 decimaal
  } catch {
    return null
  }
}

/** Vogelsnelheid in km (Haversine) als fallback wanneer OSRM faalt */
export function getHaversineDistanceKm(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number }
): number {
  const R = 6371 // Aarde straal km
  const dLat = ((to.lat - from.lat) * Math.PI) / 180
  const dLng = ((to.lng - from.lng) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((from.lat * Math.PI) / 180) *
      Math.cos((to.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Math.round(R * c * 10) / 10
}
