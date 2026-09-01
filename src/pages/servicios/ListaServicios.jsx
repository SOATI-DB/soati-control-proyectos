import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

const CP_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'

const TIPO_LABEL = {
  contrato_horas:   'Horas',
  contrato_visitas: 'Visitas',
  ejecucion:        'Ejecución',
}

export default function ListaServicios() {
  const { token, tienePermiso, esAdmin } = useAuth()
  const navigate = useNavigate()
  const puedeGestionar = esAdmin || tienePermiso('control-proyectos', 'gestionar_servicios')

  const [contratos, setContratos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [filtros, setFiltros]     = useState({ estado: '', tipo: '', cliente: '' })

  useEffect(() => { cargar() }, [filtros])

  async function cargar() {
    setLoading(true)
    try {
      const params = new URLSearchParams(
        Object.fromEntries(Object.entries(filtros).filter(([, v]) => v))
      )
      const r = await fetch(`${CP_API}/api/servicios/contratos?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await r.json()
      setContratos(Array.isArray(data) ? data : [])
    } catch { setContratos([]) }
    finally { setLoading(false) }
  }

  function saldoLabel(c) {
    if (c.tipo === 'ejecucion') return '—'
    if (c.tipo === 'contrato_horas' && c.modalidad === 'bajo_demanda') {
      return `${c.total_consumido ?? 0}h consumidas`
    }
    if (c.tipo === 'contrato_visitas') {
      return `${c.cantidad_disponible ?? 0} / ${c.cantidad_contratada ?? 0} visitas`
    }
    return `${c.cantidad_disponible ?? 0}h / ${c.cantidad_contratada ?? 0}h`
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-semibold text-[#2C3A43]">Contratos de Servicio</h1>
        {puedeGestionar && (
          <button
            onClick={() => navigate('/servicios/nuevo')}
            className="bg-[#4E738A] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#3a5a6e] transition-colors"
          >
            + Nuevo contrato
          </button>
        )}
      </div>

      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtros.estado}
          onChange={e => setFiltros(f => ({ ...f, estado: e.target.value }))}
          className="border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="pausado">Pausado</option>
          <option value="vencido">Vencido</option>
          <option value="cerrado">Cerrado</option>
        </select>
        <select
          value={filtros.tipo}
          onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
          className="border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm bg-white"
        >
          <option value="">Todos los tipos</option>
          <option value="contrato_horas">Horas</option>
          <option value="contrato_visitas">Visitas</option>
          <option value="ejecucion">Ejecución</option>
        </select>
        <input
          placeholder="Filtrar por cliente..."
          value={filtros.cliente}
          onChange={e => setFiltros(f => ({ ...f, cliente: e.target.value }))}
          className="border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm flex-1 min-w-[180px]"
        />
      </div>

      {loading ? (
        <div className="text-center text-[#9aa1a9] py-12">Cargando...</div>
      ) : contratos.length === 0 ? (
        <div className="text-center text-[#9aa1a9] py-12">No hay contratos registrados</div>
      ) : (
        <div className="bg-white rounded-xl border border-[#E8EAEC] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F4F5F6]">
              <tr className="text-left text-[#5f6b75]">
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Nombre</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Tipo</th>
                <th className="px-4 py-3">Saldo</th>
                <th className="px-4 py-3">Tareas</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody>
              {contratos.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/servicios/${c.codigo}`)}
                  className="border-t border-[#E8EAEC] hover:bg-[#F4F5F6] cursor-pointer"
                >
                  <td className="px-4 py-3 font-mono text-xs text-[#4E738A] whitespace-nowrap">{c.codigo}</td>
                  <td className="px-4 py-3 font-medium text-[#2C3A43]">{c.nombre}</td>
                  <td className="px-4 py-3 text-[#5f6b75]">{c.cliente_nombre}</td>
                  <td className="px-4 py-3 text-[#5f6b75]">
                    {TIPO_LABEL[c.tipo] ?? c.tipo}
                    {c.modalidad && <span className="ml-1 text-xs text-[#9aa1a9]">({c.modalidad})</span>}
                  </td>
                  <td className="px-4 py-3 text-[#5f6b75] whitespace-nowrap">{saldoLabel(c)}</td>
                  <td className="px-4 py-3 text-[#5f6b75]">{c.total_tareas ?? 0}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      c.estado === 'activo'  ? 'bg-green-100 text-green-700' :
                      c.estado === 'vencido' ? 'bg-orange-100 text-orange-700' :
                      c.estado === 'cerrado' ? 'bg-gray-100 text-gray-600' :
                                               'bg-yellow-100 text-yellow-700'
                    }`}>{c.estado}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
