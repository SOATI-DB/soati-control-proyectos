import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { formatFecha, formatFechaHora } from '../../utils/fecha'
import {
  getProyecto, actualizarFicha, getCostosProyecto,
  crearFase, actualizarFase, eliminarFase,
  crearTarea, actualizarTarea, eliminarTarea,
  crearContacto, actualizarContacto, eliminarContacto,
  crearHito, actualizarHito, eliminarHito,
  subirAdjuntoProyecto, descargarAdjuntoProyecto, eliminarAdjuntoProyecto,
  getIngenieros,
  getRecursosDisponibles, verificarDisponibilidad, asignarRecurso, eliminarRecurso, getRecursosTarea,
} from '../../services/api'
import GanttProyecto from './GanttProyecto'

const TABS = ['General', 'Fases', 'Tareas', 'Gantt', 'Adjuntos', 'Contactos', 'Facturación', 'Costos']

const ESTADO_PROYECTO = [
  'en_planificacion', 'en_ejecucion', 'en_pausa', 'en_cierre', 'cerrado', 'cancelado'
]
const ESTADO_LABEL_P = {
  en_planificacion: 'Planificación', en_ejecucion: 'Ejecución', en_pausa: 'En pausa',
  en_cierre: 'En cierre', cerrado: 'Cerrado', cancelado: 'Cancelado',
}

const PRIORIDAD_ESTILOS = {
  alta:  'bg-red-100 text-red-700',
  media: 'bg-yellow-100 text-yellow-700',
  baja:  'bg-gray-100 text-gray-500',
}

export default function FichaProyecto() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tienePermiso } = useAuth()
  const puedeGestionar = tienePermiso('control-proyectos', 'gestionar_proyecto')

  const [proyecto, setProyecto] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [tab, setTab] = useState('General')
  const [ingenieros, setIngenieros] = useState([])

  // General edit
  const [editandoFicha, setEditandoFicha] = useState(false)
  const [fichaForm, setFichaForm] = useState({})
  const [guardandoFicha, setGuardandoFicha] = useState(false)

  // Costos
  const [costos, setCostos] = useState(null)
  const [cargandoCostos, setCargandoCostos] = useState(false)
  const [errorCostos, setErrorCostos] = useState(null)

  // Modal genérico
  const [modal, setModal] = useState(null)
  const [modalForm, setModalForm] = useState({})
  const [guardandoModal, setGuardandoModal] = useState(false)

  // Recursos
  const [recursosDisponibles, setRecursosDisponibles] = useState([])
  const [disponibilidad, setDisponibilidad] = useState(null)
  const [verificandoDisp, setVerificandoDisp] = useState(false)
  const [recursosEnTarea, setRecursosEnTarea] = useState([])
  const [subFormVisible, setSubFormVisible] = useState(false)
  const [subFormData, setSubFormData] = useState({})
  const [subDispData, setSubDispData] = useState(null)
  const [subVerificando, setSubVerificando] = useState(false)
  const [pendingRecursos, setPendingRecursos] = useState([])

  function cargar() {
    getProyecto(id)
      .then(data => { setProyecto(data); setCargando(false) })
      .catch(() => setCargando(false))
  }

  useEffect(() => {
    cargar()
    getIngenieros().then(setIngenieros)
    getRecursosDisponibles().then(data => setRecursosDisponibles(Array.isArray(data) ? data : []))
  }, [id])

  async function verificarRecurso(form) {
    const { tipo_recurso, recurso_id, fecha_inicio_recurso, fecha_fin_recurso } = form
    if (!recurso_id || !fecha_inicio_recurso || !fecha_fin_recurso) {
      setDisponibilidad(null)
      return
    }
    setVerificandoDisp(true)
    const resultado = await verificarDisponibilidad(recurso_id, fecha_inicio_recurso, fecha_fin_recurso, form.id || null)
    setDisponibilidad(resultado)
    setVerificandoDisp(false)
  }

  useEffect(() => {
    if (tab === 'Costos' && !costos && !cargandoCostos) {
      setCargandoCostos(true)
      getCostosProyecto(id)
        .then(data => { setCostos(data); setCargandoCostos(false) })
        .catch(e => { setErrorCostos(e.message || 'Error'); setCargandoCostos(false) })
    }
  }, [tab])

  function iniciarEditFicha() {
    setFichaForm({
      nombre:                proyecto.nombre || '',
      pm_nombre:             proyecto.pm_nombre || '',
      ingeniero_cargo_id:    proyecto.ingeniero_cargo_id != null ? String(proyecto.ingeniero_cargo_id) : '',
      ingeniero_cargo_nombre: proyecto.ingeniero_cargo_nombre || '',
      requiere_diseno:       proyecto.requiere_diseno || 0,
      requiere_planos:       proyecto.requiere_planos || 0,
      categoria:             proyecto.categoria || '',
      estado:                proyecto.estado || '',
      presupuesto_usd:       proyecto.presupuesto_usd || proyecto.presupuesto_bruto || '',
      descripcion:           proyecto.descripcion || '',
      fecha_inicio_plan:     proyecto.fecha_inicio_plan?.slice(0, 10) || '',
      fecha_entrega_plan:    proyecto.fecha_entrega_plan?.slice(0, 10) || '',
      fecha_inicio_real:     proyecto.fecha_inicio_real?.slice(0, 10) || '',
      fecha_entrega_real:    proyecto.fecha_entrega_real?.slice(0, 10) || '',
    })
    setEditandoFicha(true)
  }

  async function guardarFicha() {
    setGuardandoFicha(true)
    const data = {
      ...fichaForm,
      requiere_diseno: fichaForm.requiere_diseno ? 1 : 0,
      requiere_planos: fichaForm.requiere_planos ? 1 : 0,
    }
    const ing = ingenieros.find(u => String(u.id) === String(fichaForm.ingeniero_cargo_id))
    if (ing) data.ingeniero_cargo_nombre = ing.nombre
    await actualizarFicha(id, data)
    await cargar()
    setEditandoFicha(false)
    setGuardandoFicha(false)
  }

  function abrirModal(tipo, item = null) {
    setModal({ tipo, item })
    setModalForm(item ? { ...item } : {})
    setDisponibilidad(null)
    setRecursosEnTarea([])
    setSubFormVisible(false)
    setSubFormData({})
    setSubDispData(null)
    setPendingRecursos([])
    if (tipo === 'tarea' && item?.id) {
      getRecursosTarea(item.id)
        .then(data => setRecursosEnTarea(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }

  async function verificarSubForm(form) {
    const { recurso_id, fecha_inicio, fecha_fin } = form
    if (!recurso_id || !fecha_inicio || !fecha_fin) { setSubDispData(null); return }
    setSubVerificando(true)
    const r = await verificarDisponibilidad(recurso_id, fecha_inicio, fecha_fin, modal?.item?.id || null)
    setSubDispData(r)
    setSubVerificando(false)
  }

  async function guardarSubFormRecurso() {
    const { tipo_recurso, recurso_id, fecha_inicio, fecha_fin, dedicacion_pct, forzar, conflicto_nota } = subFormData
    if (!recurso_id || !tipo_recurso || !fecha_inicio || !fecha_fin) return
    const recurso = recursosDisponibles.find(r => String(r.id) === String(recurso_id))
    const payload = {
      proyecto_id:    parseInt(id),
      tarea_id:       modal.item?.id ?? null,
      usuario_id:     String(recurso_id),
      usuario_nombre: recurso?.nombre ?? '',
      tipo_recurso,
      fecha_inicio, fecha_fin,
      dedicacion_pct: dedicacion_pct || 100,
      forzado:        forzar ? 1 : 0,
      conflicto_nota: conflicto_nota ?? null,
    }
    if (modal.item?.id) {
      const result = await asignarRecurso(payload)
      if (!result?.error) setRecursosEnTarea(list => [...list, result])
    } else {
      setPendingRecursos(list => [...list, payload])
      setRecursosEnTarea(list => [...list, { ...payload, id: `pending_${Date.now()}` }])
    }
    setSubFormVisible(false)
    setSubFormData({})
    setSubDispData(null)
  }

  async function confirmarModal() {
    setGuardandoModal(true)
    try {
      const { tipo, item } = modal
      if (tipo === 'fase') {
        item ? await actualizarFase(item.id, modalForm) : await crearFase(id, modalForm)
      } else if (tipo === 'tarea') {
        const tarea = item
          ? await actualizarTarea(item.id, modalForm)
          : await crearTarea(id, modalForm)
        for (const r of pendingRecursos) {
          await asignarRecurso({ ...r, tarea_id: tarea?.id ?? null })
        }
      } else if (tipo === 'contacto') {
        item ? await actualizarContacto(item.id, modalForm) : await crearContacto(id, modalForm)
      } else if (tipo === 'hito') {
        item ? await actualizarHito(item.id, modalForm) : await crearHito(id, modalForm)
      }
      await cargar()
      setModal(null)
    } catch (e) {
      console.error(e)
    } finally {
      setGuardandoModal(false)
    }
  }

  async function eliminar(tipo, itemId) {
    if (tipo === 'fase') await eliminarFase(itemId)
    else if (tipo === 'tarea') await eliminarTarea(itemId)
    else if (tipo === 'contacto') await eliminarContacto(itemId)
    else if (tipo === 'hito') await eliminarHito(itemId)
    else if (tipo === 'adjunto') await eliminarAdjuntoProyecto(itemId)
    await cargar()
  }

  if (cargando) return <div className="flex items-center justify-center py-16 text-[#5f6b75] text-sm">Cargando...</div>
  if (!proyecto || proyecto.error) return <div className="text-center py-16 text-red-500 text-sm">Proyecto no encontrado.</div>

  const inp = (k) => `w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30`
  const mf = (k, v) => setModalForm(f => ({ ...f, [k]: v }))

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => navigate('/proyectos')} className="text-[#4E738A] hover:underline text-sm">Proyectos</button>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600 font-mono">{proyecto.codigo}</span>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-[#2c3e50]">{proyecto.nombre}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{proyecto.cliente_nombre || '—'} · {proyecto.lugar_geografico || '—'}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 flex-wrap">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-2.5 text-sm font-medium rounded-lg border transition-colors ${tab === t
              ? 'bg-[#4E738A] text-white border-[#4E738A]'
              : 'bg-white text-gray-600 border-gray-200 hover:border-[#4E738A]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* TAB GENERAL */}
      {tab === 'General' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Ficha del proyecto</h3>
            {puedeGestionar && !editandoFicha && (
              <button onClick={iniciarEditFicha} className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                Editar
              </button>
            )}
          </div>

          {editandoFicha ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre del proyecto *</label>
                <input value={fichaForm.nombre} onChange={e => setFichaForm(f => ({ ...f, nombre: e.target.value }))} className={inp()} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select value={fichaForm.estado} onChange={e => setFichaForm(f => ({ ...f, estado: e.target.value }))} className={inp()}>
                    {ESTADO_PROYECTO.map(e => <option key={e} value={e}>{ESTADO_LABEL_P[e]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Ingeniero a cargo</label>
                  <select
                    value={fichaForm.ingeniero_cargo_id}
                    onChange={e => setFichaForm(f => ({ ...f, ingeniero_cargo_id: e.target.value }))}
                    className={inp()}
                  >
                    <option value="">— Sin asignar —</option>
                    {ingenieros.map(u => <option key={u.id} value={String(u.id)}>{u.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Presupuesto estimado (USD)</label>
                  <input type="number" value={fichaForm.presupuesto_usd} onChange={e => setFichaForm(f => ({ ...f, presupuesto_usd: e.target.value }))} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Categoría</label>
                  <input value={fichaForm.categoria} onChange={e => setFichaForm(f => ({ ...f, categoria: e.target.value }))} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha inicio plan</label>
                  <input type="date" value={fichaForm.fecha_inicio_plan} onChange={e => setFichaForm(f => ({ ...f, fecha_inicio_plan: e.target.value }))} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha entrega plan</label>
                  <input type="date" value={fichaForm.fecha_entrega_plan} onChange={e => setFichaForm(f => ({ ...f, fecha_entrega_plan: e.target.value }))} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha inicio real</label>
                  <input type="date" value={fichaForm.fecha_inicio_real} onChange={e => setFichaForm(f => ({ ...f, fecha_inicio_real: e.target.value }))} className={inp()} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Fecha entrega real</label>
                  <input type="date" value={fichaForm.fecha_entrega_real} onChange={e => setFichaForm(f => ({ ...f, fecha_entrega_real: e.target.value }))} className={inp()} />
                </div>
              </div>
              <div className="flex gap-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!fichaForm.requiere_diseno} onChange={e => setFichaForm(f => ({ ...f, requiere_diseno: e.target.checked ? 1 : 0 }))} className="accent-[#4E738A]" />
                  Requiere diseño gráfico
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={!!fichaForm.requiere_planos} onChange={e => setFichaForm(f => ({ ...f, requiere_planos: e.target.checked ? 1 : 0 }))} className="accent-[#4E738A]" />
                  Requiere planos
                </label>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Descripción / alcance</label>
                <textarea value={fichaForm.descripcion} onChange={e => setFichaForm(f => ({ ...f, descripcion: e.target.value }))} rows={4} className={inp()} />
              </div>
              <div className="flex gap-2">
                <button onClick={guardarFicha} disabled={guardandoFicha} className="px-4 py-2 text-sm bg-[#4E738A] text-white rounded-lg hover:bg-[#3d5c70] disabled:opacity-40">
                  {guardandoFicha ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditandoFicha(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Código', proyecto.codigo],
                ['Estado', ESTADO_LABEL_P[proyecto.estado] || proyecto.estado],
                ['Cliente', proyecto.cliente_nombre],
                ['Código cliente', proyecto.cliente_codigo],
                ['Tipo de contratación', proyecto.tipo_contratacion?.replace(/_/g, ' ')],
                ['Lugar geográfico', proyecto.lugar_geografico],
                ['Ejecutivo ventas', proyecto.ejecutivo_ventas_nombre],
                ['PM', proyecto.pm_nombre],
                ['Ingeniero a cargo', proyecto.ingeniero_cargo_nombre],
                ['Categoría', proyecto.categoria],
                ['Presupuesto USD', proyecto.presupuesto_usd ? `$${parseFloat(proyecto.presupuesto_usd).toLocaleString('es-CR')}` : null],
                ['Requiere diseño', proyecto.requiere_diseno ? 'Sí' : 'No'],
                ['Requiere planos', proyecto.requiere_planos ? 'Sí' : 'No'],
                ['Fecha inicio plan', formatFecha(proyecto.fecha_inicio_plan)],
                ['Fecha entrega plan', formatFecha(proyecto.fecha_entrega_plan)],
                ['Fecha inicio real', formatFecha(proyecto.fecha_inicio_real)],
                ['Fecha entrega real', formatFecha(proyecto.fecha_entrega_real)],
              ].map(([label, valor]) => (
                <div key={label}>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
                  <p className="text-[#2c3e50] mt-0.5">{valor || '—'}</p>
                </div>
              ))}
              {proyecto.descripcion && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Descripción</p>
                  <p className="text-[#2c3e50] mt-0.5 whitespace-pre-wrap">{proyecto.descripcion}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB FASES */}
      {tab === 'Fases' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Fases ({proyecto.fases?.length || 0})</h3>
            {puedeGestionar && (
              <button onClick={() => abrirModal('fase')} className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                + Agregar fase
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(proyecto.fases || []).map(f => (
              <div key={f.id} className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-[#2c3e50]">{f.nombre}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatFecha(f.fecha_inicio_plan)} — {formatFecha(f.fecha_fin_plan)} · {f.estado}
                    {f.responsable_nombre && ` · ${f.responsable_nombre}`}
                  </p>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('fase', f)} className="text-xs text-gray-400 hover:text-[#4E738A]">Editar</button>
                    <button onClick={() => eliminar('fase', f.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
            {!proyecto.fases?.length && <p className="text-sm text-gray-400 text-center py-6">Sin fases</p>}
          </div>
        </div>
      )}

      {/* TAB TAREAS */}
      {tab === 'Tareas' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Tareas ({proyecto.tareas?.length || 0})</h3>
            {puedeGestionar && (
              <button onClick={() => abrirModal('tarea')} className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                + Agregar tarea
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(proyecto.tareas || []).map(t => (
              <div key={t.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#2c3e50]">{t.titulo}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORIDAD_ESTILOS[t.prioridad] || 'bg-gray-100 text-gray-500'}`}>{t.prioridad}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.estado} {t.asignado_nombre && `· ${t.asignado_nombre}`} {t.fecha_limite && `· ${formatFecha(t.fecha_limite)}`}
                  </p>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('tarea', t)} className="text-xs text-gray-400 hover:text-[#4E738A]">Editar</button>
                    <button onClick={() => eliminar('tarea', t.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
            {!proyecto.tareas?.length && <p className="text-sm text-gray-400 text-center py-6">Sin tareas</p>}
          </div>
        </div>
      )}

      {/* TAB GANTT */}
      {tab === 'Gantt' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-[#2c3e50] mb-4">Gantt del proyecto</h3>
          <GanttProyecto proyecto={proyecto} />
        </div>
      )}

      {/* TAB ADJUNTOS */}
      {tab === 'Adjuntos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Adjuntos ({proyecto.adjuntos?.length || 0})</h3>
            {puedeGestionar && (
              <label className="cursor-pointer text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                + Subir adjunto
                <input type="file" className="hidden" onChange={async e => {
                  if (!e.target.files[0]) return
                  const fd = new FormData()
                  fd.append('archivo', e.target.files[0])
                  fd.append('categoria', 'otro')
                  await subirAdjuntoProyecto(id, fd)
                  await cargar()
                }} />
              </label>
            )}
          </div>
          <div className="space-y-2">
            {(proyecto.adjuntos || []).map(a => (
              <div key={a.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-[#2c3e50]">{a.nombre_original}</p>
                  <p className="text-xs text-gray-400">{a.categoria} · {formatFechaHora(a.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => descargarAdjuntoProyecto(a.id, a.nombre_original)} className="text-xs text-[#4E738A] hover:text-[#3d5c70]">Descargar</button>
                  {puedeGestionar && <button onClick={() => eliminar('adjunto', a.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>}
                </div>
              </div>
            ))}
            {!proyecto.adjuntos?.length && <p className="text-sm text-gray-400 text-center py-6">Sin adjuntos</p>}
          </div>
        </div>
      )}

      {/* TAB CONTACTOS */}
      {tab === 'Contactos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Contactos ({proyecto.contactos?.length || 0})</h3>
            {puedeGestionar && (
              <button onClick={() => abrirModal('contacto')} className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                + Agregar contacto
              </button>
            )}
          </div>
          <div className="space-y-3">
            {(proyecto.contactos || []).map(c => (
              <div key={c.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-[#2c3e50]">{c.nombre}</p>
                    <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{c.rol}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{[c.telefono, c.correo].filter(Boolean).join(' · ')}</p>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('contacto', c)} className="text-xs text-gray-400 hover:text-[#4E738A]">Editar</button>
                    <button onClick={() => eliminar('contacto', c.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
            {!proyecto.contactos?.length && <p className="text-sm text-gray-400 text-center py-6">Sin contactos</p>}
          </div>
        </div>
      )}

      {/* TAB FACTURACIÓN */}
      {tab === 'Facturación' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-[#2c3e50]">Cronograma de facturación ({proyecto.facturacion?.length || 0})</h3>
            {puedeGestionar && (
              <button onClick={() => abrirModal('hito')} className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                + Agregar hito
              </button>
            )}
          </div>
          <div className="space-y-2">
            {(proyecto.facturacion || []).map(h => (
              <div key={h.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#2c3e50]">{h.hito}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {h.monto_usd ? `$${parseFloat(h.monto_usd).toLocaleString('es-CR')}` : '—'}
                    {h.fecha_acordada && ` · ${formatFecha(h.fecha_acordada)}`}
                    {` · ${h.estado}`}
                  </p>
                </div>
                {puedeGestionar && (
                  <div className="flex gap-2">
                    <button onClick={() => abrirModal('hito', h)} className="text-xs text-gray-400 hover:text-[#4E738A]">Editar</button>
                    <button onClick={() => eliminar('hito', h.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>
                  </div>
                )}
              </div>
            ))}
            {!proyecto.facturacion?.length && <p className="text-sm text-gray-400 text-center py-6">Sin hitos de facturación</p>}
          </div>
        </div>
      )}

      {/* TAB COSTOS */}
      {tab === 'Costos' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-medium text-[#2c3e50] mb-4">Costos de compras</h3>
          {cargandoCostos && <p className="text-sm text-gray-400">Cargando costos...</p>}
          {errorCostos && <p className="text-sm text-red-500">No se pudieron cargar los costos de compras.</p>}
          {costos && !errorCostos && (() => {
            const mos = costos.mos ?? (Array.isArray(costos) ? costos : [])
            const resumen = costos.resumen ?? null
            const fmtUSD = v => v != null ? `$${parseFloat(v).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
            return (
              <div className="space-y-4">
                {resumen && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      ['Cotizado total', resumen.cotizado_total, 'text-[#2c3e50]'],
                      ['Ingresado', resumen.ingreso_total, 'text-green-700'],
                      ['Pendiente', resumen.pendiente_total, 'text-yellow-700'],
                    ].map(([l, v, cls]) => (
                      <div key={l} className="rounded-lg border border-gray-100 p-3 text-center">
                        <p className="text-xs text-gray-400 mb-1">{l}</p>
                        <p className={`font-semibold text-sm ${cls}`}>{fmtUSD(v)}</p>
                      </div>
                    ))}
                  </div>
                )}
                {mos.length === 0
                  ? <p className="text-sm text-gray-400">Sin órdenes de material vinculadas.</p>
                  : mos.map((mo, i) => (
                    <div key={i} className="border border-gray-100 rounded-lg p-3 text-sm">
                      <p className="font-medium text-[#2c3e50]">{mo.numero || mo.id}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{mo.estado} · {mo.proveedor}</p>
                    </div>
                  ))
                }
              </div>
            )
          })()}
        </div>
      )}

      {/* Modal genérico */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h3 className="font-semibold text-[#2c3e50] mb-4">
              {modal.item ? 'Editar' : 'Agregar'} {modal.tipo}
            </h3>

            {modal.tipo === 'fase' && (
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <input value={modalForm.nombre || ''} onChange={e => mf('nombre', e.target.value)} className={inp()} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha inicio plan</label>
                    <input type="date" value={modalForm.fecha_inicio_plan?.slice(0,10) || ''} onChange={e => mf('fecha_inicio_plan', e.target.value)} className={inp()} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha fin plan</label>
                    <input type="date" value={modalForm.fecha_fin_plan?.slice(0,10) || ''} onChange={e => mf('fecha_fin_plan', e.target.value)} className={inp()} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select value={modalForm.estado || 'pendiente'} onChange={e => mf('estado', e.target.value)} className={inp()}>
                    {['pendiente','en_curso','completada','bloqueada'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <textarea value={modalForm.notas || ''} onChange={e => mf('notas', e.target.value)} rows={2} className={inp()} /></div>
              </div>
            )}

            {modal.tipo === 'tarea' && (
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Título *</label>
                  <input value={modalForm.titulo || ''} onChange={e => mf('titulo', e.target.value)} className={inp()} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Descripción</label>
                  <textarea value={modalForm.descripcion || ''} onChange={e => mf('descripcion', e.target.value)} rows={2} className={inp()} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Fase</label>
                  <select value={modalForm.fase_id || ''} onChange={e => mf('fase_id', e.target.value ? parseInt(e.target.value) : null)} className={inp()}>
                    <option value="">— Sin fase —</option>
                    {(proyecto.fases || []).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                    <select value={modalForm.prioridad || 'media'} onChange={e => mf('prioridad', e.target.value)} className={inp()}>
                      {['alta','media','baja'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
                    <select value={modalForm.estado || 'pendiente'} onChange={e => mf('estado', e.target.value)} className={inp()}>
                      {['pendiente','en_progreso','en_curso','completada','bloqueada','cancelada'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                    <input type="date" value={modalForm.fecha_inicio?.slice(0,10) || ''} onChange={e => mf('fecha_inicio', e.target.value)} className={inp()} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha límite</label>
                    <input type="date" value={modalForm.fecha_limite?.slice(0,10) || ''} onChange={e => mf('fecha_limite', e.target.value)} className={inp()} /></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Duración (días)</label>
                    <input type="number" min="1" value={modalForm.duracion_dias || ''}
                      onChange={e => {
                        const v = e.target.value
                        setModalForm(f => {
                          const next = { ...f, duracion_dias: v ? parseInt(v) : null }
                          if (v && f.fecha_inicio) {
                            const fin = new Date(f.fecha_inicio)
                            fin.setDate(fin.getDate() + parseInt(v) - 1)
                            next.fecha_limite = fin.toISOString().split('T')[0]
                          }
                          return next
                        })
                      }}
                      className={inp()} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Tarea predecesora</label>
                    <select value={modalForm.tarea_predecesora_id || ''}
                      onChange={e => mf('tarea_predecesora_id', e.target.value ? parseInt(e.target.value) : null)}
                      className={inp()}>
                      <option value="">— Sin predecesora —</option>
                      {(proyecto.tareas || []).filter(t => t.id !== modal.item?.id).map(t =>
                        <option key={t.id} value={t.id}>{t.titulo}</option>
                      )}
                    </select></div>
                </div>

                {/* Sección recursos */}
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-[#2c3e50]">Recursos asignados</p>
                    {!subFormVisible && (
                      <button type="button"
                        onClick={() => { setSubFormVisible(true); setSubFormData({}); setSubDispData(null) }}
                        className="text-xs text-[#4E738A] hover:underline">
                        + Agregar recurso
                      </button>
                    )}
                  </div>

                  {recursosEnTarea.length > 0 && (
                    <div className="space-y-1 mb-2">
                      {recursosEnTarea.map(r => (
                        <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-2 py-1.5 text-xs">
                          <span className="text-[#2c3e50]">{r.usuario_nombre} · {r.tipo_recurso} · {r.dedicacion_pct}%</span>
                          {String(r.id).startsWith('pending_')
                            ? <button type="button"
                                onClick={() => {
                                  const key = r.id
                                  setRecursosEnTarea(list => list.filter(x => x.id !== key))
                                  setPendingRecursos(list => list.filter((_, i) =>
                                    recursosEnTarea.filter(x => String(x.id).startsWith('pending_')).indexOf(r) !== i
                                  ))
                                }}
                                className="text-gray-400 hover:text-red-500 ml-2">✕</button>
                            : <button type="button"
                                onClick={async () => { await eliminarRecurso(r.id); setRecursosEnTarea(list => list.filter(x => x.id !== r.id)) }}
                                className="text-gray-400 hover:text-red-500 ml-2">✕</button>
                          }
                        </div>
                      ))}
                    </div>
                  )}
                  {recursosEnTarea.length === 0 && !subFormVisible && (
                    <p className="text-xs text-gray-400 mb-2">Sin recursos asignados</p>
                  )}

                  {subFormVisible && (
                    <div className="bg-[#4E738A]/5 border border-[#4E738A]/20 rounded-lg p-3 space-y-2">
                      <div><label className="block text-xs text-gray-500 mb-1">Tipo de recurso</label>
                        <select value={subFormData.tipo_recurso || ''}
                          onChange={e => { setSubFormData(f => ({ ...f, tipo_recurso: e.target.value, recurso_id: '' })); setSubDispData(null) }}
                          className={inp()}>
                          <option value="">— Seleccionar —</option>
                          <option value="ingenieria">Ingeniería</option>
                          <option value="planos">Planos</option>
                          <option value="diseno">Diseño</option>
                        </select></div>

                      {subFormData.tipo_recurso && (
                        <div><label className="block text-xs text-gray-500 mb-1">Recurso</label>
                          <select value={subFormData.recurso_id || ''}
                            onChange={e => { const v = e.target.value; setSubFormData(f => ({ ...f, recurso_id: v })); verificarSubForm({ ...subFormData, recurso_id: v }) }}
                            className={inp()}>
                            <option value="">— Seleccionar —</option>
                            {recursosDisponibles.filter(r => r.tipos.includes(subFormData.tipo_recurso)).map(r =>
                              <option key={r.id} value={r.id}>{r.nombre}</option>
                            )}
                          </select></div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div><label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                          <input type="date" value={subFormData.fecha_inicio || ''}
                            onChange={e => { const v = e.target.value; setSubFormData(f => ({ ...f, fecha_inicio: v })); verificarSubForm({ ...subFormData, fecha_inicio: v }) }}
                            className={inp()} /></div>
                        <div><label className="block text-xs text-gray-500 mb-1">Fecha fin</label>
                          <input type="date" value={subFormData.fecha_fin || ''}
                            onChange={e => { const v = e.target.value; setSubFormData(f => ({ ...f, fecha_fin: v })); verificarSubForm({ ...subFormData, fecha_fin: v }) }}
                            className={inp()} /></div>
                      </div>

                      <div><label className="block text-xs text-gray-500 mb-1">% Dedicación</label>
                        <input type="number" min="1" max="100" value={subFormData.dedicacion_pct || 100}
                          onChange={e => setSubFormData(f => ({ ...f, dedicacion_pct: parseInt(e.target.value) }))}
                          className={inp()} /></div>

                      {subVerificando && <p className="text-xs text-gray-400">Verificando disponibilidad...</p>}

                      {subDispData && !subVerificando && (
                        subDispData.disponible
                          ? <div className="flex items-center gap-1.5 text-xs text-[#2e9e5b] bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                              <svg viewBox="0 0 20 20" className="w-3.5 h-3.5 fill-current shrink-0"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>
                              Disponible
                            </div>
                          : <div className="text-xs bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 space-y-1">
                              <p className="font-medium text-orange-700">Conflicto detectado:</p>
                              {subDispData.solapamientos.map((s, i) => (
                                <p key={i} className="text-orange-600">{s.proyecto_codigo} ({s.pm_nombre}) — {s.tarea} · {s.dedicacion_pct}%</p>
                              ))}
                              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                <input type="checkbox" checked={!!subFormData.forzar} onChange={e => setSubFormData(f => ({ ...f, forzar: e.target.checked }))} className="accent-[#EE7623]" />
                                <span className="text-orange-700 font-medium">Forzar asignación</span>
                              </label>
                              {subFormData.forzar && (
                                <div><label className="block text-xs text-gray-500 mb-1">Nota para el PM</label>
                                  <input value={subFormData.conflicto_nota || ''} onChange={e => setSubFormData(f => ({ ...f, conflicto_nota: e.target.value }))} className={inp()} placeholder="Razón del solapamiento..." /></div>
                              )}
                            </div>
                      )}

                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={guardarSubFormRecurso}
                          className="px-3 py-1.5 text-xs bg-[#4E738A] text-white rounded-lg hover:bg-[#3d5c70]">
                          Agregar
                        </button>
                        <button type="button" onClick={() => { setSubFormVisible(false); setSubFormData({}); setSubDispData(null) }}
                          className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                          Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {modal.tipo === 'contacto' && (
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
                  <input value={modalForm.nombre || ''} onChange={e => mf('nombre', e.target.value)} className={inp()} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Rol</label>
                  <input value={modalForm.rol || ''} onChange={e => mf('rol', e.target.value)} className={inp()} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                    <input value={modalForm.telefono || ''} onChange={e => mf('telefono', e.target.value)} className={inp()} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Correo</label>
                    <input type="email" value={modalForm.correo || ''} onChange={e => mf('correo', e.target.value)} className={inp()} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <input value={modalForm.notas || ''} onChange={e => mf('notas', e.target.value)} className={inp()} /></div>
              </div>
            )}

            {modal.tipo === 'hito' && (
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Hito</label>
                  <input value={modalForm.hito || ''} onChange={e => mf('hito', e.target.value)} className={inp()} /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Monto USD</label>
                    <input type="number" value={modalForm.monto_usd || ''} onChange={e => mf('monto_usd', e.target.value)} className={inp()} /></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha acordada</label>
                    <input type="date" value={modalForm.fecha_acordada?.slice(0,10) || ''} onChange={e => mf('fecha_acordada', e.target.value)} className={inp()} /></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
                  <select value={modalForm.estado || 'pendiente'} onChange={e => mf('estado', e.target.value)} className={inp()}>
                    {['pendiente','facturado','pagado'].map(e => <option key={e} value={e}>{e}</option>)}
                  </select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Notas</label>
                  <input value={modalForm.notas || ''} onChange={e => mf('notas', e.target.value)} className={inp()} /></div>
              </div>
            )}

            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmarModal} disabled={guardandoModal} className="px-4 py-2 text-sm bg-[#4E738A] text-white rounded-lg hover:bg-[#3d5c70] disabled:opacity-40">
                {guardandoModal ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
