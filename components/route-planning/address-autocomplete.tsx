'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { MapPin, Loader2 } from 'lucide-react'

export interface AddressSuggestion {
  displayName: string
  lat: number
  lng: number
  country: string
}

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (suggestion: AddressSuggestion) => void
  placeholder?: string
  disabled?: boolean
  id?: string
  'aria-label'?: string
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debouncedValue
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Typ adres of plaats…',
  disabled = false,
  id,
  'aria-label': ariaLabel,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(value.trim(), 350)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }
    setLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      const res = await fetch(`/api/geocode/suggest?${params}`)
      const data = await res.json()
      setSuggestions(Array.isArray(data) ? data : [])
      setHighlightIndex(-1)
    } catch {
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debouncedQuery.length >= 3) {
      fetchSuggestions(debouncedQuery)
      setOpen(true)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }, [debouncedQuery, fetchSuggestions])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.displayName)
    onSelect(suggestion)
    setSuggestions([])
    setOpen(false)
    setHighlightIndex(-1)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlightIndex((i) => (i < suggestions.length - 1 ? i + 1 : i))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlightIndex((i) => (i > 0 ? i - 1 : -1))
    } else if (e.key === 'Enter' && highlightIndex >= 0 && suggestions[highlightIndex]) {
      e.preventDefault()
      handleSelect(suggestions[highlightIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setHighlightIndex(-1)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <MapPin className="h-4 w-4" aria-hidden />
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          id={id}
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => value.length >= 3 && suggestions.length > 0 && setOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          autoComplete="off"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-autocomplete="list"
          aria-controls="address-suggestions-list"
          aria-activedescendant={
            highlightIndex >= 0 && suggestions[highlightIndex]
              ? `address-suggestion-${highlightIndex}`
              : undefined
          }
          className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/25 disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          id="address-suggestions-list"
          role="listbox"
          className="absolute z-50 mt-2 max-h-56 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-slate-200/50"
        >
          {suggestions.map((s, i) => (
            <li
              key={`${s.lat}-${s.lng}-${i}`}
              id={`address-suggestion-${i}`}
              role="option"
              aria-selected={highlightIndex === i}
              onMouseEnter={() => setHighlightIndex(i)}
              onClick={() => handleSelect(s)}
              className={`cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-teal-50 ${
                highlightIndex === i ? 'bg-teal-50 text-teal-900 font-medium' : ''
              }`}
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-teal-500" />
                <span className="block truncate">{s.displayName}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
