'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, MapPin, MapPinned, Clock, Navigation } from 'lucide-react'
import { format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { calculateRouteEta, type RouteStopInput, type RouteStopWithEta } from '@/lib/route-eta'
import { getHaversineDistanceKm } from '@/lib/route-distance'
import { RouteMap } from './route-map'
import { AddressAutocomplete, type AddressSuggestion } from './address-autocomplete'

const defaultStop = (seq: number): RouteStopInput => ({
  id: crypto.randomUUID(),
  sequence: seq,
  type: seq === 1 ? 'PICKUP' : 'DELIVERY',
  name: '',
  address: '',
  city: '',
  postalCode: '',
  country: 'Nederland',
  distanceKm: 0,
  durationMinutes: 0,
})

/** Format minuten als "X u Y min" of "X min" */
function formatMinutesAsHours(minutes: number): string {
  if (minutes <= 0) return '0 min'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m} min`
  if (m === 0) return `${h} u`
  return `${h} u ${m} min`
}

export function RoutePlanningEta() {
  const [startAt, setStartAt] = useState(() => {
    const d = new Date()
    d.setMinutes(0)
    d.setSeconds(0)
    return d.toISOString().slice(0, 16)
  })
  const [speedKmh, setSpeedKmh] = useState(80)
  const [stops, setStops] = useState<RouteStopInput[]>([
    { ...defaultStop(1), name: 'Start', address: '', city: '', postalCode: '', country: 'Nederland' },
    { ...defaultStop(2), name: 'Stop 2', address: '', city: '', postalCode: '', country: 'Nederland', distanceKm: 0 },
  ])

  const addStop = useCallback(() => {
    const next = stops.length + 1
    setStops((prev) => [
      ...prev,
      { ...defaultStop(next), name: `Stop ${next}`, distanceKm: 0 },
    ])
  }, [stops.length])

  const removeStop = useCallback((id: string) => {
    setStops((prev) => {
      const filtered = prev.filter((s) => s.id !== id)
      return filtered.map((s, i) => ({ ...s, sequence: i + 1 }))
    })
  }, [])

  const updateStop = useCallback((id: string, updates: Partial<RouteStopInput>) => {
    setStops((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)))
  }, [])

  /** Na selectie van een adres: coördinaten + land + afstand vanaf vorige stop bijwerken. */
  const applyAddressSelection = useCallback(
    async (stop: RouteStopInput, suggestion: AddressSuggestion) => {
      const { lat, lng, displayName, country } = suggestion
      const updates: Partial<RouteStopInput> = { 
        address: displayName, 
        lat, 
        lng,
        country: country || undefined
      }
      const sorted = [...stops].sort((a, b) => a.sequence - b.sequence)
      const prevStop = sorted.find((s) => s.sequence === stop.sequence - 1)
      if (prevStop && typeof prevStop.lat === 'number' && typeof prevStop.lng === 'number') {
        try {
          const distRes = await fetch('/api/route-distance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              from: { lat: prevStop.lat, lng: prevStop.lng },
              to: { lat, lng },
            }),
          })
          const distData = await distRes.json()
          updates.distanceKm =
            distData.distanceKm ??
            getHaversineDistanceKm(
              { lat: prevStop.lat, lng: prevStop.lng },
              { lat, lng }
            )
        } catch {
          updates.distanceKm = getHaversineDistanceKm(
            { lat: prevStop.lat, lng: prevStop.lng },
            { lat, lng }
          )
        }
      }
      updateStop(stop.id, updates)
    },
    [updateStop, stops]
  )

  const stopsWithEta: RouteStopWithEta[] = calculateRouteEta(
    new Date(startAt),
    speedKmh,
    stops
  ).sort((a, b) => a.sequence - b.sequence)

  const stopsWithCoords = stops.filter(
    (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
  )
  const sortedStops = [...stops].sort((a, b) => a.sequence - b.sequence)

  const [routeProfileLabel, setRouteProfileLabel] = useState<string | null>(null)
  useEffect(() => {
    fetch('/api/route-profile')
      .then((res) => res.json())
      .then((data) => setRouteProfileLabel(data.label ?? null))
      .catch(() => setRouteProfileLabel(null))
  }, [])

  const inputBase =
    'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25'

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      {/* Kaart */}
      <Card className="overflow-hidden border-0 bg-white shadow-lg ring-1 ring-slate-200/60 rounded-2xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
          <CardTitle className="flex items-center gap-3 text-xl font-semibold text-slate-800">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <MapPinned className="h-5 w-5" />
            </div>
            Route op kaart
          </CardTitle>
          <p className="mt-1 text-sm text-slate-600">
            Typ bij elke stop een adres; kies een suggestie en de locatie en route worden{' '}
            <strong className="text-slate-700">automatisch</strong> op de kaart gezet met de juiste afstand.
          </p>
          {routeProfileLabel && (
            <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
              {routeProfileLabel}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <RouteMap stops={stops} />
          {stopsWithCoords.length === 0 && (
            <div className="border-t border-slate-100 bg-amber-50/80 px-6 py-4 text-sm font-medium text-amber-800">
              Geen locaties op de kaart. Typ een adres bij een stop en kies een suggestie.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
        {/* Linkerkolom: Vertrek + Locaties */}
        <div className="space-y-6">
          <Card className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-2xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Clock className="h-4 w-4" />
                </div>
                Vertrek & snelheid
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-8 px-6 py-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Vertrektijd</span>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className={inputBase}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Gem. snelheid (km/u)</span>
                <input
                  type="number"
                  min={1}
                  max={120}
                  value={speedKmh}
                  onChange={(e) => setSpeedKmh(Number(e.target.value) || 80)}
                  className={`w-28 ${inputBase}`}
                />
              </label>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg ring-1 ring-slate-200/60 rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
              <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Navigation className="h-4 w-4" />
                </div>
                Los- en laadlocaties
              </CardTitle>
              <Button
                type="button"
                onClick={addStop}
                className="rounded-xl bg-teal-600 font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
              >
                <Plus className="mr-2 h-4 w-4" />
                Locatie toevoegen
              </Button>
            </CardHeader>
            <CardContent className="space-y-5 px-6 py-6">
              {stops.map((stop, index) => {
                const prev = sortedStops.find((s) => s.sequence === stop.sequence - 1)
                const hasPrevCoords = prev && typeof prev.lat === 'number' && typeof prev.lng === 'number'
                const isAutoDistance =
                  index > 0 && typeof stop.lat === 'number' && (hasPrevCoords || stop.distanceKm > 0)
                const isStart = index === 0
                return (
                  <div
                    key={stop.id}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:shadow-md hover:border-slate-300/80"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${
                          isStart
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-teal-50 text-teal-800'
                        }`}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/80 text-xs font-bold">
                          {index + 1}
                        </span>
                        {stop.type === 'PICKUP' ? 'Laden' : 'Lossen'}
                        {isStart && (
                          <span className="rounded bg-white/60 px-1.5 py-0.5 text-xs font-medium">
                            Start
                          </span>
                        )}
                      </span>
                      {stops.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeStop(stop.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="flex flex-col gap-2 sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700">Naam</span>
                        <input
                          type="text"
                          value={stop.name}
                          onChange={(e) => updateStop(stop.id, { name: e.target.value })}
                          placeholder="bijv. Magazijn Rotterdam"
                          className={`rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25`}
                        />
                      </label>
                      <label className="flex flex-col gap-2 sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700">Adres</span>
                        <AddressAutocomplete
                          value={stop.address}
                          onChange={(v) => updateStop(stop.id, { address: v })}
                          onSelect={(suggestion) => applyAddressSelection(stop, suggestion)}
                          placeholder="Typ adres of plaats (min. 3 tekens)…"
                          aria-label="Adres met suggesties"
                        />
                        <p className="text-xs text-slate-500">
                          Kies een suggestie om de locatie op de kaart te zetten en de route automatisch te berekenen.
                        </p>
                      </label>
                      {index > 0 && (
                        <div className="flex flex-col gap-2 sm:col-span-2">
                          <span className="text-sm font-medium text-slate-700">Afstand vanaf vorige</span>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={stop.distanceKm}
                              onChange={(e) =>
                                updateStop(stop.id, { distanceKm: Number(e.target.value) || 0 })
                              }
                              className={`w-24 ${inputBase} text-sm py-2`}
                            />
                            <span className="text-sm text-slate-500">km</span>
                            {isAutoDistance && (
                              <span className="text-xs font-medium text-emerald-600">✓ automatisch</span>
                            )}
                          </div>
                        </div>
                      )}
                      <label className="flex flex-col gap-2 sm:col-span-2">
                        <span className="text-sm font-medium text-slate-700">
                          Verwachte laad-/lostijd (min)
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={480}
                          step={5}
                          value={stop.durationMinutes ?? 0}
                          onChange={(e) =>
                            updateStop(stop.id, {
                              durationMinutes: Math.max(0, Number(e.target.value) || 0),
                            })
                          }
                          placeholder="bijv. 30"
                          className={`w-28 ${inputBase} text-sm py-2`}
                        />
                        <p className="text-xs text-slate-500">
                          Geschatte duur bij deze stop; wordt meegenomen in ETA en werkuren.
                        </p>
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateStop(stop.id, { type: 'PICKUP' })}
                        className={`rounded-lg transition-colors ${
                          stop.type === 'PICKUP'
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Laden
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateStop(stop.id, { type: 'DELIVERY' })}
                        className={`rounded-lg transition-colors ${
                          stop.type === 'DELIVERY'
                            ? 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Lossen
                      </Button>
                      {typeof stop.lat === 'number' && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          ✓ Op kaart
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Rechterkolom: ETA-tijdlijn + werkuren */}
        <Card className="h-fit border-0 shadow-lg ring-1 ring-slate-200/60 rounded-2xl overflow-hidden lg:sticky lg:top-6">
          <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-6 py-5">
            <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-800">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                <MapPin className="h-4 w-4" />
              </div>
              ETA-tijdlijn
            </CardTitle>
            <p className="mt-1 text-sm text-slate-600">
              EU rij- en rusttijden: 4,5u rijden → 45 min pauze; max 9u per dag
            </p>
            <p className="mt-2 text-xs text-slate-500">
              Bij elke stop: rijtijd en werkuren (incl. laad-/lostijd) tot nu toe en resterend.
            </p>
          </CardHeader>
          <CardContent className="px-6 pt-6 pb-6">
            <ul className="space-y-0">
              {stopsWithEta.map((stop, i) => (
                <li key={stop.id} className="relative flex gap-4 pb-8 last:pb-0">
                  {i < stopsWithEta.length - 1 && (
                    <span
                      className="absolute left-4 top-8 h-[calc(100%-0.5rem)] w-0.5 bg-gradient-to-b from-teal-400 to-teal-200"
                      aria-hidden
                    />
                  )}
                  <div
                    className={`relative z-10 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 ${
                      stop.type === 'PICKUP'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                        : 'border-teal-500 bg-teal-50 text-teal-700'
                    } font-bold text-sm`}
                  >
                    {stop.sequence}
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-lg font-bold text-slate-900">
                        {format(new Date(stop.eta), 'HH:mm', { locale: nl })}
                      </span>
                      <span className="text-sm text-slate-500">
                        {format(new Date(stop.eta), 'EEEE d MMM', { locale: nl })}
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-2">
                      <span
                        className={`rounded-lg px-2.5 py-0.5 text-xs font-semibold ${
                          stop.type === 'PICKUP'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-teal-100 text-teal-800'
                        }`}
                      >
                        {stop.type === 'PICKUP' ? 'Laden' : 'Lossen'}
                      </span>
                      {stop.breakMinutesBefore > 0 && (
                        <span className="rounded-lg bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                          + 45 min pauze
                        </span>
                      )}
                      {stop.stopDurationMinutes > 0 && (
                        <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                          {stop.stopDurationMinutes} min ter plaatse
                        </span>
                      )}
                      {stop.isNewDay && (
                        <span className="text-xs text-slate-500">(volgende dag)</span>
                      )}
                    </div>
                    <p className="mt-1.5 font-semibold text-slate-800">
                      {stop.name || `Stop ${stop.sequence}`}
                    </p>
                    {(stop.address || stop.city) && (
                      <p className="text-sm text-slate-600">
                        {[stop.address, stop.city, stop.postalCode].filter(Boolean).join(', ')}
                      </p>
                    )}
                    {stop.driveMinutesFromPrev > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {stop.driveMinutesFromPrev} min rijden vanaf vorige stop
                      </p>
                    )}
                    {/* Rijtijd + werkuren (incl. laad-/lostijd) */}
                    <div className="mt-2 space-y-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs">
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium text-slate-700">
                        <span>
                          Gereden sinds pauze:{' '}
                          <span className="font-semibold text-emerald-700">
                            {formatMinutesAsHours(stop.driveMinutesSinceBreakAtArrival)}
                          </span>
                        </span>
                        <span>
                          Gereden vandaag:{' '}
                          <span className="font-semibold text-emerald-700">
                            {formatMinutesAsHours(stop.driveMinutesTodayAtArrival)}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 font-medium text-slate-700">
                        <span>
                          Resterend tot pauze:{' '}
                          <span className="font-semibold text-teal-700">
                            {formatMinutesAsHours(stop.remainingDriveMinutesUntilBreak)}
                          </span>
                        </span>
                        <span>
                          Resterend vandaag:{' '}
                          <span className="font-semibold text-teal-700">
                            {formatMinutesAsHours(stop.remainingDriveMinutesToday)}
                          </span>
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-slate-200 pt-2 font-medium text-slate-700">
                        <span>
                          Werkuren tot nu toe:{' '}
                          <span className="font-semibold text-violet-700">
                            {formatMinutesAsHours(stop.workMinutesSoFarAtArrival)}
                          </span>
                        </span>
                        <span>
                          Resterende werkuren:{' '}
                          <span className="font-semibold text-violet-700">
                            {formatMinutesAsHours(stop.remainingWorkMinutes)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            {stopsWithEta.length === 0 && (
              <p className="rounded-xl bg-slate-50 px-4 py-4 text-sm text-slate-500">
                Voeg locaties toe door een adres te typen en een suggestie te kiezen.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
