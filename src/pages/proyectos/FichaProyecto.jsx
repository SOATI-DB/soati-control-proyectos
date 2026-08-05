import { useEffect, useState, useMemo } from 'react'
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
  crearSubproyecto, actualizarSubproyecto, eliminarSubproyecto,
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
  const [errorModal, setErrorModal] = useState(null)
  const [errorSubForm, setErrorSubForm] = useState(null)

  const [filtroFase, setFiltroFase] = useState('')

  // Edición inline de recursos
  const [editandoRecurso, setEditandoRecurso] = useState(null)
  const [formRecurso, setFormRecurso] = useState({})

  // Subproyectos modal
  const [modalSP, setModalSP] = useState(null)
  const [formSP, setFormSP] = useState({})
  const [guardandoSP, setGuardandoSP] = useState(false)

  const tareasDisponiblesComoPredecesoras = useMemo(() => {
    const todasTareas = (proyecto?.tareas || []).filter(t => t.activo !== 0 && t.id !== modalForm.id)
    if (!modalForm.fase_id || !proyecto?.subproyectos?.length) return todasTareas
    const faseSeleccionada = (proyecto?.fases || []).find(f => String(f.id) === String(modalForm.fase_id))
    if (!faseSeleccionada?.subproyecto_id) return todasTareas
    const fasesDelSubproyecto = (proyecto?.fases || [])
      .filter(f => f.subproyecto_id === faseSeleccionada.subproyecto_id)
      .map(f => f.id)
    return todasTareas.filter(t => !t.fase_id || fasesDelSubproyecto.includes(t.fase_id))
  }, [modalForm.fase_id, modalForm.id, proyecto?.tareas, proyecto?.fases, proyecto?.subproyectos])

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
    const resultado = await verificarDisponibilidad(recurso_id, fecha_inicio_recurso, fecha_fin_recurso, form.id || null, id)
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

  function abrirModal(tipo, item = null, extra = {}) {
    setModal({ tipo, item })
    if (tipo === 'tarea' && item) {
      const ids = (() => {
        try {
          const parsed = typeof item.predecesoras_ids === 'string'
            ? JSON.parse(item.predecesoras_ids)
            : (item.predecesoras_ids || [])
          if (item.tarea_predecesora_id && !parsed.includes(String(item.tarea_predecesora_id))) {
            parsed.push(String(item.tarea_predecesora_id))
          }
          return parsed
        } catch { return [] }
      })()
      setModalForm({ ...item, predecesoras_ids: ids })
    } else {
      setModalForm(item ? { ...item } : { ...extra })
    }
    setDisponibilidad(null)
    setRecursosEnTarea([])
    setSubFormVisible(false)
    setSubFormData({})
    setSubDispData(null)
    setPendingRecursos([])
    setErrorModal(null)
    setErrorSubForm(null)
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
    const r = await verificarDisponibilidad(recurso_id, fecha_inicio, fecha_fin, modal?.item?.id || null, id)
    setSubDispData(r)
    setSubVerificando(false)
  }

  async function guardarSubFormRecurso() {
    const { tipo_recurso, recurso_id, fecha_inicio, fecha_fin, dedicacion_pct, forzar, conflicto_nota } = subFormData
    if (!recurso_id || !tipo_recurso || !fecha_inicio || !fecha_fin) return
    if (fecha_inicio && modalForm.fecha_inicio) {
      const fechaRecurso = new Date(`${fecha_inicio}T12:00:00`)
      const fechaTarea   = new Date(`${modalForm.fecha_inicio}T12:00:00`)
      if (fechaRecurso < fechaTarea) {
        setErrorSubForm(`El recurso no puede iniciar (${fecha_inicio}) antes que la tarea (${modalForm.fecha_inicio})`)
        return
      }
    }
    setErrorSubForm(null)
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
    setErrorModal(null)
    if (modal.tipo === 'tarea' && modalForm.fase_id && modalForm.fecha_inicio) {
      const faseSeleccionada = (proyecto.fases || []).find(f => f.id === modalForm.fase_id)
      if (faseSeleccionada?.fecha_inicio_plan) {
        const fechaTarea = new Date(`${modalForm.fecha_inicio}T12:00:00`)
        const fechaFase  = new Date(`${String(faseSeleccionada.fecha_inicio_plan).slice(0,10)}T12:00:00`)
        if (fechaTarea < fechaFase) {
          setErrorModal(`La tarea no puede iniciar (${modalForm.fecha_inicio}) antes que la fase "${faseSeleccionada.nombre}" (${String(faseSeleccionada.fecha_inicio_plan).slice(0,10)})`)
          return
        }
      }
    }
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

  async function guardarEdicionRecurso(recursoId) {
    if (formRecurso.fecha_inicio && modalForm.fecha_inicio) {
      const fechaRecurso = new Date(`${formRecurso.fecha_inicio}T12:00:00`)
      const fechaTarea   = new Date(`${String(modalForm.fecha_inicio).slice(0,10)}T12:00:00`)
      if (fechaRecurso < fechaTarea) {
        setErrorSubForm(`El recurso no puede iniciar antes que la tarea (${String(modalForm.fecha_inicio).slice(0,10)})`)
        return
      }
    }
    const API = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'
    const hdrs = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('soati_shell_token')}` })
    const r = await fetch(`${API}/api/recursos/${recursoId}`, {
      method: 'PATCH', headers: hdrs(), body: JSON.stringify(formRecurso)
    })
    if (!r.ok) { setErrorSubForm('Error al actualizar recurso'); return }
    setRecursosEnTarea(prev => prev.map(rec => rec.id === recursoId ? { ...rec, ...formRecurso } : rec))
    setEditandoRecurso(null)
    setErrorSubForm(null)
  }

  async function guardarSP() {
    setGuardandoSP(true)
    try {
      if (modalSP === 'nuevo') {
        await crearSubproyecto({ ...formSP, proyecto_id: parseInt(id) })
      } else {
        await actualizarSubproyecto(modalSP.id, formSP)
      }
      await cargar()
      setModalSP(null)
    } catch (e) {
      console.error(e)
    } finally {
      setGuardandoSP(false)
    }
  }

  async function eliminarSP(spId) {
    await eliminarSubproyecto(spId)
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
        {proyecto.es_interno === 1 && (
          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
            Interno
          </span>
        )}
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
      {tab === 'Fases' && (() => {
        const sps = proyecto.subproyectos || []
        const FilaFase = ({ f }) => (
          <div className="border border-gray-100 rounded-lg p-4 flex items-center justify-between">
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
                <button
                  onClick={() => abrirModal('fase', null, { fase_padre_id: f.id, fase_padre_nombre: f.nombre, subproyecto_id: f.subproyecto_id || null })}
                  className="text-xs text-[#4E738A] border border-[#4E738A]/40 rounded px-2 py-0.5 hover:bg-[#4E738A]/5"
                >
                  + Sub-fase
                </button>
                <button onClick={() => eliminar('fase', f.id)} className="text-xs text-gray-400 hover:text-red-500">Eliminar</button>
              </div>
            )}
          </div>
        )
        return (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-[#2c3e50]">Fases ({proyecto.fases?.length || 0})</h3>
              {puedeGestionar && (
                <div className="flex gap-2">
                  <button onClick={() => { setModalSP('nuevo'); setFormSP({}) }}
                    className="text-xs text-gray-500 border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                    + Subproyecto
                  </button>
                  <button onClick={() => abrirModal('fase')}
                    className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5">
                    + Agregar fase
                  </button>
                </div>
              )}
            </div>

            {sps.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                {sps.map(sp => (
                  <div key={sp.id} className="flex items-center gap-1.5 bg-[#2C3A43] text-white text-xs px-3 py-1.5 rounded-full">
                    <span>{sp.nombre}</span>
                    {puedeGestionar && (
                      <>
                        <button
                          onClick={() => { setModalSP(sp); setFormSP({ nombre: sp.nombre, descripcion: sp.descripcion || '', estado: sp.estado, responsable_id: sp.responsable_id || '', responsable_nombre: sp.responsable_nombre || '', fecha_inicio_plan: sp.fecha_inicio_plan?.slice(0,10) || '', fecha_fin_plan: sp.fecha_fin_plan?.slice(0,10) || '', notas: sp.notas || '' }) }}
                          className="opacity-70 hover:opacity-100 text-[10px] ml-1">✎</button>
                        <button onClick={() => eliminarSP(sp.id)} className="opacity-70 hover:opacity-100 ml-0.5 text-sm leading-none">×</button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {sps.length > 0 ? (
              <div className="space-y-5">
                {sps.map(sp => {
                  const fasesDelSP = (proyecto.fases || []).filter(f => f.subproyecto_id === sp.id)
                  return (
                    <div key={sp.id}>
                      <div className="text-xs font-bold text-white bg-[#2C3A43] px-3 py-1.5 rounded-lg mb-2">{sp.nombre}</div>
                      <div className="space-y-2 pl-2">
                        {fasesDelSP.map(f => <FilaFase key={f.id} f={f} />)}
                        {fasesDelSP.length === 0 && <p className="text-xs text-gray-400 pl-2 py-2">Sin fases asignadas</p>}
                      </div>
                    </div>
                  )
                })}
                {(proyecto.fases || []).filter(f => !f.subproyecto_id).length > 0 && (
                  <div>
                    <div className="text-xs font-bold text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg mb-2">Sin subproyecto</div>
                    <div className="space-y-2 pl-2">
                      {(proyecto.fases || []).filter(f => !f.subproyecto_id).map(f => <FilaFase key={f.id} f={f} />)}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(proyecto.fases || []).map(f => <FilaFase key={f.id} f={f} />)}
                {!proyecto.fases?.length && <p className="text-sm text-gray-400 text-center py-6">Sin fases</p>}
              </div>
            )}
          </div>
        )
      })()}

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
          {(proyecto.fases || []).length > 0 && (
            <div className="mb-3 flex items-center gap-2">
              <label className="text-xs text-gray-500 shrink-0">Fase:</label>
              <select
                value={filtroFase}
                onChange={e => setFiltroFase(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-[#4E738A] flex-1 max-w-xs"
              >
                <option value="">Todas</option>
                <option value="__sin_fase__">Sin fase</option>
                {(proyecto.fases || []).map(f => (
                  <option key={f.id} value={String(f.id)}>{f.nombre}</option>
                ))}
              </select>
              {filtroFase && (
                <button onClick={() => setFiltroFase('')} className="text-xs text-gray-400 hover:text-gray-600">
                  Limpiar
                </button>
              )}
            </div>
          )}
          <div className="space-y-2">
            {(proyecto.tareas || [])
              .filter(t => {
                if (!filtroFase) return true
                if (filtroFase === '__sin_fase__') return !t.fase_id
                return String(t.fase_id) === filtroFase
              })
              .map(t => (
              <div key={t.id} className="border border-gray-100 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm text-[#2c3e50]">{t.titulo}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${PRIORIDAD_ESTILOS[t.prioridad] || 'bg-gray-100 text-gray-500'}`}>{t.prioridad}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {t.estado} {t.asignado_nombre && `· ${t.asignado_nombre}`} {t.fecha_limite && `· SLA: ${formatFecha(t.fecha_limite)}`}
                    {t.avance > 0 && ` · ${t.avance}%`}
                  </p>
                  {t.responsable && (
                    <span className="text-[11px] text-gray-400">Resp: {t.responsable}</span>
                  )}
                  {(() => {
                    let ids = []
                    try { ids = JSON.parse(t.predecesoras_ids || '[]') } catch {}
                    if (t.tarea_predecesora_id && !ids.includes(String(t.tarea_predecesora_id))) ids.push(String(t.tarea_predecesora_id))
                    if (!ids.length) return null
                    const nombres = ids.map(id => {
                      const pred = (proyecto.tareas || []).find(tt => String(tt.id) === String(id))
                      return pred?.titulo || `#${id}`
                    })
                    return <span className="text-[11px] text-gray-400">Pred: {nombres.join(', ')}</span>
                  })()}
                  {(t.recursos || []).map(r => (
                    <div key={r.id} className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                      <span>{r.usuario_nombre}</span>
                      <span>·</span>
                      <span>{formatFecha(r.fecha_inicio)} — {formatFecha(r.fecha_fin)}</span>
                      <span>({r.dedicacion_pct}%)</span>
                    </div>
                  ))}
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
          <GanttProyecto proyecto={proyecto} onEditarTarea={(t) => abrirModal('tarea', t)} />
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
              {modal.tipo === 'fase'
                ? (modal.item
                    ? 'Editar fase'
                    : modalForm.fase_padre_id
                      ? `Nueva sub-fase de: ${modalForm.fase_padre_nombre}`
                      : 'Nueva fase')
                : `${modal.item ? 'Editar' : 'Agregar'} ${modal.tipo}`}
            </h3>

            {modal.tipo === 'fase' && (
              <div className="space-y-3">
                {modalForm.fase_padre_id && (
                  <div className="bg-[#4E738A]/8 border border-[#4E738A]/20 rounded-lg px-3 py-2 text-xs text-[#4E738A]">
                    Sub-fase de: <strong>{modalForm.fase_padre_nombre}</strong>
                  </div>
                )}
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
                {(proyecto.subproyectos || []).length > 0 && !modalForm.fase_padre_id && (
                  <div><label className="block text-xs text-gray-500 mb-1">Subproyecto</label>
                    <select value={modalForm.subproyecto_id || ''} onChange={e => mf('subproyecto_id', e.target.value ? parseInt(e.target.value) : null)} className={inp()}>
                      <option value="">— Sin subproyecto —</option>
                      {(proyecto.subproyectos || []).map(sp => <option key={sp.id} value={sp.id}>{sp.nombre}</option>)}
                    </select></div>
                )}
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
                    {(proyecto.subproyectos || []).length > 0 ? (
                      <>
                        {(proyecto.subproyectos || []).map(sp => {
                          const fasesSP = (proyecto.fases || []).filter(f => f.subproyecto_id === sp.id)
                          if (!fasesSP.length) return null
                          return (
                            <optgroup key={sp.id} label={sp.nombre}>
                              {fasesSP.map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                            </optgroup>
                          )
                        })}
                        {(proyecto.fases || []).filter(f => !f.subproyecto_id).length > 0 && (
                          <optgroup label="Sin subproyecto">
                            {(proyecto.fases || []).filter(f => !f.subproyecto_id).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)}
                          </optgroup>
                        )}
                      </>
                    ) : (
                      (proyecto.fases || []).map(f => <option key={f.id} value={f.id}>{f.nombre}</option>)
                    )}
                  </select></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                    <select value={modalForm.prioridad || 'media'} onChange={e => mf('prioridad', e.target.value)} className={inp()}>
                      {['alta','media','baja'].map(p => <option key={p} value={p}>{p}</option>)}
                    </select></div>
                  <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
                    <select value={modalForm.estado || 'pendiente'} onChange={e => mf('estado', e.target.value)} className={inp()}>
                      {['pendiente','en_progreso','completada','bloqueada'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select></div>
                </div>
                <div><label className="block text-xs text-gray-500 mb-1">Responsable</label>
                  <input type="text" value={modalForm.responsable ?? ''} onChange={e => mf('responsable', e.target.value)}
                    placeholder="Ej: PM, Ingeniero a cargo, Cliente, Logística..."
                    className={inp()} /></div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Avance (%)</label>
                  <input
                    type="number" min="0" max="100"
                    value={modalForm.avance ?? 0}
                    onChange={e => {
                      const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0))
                      setModalForm(f => ({ ...f, avance: val, estado: val === 100 ? 'completada' : f.estado }))
                    }}
                    className={inp()}
                  />
                  <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${modalForm.avance ?? 0}%`, backgroundColor: (modalForm.avance ?? 0) === 100 ? '#52a96e' : '#4E738A' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="block text-xs text-gray-500 mb-1">Fecha inicio</label>
                    <input type="date" value={modalForm.fecha_inicio?.slice(0,10) || ''} onChange={e => mf('fecha_inicio', e.target.value)} className={inp()} /></div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Fecha límite (SLA)</label>
                    <input type="date" value={modalForm.fecha_limite?.slice(0,10) || ''} onChange={e => mf('fecha_limite', e.target.value)} className={inp()} />
                    <p className="text-[10px] text-gray-400 mt-0.5">Fecha máxima comprometida con el cliente</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Duración estimada (días hábiles de trabajo)</label>
                    <input type="number" min="0.1" step="0.1" value={modalForm.duracion_dias ?? ''}
                      onChange={e => {
                        const v = e.target.value
                        setModalForm(f => {
                          const next = { ...f, duracion_dias: v ? parseFloat(v) : null }
                          if (v && f.fecha_inicio) {
                            const fin = new Date(f.fecha_inicio)
                            fin.setDate(fin.getDate() + Math.max(1, Math.ceil(parseFloat(v))) - 1)
                            next.fecha_limite = fin.toISOString().split('T')[0]
                          }
                          return next
                        })
                      }}
                      className={inp()} />
                    <p className="text-[10px] text-gray-400 mt-0.5">Tiempo real de ejecución desde la fecha de inicio</p>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Tareas predecesoras</label>
                    <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto divide-y divide-gray-100">
                      {tareasDisponiblesComoPredecesoras.length === 0 ? (
                        <p className="text-xs text-gray-400 p-2">No hay tareas disponibles</p>
                      ) : (
                        tareasDisponiblesComoPredecesoras.map(t => {
                          const seleccionada = (modalForm.predecesoras_ids || []).includes(String(t.id))
                          return (
                            <label key={t.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={seleccionada}
                                onChange={e => {
                                  const ids = modalForm.predecesoras_ids || []
                                  const idStr = String(t.id)
                                  mf('predecesoras_ids', e.target.checked ? [...ids, idStr] : ids.filter(id => id !== idStr))
                                }}
                                className="rounded border-gray-300 text-[#4E738A] focus:ring-[#4E738A]"
                              />
                              <span className="text-xs text-gray-700 truncate">{t.titulo}</span>
                            </label>
                          )
                        })
                      )}
                    </div>
                    {(modalForm.predecesoras_ids || []).length > 0 && (
                      <button type="button" onClick={() => mf('predecesoras_ids', [])}
                        className="text-xs text-gray-400 hover:text-gray-600 mt-1">
                        Limpiar selección
                      </button>
                    )}
                  </div>
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
                    <div className="space-y-1.5 mb-2">
                      {recursosEnTarea.map(r => (
                        <div key={r.id} className="border border-gray-100 rounded-lg p-2">
                          {editandoRecurso === r.id ? (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-[#2C3A43]">{r.usuario_nombre} · {r.tipo_recurso}</span>
                                <button type="button" onClick={() => { setEditandoRecurso(null); setErrorSubForm(null) }}
                                  className="text-xs text-gray-400 hover:text-gray-600">Cancelar</button>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Fecha inicio</label>
                                  <input type="date" value={formRecurso.fecha_inicio ?? ''}
                                    onChange={e => setFormRecurso(f => ({ ...f, fecha_inicio: e.target.value }))}
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4E738A]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Fecha fin</label>
                                  <input type="date" value={formRecurso.fecha_fin ?? ''}
                                    onChange={e => setFormRecurso(f => ({ ...f, fecha_fin: e.target.value }))}
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4E738A]" />
                                </div>
                                <div>
                                  <label className="block text-[10px] text-gray-500 mb-0.5">Dedicación (%)</label>
                                  <input type="number" min="1" max="100" value={formRecurso.dedicacion_pct ?? 100}
                                    onChange={e => setFormRecurso(f => ({ ...f, dedicacion_pct: parseInt(e.target.value) || 100 }))}
                                    className="w-full border border-gray-200 rounded px-2 py-1 text-xs focus:outline-none focus:border-[#4E738A]" />
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <button type="button" onClick={() => guardarEdicionRecurso(r.id)}
                                  className="text-xs bg-[#4E738A] text-white px-3 py-1 rounded hover:bg-[#3d5c70]">
                                  Guardar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between">
                              <div>
                                <span className="text-xs text-[#2C3A43]">{r.usuario_nombre} · {r.tipo_recurso} · {r.dedicacion_pct}%</span>
                                <div className="text-[11px] text-gray-400 mt-0.5">
                                  {r.fecha_inicio ? formatFecha(r.fecha_inicio) : '—'} → {r.fecha_fin ? formatFecha(r.fecha_fin) : '—'}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 ml-3 shrink-0">
                                {!String(r.id).startsWith('pending_') && (
                                  <button type="button"
                                    onClick={() => {
                                      setFormRecurso({
                                        fecha_inicio:   r.fecha_inicio ? String(r.fecha_inicio).slice(0,10) : '',
                                        fecha_fin:      r.fecha_fin    ? String(r.fecha_fin).slice(0,10)    : '',
                                        dedicacion_pct: r.dedicacion_pct ?? 100
                                      })
                                      setEditandoRecurso(r.id)
                                    }}
                                    className="text-xs text-[#4E738A] hover:underline">
                                    Editar
                                  </button>
                                )}
                                {String(r.id).startsWith('pending_')
                                  ? <button type="button"
                                      onClick={() => {
                                        const key = r.id
                                        setRecursosEnTarea(list => list.filter(x => x.id !== key))
                                        setPendingRecursos(list => list.filter((_, i) =>
                                          recursosEnTarea.filter(x => String(x.id).startsWith('pending_')).indexOf(r) !== i
                                        ))
                                      }}
                                      className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                                  : <button type="button"
                                      onClick={async () => { await eliminarRecurso(r.id); setRecursosEnTarea(list => list.filter(x => x.id !== r.id)) }}
                                      className="text-gray-400 hover:text-red-500 text-lg leading-none">×</button>
                                }
                              </div>
                            </div>
                          )}
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

                      {errorSubForm && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{errorSubForm}</p>
                      )}
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={guardarSubFormRecurso}
                          className="px-3 py-1.5 text-xs bg-[#4E738A] text-white rounded-lg hover:bg-[#3d5c70]">
                          Agregar
                        </button>
                        <button type="button" onClick={() => { setSubFormVisible(false); setSubFormData({}); setSubDispData(null); setErrorSubForm(null) }}
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

            {errorModal && (
              <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {errorModal}
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
      {/* Modal Subproyecto */}
      {modalSP && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="font-semibold text-[#2c3e50] mb-4">
              {modalSP === 'nuevo' ? 'Nuevo subproyecto' : `Editar: ${modalSP.nombre}`}
            </h3>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input value={formSP.nombre || ''} onChange={e => setFormSP(f => ({ ...f, nombre: e.target.value }))} className={inp()} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Descripción</label>
                <textarea value={formSP.descripcion || ''} onChange={e => setFormSP(f => ({ ...f, descripcion: e.target.value }))} rows={2} className={inp()} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Estado</label>
                <select value={formSP.estado || 'pendiente'} onChange={e => setFormSP(f => ({ ...f, estado: e.target.value }))} className={inp()}>
                  {['pendiente','en_progreso','completada','bloqueada'].map(e => <option key={e} value={e}>{e}</option>)}
                </select></div>
              <div><label className="block text-xs text-gray-500 mb-1">Responsable</label>
                <select value={formSP.responsable_id || ''} onChange={e => {
                  const u = ingenieros.find(x => String(x.id) === e.target.value)
                  setFormSP(f => ({ ...f, responsable_id: e.target.value, responsable_nombre: u?.nombre || '' }))
                }} className={inp()}>
                  <option value="">— Sin responsable —</option>
                  {ingenieros.map(u => <option key={u.id} value={String(u.id)}>{u.nombre}</option>)}
                </select></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs text-gray-500 mb-1">Fecha inicio plan</label>
                  <input type="date" value={formSP.fecha_inicio_plan || ''} onChange={e => setFormSP(f => ({ ...f, fecha_inicio_plan: e.target.value }))} className={inp()} /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Fecha fin plan</label>
                  <input type="date" value={formSP.fecha_fin_plan || ''} onChange={e => setFormSP(f => ({ ...f, fecha_fin_plan: e.target.value }))} className={inp()} /></div>
              </div>
              <div><label className="block text-xs text-gray-500 mb-1">Notas</label>
                <textarea value={formSP.notas || ''} onChange={e => setFormSP(f => ({ ...f, notas: e.target.value }))} rows={2} className={inp()} /></div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setModalSP(null)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={guardarSP} disabled={guardandoSP || !formSP.nombre?.trim()} className="px-4 py-2 text-sm bg-[#2C3A43] text-white rounded-lg hover:bg-[#1e2a32] disabled:opacity-40">
                {guardandoSP ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
