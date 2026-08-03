import { useState, useEffect } from 'react'

const MODULO_CONFIG = {
  'field-reports':        { label: 'Field Reports',           icono: '📋' },
  'wang':                 { label: 'Wang',                    icono: '📄' },
  'control-gastos':       { label: 'Control de Gastos',       icono: '💰' },
  'activos':              { label: 'Activos Fijos',           icono: '🏭' },
  'compras':              { label: 'Compras',                 icono: '🛒' },
  'rh':                   { label: 'Recursos Humanos',        icono: '🪪' },
  'tickets':              { label: 'Tickets',                 icono: '🎫' },
  'design-ops':           { label: 'Design Ops',              icono: '🎨' },
  'gestion-trabajo':      { label: 'Gestión de Trabajo',      icono: '✅' },
  'control-proyectos':    { label: 'Control de Proyectos',    icono: '📊' },
  'comercial':            { label: 'Comercial',               icono: '💼' },
  'inventario':           { label: 'Inventario de Bodega',    icono: '📦' },
  'inventario-software':  { label: 'Inventario Software',     icono: '💻' },
  'despacho':             { label: 'Despacho',                icono: '🚚' },
}

const isDev = import.meta.env.DEV
const BASE = import.meta.env.VITE_SHELL_URL ?? window.location.origin

const MODULOS_DISPONIBLES = new Set([
  'field-reports',
  'wang',
  'control-gastos',
  'activos',
  'compras',
  'rh',
  'control-proyectos',
  'comercial',
  'tickets',
])

const RUTAS = isDev ? {
  'field-reports':       'http://localhost:5174',
  'wang':                'http://localhost:5175',
  'control-gastos':      'http://localhost:5176',
  'activos':             'http://localhost:5185',
  'compras':             'http://localhost:5177',
  'rh':                  'http://localhost:5182',
  'tickets':             'http://localhost:5184',
  'design-ops':          'http://localhost:5178',
  'gestion-trabajo':     'http://localhost:5180',
  'control-proyectos':   'http://localhost:5181',
  'comercial':           'http://localhost:5186',
  'inventario':          'http://localhost:5179',
  'despacho':            'http://localhost:5183',
} : {
  'field-reports':       `${BASE}/field-reports`,
  'wang':                `${BASE}/wang`,
  'control-gastos':      `${BASE}/control-gastos`,
  'activos':             `${BASE}/activos`,
  'compras':             `${BASE}/compras`,
  'rh':                  `${BASE}/rh`,
  'tickets':             `${BASE}/tickets`,
  'design-ops':          `${BASE}/design-ops`,
  'gestion-trabajo':     `${BASE}/gestion-trabajo`,
  'control-proyectos':   `${BASE}/control-proyectos`,
  'comercial':           `${BASE}/comercial`,
  'inventario':          `${BASE}/inventario`,
  'inventario-software': `${BASE}/inventario-software`,
  'despacho':            `${BASE}/despacho`,
}

export function NavModulos({ modulos = [], shellUrl = '', usuarioNombre = '' }) {
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    function handler(e) { if (e.key === 'Escape') setAbierto(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const modulosDisponibles = modulos.filter(m => MODULO_CONFIG[m] && RUTAS[m])

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-30 bg-[#4E738A] hover:bg-[#3d5c70] text-white transition-colors rounded-r-lg shadow-md"
        style={{ writingMode: 'vertical-rl' }}
        title="Ver módulos"
      >
        <div className="flex flex-col items-center gap-1 px-1.5 py-3">
          <svg viewBox="0 0 24 24" className="w-4 h-4 rotate-90" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
          <span className="text-xs font-medium tracking-wide" style={{ fontSize: '10px' }}>APPS</span>
        </div>
      </button>

      {abierto && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setAbierto(false)}
        />
      )}

      <div className={`fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-300 ${abierto ? 'translate-x-0' : '-translate-x-full'}`}>

        <div className="bg-[#4E738A] px-5 py-4 flex items-center justify-between">
          <img src="/assets/brand/logo-soati-blanco.svg" alt="Soati" className="h-8 w-auto" />
          <button onClick={() => setAbierto(false)} className="text-white/70 hover:text-white">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {usuarioNombre && (
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 uppercase tracking-wide">Usuario</p>
            <p className="text-sm font-medium text-gray-700 mt-0.5">{usuarioNombre}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto py-3">
          <p className="px-5 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
            Mis módulos
          </p>
          {modulosDisponibles.map(m => {
            const disponible = MODULOS_DISPONIBLES.has(m)
            const config = MODULO_CONFIG[m]
            if (disponible) {
              return (
                <a key={m} href={RUTAS[m]} onClick={() => setAbierto(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="text-base">{config.icono}</span>
                  <span>{config.label}</span>
                </a>
              )
            }
            return (
              <div key={m}
                className="flex items-center justify-between px-5 py-2.5 text-sm text-gray-400 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <span className="text-base opacity-50">{config.icono}</span>
                  <span>{config.label}</span>
                </div>
                <span className="text-xs bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                  Próximo
                </span>
              </div>
            )
          })}
        </div>

        <div className="border-t border-gray-100 p-4">
          <a
            href={isDev ? 'http://localhost:5173' : BASE}
            className="flex items-center gap-2 text-sm text-[#4E738A] font-medium hover:underline"
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            SOATI APPS
          </a>
        </div>
      </div>
    </>
  )
}
