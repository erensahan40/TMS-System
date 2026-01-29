import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Format dimensions from mm to readable format
export function formatDimension(mm: number, unit: 'mm' | 'cm' | 'm' = 'mm'): string {
  switch (unit) {
    case 'm':
      return `${(mm / 1000).toFixed(2)} m`
    case 'cm':
      return `${(mm / 10).toFixed(1)} cm`
    default:
      return `${mm} mm`
  }
}

// Format weight from kg to readable format
export function formatWeight(kg: number): string {
  if (kg >= 1000) {
    return `${(kg / 1000).toFixed(2)} ton`
  }
  return `${kg} kg`
}

// Calculate volume in mm³
export function calculateVolume(length: number, width: number, height: number): number {
  return length * width * height
}

// Convert volume to m³
export function volumeToCubicMeters(mm3: number): number {
  return mm3 / 1_000_000_000
}

/**
 * Gets a companyId from session or falls back to the first company in the database
 * This allows the app to work without authentication
 */
export async function getCompanyId(): Promise<string | null> {
  const { prisma } = await import('./prisma')
  try {
    const firstCompany = await prisma.company.findFirst({
      orderBy: { createdAt: 'asc' },
    })
    return firstCompany?.id || null
  } catch {
    return null
  }
}

