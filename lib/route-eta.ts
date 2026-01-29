/**
 * ETA-berekening met EU rij- en rusttijden (vereenvoudigd):
 * - Max 4,5 uur rijden, daarna 45 min pauze
 * - Max 9 uur rijtijd per dag, daarna 11 uur rust
 */

const MAX_DRIVE_BEFORE_BREAK_MINUTES = 4.5 * 60 // 270 min
const BREAK_DURATION_MINUTES = 45
const MAX_DRIVE_PER_DAY_MINUTES = 9 * 60 // 540 min
const DAILY_REST_MINUTES = 11 * 60 // 660 min

export interface RouteStopInput {
  id: string
  sequence: number
  type: 'PICKUP' | 'DELIVERY'
  name: string
  address: string
  city: string
  postalCode: string
  country?: string
  /** Afstand in km vanaf vorige stop (eerste stop = 0) */
  distanceKm: number
  /** Coördinaten voor de kaart (via geocode of handmatig) */
  lat?: number
  lng?: number
  /** Geschatte duur bij deze stop in minuten (laad-/lostijd), meegenomen in ETA */
  durationMinutes?: number
}

export interface RouteStopWithEta extends RouteStopInput {
  eta: Date
  driveMinutesFromPrev: number
  breakMinutesBefore: number
  isNewDay?: boolean
  /** Resterende rijtijd tot volgende verplichte pauze (max 4,5u), in minuten */
  remainingDriveMinutesUntilBreak: number
  /** Resterende rijtijd vandaag tot dagrust (max 9u), in minuten */
  remainingDriveMinutesToday: number
  /** Duur bij deze stop (laad-/lostijd) in minuten */
  stopDurationMinutes: number
  /** Gereden sinds laatste pauze (of sinds vertrek) bij aankomst, in minuten */
  driveMinutesSinceBreakAtArrival: number
  /** Gereden vandaag bij aankomst, in minuten */
  driveMinutesTodayAtArrival: number
  /** Werkuren tot nu toe bij aankomst (rijtijd vandaag + laad-/lostijd vorige stops), in minuten */
  workMinutesSoFarAtArrival: number
  /** Resterende werkuren (resterende rijtijd vandaag + laad-/lostijd deze stop en volgende), in minuten */
  remainingWorkMinutes: number
}

export function calculateRouteEta(
  startAt: Date,
  speedKmh: number,
  stops: RouteStopInput[]
): RouteStopWithEta[] {
  if (stops.length === 0) return []
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence)

  // Resterende werkuren = resterende rijtijd vandaag + laad-/lostijd vanaf deze stop
  const durationFromIndex = (fromIdx: number) =>
    sorted
      .slice(fromIdx)
      .reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0)

  let current = new Date(startAt.getTime())
  let driveMinutesSinceBreak = 0
  let driveMinutesToday = 0
  let workMinutesSoFar = 0 // rijtijd + laad-/lostijd vorige stops
  const result: RouteStopWithEta[] = []

  for (let i = 0; i < sorted.length; i++) {
    const stop = sorted[i]
    const stopDuration = stop.durationMinutes ?? 0

    if (i === 0) {
      result.push({
        ...stop,
        eta: new Date(current.getTime()),
        driveMinutesFromPrev: 0,
        breakMinutesBefore: 0,
        remainingDriveMinutesUntilBreak: MAX_DRIVE_BEFORE_BREAK_MINUTES,
        remainingDriveMinutesToday: MAX_DRIVE_PER_DAY_MINUTES,
        stopDurationMinutes: stopDuration,
        driveMinutesSinceBreakAtArrival: 0,
        driveMinutesTodayAtArrival: 0,
        workMinutesSoFarAtArrival: 0,
        remainingWorkMinutes: MAX_DRIVE_PER_DAY_MINUTES + durationFromIndex(0),
      })
      current = new Date(current.getTime() + stopDuration * 60 * 1000)
      workMinutesSoFar += stopDuration
      continue
    }

    const distanceKm = stop.distanceKm
    const driveMinutes = distanceKm > 0 ? Math.round((distanceKm / speedKmh) * 60) : 0
    let breakBefore = 0
    let isNewDay = false

    if (driveMinutesSinceBreak >= MAX_DRIVE_BEFORE_BREAK_MINUTES && driveMinutes > 0) {
      current = new Date(current.getTime() + BREAK_DURATION_MINUTES * 60 * 1000)
      driveMinutesSinceBreak = 0
      breakBefore = BREAK_DURATION_MINUTES
    }
    if (driveMinutesToday + driveMinutes >= MAX_DRIVE_PER_DAY_MINUTES && driveMinutes > 0) {
      current = new Date(current.getTime() + DAILY_REST_MINUTES * 60 * 1000)
      driveMinutesToday = 0
      driveMinutesSinceBreak = 0
      isNewDay = true
    }

    current = new Date(current.getTime() + driveMinutes * 60 * 1000)
    driveMinutesSinceBreak += driveMinutes
    driveMinutesToday += driveMinutes

    const remainingUntilBreak = Math.max(0, MAX_DRIVE_BEFORE_BREAK_MINUTES - driveMinutesSinceBreak)
    const remainingToday = Math.max(0, MAX_DRIVE_PER_DAY_MINUTES - driveMinutesToday)
    const workSoFar = driveMinutesToday + workMinutesSoFar
    const remainingWork = remainingToday + durationFromIndex(i)

    result.push({
      ...stop,
      eta: new Date(current.getTime()),
      driveMinutesFromPrev: driveMinutes,
      breakMinutesBefore: breakBefore,
      isNewDay,
      remainingDriveMinutesUntilBreak: remainingUntilBreak,
      remainingDriveMinutesToday: remainingToday,
      stopDurationMinutes: stopDuration,
      driveMinutesSinceBreakAtArrival: driveMinutesSinceBreak,
      driveMinutesTodayAtArrival: driveMinutesToday,
      workMinutesSoFarAtArrival: workSoFar,
      remainingWorkMinutes: remainingWork,
    })

    current = new Date(current.getTime() + stopDuration * 60 * 1000)
    workMinutesSoFar += stopDuration
  }

  return result
}
