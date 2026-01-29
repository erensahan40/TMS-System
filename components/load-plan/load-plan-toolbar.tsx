'use client'

import { Button } from '@/components/ui/button'
import type { Trailer } from '@/types/load-plan'
import { Save, Check, RotateCw, AlertTriangle, Download } from 'lucide-react'

interface LoadPlanToolbarProps {
  trailers: Trailer[]
  selectedTrailer: Trailer | null
  onTrailerChange: (trailer: Trailer) => void
  onSave: () => void
  onValidate: () => void
  onAutoPack: () => void
  saving: boolean
  saved: boolean
}

export function LoadPlanToolbar({
  trailers,
  selectedTrailer,
  onTrailerChange,
  onSave,
  onValidate,
  onAutoPack,
  saving,
  saved,
}: LoadPlanToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b bg-white px-4 py-2">
      <div className="flex items-center gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Trailer:</label>
          <select
            value={selectedTrailer?.id || ''}
            onChange={(e) => {
              const trailer = trailers.find((t) => t.id === e.target.value)
              if (trailer) onTrailerChange(trailer)
            }}
            className="ml-2 rounded-md border border-gray-300 px-3 py-1 text-sm"
          >
            {trailers.map((trailer) => (
              <option key={trailer.id} value={trailer.id}>
                {trailer.name} ({trailer.type})
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={onAutoPack}>
          <RotateCw className="mr-2 h-4 w-4" />
          Auto-pack
        </Button>
        <Button variant="outline" size="sm" onClick={onValidate}>
          <AlertTriangle className="mr-2 h-4 w-4" />
          Validate
        </Button>
        <Button variant="outline" size="sm" onClick={onSave} disabled={saving}>
          {saved ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Saved
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {saving ? 'Saving...' : 'Save'}
            </>
          )}
        </Button>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  )
}


