import { useState, useRef, useEffect } from 'react'

export function SearchableSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  disabled = false,
  className = '',
}) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const containerRef      = useRef(null)
  const inputRef          = useRef(null)

  const selected = options.find(o => String(o.value) === String(value)) ?? null

  const filtered = query.trim()
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  useEffect(() => {
    function handleOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [])

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 0)
  }, [open])

  function handleSelect(opt) {
    onChange(opt.value)
    setOpen(false)
    setQuery('')
  }

  function handleToggle() {
    if (disabled) return
    setOpen(prev => !prev)
    if (!open) setQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleToggle}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm rounded-lg border
          bg-white text-left transition-colors
          ${disabled
            ? 'border-[#E8EAEC] text-[#5f6b75] cursor-not-allowed bg-[#F4F5F6]'
            : 'border-[#E8EAEC] text-[#2C3A43] hover:border-[#4E738A] cursor-pointer'
          }
          ${open ? 'border-[#4E738A] ring-1 ring-[#4E738A]/20' : ''}
        `}
      >
        <span className={selected ? 'text-[#2C3A43]' : 'text-[#5f6b75]'}>
          {selected
            ? <>
                {selected.label}
                {selected.badge && (
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-[#EE7623]/10 text-[#EE7623] font-medium">
                    {selected.badge}
                  </span>
                )}
              </>
            : placeholder}
        </span>
        <svg
          className={`w-4 h-4 text-[#5f6b75] shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#E8EAEC] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-[#E8EAEC]">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full px-2 py-1.5 text-sm border border-[#E8EAEC] rounded-md
                focus:outline-none focus:border-[#4E738A] focus:ring-1 focus:ring-[#4E738A]/20"
            />
          </div>
          <ul className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-sm text-[#5f6b75] text-center">Sin resultados</li>
            ) : (
              filtered.map(opt => (
                <li
                  key={opt.value}
                  onClick={() => handleSelect(opt)}
                  className={`px-3 py-2 text-sm cursor-pointer flex items-center justify-between gap-2
                    hover:bg-[#4E738A]/5 transition-colors
                    ${String(opt.value) === String(value)
                      ? 'bg-[#4E738A]/10 text-[#4E738A] font-medium'
                      : 'text-[#2C3A43]'
                    }
                  `}
                >
                  <span>{opt.label}</span>
                  {opt.badge && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[#EE7623]/10 text-[#EE7623] font-medium shrink-0">
                      {opt.badge}
                    </span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
