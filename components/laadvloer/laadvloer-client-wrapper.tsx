'use client'

import { useState, useEffect } from 'react'

export function LaadvloerClientWrapper() {
  const [Component, setComponent] = useState<React.ComponentType | null>(null)

  useEffect(() => {
    import('@/components/laadvloer/laadvloer-visualisatie').then((m) =>
      setComponent(() => m.LaadvloerVisualisatie)
    )
  }, [])

  if (!Component) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">Laadvloer wordt geladen...</p>
      </div>
    )
  }

  return <Component />
}
