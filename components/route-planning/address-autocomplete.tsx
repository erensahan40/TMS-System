'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { MapPin, Loader2 } from 'lucide-react'

export interface AddressSuggestion {
  displayName: string
  lat: number
  lng: number
  country: string
  /** Bedrijfsnaam/venue-naam; alleen gezet bij POI’s, voor weergave in het popup. */
  name?: string
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
  const DROPDOWN_MAX_HEIGHT = 280
  const DROPDOWN_PADDING = 16
  const [dropdownPosition, setDropdownPosition] = useState<{
    top?: number
    bottom?: number
    left: number
    width: number
    maxHeight: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(value.trim(), 180)

  const updateDropdownPosition = useCallback(() => {
    const input = inputRef.current
    if (!input) return
    const rect = input.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom - DROPDOWN_PADDING
    const spaceAbove = rect.top - DROPDOWN_PADDING
    const fitsBelow = spaceBelow >= Math.min(DROPDOWN_MAX_HEIGHT, 200)
    if (fitsBelow) {
      setDropdownPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(DROPDOWN_MAX_HEIGHT, Math.max(120, spaceBelow)),
      })
    } else {
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
        width: rect.width,
        maxHeight: Math.min(DROPDOWN_MAX_HEIGHT, Math.max(120, spaceAbove)),
      })
    }
  }, [])

  useEffect(() => {
    if (!open || suggestions.length === 0) {
      setDropdownPosition(null)
      return
    }
    updateDropdownPosition()
    const onScrollOrResize = () => updateDropdownPosition()
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    let el: Element | null = inputRef.current?.parentElement ?? null
    let scrollParent: Element | null = null
    while (el) {
      const { overflowY } = getComputedStyle(el)
      if (/(auto|scroll|overlay)/.test(overflowY)) {
        scrollParent = el
        scrollParent.addEventListener('scroll', onScrollOrResize)
        break
      }
      el = el.parentElement
    }
    return () => {
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
      scrollParent?.removeEventListener('scroll', onScrollOrResize)
    }
  }, [open, suggestions.length, updateDropdownPosition])

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
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
    if (debouncedQuery.length >= 2) {
      fetchSuggestions(debouncedQuery)
      setOpen(true)
    } else {
      setSuggestions([])
      setOpen(false)
    }
  }, [debouncedQuery, fetchSuggestions])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value
      onChange(newValue)
      if (newValue.trim().length >= 2) setOpen(true)
    },
    [onChange]
  )

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node
      if (!containerRef.current) return
      if (containerRef.current.contains(target)) return
      const inDropdown = (e.target as Element)?.closest?.('[data-address-suggestions-list]')
      if (inDropdown) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside, true)
    return () => document.removeEventListener('mousedown', handleClickOutside, true)
  }, [])

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion) => {
      onChange(suggestion.displayName)
      onSelect(suggestion)
      setSuggestions([])
      setOpen(false)
      setHighlightIndex(-1)
      inputRef.current?.blur()
    },
    [onChange, onSelect]
  )

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
          onChange={handleInputChange}
          onFocus={() => value.trim().length >= 2 && setOpen(true)}
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
      {open && suggestions.length > 0 && dropdownPosition &&
        typeof document !== 'undefined' &&
        createPortal(
          <ul
            id="address-suggestions-list"
            role="listbox"
            data-address-suggestions-list
            style={{
              position: 'fixed',
              ...(dropdownPosition.top != null
                ? { top: dropdownPosition.top }
                : { bottom: dropdownPosition.bottom }),
              left: dropdownPosition.left,
              width: Math.max(dropdownPosition.width, 260),
              maxHeight: dropdownPosition.maxHeight,
              zIndex: 9999,
            }}
            className="overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl ring-1 ring-slate-200/50"
          >
            {suggestions.map((s, i) => {
              const addressLine = s.name && s.displayName.startsWith(s.name)
                ? s.displayName.slice(s.name.length).replace(/^[\s,–-]+/, '')
                : s.displayName
              return (
                <li
                  key={`${s.lat}-${s.lng}-${i}`}
                  id={`address-suggestion-${i}`}
                  role="option"
                  aria-selected={highlightIndex === i}
                  onMouseEnter={() => setHighlightIndex(i)}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    handleSelect(s)
                  }}
                  onClick={(e) => e.preventDefault()}
                  className={`cursor-pointer px-4 py-2.5 text-sm text-slate-700 transition-colors hover:bg-teal-50 active:bg-teal-100 ${
                    highlightIndex === i ? 'bg-teal-50 text-teal-900 font-medium' : ''
                  }`}
                >
                  <span className="flex items-start gap-2">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-teal-500" />
                    {s.name ? (
                      <span className="min-w-0 flex-1">
                        <span className="block font-semibold text-slate-900 truncate">{s.name}</span>
                        {addressLine && (
                          <span className="block text-slate-600 truncate">{addressLine}</span>
                        )}
                      </span>
                    ) : (
                      <span className="block truncate">{s.displayName}</span>
                    )}
                  </span>
                </li>
              )
            })}
          </ul>,
          document.body
        )}
    </div>
  )
}
