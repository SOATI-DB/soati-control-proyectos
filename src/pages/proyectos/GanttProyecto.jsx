import { useEffect, useState, useRef, Fragment } from 'react'
import { formatFecha } from '../../utils/fecha'

const COLOR_ESTADO = {
  en_progreso: '#4E738A',
  en_curso:    '#4E738A',
  completada:  '#2e9e5b',
  pendiente:   '#9aa1a9',
  retrasada:   '#d9534f',
  bloqueada:   '#EE7623',
}

function barColor(estado) {
  return COLOR_ESTADO[estado] || COLOR_ESTADO.pendiente
}

function calcBarDuracion(fechaInicio, duracion, diaInicioStr, totalDias) {
  if (!fechaInicio || !duracion) return null
  const fi = new Date(`${String(fechaInicio).slice(0, 10)}T12:00:00`)
  const ff = new Date(fi)
  ff.setDate(ff.getDate() + parseInt(duracion) - 1)
  const fechaFin = `${ff.getFullYear()}-${String(ff.getMonth() + 1).padStart(2, '0')}-${String(ff.getDate()).padStart(2, '0')}`
  return calcBar(fechaInicio, fechaFin, diaInicioStr, totalDias)
}

function calcBar(fechaInicio, fechaFin, diaInicio, totalDias) {
  if (!fechaInicio || !fechaFin) return null
  const fi = new Date(`${String(fechaInicio).slice(0, 10)}T12:00:00`)
  const ff = new Date(`${String(fechaFin).slice(0, 10)}T12:00:00`)
  const ref = new Date(`${diaInicio}T12:00:00`)
  const finMes = new Date(ref.getFullYear(), ref.getMonth() + 1, 0, 12, 0, 0)

  if (ff < ref) return null
  if (fi > finMes) return null

  const inicioEfectivo = fi < ref ? ref : fi
  const finEfectivo    = ff > finMes ? finMes : ff

  const offsetDias = Math.floor((inicioEfectivo - ref) / 86400000)
  const duracion   = Math.max(1, Math.floor((finEfectivo - inicioEfectivo) / 86400000) + 1)

  const left  = (offsetDias / totalDias) * 100
  const width = (duracion / totalDias) * 100

  if (width <= 0) return null
  return { left: `${left}%`, width: `${width}%` }
}

export default function GanttProyecto({ proyecto }) {
  const hoy = new Date()
  const [mesOffset, setMesOffset] = useState(0)
  const [tooltip, setTooltip] = useState(null)
  const [exportando, setExportando] = useState(false)
  const [incluirRecurso, setIncluirRecurso] = useState(false)
  const [barAreaWidth, setBarAreaWidth] = useState(0)
  const barAreaRef = useRef(null)

  const mesBase = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1)
  const year = mesBase.getFullYear()
  const month = mesBase.getMonth()
  const diasEnMes = new Date(year, month + 1, 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1)
  const diaInicioStr = `${year}-${String(month + 1).padStart(2,'0')}-01`

  const mesLabel = mesBase.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })

  const fases = proyecto?.fases ?? []
  const tareas = proyecto?.tareas ?? []

  useEffect(() => {
    function medir() {
      if (barAreaRef.current) setBarAreaWidth(barAreaRef.current.offsetWidth)
    }
    medir()
    window.addEventListener('resize', medir)
    return () => window.removeEventListener('resize', medir)
  }, [fases, tareas, mesOffset])

  function getTareasDeFase(faseId) {
    return tareas.filter(t => t.fase_id === faseId)
  }
  const tareasSinFase = tareas.filter(t => !t.fase_id)

  function getRangoDeFase(faseId) {
    const ts = getTareasDeFase(faseId)
    const allRecursos = ts.flatMap(t => t.recursos || []).filter(r => r.fecha_inicio && r.fecha_fin)
    if (allRecursos.length > 0) {
      return {
        inicio: allRecursos.map(r => r.fecha_inicio).reduce((min, d) => d < min ? d : min),
        fin:    allRecursos.map(r => r.fecha_fin).reduce((max, d) => d > max ? d : max),
      }
    }
    const tsConFechas = ts.filter(t => t.fecha_inicio)
    if (!tsConFechas.length) return { inicio: null, fin: null }
    const inicios = tsConFechas.map(t => t.fecha_inicio)
    const fines = tsConFechas.map(t => {
      if (t.fecha_limite) return t.fecha_limite
      if (t.duracion_dias) {
        const fi = new Date(`${t.fecha_inicio}T12:00:00`)
        fi.setDate(fi.getDate() + t.duracion_dias - 1)
        return `${fi.getFullYear()}-${String(fi.getMonth() + 1).padStart(2, '0')}-${String(fi.getDate()).padStart(2, '0')}`
      }
      return null
    }).filter(Boolean)
    if (!fines.length) return { inicio: null, fin: null }
    return {
      inicio: inicios.reduce((min, d) => d < min ? d : min),
      fin:    fines.reduce((max, d) => d > max ? d : max),
    }
  }

  function getBarTarea(t) {
    if (t.duracion_dias && t.fecha_inicio) {
      return calcBarDuracion(t.fecha_inicio, t.duracion_dias, diaInicioStr, diasEnMes)
    }
    return calcBar(t.fecha_inicio, t.fecha_limite, diaInicioStr, diasEnMes)
  }

  // Orden de filas: fase → tarea → recursos de esa tarea
  const orderedRows = []
  for (const f of fases) {
    orderedRows.push({ type: 'fase', item: f })
    for (const t of getTareasDeFase(f.id)) {
      orderedRows.push({ type: 'tarea', item: t })
      for (const r of (t.recursos || [])) {
        orderedRows.push({ type: 'recurso', item: r, tarea: t })
      }
    }
  }
  for (const t of tareasSinFase) {
    orderedRows.push({ type: 'tarea', item: t })
    for (const r of (t.recursos || [])) {
      orderedRows.push({ type: 'recurso', item: r, tarea: t })
    }
  }
  const tareaRowIndex = {}
  orderedRows.forEach((r, i) => { if (r.type === 'tarea') tareaRowIndex[r.item.id] = i })

  // Líneas de dependencia
  const dependencyLines = []
  if (barAreaWidth > 0) {
    for (const t of tareas) {
      if (!t.tarea_predecesora_id) continue
      const predIdx = tareaRowIndex[t.tarea_predecesora_id]
      const currIdx = tareaRowIndex[t.id]
      if (predIdx === undefined || currIdx === undefined) continue
      const predItem = orderedRows[predIdx]?.item
      if (!predItem) continue
      const barA = getBarTarea(predItem)
      const barB = getBarTarea(t)
      if (!barA || !barB) continue
      dependencyLines.push({
        x1: barAreaWidth * (parseFloat(barA.left) + parseFloat(barA.width)) / 100,
        y1: predIdx * 32 + 16,
        x2: barAreaWidth * parseFloat(barB.left) / 100,
        y2: currIdx * 32 + 16,
      })
    }
  }

  async function exportarPDF() {
    setExportando(true)
    try {
      const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'
      const t = localStorage.getItem('soati_shell_token')
      const res = await fetch(
        `${BASE}/api/proyectos/${proyecto.id}/gantt-pdf?incluir_recurso=${incluirRecurso}`,
        { headers: { Authorization: `Bearer ${t}` } }
      )
      if (!res.ok) throw new Error('Error al generar PDF')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `gantt-${proyecto.codigo}.pdf`
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 5000)
    } catch {
      alert('No se pudo generar el PDF')
    } finally {
      setExportando(false)
    }
  }

  // Columnas de días (reutilizadas en cada fila)
  function DiasCols() {
    return dias.map(d => (
      <div
        key={d}
        className="absolute top-0 bottom-0 border-r border-gray-100"
        style={{ left: `${((d - 1) / diasEnMes) * 100}%`, width: `${(1 / diasEnMes) * 100}%` }}
      />
    ))
  }

  function FilaBar({ label, fechaInicio, fechaFin, duracion, estado, recursoNombre, dedicacion }) {
    const bar = duracion && fechaInicio && !fechaFin
      ? calcBarDuracion(fechaInicio, duracion, diaInicioStr, diasEnMes)
      : calcBar(fechaInicio, fechaFin, diaInicioStr, diasEnMes)
    const color = barColor(estado)
    return (
      <div className="flex border-b border-gray-100 min-h-[32px]">
        <div className="w-48 shrink-0 px-2 py-1 text-xs text-[#2C3A43] truncate border-r border-gray-200 flex items-center">
          {label}
        </div>
        <div className="flex-1 relative">
          <DiasCols />
          {bar && (
            <div
              className="absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80"
              style={{ left: bar.left, width: bar.width, backgroundColor: color }}
              onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, label, estado, fechaInicio, fechaFin, recursoNombre, dedicacion })}
              onMouseLeave={() => setTooltip(null)}
            />
          )}
        </div>
      </div>
    )
  }

  function FilaTarea({ t, labelPrefix }) {
    const recursos = t.recursos || []
    const estaVencida = t.fecha_limite
      && new Date(`${t.fecha_limite}T12:00:00`) < hoy
      && t.estado !== 'completada'
    const barSLA      = calcBar(t.fecha_inicio, t.fecha_limite, diaInicioStr, diasEnMes)
    const barPrincipal = recursos.length === 0 ? getBarTarea(t) : null
    const color = barColor(t.estado)
    return (
      <Fragment>
        <div className="flex border-b border-gray-100 min-h-[32px]">
          <div className="w-48 shrink-0 px-2 py-1 text-xs text-[#2C3A43] truncate border-r border-gray-200 flex items-center gap-1">
            {estaVencida && <span className="w-2 h-2 rounded-full bg-red-500 shrink-0 flex-none" title="SLA vencido" />}
            <span className="truncate">{labelPrefix}{t.titulo}</span>
          </div>
          <div className="flex-1 relative">
            <DiasCols />
            {barSLA && recursos.length > 0 && (
              <div
                className="absolute top-1 bottom-1 rounded"
                style={{ left: barSLA.left, width: barSLA.width, backgroundColor: color, opacity: 0.3 }}
                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, label: t.titulo, estado: t.estado, fechaInicio: t.fecha_inicio, fechaFin: t.fecha_limite })}
                onMouseLeave={() => setTooltip(null)}
              />
            )}
            {barPrincipal && (
              <div
                className="absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80"
                style={{ left: barPrincipal.left, width: barPrincipal.width, backgroundColor: color }}
                onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, label: t.titulo, estado: t.estado, fechaInicio: t.fecha_inicio, fechaFin: t.fecha_limite })}
                onMouseLeave={() => setTooltip(null)}
              />
            )}
          </div>
        </div>
        {recursos.map(r => (
          <FilaBar
            key={r.id}
            label={`     └─ ${r.usuario_nombre} (${r.dedicacion_pct}%)`}
            fechaInicio={r.fecha_inicio}
            fechaFin={r.fecha_fin}
            estado={t.estado}
            recursoNombre={r.usuario_nombre}
            dedicacion={r.dedicacion_pct}
          />
        ))}
      </Fragment>
    )
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <label style={{ fontSize: '12px', color: '#666', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="checkbox" checked={incluirRecurso} onChange={e => setIncluirRecurso(e.target.checked)} />
            Incluir recursos
          </label>
          <button
            onClick={exportarPDF}
            disabled={exportando}
            className="bg-[#4E738A] hover:bg-[#3d5c70] text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {exportando ? 'Generando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex gap-4 mb-3 flex-wrap">
        {Object.entries({ en_progreso: 'En progreso', completada: 'Completada', pendiente: 'Pendiente', retrasada: 'Retrasada', bloqueada: 'Bloqueada' }).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1 text-xs text-gray-500">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: barColor(k) }} />
            {v}
          </span>
        ))}
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full inline-block bg-red-500" />
          SLA vencido
        </span>
      </div>

      {/* Grid */}
      <div className="border border-gray-200 rounded-lg overflow-hidden overflow-x-auto">
        {/* Header días */}
        <div className="flex bg-gray-50 border-b border-gray-200">
          <div className="w-48 shrink-0 px-2 py-1.5 text-xs font-medium text-gray-500 border-r border-gray-200">
            Fase / Tarea
          </div>
          <div className="flex-1 relative min-h-[28px]" ref={barAreaRef}>
            {dias.map(d => (
              <div
                key={d}
                className="absolute top-0 bottom-0 flex items-center justify-center text-[10px] text-gray-400 border-r border-gray-200"
                style={{ left: `${((d - 1) / diasEnMes) * 100}%`, width: `${(1 / diasEnMes) * 100}%` }}
              >
                {d % 5 === 1 || d === 1 ? d : ''}
              </div>
            ))}
          </div>
        </div>

        {/* Filas con SVG overlay para flechas */}
        <div className="relative">
          {fases.map(f => {
            const { inicio: faseInicio, fin: faseFin } = getRangoDeFase(f.id)
            const barFase = calcBar(faseInicio || f.fecha_inicio_plan, faseFin || f.fecha_fin_plan, diaInicioStr, diasEnMes)
            return (
              <div key={f.id}>
                <div className="flex bg-[#4E738A]/5 border-b border-gray-200 min-h-[32px]">
                  <div className="w-48 shrink-0 px-2 py-1 text-xs font-semibold text-[#4E738A] truncate border-r border-gray-200 flex items-center">
                    {f.nombre}
                  </div>
                  <div className="flex-1 relative">
                    {barFase && (
                      <div
                        className="absolute top-1 bottom-1 rounded opacity-30"
                        style={{ ...barFase, backgroundColor: barColor(f.estado) }}
                      />
                    )}
                  </div>
                </div>
                {getTareasDeFase(f.id).map(t => (
                  <FilaTarea key={t.id} t={t} labelPrefix="  └ " />
                ))}
              </div>
            )
          })}

          {tareasSinFase.map(t => (
            <FilaTarea key={t.id} t={t} labelPrefix="" />
          ))}

          {fases.length === 0 && tareas.length === 0 && (
            <div className="flex border-b border-gray-100 min-h-[48px] items-center justify-center">
              <p className="text-sm text-gray-400">Sin fases ni tareas</p>
            </div>
          )}

          {/* SVG flechas de dependencias */}
          {dependencyLines.length > 0 && (
            <svg
              style={{
                position: 'absolute',
                top: 0,
                left: 192,
                width: 'calc(100% - 192px)',
                height: orderedRows.length * 32,
                pointerEvents: 'none',
                zIndex: 10,
                overflow: 'visible',
              }}
            >
              <defs>
                <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M 0 0 L 6 3 L 0 6 Z" fill="#4E738A" opacity="0.7" />
                </marker>
              </defs>
              {dependencyLines.map((line, i) => (
                <path
                  key={i}
                  d={`M ${line.x1} ${line.y1} C ${Math.min(line.x1 + 20, barAreaWidth)} ${line.y1} ${Math.max(line.x2 - 20, 0)} ${line.y2} ${line.x2} ${line.y2}`}
                  stroke="#4E738A"
                  strokeWidth="1.5"
                  strokeOpacity="0.6"
                  strokeDasharray="4,2"
                  fill="none"
                  markerEnd="url(#dep-arrow)"
                />
              ))}
            </svg>
          )}
        </div>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs pointer-events-none"
          style={{ top: tooltip.y + 12, left: tooltip.x + 12, maxWidth: 240 }}
        >
          <p className="font-semibold text-[#2C3A43] mb-1">{tooltip.label}</p>
          <p className="text-gray-500">Estado: {tooltip.estado}</p>
          {tooltip.fechaInicio && <p className="text-gray-500">Inicio: {formatFecha(tooltip.fechaInicio)}</p>}
          {tooltip.fechaFin && <p className="text-gray-500">Fin: {formatFecha(tooltip.fechaFin)}</p>}
          {tooltip.recursoNombre && <p className="text-gray-500">Recurso: {tooltip.recursoNombre}</p>}
          {tooltip.dedicacion && <p className="text-gray-500">Dedicación: {tooltip.dedicacion}%</p>}
        </div>
      )}
    </div>
  )
}
