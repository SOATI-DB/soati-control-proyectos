import { useEffect, useState } from 'react'
import { getCalendarioRecursos } from '../../services/api'
import { formatFecha } from '../../utils/fecha'

const TIPOS = [
  { id: '',           label: 'Todos' },
  { id: 'ingenieria', label: 'Ingeniería' },
  { id: 'planos',     label: 'Planos' },
  { id: 'diseno',     label: 'Diseño' },
]

const COLORES = [
  '#4E738A', '#2C7A7B', '#6B5B95', '#88B04B',
  '#F7CAC9', '#92A8D1', '#955251', '#B5838D'
]

function colorProyecto(codigo) {
  let hash = 0
  for (const c of (codigo || '')) hash = (hash * 31 + c.charCodeAt(0)) % COLORES.length
  return COLORES[hash]
}

export default function CalendarioRecursos() {
  const hoy = new Date()
  const [mesOffset, setMesOffset] = useState(0)
  const [tipo, setTipo] = useState('')
  const [asignaciones, setAsignaciones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [tooltip, setTooltip] = useState(null)

  const mesBase = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1)
  const year = mesBase.getFullYear()
  const month = mesBase.getMonth()
  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1)
  const mesStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const mesLabel = mesBase.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })

  useEffect(() => {
    setCargando(true)
    getCalendarioRecursos(mesStr, tipo || undefined)
      .then(data => { setAsignaciones(Array.isArray(data) ? data : []); setCargando(false) })
      .catch(() => { setAsignaciones([]); setCargando(false) })
  }, [mesStr, tipo])

  // Agrupar por usuario_nombre
  const usuariosMap = {}
  for (const a of asignaciones) {
    if (!usuariosMap[a.usuario_id]) {
      usuariosMap[a.usuario_id] = { nombre: a.usuario_nombre, asignaciones: [] }
    }
    usuariosMap[a.usuario_id].asignaciones.push(a)
  }
  const usuarios = Object.values(usuariosMap).sort((a, b) => a.nombre.localeCompare(b.nombre))

  function diaOcupado(asig, dia) {
    const d = new Date(year, month, dia)
    const fi = new Date(`${String(asig.fecha_inicio).slice(0, 10)}T12:00:00`)
    const ff = new Date(`${String(asig.fecha_fin).slice(0, 10)}T12:00:00`)
    return d >= fi && d <= ff
  }

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <button
          onClick={() => setMesOffset(m => m - 1)}
          className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-[#4E738A] text-[#4E738A]"
        >
          &lsaquo; Anterior
        </button>
        <span className="text-sm font-medium text-[#2C3A43] capitalize">{mesLabel}</span>
        <button
          onClick={() => setMesOffset(m => m + 1)}
          className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-[#4E738A] text-[#4E738A]"
        >
          Siguiente &rsaquo;
        </button>

        <div className="ml-auto flex gap-1 flex-wrap">
          {TIPOS.map(t => (
            <button
              key={t.id}
              onClick={() => setTipo(t.id)}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                tipo === t.id
                  ? 'bg-[#4E738A] text-white border-[#4E738A]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E738A]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {cargando && <p className="text-sm text-gray-400 mb-4">Cargando...</p>}

      {/* Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        {/* Header días */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          <div className="w-40 shrink-0 px-2 py-1.5 text-xs font-medium text-gray-500 border-r border-gray-200">
            Recurso
          </div>
          <div className="flex flex-1 min-w-0">
            {dias.map(d => {
              const fecha = new Date(year, month, d)
              const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6
              return (
                <div
                  key={d}
                  className={`flex-1 min-w-[28px] text-center text-[10px] py-1.5 border-r border-gray-200 ${esFinde ? 'bg-gray-100 text-gray-400' : 'text-gray-500'}`}
                >
                  {d}
                </div>
              )
            })}
          </div>
        </div>

        {/* Filas por usuario */}
        {usuarios.map(u => (
          <div key={u.nombre} className="flex border-b border-gray-100 min-h-[36px]">
            <div className="w-40 shrink-0 px-2 py-1 text-xs text-[#2C3A43] font-medium truncate border-r border-gray-200 flex items-center">
              {u.nombre}
            </div>
            <div className="flex flex-1 min-w-0 relative">
              {dias.map(d => {
                const fecha = new Date(year, month, d)
                const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6
                const asig = u.asignaciones.find(a => diaOcupado(a, d))
                return (
                  <div
                    key={d}
                    className={`flex-1 min-w-[28px] border-r border-gray-100 flex items-center justify-center ${esFinde ? 'bg-gray-50' : ''}`}
                    onMouseEnter={asig ? e => setTooltip({ x: e.clientX, y: e.clientY, asig }) : undefined}
                    onMouseLeave={() => setTooltip(null)}
                  >
                    {asig && (
                      <div
                        className="w-full h-5 mx-px rounded-sm cursor-pointer"
                        style={{ backgroundColor: colorProyecto(asig.codigo) }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {usuarios.length === 0 && !cargando && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-400">Sin recursos asignados en este mes</p>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12, maxWidth: 220 }}
        >
          <p className="font-semibold text-[#2C3A43] mb-1">{tooltip.asig.codigo}</p>
          <p className="text-gray-500">{tooltip.asig.proyecto_nombre}</p>
          <p className="text-gray-500">Tipo: {tooltip.asig.tipo_recurso}</p>
          <p className="text-gray-500">{formatFecha(tooltip.asig.fecha_inicio)} — {formatFecha(tooltip.asig.fecha_fin)}</p>
          {tooltip.asig.dedicacion_pct !== 100 && (
            <p className="text-gray-500">Dedicación: {tooltip.asig.dedicacion_pct}%</p>
          )}
        </div>
      )}
    </div>
  )
}
