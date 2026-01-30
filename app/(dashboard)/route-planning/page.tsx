import { RoutePlanningEta } from '@/components/route-planning/route-planning-eta'
import { Route, Clock, MapPin, Coffee } from 'lucide-react'

export const metadata = {
  title: 'Route & ETA | TMS',
  description: 'Routeplanning met automatische ETA, EU rij- en rusttijden en pauzemeldingen',
}

export default function RoutePlanningPage() {
  return (
    <div className="min-h-0 space-y-4">
      {/* Hero */}
      <header className="relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-800 via-teal-800 to-cyan-900 px-4 py-4 text-white shadow-lg sm:px-5 sm:py-5">
        <div className="absolute right-0 top-0 h-32 w-32 translate-x-12 -translate-y-12 rounded-full bg-teal-500/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 sm:h-11 sm:w-11">
            <Route className="h-5 w-5 sm:h-6 sm:w-6" strokeWidth={2} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">Route & ETA</h1>
            <p className="mt-1 max-w-2xl text-xs leading-relaxed text-white/95 sm:text-sm">
              Plan ritten met automatische ETA en EU rij-/rusttijden. Bij &gt;4,5u rijden wordt een pauze van 45 min meegenomen.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium text-white/90">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
                <MapPin className="h-3 w-3" /> Route
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
                <Clock className="h-3 w-3" /> ETA
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 backdrop-blur-sm">
                <Coffee className="h-3 w-3" /> Pauzes
              </span>
            </div>
          </div>
        </div>
      </header>
      <RoutePlanningEta />
    </div>
  )
}
