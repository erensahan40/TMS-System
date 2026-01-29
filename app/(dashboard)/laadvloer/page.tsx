import { LaadvloerClientWrapper } from '@/components/laadvloer/laadvloer-client-wrapper'

export const metadata = {
  title: 'Laadvloer visualisatie | TMS',
  description: 'Visualiseer en plan palletten op de laadvloer van uw vrachtwagen',
}

export default function LaadvloerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Laadvloer visualisatie</h1>
        <p className="mt-2 text-gray-600">
          Kies een vrachtwagetype, voeg palletten toe en sleep ze op de laadvloer voor een realistische planning.
        </p>
      </div>
      <LaadvloerClientWrapper />
    </div>
  )
}
