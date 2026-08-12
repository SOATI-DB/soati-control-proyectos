import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProyectos, getPMs, getRecursosIngenieria } from '../../services/api'
import { formatFecha } from '../../utils/fecha'
import { useAuth } from '../../hooks/useAuth'

const ESTADO_LABEL = {
  en_planificacion: 'Planificación',
  en_ejecucion:     'Ejecución',
  en_pausa:         'En pausa',
  en_cierre:        'En cierre',
  cerrado:          'Cerrado',
  cancelado:        'Cancelado',
}

const ESTADO_ESTILOS = {
  en_planificacion: 'bg-blue-100 text-blue-700',
  en_ejecucion:     'bg-green-100 text-green-700',
  en_pausa:         'bg-yellow-100 text-yellow-700',
  en_cierre:        'bg-orange-100 text-orange-700',
  cerrado:          'bg-gray-100 text-gray-500',
  cancelado:        'bg-red-100 text-red-600',
}

const HOY = new Date()

function diasParaVencer(fecha) {
  if (!fecha) return null
  const d = new Date(`${fecha}T12:00:00`)
  return Math.ceil((d - HOY) / (1000 * 60 * 60 * 24))
}

const FiltrosBusqueda = React.memo(function FiltrosBusqueda({ onBusquedaChange, onClienteChange, onLimpiar, hayFiltros }) {
  const [busquedaLocal, setBusquedaLocal] = useState('')
  const [clienteLocal, setClienteLocal] = useState('')
  const busquedaTimer = useRef(null)
  const clienteTimer = useRef(null)

  function handleBusqueda(e) {
    setBusquedaLocal(e.target.value)
    clearTimeout(busquedaTimer.current)
    busquedaTimer.current = setTimeout(() => onBusquedaChange(e.target.value), 400)
  }

  function handleCliente(e) {
    setClienteLocal(e.target.value)
    clearTimeout(clienteTimer.current)
    clienteTimer.current = setTimeout(() => onClienteChange(e.target.value), 400)
  }

  function handleLimpiar() {
    setBusquedaLocal('')
    setClienteLocal('')
    onLimpiar()
  }

  return (
    <>
      <input
        type="text"
        value={busquedaLocal}
        onChange={handleBusqueda}
        placeholder="Buscar por nombre o código..."
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 flex-1 min-w-48"
      />
      <input
        type="text"
        value={clienteLocal}
        onChange={handleCliente}
        placeholder="Filtrar por cliente..."
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 flex-1 min-w-40"
      />
      {(hayFiltros || busquedaLocal || clienteLocal) && (
        <button onClick={handleLimpiar} className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-[#5f6b75] hover:bg-gray-50 transition-colors whitespace-nowrap">
          Limpiar filtros
        </button>
      )}
    </>
  )
})

export default function ListaProyectos() {
  const navigate = useNavigate()
  const { user, tienePermiso } = useAuth()
  const [proyectos, setProyectos] = useState([])
  const [cargandoInicial, setCargandoInicial] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [filtroPM, setFiltroPM] = useState('')
  const [filtroIngeniero, setFiltroIngeniero] = useState('')
  const [filtroInterno, setFiltroInterno] = useState(false)
  const [listaPMs, setListaPMs] = useState([])
  const [listaIngenieros, setListaIngenieros] = useState([])

  // Fuente de verdad para los parámetros del fetch — no causa re-renders
  const filtrosRef = useRef({ estado: '', q: '', pm: '', cliente: '', ingeniero: '' })

  const puedeGestionar = user?.rol === 'admin' || tienePermiso('control-proyectos', 'gestionar_proyecto')

  useEffect(() => {
    getPMs().then(setListaPMs)
    getRecursosIngenieria().then(setListaIngenieros)
    buscar(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const buscar = useCallback(async (esInicial = false) => {
    if (esInicial) setCargandoInicial(true)
    try {
      const f = filtrosRef.current
      const params = {}
      if (f.estado)    params.estado             = f.estado
      if (f.q)         params.q                  = f.q
      if (f.pm)        params.pm_id              = f.pm
      if (f.cliente)   params.cliente            = f.cliente
      if (f.ingeniero) params.ingeniero_cargo_id = f.ingeniero
      const data = await getProyectos(params)
      setProyectos(Array.isArray(data) ? data : [])
    } catch {
      setProyectos([])
    } finally {
      if (esInicial) setCargandoInicial(false)
    }
  }, [])

  function handleEstadoChange(e) {
    const val = e.target.value
    filtrosRef.current.estado = val
    setFiltroEstado(val)
    buscar()
  }

  function handlePMChange(e) {
    const val = e.target.value
    filtrosRef.current.pm = val
    setFiltroPM(val)
    buscar()
  }

  function handleIngenieroChange(e) {
    const val = e.target.value
    filtrosRef.current.ingeniero = val
    setFiltroIngeniero(val)
    buscar()
  }

  const activos = proyectos.filter(p => !['cerrado', 'cancelado'].includes(p.estado))
  const enEjecucion = proyectos.filter(p => p.estado === 'en_ejecucion')
  const enPlanificacion = proyectos.filter(p => p.estado === 'en_planificacion')
  const proximosVencer = activos.filter(p => {
    const dias = diasParaVencer(p.fecha_entrega_plan)
    return dias !== null && dias <= 30 && dias >= 0
  })

  function limpiarFiltros() {
    filtrosRef.current = { estado: '', q: '', pm: '', cliente: '', ingeniero: '' }
    setFiltroEstado('')
    setFiltroPM('')
    setFiltroIngeniero('')
    setFiltroInterno(false)
    buscar()
  }

  const handleBusquedaChange = useCallback((q) => {
    filtrosRef.current.q = q
    buscar()
  }, [buscar])

  const handleClienteChange = useCallback((c) => {
    filtrosRef.current.cliente = c
    buscar()
  }, [buscar])

  const handleLimpiarFiltros = useCallback(() => {
    limpiarFiltros()
  }, [buscar]) // eslint-disable-line react-hooks/exhaustive-deps

  const hayFiltros = filtroEstado || filtroPM || filtroIngeniero || filtroInterno
  const filtrados = proyectos.filter(p => !filtroInterno || p.es_interno === 1)

  if (cargandoInicial) return (
    <div className="flex items-center justify-center py-16 text-[#5f6b75] text-sm">Cargando...</div>
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-[#2c3e50]">Proyectos</h2>
        {puedeGestionar && (
          <button
            onClick={() => navigate('/proyectos/nuevo')}
            className="text-sm bg-[#4E738A] text-white px-4 py-2 rounded-lg hover:bg-[#3d5c70] transition-colors"
          >
            + Nuevo proyecto
          </button>
        )}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Activos', valor: activos.length, color: 'bg-[#4E738A]' },
          { label: 'En ejecución', valor: enEjecucion.length, color: 'bg-green-600' },
          { label: 'En planificación', valor: enPlanificacion.length, color: 'bg-blue-600' },
          { label: 'Próximos a vencer', valor: proximosVencer.length, color: 'bg-orange-500' },
        ].map(k => (
          <div key={k.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-2xl font-bold text-white ${k.color} inline-block px-3 py-1 rounded-lg`}>
              {k.valor}
            </p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-2 flex-wrap">
        <FiltrosBusqueda
          onBusquedaChange={handleBusquedaChange}
          onClienteChange={handleClienteChange}
          onLimpiar={handleLimpiarFiltros}
          hayFiltros={hayFiltros}
        />
        <select
          value={filtroEstado}
          onChange={handleEstadoChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="flex gap-3 mb-4 flex-wrap">
        <select
          value={filtroPM}
          onChange={handlePMChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 flex-1 min-w-40"
        >
          <option value="">PM — todos</option>
          {listaPMs.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <select
          value={filtroIngeniero}
          onChange={handleIngenieroChange}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 flex-1 min-w-40"
        >
          <option value="">Ingeniero a cargo — todos</option>
          {listaIngenieros.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 whitespace-nowrap">
          <input
            type="checkbox"
            checked={filtroInterno}
            onChange={e => setFiltroInterno(e.target.checked)}
            className="rounded border-gray-300 accent-amber-600"
          />
          Solo internos
        </label>
      </div>

      {/* Tabla */}
      {filtrados.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-[#5f6b75] text-sm">
          No hay proyectos con los filtros aplicados.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Código</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Nombre</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">PM</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Entrega</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtrados.map(p => {
                const dias = diasParaVencer(p.fecha_entrega_plan)
                const urgente = dias !== null && dias <= 30 && dias >= 0 && !['cerrado','cancelado'].includes(p.estado)
                return (
                  <tr
                    key={p.id}
                    onClick={() => navigate(`/proyectos/${p.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.codigo}</td>
                    <td className="px-4 py-3 font-medium text-[#2c3e50]">
                      <span>{p.nombre}</span>
                      {p.es_interno === 1 && (
                        <span className="ml-2 inline-flex items-center bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
                          Interno
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.cliente_nombre || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{p.pm_nombre || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_ESTILOS[p.estado] || 'bg-gray-100 text-gray-600'}`}>
                        {ESTADO_LABEL[p.estado] || p.estado}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${urgente ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
                      {formatFecha(p.fecha_entrega_plan)}
                      {urgente && <span className="ml-1">({dias}d)</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
