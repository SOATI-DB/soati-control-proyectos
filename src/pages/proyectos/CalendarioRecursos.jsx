import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCalendarioRecursos } from '../../services/api'
import { formatFecha } from '../../utils/fecha'

const CP_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'
const token = () => localStorage.getItem('soati_shell_token')

const TIPOS = [
  { id: '',           label: 'Todos' },
  { id: 'ingenieria', label: 'Ingeniería' },
  { id: 'planos',     label: 'Planos' },
  { id: 'diseno',     label: 'Diseño' },
  { id: 'tecnicos',   label: 'Técnicos' },  // agrupa ensamble + campo
]

// Fallback: golden angle por índice en lista ordenada alfabéticamente
function calcularColorGoldenAngle(idx) {
  let hue = (idx * 137.5) % 360
  if (hue < 20 || hue > 340) hue = (hue + 20) % 360

  const sats = [55, 75, 45]
  const lits = [42, 35, 50]
  const sat  = sats[idx % 3]
  const lit  = lits[idx % 3]

  return `hsl(${Math.round(hue)}, ${sat}%, ${lit}%)`
}

// Color del proyecto — usa BD si existe, golden angle por índice como fallback
function colorProyecto(codigo, colorBD, todosCodigos) {
  if (colorBD) return colorBD
  const idx = [...todosCodigos].sort().indexOf(codigo)
  return calcularColorGoldenAngle(idx >= 0 ? idx : 0)
}


function anchoBarra(asig) {
  if (asig.hora_inicio && asig.hora_fin) {
    const toMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m }
    const mins = Math.max(0, toMin(asig.hora_fin) - toMin(asig.hora_inicio))
    return `${Math.min(100, (mins / (9.5 * 60)) * 100).toFixed(1)}%`
  }
  return '100%'
}

export default function CalendarioRecursos() {
  const navigate = useNavigate()
  const hoy = new Date()
  const [vista, setVista]               = useState('mes')
  const [mesOffset, setMesOffset]       = useState(0)
  const [quincenaIdx, setQuincenaIdx]   = useState(0)
  const [semanaOffset, setSemanaOffset] = useState(0)
  const [tipo, setTipo]                 = useState('')
  const [asignaciones, setAsignaciones] = useState([])
  const [cargando, setCargando]         = useState(false)
  const [tooltip, setTooltip]           = useState(null)

  const mesBase  = new Date(hoy.getFullYear(), hoy.getMonth() + mesOffset, 1)
  const year     = mesBase.getFullYear()
  const month    = mesBase.getMonth()
  const mesStr   = `${year}-${String(month + 1).padStart(2, '0')}`
  const mesLabel = mesBase.toLocaleDateString('es-CR', { month: 'long', year: 'numeric' })

  // Calcular rango de días según la vista
  let dias = []
  let rangeLabel = ''

  if (vista === 'mes') {
    const diasEnMes = new Date(year, month + 1, 0).getDate()
    dias = Array.from({ length: diasEnMes }, (_, i) => ({
      dia: i + 1,
      fecha: new Date(year, month, i + 1),
    }))
    rangeLabel = mesLabel

  } else if (vista === 'quincena') {
    const diasEnMes = new Date(year, month + 1, 0).getDate()
    const inicio = quincenaIdx === 0 ? 1 : 16
    const fin    = quincenaIdx === 0 ? 15 : diasEnMes
    dias = Array.from({ length: fin - inicio + 1 }, (_, i) => ({
      dia: inicio + i,
      fecha: new Date(year, month, inicio + i),
    }))
    rangeLabel = `${quincenaIdx === 0 ? '1ª' : '2ª'} quincena — ${mesLabel}`

  } else if (vista === 'semana') {
    const lunes = new Date(hoy)
    lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7) + semanaOffset * 7)
    dias = Array.from({ length: 7 }, (_, i) => {
      const f = new Date(lunes)
      f.setDate(lunes.getDate() + i)
      return { dia: f.getDate(), fecha: f }
    })
    const domingofin = new Date(lunes)
    domingofin.setDate(lunes.getDate() + 6)
    rangeLabel = `${lunes.getDate()}/${lunes.getMonth()+1} — ${domingofin.getDate()}/${domingofin.getMonth()+1}/${domingofin.getFullYear()}`
  }

  const mesParaCargar = vista === 'semana'
    ? `${dias[0]?.fecha.getFullYear()}-${String(dias[0]?.fecha.getMonth()+1).padStart(2,'0')}`
    : mesStr

  const mesParaCargar2 = vista === 'semana' && dias[6]?.fecha.getMonth() !== dias[0]?.fecha.getMonth()
    ? `${dias[6]?.fecha.getFullYear()}-${String(dias[6]?.fecha.getMonth()+1).padStart(2,'0')}`
    : null

  useEffect(() => {
    if (dias.length === 0) return
    const mesActual  = mesParaCargar
    const mesAnio    = parseInt(mesActual.split('-')[1])
    const anioActual = parseInt(mesActual.split('-')[0])
    setCargando(true)
    ;(async () => {
      try {
        let asigBase = []
        if (tipo === 'tecnicos') {
          const [ensamble, campo] = await Promise.all([
            getCalendarioRecursos(mesActual, 'ensamble').catch(() => []),
            getCalendarioRecursos(mesActual, 'campo').catch(() => []),
          ])
          asigBase = [...(Array.isArray(ensamble) ? ensamble : []),
                      ...(Array.isArray(campo) ? campo : [])]
        } else {
          asigBase = await getCalendarioRecursos(mesActual, tipo || undefined).catch(() => [])
          if (!Array.isArray(asigBase)) asigBase = []
        }
        if (mesParaCargar2) {
          let asigBase2 = []
          if (tipo === 'tecnicos') {
            const [ensamble2, campo2] = await Promise.all([
              getCalendarioRecursos(mesParaCargar2, 'ensamble').catch(() => []),
              getCalendarioRecursos(mesParaCargar2, 'campo').catch(() => []),
            ])
            asigBase2 = [...(Array.isArray(ensamble2) ? ensamble2 : []),
                         ...(Array.isArray(campo2) ? campo2 : [])]
          } else {
            asigBase2 = await getCalendarioRecursos(mesParaCargar2, tipo || undefined).catch(() => [])
            if (!Array.isArray(asigBase2)) asigBase2 = []
          }
          asigBase = [...asigBase, ...asigBase2]
        }
        const vistos = new Set()
        asigBase = asigBase.filter(a => {
          if (vistos.has(a.id)) return false
          vistos.add(a.id)
          return true
        })
        asigBase = asigBase.map(asig => {
          const esServicio = !!asig.servicio_tarea_id
          return {
            ...asig,
            tipo:              esServicio ? 'servicio' : 'proyecto',
            codigo:            esServicio ? asig.sv_codigo        : asig.codigo,
            tarea_nombre:      esServicio ? asig.sv_tarea_nombre  : asig.tarea_nombre,
            tarea_descripcion: esServicio ? asig.sv_tarea_descripcion : null,
            contrato_nombre:   asig.sv_contrato_nombre ?? null,
            prioridad:         esServicio ? null : (asig.tarea_prioridad ?? null),
            fecha_limite:      esServicio ? null : (asig.tarea_fecha_limite ?? null),
            fecha_limite_fija: esServicio
              ? (asig.sv_fecha_limite_fija ?? false)
              : (asig.tarea_fecha_limite_fija ?? false),
            pm_nombre:              esServicio ? null : (asig.pm_nombre ?? null),
            ingeniero_cargo_nombre: esServicio ? null : (asig.ingeniero_cargo_nombre ?? null),
            proyecto_id:            asig.proyecto_id      ?? null,
            tarea_id:               asig.tarea_id         ?? null,
            servicio_tarea_id:      asig.servicio_tarea_id ?? null,
            proyecto_color:    asig.proyecto_color ?? null,
            sv_color:          asig.sv_color       ?? null,
          }
        })
        setAsignaciones(asigBase)
        setCargando(false)
      } catch {
        setAsignaciones([])
        setCargando(false)
      }
    })()
  }, [mesStr, quincenaIdx, semanaOffset, tipo, vista, mesParaCargar2]) // eslint-disable-line react-hooks/exhaustive-deps

  // Agrupar por usuario
  const usuariosMap = {}
  for (const a of asignaciones) {
    if (!usuariosMap[a.usuario_id]) {
      usuariosMap[a.usuario_id] = { nombre: a.usuario_nombre, asignaciones: [] }
    }
    usuariosMap[a.usuario_id].asignaciones.push(a)
  }
  const usuarios = Object.values(usuariosMap).sort((a, b) => a.nombre.localeCompare(b.nombre))

  const usuariosFiltrados = (vista === 'mes')
    ? usuarios
    : usuarios.filter(u =>
        u.asignaciones.some(a => dias.some(({ fecha }) => diaOcupado(a, fecha)))
      )

  function diaOcupado(asig, fechaDia) {
    const d = new Date(fechaDia)
    d.setHours(12, 0, 0, 0)
    const fi = new Date(`${String(asig.fecha_inicio).slice(0, 10)}T12:00:00`)
    const ff = new Date(`${String(asig.fecha_fin).slice(0, 10)}T12:00:00`)
    if (d < fi || d > ff) return false
    if (!asig.incluir_fines_semana && (d.getDay() === 0 || d.getDay() === 6)) return false
    return true
  }

  return (
    <div>
      {/* Controles */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">

        {/* Navegación */}
        <button
          onClick={() => {
            if (vista === 'mes')      setMesOffset(m => m - 1)
            if (vista === 'quincena') {
              if (quincenaIdx === 0) { setQuincenaIdx(1); setMesOffset(m => m - 1) }
              else setQuincenaIdx(0)
            }
            if (vista === 'semana')  setSemanaOffset(s => s - 1)
          }}
          className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-[#4E738A] text-[#4E738A]"
        >
          &lsaquo; Anterior
        </button>

        <span className="text-sm font-medium text-[#2C3A43] capitalize">{rangeLabel}</span>

        <button
          onClick={() => {
            if (vista === 'mes')      setMesOffset(m => m + 1)
            if (vista === 'quincena') {
              if (quincenaIdx === 1) { setQuincenaIdx(0); setMesOffset(m => m + 1) }
              else setQuincenaIdx(1)
            }
            if (vista === 'semana')  setSemanaOffset(s => s + 1)
          }}
          className="px-2 py-1 text-xs border border-gray-200 rounded hover:border-[#4E738A] text-[#4E738A]"
        >
          Siguiente &rsaquo;
        </button>

        {/* Selector de vista */}
        <div className="flex gap-1 border border-gray-200 rounded-lg overflow-hidden">
          {[
            { id: 'semana',   label: 'Semana' },
            { id: 'quincena', label: 'Quincena' },
            { id: 'mes',      label: 'Mes' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => {
                setVista(v.id)
                setSemanaOffset(0)
                setQuincenaIdx(0)
              }}
              className={`px-3 py-1 text-xs transition-colors ${
                vista === v.id
                  ? 'bg-[#4E738A] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>

        {/* Filtros de tipo */}
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
            {dias.map(({ dia, fecha }) => {
              const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6
              const esHoy   = fecha.toDateString() === hoy.toDateString()
              return (
                <div
                  key={dia}
                  className={`flex-1 text-center text-[10px] py-1.5 border-r border-gray-200 ${
                    esFinde ? 'bg-gray-100 text-gray-400' :
                    esHoy   ? 'bg-[#4E738A]/10 text-[#4E738A] font-semibold' :
                    'text-gray-500'
                  }`}
                  style={{ minWidth: vista === 'semana' ? '80px' : vista === 'quincena' ? '48px' : '28px' }}
                >
                  {vista === 'semana'
                    ? `${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][fecha.getDay()]} ${dia}`
                    : dia
                  }
                </div>
              )
            })}
          </div>
        </div>

        {/* Filas por usuario */}
        {usuariosFiltrados.map(u => (
          <div key={u.nombre} className="flex border-b border-gray-100 min-h-[40px]">
            <div className="w-40 shrink-0 px-2 py-1 text-xs text-[#2C3A43] font-medium truncate border-r border-gray-200 flex items-center">
              {u.nombre}
            </div>
            <div className="flex flex-1 min-w-0 relative">
              {dias.map(({ dia, fecha }) => {
                const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6
                const asigs   = u.asignaciones.filter(a => diaOcupado(a, fecha))
                const minW    = vista === 'semana' ? '80px' : vista === 'quincena' ? '48px' : '28px'
                return (
                  <div
                    key={dia}
                    className={`flex-1 border-r border-gray-100 flex flex-col items-stretch justify-center gap-px py-0.5 ${esFinde ? 'bg-gray-50' : ''}`}
                    style={{ minWidth: minW }}
                  >
                    {asigs.map((asig, i) => {
                      const hoy             = new Date(); hoy.setHours(0,0,0,0)
                      const esFechaFija      = !!asig.fecha_limite_fija
                      const esPrioridadAlta  = asig.prioridad === 'alta' || asig.prioridad === 'critica'
                      const colorAlerta      = '#dc2626'
                      // Barra roja solo por fecha fija — NO por prioridad ni SLA
                      // Recopilar todos los códigos visibles para el fallback de golden angle
                      const todosCodigos = new Set(asignaciones.map(a => a.codigo).filter(Boolean))
                      const colorBD      = asig.tipo === 'servicio'
                        ? (asig.sv_color ?? null)
                        : (asig.proyecto_color ?? null)
                      const color        = esFechaFija
                        ? colorAlerta
                        : colorProyecto(asig.codigo, colorBD, todosCodigos)
                      // Texto rojo en etiqueta si prioridad alta (independiente del color de barra)
                      const fechaLimite      = asig.fecha_limite ? new Date(asig.fecha_limite) : null
                      const diasRestantes    = fechaLimite ? Math.ceil((fechaLimite - hoy) / 86400000) : null
                      const esSlaUrgente     = diasRestantes !== null && diasRestantes <= 3 && diasRestantes >= 0
                      const etiqueta        = asig.codigo || ''
                      const mostrarEtiqueta = vista !== 'mes' && etiqueta
                      return (
                        <div
                          key={i}
                          className="mx-0.5 rounded-sm cursor-pointer flex items-center overflow-hidden"
                          style={{
                            backgroundColor: color,
                            height: mostrarEtiqueta ? '16px' : '10px',
                            opacity: asig.tipo === 'servicio' ? 0.85 : 1,
                            width: anchoBarra(asig),
                          }}
                          onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY, asig, esSlaUrgente, esPrioridadAlta, esFechaFija, diasRestantes })}
                          onMouseLeave={() => setTooltip(null)}
                          onClick={() => {
                            if (asig.servicio_tarea_id && asig.codigo) {
                              navigate(`/servicios/${asig.codigo}`)
                            } else if (asig.proyecto_id) {
                              navigate(`/proyectos/${asig.proyecto_id}?tarea=${asig.tarea_id}`)
                            }
                          }}
                        >
                          {mostrarEtiqueta && (
                            <span
                              className="font-medium px-1 truncate"
                              style={{ fontSize: '9px', lineHeight: '16px', color: '#ffffff' }}
                            >
                              {etiqueta}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {usuariosFiltrados.length === 0 && !cargando && (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-gray-400">Sin recursos asignados en este período</p>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-xl shadow-xl px-4 py-3 text-sm pointer-events-none max-w-xs"
          style={{ left: Math.min(tooltip.x + 12, window.innerWidth - 280), top: tooltip.y + 12 }}
        >
          <p className="font-semibold text-[#2C3A43] mb-1">{tooltip.asig.codigo}</p>
          {tooltip.asig.tipo === 'servicio' && tooltip.asig.contrato_nombre && (
            <p className="text-gray-600 text-xs mb-1">{tooltip.asig.contrato_nombre}</p>
          )}
          {tooltip.asig.tarea_nombre && (
            <p className={`mb-1 ${tooltip.esPrioridadAlta ? 'text-red-600 font-medium' : 'text-gray-700'}`}>
              <span className="text-gray-400 text-xs font-normal">Tarea: </span>
              {tooltip.asig.tarea_nombre}
              {tooltip.esPrioridadAlta && <span className="ml-1 text-xs">🔴 Alta prioridad</span>}
            </p>
          )}
          {tooltip.esSlaUrgente && (
            <p className="text-red-600 text-xs font-medium mb-1">
              ⚠️ SLA vence en {tooltip.diasRestantes === 0 ? 'hoy' : `${tooltip.diasRestantes} día${tooltip.diasRestantes === 1 ? '' : 's'}`}
            </p>
          )}
          {tooltip.esFechaFija && (
            <p className="text-red-600 text-xs font-medium mb-1">
              🔒 Fecha límite fija
            </p>
          )}
          {tooltip.asig.tipo === 'servicio' && tooltip.asig.tarea_descripcion && (
            <p className="text-gray-600 text-xs mb-1">{tooltip.asig.tarea_descripcion}</p>
          )}
          {tooltip.asig.tipo !== 'servicio' && tooltip.asig.pm_nombre && (
            <p className="text-gray-700 mb-1">
              <span className="text-gray-400 text-xs">PM: </span>
              {tooltip.asig.pm_nombre}
            </p>
          )}
          {tooltip.asig.tipo !== 'servicio' && tooltip.asig.ingeniero_cargo_nombre && (
            <p className="text-gray-700 mb-1">
              <span className="text-gray-400 text-xs">Ingeniero: </span>
              {tooltip.asig.ingeniero_cargo_nombre}
            </p>
          )}
          <p className="text-gray-500 text-xs">
            Tipo: {tooltip.asig.tipo === 'servicio' ? 'Servicio' : 'Ingeniería'}
          </p>
          <p className="text-gray-400 text-xs">
            {String(tooltip.asig.fecha_inicio).slice(0, 10).replace(/-/g, '/')}
            {' — '}
            {String(tooltip.asig.fecha_fin).slice(0, 10).replace(/-/g, '/')}
          </p>
        </div>
      )}
    </div>
  )
}
