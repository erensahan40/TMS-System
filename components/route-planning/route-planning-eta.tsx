'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Plus, Trash2, MapPin, MapPinned, Clock, Navigation, AlertTriangle, Coffee, GripVertical } from 'lucide-react'
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

  /** Stop verplaatsen (fromIndex en toIndex zijn indices in de gesorteerde lijst, 0-based). Herberekent sequence en afstanden. */
  const reorderStops = useCallback(
    (fromIndex: number, toIndex: number) => {
      if (fromIndex === toIndex) return
      setStops((prev) => {
        const sorted = [...prev].sort((a, b) => a.sequence - b.sequence)
        const [removed] = sorted.splice(fromIndex, 1)
        sorted.splice(toIndex, 0, removed)
        const newSorted = sorted.map((s, i) => ({ ...s, sequence: i + 1 }))
        queueMicrotask(() => {
          newSorted.forEach((stop, i) => {
            if (i === 0) return
            const prevStop = newSorted[i - 1]
            if (
              typeof prevStop.lat === 'number' &&
              typeof prevStop.lng === 'number' &&
              typeof stop.lat === 'number' &&
              typeof stop.lng === 'number'
            ) {
              fetch('/api/route-distance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  from: { lat: prevStop.lat, lng: prevStop.lng },
                  to: { lat: stop.lat, lng: stop.lng },
                }),
              })
                .then((res) => res.json())
                .then((data) => {
                  if (data.distanceKm != null) {
                    updateStop(stop.id, { distanceKm: data.distanceKm })
                  }
                })
                .catch(() => {})
            }
          })
        })
        return newSorted
      })
    },
    [updateStop]
  )

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

  // Samenvatting route
  const totalDistanceKm = sortedStops.reduce((sum, s, i) => sum + (i > 0 ? s.distanceKm : 0), 0)
  const lastStop = stopsWithEta[stopsWithEta.length - 1]
  const totalDriveMinutes = lastStop ? lastStop.driveMinutesTodayAtArrival : 0
  const totalWorkMinutes = lastStop ? lastStop.workMinutesSoFarAtArrival : 0
  const totalBreakCount = stopsWithEta.reduce((sum, s) => sum + (s.breaksInLeg ?? 0), 0)
  const totalBreakMinutes = stopsWithEta.reduce((sum, s) => sum + (s.breakMinutesBefore ?? 0), 0)

  const inputBase =
    'rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25'

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      {/* Kaart */}
      <Card className="overflow-hidden border-0 bg-white shadow-md ring-1 ring-slate-200/60 rounded-xl">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
              <MapPinned className="h-4 w-4" />
            </div>
            Route op kaart
          </CardTitle>
          <p className="mt-0.5 text-xs text-slate-600">
            Adres invullen en suggestie kiezen → locatie en afstand worden automatisch gezet.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <RouteMap stops={sortedStops} />
          {stopsWithCoords.length === 0 && (
            <div className="border-t border-slate-100 bg-amber-50/80 px-4 py-2 text-xs font-medium text-amber-800">
              Geen locaties. Typ adres en kies een suggestie.
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        {/* Linkerkolom: Vertrek + Locaties */}
        <div className="space-y-4">
          <Card className="border-0 shadow-md ring-1 ring-slate-200/60 rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center gap-4 border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Clock className="h-4 w-4" />
                </div>
                Vertrek & snelheid
              </CardTitle>
              <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-slate-600">Vertrektijd</span>
                  <input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                    className={inputBase}
                  />
                </label>
                <label className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-slate-600">Snelheid (km/u)</span>
                  <input
                    type="number"
                    min={1}
                    max={120}
                    value={speedKmh}
                    onChange={(e) => setSpeedKmh(Number(e.target.value) || 80)}
                    className={`w-20 ${inputBase}`}
                  />
                </label>
              </div>
            </CardHeader>
          </Card>

          <Card className="border-0 shadow-md ring-1 ring-slate-200/60 rounded-xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <Navigation className="h-4 w-4" />
                </div>
                Los- en laadlocaties
              </CardTitle>
              <Button
                type="button"
                onClick={addStop}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-teal-700 transition-colors"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Toevoegen
              </Button>
            </CardHeader>
            <CardContent className="space-y-3 px-4 py-4">
              {sortedStops.map((stop, index) => {
                const prev = index > 0 ? sortedStops[index - 1] : undefined
                const hasPrevCoords = prev && typeof prev.lat === 'number' && typeof prev.lng === 'number'
                const isAutoDistance =
                  index > 0 && typeof stop.lat === 'number' && (hasPrevCoords || stop.distanceKm > 0)
                const isStart = index === 0
                return (
                  <div
                    key={stop.id}
                    data-index={index}
                    draggable={stops.length > 1}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.add('ring-2', 'ring-teal-400')
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('ring-2', 'ring-teal-400')
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.currentTarget.classList.remove('ring-2', 'ring-teal-400')
                      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
                      const toIndex = parseInt((e.currentTarget as HTMLElement).dataset.index ?? '0', 10)
                      if (!Number.isNaN(fromIndex) && !Number.isNaN(toIndex)) reorderStops(fromIndex, toIndex)
                    }}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(index))
                      e.dataTransfer.effectAllowed = 'move'
                      e.currentTarget.classList.add('opacity-60')
                    }}
                    onDragEnd={(e) => {
                      e.currentTarget.classList.remove('opacity-60')
                    }}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-all hover:border-slate-300/80"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      {stops.length > 1 && (
                        <span
                          className="flex-shrink-0 cursor-grab rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
                          aria-label="Volgorde wijzigen"
                        >
                          <GripVertical className="h-4 w-4" />
                        </span>
                      )}
                      <span
                        className={`inline-flex min-w-0 flex-1 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${
                          isStart ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-50 text-teal-800'
                        }`}
                      >
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/80 text-[10px] font-bold">
                          {index + 1}
                        </span>
                        {stop.type === 'PICKUP' ? 'Laden' : 'Lossen'}
                        {isStart && <span className="rounded bg-white/60 px-1 py-0.5 text-[10px] font-medium">Start</span>}
                      </span>
                      {stops.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 rounded p-0 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          onClick={() => removeStop(stop.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                    <div className="grid gap-2 gap-y-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-600">Naam</span>
                        <input
                          type="text"
                          value={stop.name}
                          onChange={(e) => updateStop(stop.id, { name: e.target.value })}
                          placeholder="bijv. Magazijn"
                          className="min-w-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25"
                        />
                      </label>
                      <label className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-xs font-medium text-slate-600">Adres</span>
                        <AddressAutocomplete
                          value={stop.address}
                          onChange={(v) => updateStop(stop.id, { address: v })}
                          onSelect={(suggestion) => applyAddressSelection(stop, suggestion)}
                          placeholder="Adres of bedrijfsnaam (kies suggestie)"
                          aria-label="Adres met suggesties"
                        />
                      </label>
                      {index > 0 && (
                        <label className="flex flex-col gap-0.5">
                          <span className="text-xs font-medium text-slate-600">km</span>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min={0}
                              step={0.1}
                              value={stop.distanceKm}
                              onChange={(e) =>
                                updateStop(stop.id, { distanceKm: Number(e.target.value) || 0 })
                              }
                              className={`w-16 ${inputBase}`}
                            />
                            {isAutoDistance && (
                              <span className="text-[10px] font-medium text-emerald-600">✓</span>
                            )}
                          </div>
                        </label>
                      )}
                      <label className="flex flex-col gap-0.5">
                        <span className="text-xs font-medium text-slate-600">min stop</span>
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
                          placeholder="0"
                          className={`w-14 ${inputBase}`}
                        />
                      </label>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => updateStop(stop.id, { type: 'PICKUP' })}
                        className={`h-6 rounded px-2 text-xs transition-colors ${
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
                        className={`h-6 rounded px-2 text-xs transition-colors ${
                          stop.type === 'DELIVERY'
                            ? 'border-teal-300 bg-teal-50 text-teal-800 hover:bg-teal-100'
                            : 'border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        Lossen
                      </Button>
                      {typeof stop.lat === 'number' && (
                        <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                          ✓ Kaart
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Rechterkolom: Samenvatting + ETA-tijdlijn + werkuren */}
        <div className="space-y-4 lg:sticky lg:top-6">
          {/* Samenvatting route */}
          {stopsWithEta.length > 0 && (
            <Card className="border-0 shadow-md ring-1 ring-slate-200/60 rounded-xl overflow-hidden">
              <CardContent className="px-4 py-3">
                <dl className="grid grid-cols-4 gap-x-4 gap-y-1">
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Afstand</dt>
                    <dd className="text-sm font-semibold text-slate-900">{totalDistanceKm.toFixed(1)} km</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Rijtijd</dt>
                    <dd className="text-sm font-semibold text-slate-900">{formatMinutesAsHours(totalDriveMinutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Werkuren</dt>
                    <dd className="text-sm font-semibold text-slate-900">{formatMinutesAsHours(totalWorkMinutes)}</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500">Pauzes</dt>
                    <dd className="text-sm font-semibold text-slate-900">
                      {totalBreakCount === 0 ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <span className="text-amber-700">
                          {totalBreakCount}× 45 min
                        </span>
                      )}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          )}

          <Card className="border-0 shadow-md ring-1 ring-slate-200/60 rounded-xl overflow-hidden">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-b from-slate-50 to-white px-4 py-3">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-slate-800">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-100 text-teal-600">
                  <MapPin className="h-4 w-4" />
                </div>
                ETA-tijdlijn
              </CardTitle>
              <p className="mt-0.5 text-xs text-slate-600">
                EU-regel: max 4,5u rijden → 45 min pauze; max 9u/dag. Pauzes zitten automatisch in de ETA.
              </p>
            </CardHeader>
            <CardContent className="px-4 pt-3 pb-4">
              <ul className="space-y-0">
                {stopsWithEta.map((stop, i) => (
                  <li key={stop.id} className="relative">
                    {/* Pauzemelding tussen vorige stop en deze (bij rit > 4,5 u) */}
                    {i > 0 && (stop.breaksInLeg ?? 0) > 0 && (
                      <div
                        className="mb-2 ml-10 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2"
                        role="alert"
                      >
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600" aria-hidden />
                        <div className="min-w-0 text-xs">
                          <p className="font-semibold text-amber-900">
                            Pauze vereist tussen stop {i} en {i + 1}
                          </p>
                          <p className="mt-0.5 text-amber-800">
                            Rijtijd {formatMinutesAsHours(stop.driveMinutesFromPrev)} → {(stop.breaksInLeg ?? 0)}× 45 min pauze (EU). ETA houdt er rekening mee.
                          </p>
                        </div>
                      </div>
                    )}
                    <div className={`relative flex gap-3 ${i === stopsWithEta.length - 1 ? 'pb-0' : 'pb-4'}`}>
                      {i < stopsWithEta.length - 1 && (
                        <span
                          className="absolute left-3 top-6 h-[calc(100%-0.25rem)] w-0.5 bg-gradient-to-b from-teal-400 to-teal-200"
                          aria-hidden
                        />
                      )}
                      <div
                        className={`relative z-10 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                          stop.type === 'PICKUP'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-teal-500 bg-teal-50 text-teal-700'
                        }`}
                      >
                        {stop.sequence}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-1.5">
                          <span className="text-base font-bold text-slate-900">
                            {format(new Date(stop.eta), 'HH:mm', { locale: nl })}
                          </span>
                          <span className="text-xs text-slate-500">
                            {format(new Date(stop.eta), 'd MMM', { locale: nl })}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span
                            className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              stop.type === 'PICKUP'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-teal-100 text-teal-800'
                            }`}
                          >
                            {stop.type === 'PICKUP' ? 'Laden' : 'Lossen'}
                          </span>
                          {(stop.breakMinutesBefore ?? 0) > 0 && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                              <Coffee className="h-2.5 w-2.5" />
                              {(stop.breaksInLeg ?? 0) > 1 ? `${stop.breaksInLeg}× 45 min` : '45 min'}
                            </span>
                          )}
                          {stop.stopDurationMinutes > 0 && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                              {stop.stopDurationMinutes} min
                            </span>
                          )}
                          {stop.isNewDay && (
                            <span className="text-[10px] text-slate-500">(volgende dag)</span>
                          )}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-slate-800">
                          {stop.name || `Stop ${stop.sequence}`}
                        </p>
                        {(stop.address || stop.city) && (
                          <p className="text-xs text-slate-600 line-clamp-1">
                            {[stop.address, stop.city, stop.postalCode].filter(Boolean).join(', ')}
                          </p>
                        )}
                        {stop.driveMinutesFromPrev > 0 && (
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {stop.driveMinutesFromPrev} min rijden
                            {(stop.breakMinutesBefore ?? 0) > 0 && (
                              <span className="ml-1">+ {stop.breakMinutesBefore} min pauze</span>
                            )}
                          </p>
                        )}
                        <div className="mt-1.5 rounded bg-slate-50 px-2 py-1.5 text-[10px] font-medium text-slate-700">
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>Sinds pauze: <span className="font-semibold text-emerald-700">{formatMinutesAsHours(stop.driveMinutesSinceBreakAtArrival)}</span></span>
                            <span>Vandaag: <span className="font-semibold text-emerald-700">{formatMinutesAsHours(stop.driveMinutesTodayAtArrival)}</span></span>
                            <span>Rest pauze: <span className="font-semibold text-teal-700">{formatMinutesAsHours(stop.remainingDriveMinutesUntilBreak)}</span></span>
                            <span>Rest vandaag: <span className="font-semibold text-teal-700">{formatMinutesAsHours(stop.remainingDriveMinutesToday)}</span></span>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-3 border-t border-slate-200 pt-1">
                            <span>Werk tot nu: <span className="font-semibold text-violet-700">{formatMinutesAsHours(stop.workMinutesSoFarAtArrival)}</span></span>
                            <span>Rest werk: <span className="font-semibold text-violet-700">{formatMinutesAsHours(stop.remainingWorkMinutes)}</span></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {stopsWithEta.length === 0 && (
                <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
                  Voeg locaties toe: adres typen en suggestie kiezen.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
