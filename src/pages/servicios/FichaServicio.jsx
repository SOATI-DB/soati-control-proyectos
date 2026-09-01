import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'

const CP_API = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'

export default function FichaServicio() {
  const { codigo } = useParams()
  const navigate   = useNavigate()
  const { token, tienePermiso, esAdmin } = useAuth()
  const puedeGestionar = esAdmin || tienePermiso('control-proyectos', 'gestionar_servicios')

  const [contrato, setContrato] = useState(null)
  const [tareas, setTareas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tabActivo, setTabActivo] = useState('general')

  const [modalTarea, setModalTarea] = useState(false)
  const [formTarea, setFormTarea]   = useState({
    titulo: '', descripcion: '', asignado_id: '', asignado_nombre: '',
    fecha: '', hora_inicio: '', hora_fin: ''
  })
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => { cargar() }, [codigo])

  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos/${codigo}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!r.ok) { navigate('/servicios'); return }
      const data = await r.json()
      setContrato(data)
      setTareas(data.tareas ?? [])
    } catch { navigate('/servicios') }
    finally { setLoading(false) }
  }

  async function cargarUsuarios() {
    try {
      const SHELL_API = import.meta.env.VITE_SHELL_API_URL ?? 'http://localhost:3001'
      const r = await fetch(`${SHELL_API}/api/users/recursos`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await r.json()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch { setUsuarios([]) }
  }

  async function guardarTarea() {
    if (!formTarea.titulo) return
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos/${codigo}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...formTarea,
          hora_inicio: formTarea.hora_inicio || null,
          hora_fin:    formTarea.hora_fin    || null,
        })
      })
      if (r.ok) {
        setModalTarea(false)
        setFormTarea({ titulo: '', descripcion: '', asignado_id: '', asignado_nombre: '', fecha: '', hora_inicio: '', hora_fin: '' })
        cargar()
      }
    } catch (e) { console.error(e) }
  }

  async function cambiarEstadoTarea(tareaId, nuevoEstado) {
    try {
      await fetch(`${CP_API}/api/servicios/tareas/${tareaId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      cargar()
    } catch (e) { console.error(e) }
  }

  if (loading) return <div className="text-center text-[#9aa1a9] py-12">Cargando...</div>
  if (!contrato) return null

  const mostrarSaldo = contrato.cantidad_contratada && contrato.modalidad !== 'bajo_demanda'
  const pctSaldo = mostrarSaldo
    ? Math.min(100, Math.round((contrato.cantidad_disponible / contrato.cantidad_contratada) * 100))
    : null

  return (
    <div>
      <div className="flex items-center gap-2 text-sm text-[#9aa1a9] mb-4">
        <button onClick={() => navigate('/servicios')} className="hover:text-[#4E738A]">Servicios</button>
        <span>/</span>
        <span className="text-[#2C3A43] font-medium">{contrato.codigo}</span>
      </div>

      <div className="bg-white rounded-xl border border-[#E8EAEC] p-6 mb-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold text-[#2C3A43]">{contrato.nombre}</h1>
            <p className="text-sm text-[#9aa1a9] font-mono mt-0.5">{contrato.codigo}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            contrato.estado === 'activo'  ? 'bg-green-100 text-green-700' :
            contrato.estado === 'vencido' ? 'bg-orange-100 text-orange-700' :
            contrato.estado === 'cerrado' ? 'bg-gray-100 text-gray-600' :
                                            'bg-yellow-100 text-yellow-700'
          }`}>{contrato.estado}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 text-sm">
          <div><span className="text-[#9aa1a9]">Cliente</span><p className="text-[#2C3A43] font-medium mt-0.5">{contrato.cliente_nombre}</p></div>
          <div><span className="text-[#9aa1a9]">Tipo</span><p className="text-[#2C3A43] font-medium mt-0.5">{contrato.tipo}{contrato.modalidad ? ` · ${contrato.modalidad}` : ''}</p></div>
          <div><span className="text-[#9aa1a9]">Periodo</span><p className="text-[#2C3A43] font-medium mt-0.5">{contrato.periodo}</p></div>
          <div><span className="text-[#9aa1a9]">Origen</span><p className="text-[#2C3A43] font-medium mt-0.5 capitalize">{contrato.origen}</p></div>
        </div>

        {mostrarSaldo && (
          <div className="mt-5">
            <div className="flex justify-between text-sm mb-1.5">
              <span className="text-[#5f6b75]">
                {contrato.tipo === 'contrato_visitas' ? 'Visitas disponibles' : 'Horas disponibles'}
              </span>
              <span className="text-[#2C3A43] font-medium">
                {contrato.cantidad_disponible} / {contrato.cantidad_contratada}
                {contrato.tipo === 'contrato_visitas' ? ' visitas' : 'h'}
              </span>
            </div>
            <div className="h-2 bg-[#E8EAEC] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctSaldo > 20 ? 'bg-[#4E738A]' : 'bg-[#d9534f]'}`}
                style={{ width: `${pctSaldo}%` }}
              />
            </div>
          </div>
        )}

        {contrato.modalidad === 'bajo_demanda' && (
          <div className="mt-4 p-3 bg-[#F4F5F6] rounded-lg text-sm text-[#5f6b75]">
            Contrato bajo demanda — <strong className="text-[#2C3A43]">{contrato.total_consumido ?? 0}h</strong> consumidas hasta la fecha
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-[#E8EAEC] overflow-hidden">
        <nav className="flex border-b border-[#E8EAEC]">
          {['general', 'tareas', 'consumo'].map(tab => (
            <button
              key={tab}
              onClick={() => setTabActivo(tab)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tabActivo === tab
                  ? 'border-[#4E738A] text-[#4E738A]'
                  : 'border-transparent text-[#5f6b75] hover:text-[#2C3A43]'
              }`}
            >
              {tab === 'general' ? 'General' : tab === 'tareas' ? 'Tareas' : 'Consumo'}
            </button>
          ))}
        </nav>

        <div className="p-5">
          {tabActivo === 'general' && (
            <div className="text-sm space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div><span className="text-[#9aa1a9]">Fecha inicio</span><p className="text-[#2C3A43] mt-0.5">{contrato.fecha_inicio ?? '—'}</p></div>
                <div><span className="text-[#9aa1a9]">Fecha fin</span><p className="text-[#2C3A43] mt-0.5">{contrato.fecha_fin ?? '—'}</p></div>
              </div>
              {contrato.notas && (
                <div><span className="text-[#9aa1a9]">Notas</span><p className="text-[#2C3A43] mt-0.5 whitespace-pre-wrap">{contrato.notas}</p></div>
              )}
            </div>
          )}

          {tabActivo === 'tareas' && (
            <div>
              {puedeGestionar && (
                <div className="flex justify-end mb-4">
                  <button
                    onClick={() => { cargarUsuarios(); setModalTarea(true) }}
                    className="bg-[#4E738A] text-white px-3 py-1.5 rounded-lg text-sm hover:bg-[#3a5a6e] transition-colors"
                  >
                    + Nueva tarea
                  </button>
                </div>
              )}

              {tareas.length === 0 ? (
                <p className="text-center text-[#9aa1a9] py-8">Sin tareas registradas</p>
              ) : (
                <div className="space-y-2">
                  {tareas.map(t => (
                    <div key={t.id} className="flex items-start gap-3 p-3 border border-[#E8EAEC] rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-[#2C3A43] text-sm">{t.titulo}</p>
                        {t.asignado_nombre && <p className="text-xs text-[#9aa1a9] mt-0.5">{t.asignado_nombre}</p>}
                        {t.fecha && (
                          <p className="text-xs text-[#9aa1a9] mt-0.5">
                            {t.fecha}{t.hora_inicio ? ` · ${t.hora_inicio}${t.hora_fin ? ` - ${t.hora_fin}` : ''}` : ''}
                          </p>
                        )}
                      </div>
                      <select
                        value={t.estado}
                        onChange={e => cambiarEstadoTarea(t.id, e.target.value)}
                        disabled={!puedeGestionar}
                        className="text-xs border border-[#E8EAEC] rounded px-2 py-1 bg-white"
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_progreso">En progreso</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tabActivo === 'consumo' && (
            <div>
              {(contrato.ajustes ?? []).length === 0 ? (
                <p className="text-center text-[#9aa1a9] py-8">Sin registros de consumo</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[#5f6b75] border-b border-[#E8EAEC]">
                      <th className="pb-2 pr-4">Fecha</th>
                      <th className="pb-2 pr-4">Tipo</th>
                      <th className="pb-2 pr-4">Cantidad</th>
                      <th className="pb-2">Nota / Origen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(contrato.ajustes ?? []).map(a => (
                      <tr key={a.id} className="border-t border-[#E8EAEC]">
                        <td className="py-2 pr-4 text-[#5f6b75]">{a.created_at?.slice(0, 10)}</td>
                        <td className="py-2 pr-4 text-[#5f6b75] capitalize">
                          {a.tipo_ajuste.replace(/_/g, ' ')}
                          {a.excede_saldo ? <span className="ml-1 text-xs text-[#d9534f]">⚠ excede</span> : ''}
                        </td>
                        <td className="py-2 pr-4 text-[#2C3A43] font-medium">
                          {a.cantidad != null ? `${a.cantidad > 0 ? '+' : ''}${a.cantidad}h` : a.visitas ? `${a.visitas} visita(s)` : '—'}
                        </td>
                        <td className="py-2 text-[#5f6b75]">{a.nota ?? a.origen_id ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>

      {modalTarea && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-[#2C3A43] mb-4">Nueva tarea</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-[#5f6b75]">Título *</label>
                <input
                  value={formTarea.titulo}
                  onChange={e => setFormTarea(f => ({ ...f, titulo: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-[#5f6b75]">Asignar a</label>
                <select
                  value={formTarea.asignado_id}
                  onChange={e => {
                    const u = usuarios.find(u => u.id === e.target.value)
                    setFormTarea(f => ({ ...f, asignado_id: e.target.value, asignado_nombre: u?.nombre ?? '' }))
                  }}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm text-[#5f6b75]">Fecha</label>
                <input
                  type="date" lang="es-CR"
                  value={formTarea.fecha}
                  onChange={e => setFormTarea(f => ({ ...f, fecha: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Hora inicio (opcional)</label>
                  <input
                    type="time"
                    value={formTarea.hora_inicio}
                    onChange={e => setFormTarea(f => ({ ...f, hora_inicio: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Hora fin (opcional)</label>
                  <input
                    type="time"
                    value={formTarea.hora_fin}
                    onChange={e => setFormTarea(f => ({ ...f, hora_fin: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-[#5f6b75]">Descripción</label>
                <textarea
                  value={formTarea.descripcion}
                  onChange={e => setFormTarea(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalTarea(false)} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">Cancelar</button>
              <button onClick={guardarTarea} className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e]">Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
