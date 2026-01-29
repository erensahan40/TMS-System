export type TrailerType = 'BACHE' | 'FRIGO' | 'STUKGOED'

export const TRAILER_PRESETS: Record<
  TrailerType,
  { name: string; lengthCm: number; widthCm: number; heightCm: number }
> = {
  BACHE: {
    name: 'Bâche / Tautliner',
    lengthCm: 1360,
    widthCm: 245,
    heightCm: 270,
  },
  FRIGO: {
    name: 'Frigo / Reefer',
    lengthCm: 1330,
    widthCm: 240,
    heightCm: 260,
  },
  STUKGOED: {
    name: 'Stukgoedwagen',
    lengthCm: 900,
    widthCm: 230,
    heightCm: 250,
  },
}

export interface PalletItem {
  id: string
  label?: string
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface PlacedPallet extends PalletItem {
  positionX: number
  positionY: number
  rotation: number
}
