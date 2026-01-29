import { RoutePlanningEta } from '@/components/route-planning/route-planning-eta'
import { Route, Clock } from 'lucide-react'

export const metadata = {
  title: 'Route & ETA | TMS',
  description: 'Los- en laadlocaties met automatische ETA op basis van snelheid en rij-/rusttijden',
}

export default function RoutePlanningPage() {
  return (
    <div className="min-h-0 space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
        <div className="absolute right-0 top-0 h-40 w-40 translate-x-10 -translate-y-10 rounded-full bg-white/10 blur-2xl" aria-hidden />
        <div className="absolute bottom-0 left-0 h-32 w-32 -translate-x-8 translate-y-8 rounded-full bg-cyan-400/20 blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-start gap-4 sm:gap-6">
          <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-white/20 backdrop-blur sm:h-14 sm:w-14">
            <Route className="h-6 w-6 sm:h-8 sm:w-8" strokeWidth={2} />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Route & ETA</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/95 sm:text-base">
              Voer bij elke stop een adres in en kies een suggestie. De afstand wordt automatisch berekend
              en de route verschijnt op de kaart. ETA volgt uit snelheid en EU rij- en rusttijden
              (4,5u → 45 min pauze; max 9u per dag).
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-medium text-white/90 sm:text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1">
                <Clock className="h-3.5 w-3.5" />
                ETA-tijdlijn
              </span>
              <span className="rounded-full bg-white/20 px-3 py-1">Afstand automatisch</span>
            </div>
          </div>
        </div>
      </div>
      <RoutePlanningEta />
    </div>
  )
}
