import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getProyectos } from '../../services/api'
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

export default function ListaProyectos() {
  const navigate = useNavigate()
  const { user, tienePermiso } = useAuth()
  const [proyectos, setProyectos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const puedeGestionar = user?.rol === 'admin' || tienePermiso('control-proyectos', 'gestionar_proyecto')

  useEffect(() => {
    getProyectos()
      .then(data => { setProyectos(Array.isArray(data) ? data : []); setCargando(false) })
      .catch(() => setCargando(false))
  }, [])

  const activos = proyectos.filter(p => !['cerrado', 'cancelado'].includes(p.estado))
  const enEjecucion = proyectos.filter(p => p.estado === 'en_ejecucion')
  const enPlanificacion = proyectos.filter(p => p.estado === 'en_planificacion')
  const proximosVencer = activos.filter(p => {
    const dias = diasParaVencer(p.fecha_entrega_plan)
    return dias !== null && dias <= 30 && dias >= 0
  })

  const filtrados = proyectos.filter(p => {
    if (filtroEstado && p.estado !== filtroEstado) return false
    if (busqueda) {
      const q = busqueda.toLowerCase()
      return p.nombre.toLowerCase().includes(q) || p.codigo.toLowerCase().includes(q)
    }
    return true
  })

  if (cargando) return (
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
      <div className="flex gap-3 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="Buscar por nombre o código..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 flex-1 min-w-48"
        />
        <select
          value={filtroEstado}
          onChange={e => setFiltroEstado(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30"
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
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
                    <td className="px-4 py-3 font-medium text-[#2c3e50]">{p.nombre}</td>
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
