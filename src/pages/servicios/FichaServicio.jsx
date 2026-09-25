import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { getRecursosDisponibles, verificarDisponibilidad } from '../../services/api.js'

const CP_API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'
const TOKEN_KEY = 'soati_shell_token'

export default function FichaServicio() {
  const { codigo } = useParams()
  const navigate   = useNavigate()
  const { tienePermiso, esAdmin } = useAuth()
  const puedeGestionar = esAdmin || tienePermiso('control-proyectos', 'gestionar_servicios')

  const [contrato, setContrato] = useState(null)
  const [tareas, setTareas]     = useState([])
  const [loading, setLoading]   = useState(true)
  const [tabActivo, setTabActivo] = useState('general')

  const [modalEditar, setModalEditar]         = useState(false)
  const [formEditar, setFormEditar]           = useState({})
  const [guardandoEditar, setGuardandoEditar] = useState(false)
  const [errorEditar, setErrorEditar]         = useState('')

  const [modalTarea, setModalTarea]             = useState(false)
  const [modalEditarTarea, setModalEditarTarea] = useState(null)
  const [modalPropagar, setModalPropagar]       = useState(null) // { tarea, campo, valor }
  const [formEditarTarea, setFormEditarTarea]   = useState({ titulo: '', fecha: '', fecha_fin: '' })
  const [guardandoEditarTarea, setGuardandoEditarTarea] = useState(false)
  const [recursosEnTarea, setRecursosEnTarea]   = useState([])
  const [subFormVisible, setSubFormVisible]     = useState(false)
  const [subFormData, setSubFormData]           = useState({})
  const [subDispData, setSubDispData]           = useState(null)
  const [subVerificando, setSubVerificando]     = useState(false)
  const [errorRecurso, setErrorRecurso]         = useState('')
  const [confirmandoEliminarTarea, setConfirmandoEliminarTarea] = useState(null)
  const [editandoRecurso, setEditandoRecurso]   = useState(null)
  const [formRecurso, setFormRecurso]           = useState({})
  const [formTarea, setFormTarea]               = useState({
    titulo: '', descripcion: '', asignado_id: '', asignado_nombre: '',
    fecha: '', fecha_fin: '', hora_inicio: '', hora_fin: '',
    recurrencia_tipo: '', recurrencia_fin: '',
    tipo_consumo: 'contratado',
  })
  const [usuarios, setUsuarios] = useState([])

  useEffect(() => { cargar() }, [codigo])

  /** Carga el contrato y sus tareas desde la API usando el código de la ruta. */
  async function cargar() {
    setLoading(true)
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos/${codigo}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` }
      })
      if (!r.ok) { navigate('/servicios'); return }
      const data = await r.json()
      setContrato(data)
      setTareas(data.tareas ?? [])
    } catch { navigate('/servicios') }
    finally { setLoading(false) }
  }

  /** Carga la lista de recursos disponibles desde shell-api para los selectores de usuario. */
  async function cargarUsuarios() {
    try {
      const data = await getRecursosDisponibles()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch { setUsuarios([]) }
  }

  /** Verifica disponibilidad del recurso seleccionado contra cualquier asignación existente (proyecto o servicio). */
  async function verificarSubForm(form) {
    const { recurso_id, fecha_inicio, fecha_fin } = form
    if (!recurso_id || !fecha_inicio || !fecha_fin) { setSubDispData(null); return }
    setSubVerificando(true)
    const r = await verificarDisponibilidad(recurso_id, fecha_inicio, fecha_fin, null, null, modalEditarTarea?.id || null)
    setSubDispData(r)
    setSubVerificando(false)
  }

  /** Abre el modal de edición del contrato precargando los datos actuales en el formulario. */
  function abrirEditar() {
    setFormEditar({
      nombre:              contrato.nombre              ?? '',
      cliente_nombre:      contrato.cliente_nombre      ?? '',
      cliente_codigo:      contrato.cliente_codigo      ?? '',
      tipo:                    contrato.tipo                    ?? '',
      modalidad:               contrato.modalidad               ?? '',
      periodo:                 contrato.periodo                 ?? 'unico',
      cantidad_contratada:     contrato.cantidad_contratada     ?? '',
      cantidad_disponible:     contrato.cantidad_disponible     ?? '',
      cantidad_demanda_limite: contrato.cantidad_demanda_limite ?? '',
      fecha_inicio:        contrato.fecha_inicio        ?? '',
      fecha_fin:           contrato.fecha_fin           ?? '',
      estado:              contrato.estado              ?? 'activo',
      notas:               contrato.notas               ?? '',
    })
    setErrorEditar('')
    setModalEditar(true)
  }

  /** Persiste los cambios del contrato vía PATCH al endpoint de contratos. */
  async function guardarEdicion() {
    if (!formEditar.nombre || !formEditar.cliente_nombre || !formEditar.cliente_codigo || !formEditar.tipo) {
      setErrorEditar('Nombre, cliente y tipo son requeridos')
      return
    }
    setGuardandoEditar(true)
    setErrorEditar('')
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos/${codigo}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}`
        },
        body: JSON.stringify({
          ...formEditar,
          cantidad_contratada:     formEditar.cantidad_contratada     !== '' ? parseFloat(formEditar.cantidad_contratada)     : null,
          cantidad_disponible:     formEditar.cantidad_disponible     !== '' ? parseFloat(formEditar.cantidad_disponible)     : null,
          cantidad_demanda_limite: formEditar.cantidad_demanda_limite !== '' ? parseFloat(formEditar.cantidad_demanda_limite) : null,
          fecha_inicio: formEditar.fecha_inicio || null,
          fecha_fin:    formEditar.fecha_fin    || null,
          modalidad:    formEditar.modalidad    || null,
        })
      })
      const data = await r.json()
      if (!r.ok) { setErrorEditar(data.error ?? 'Error al guardar'); return }
      setModalEditar(false)
      cargar()
    } catch { setErrorEditar('Error de conexión') }
    finally { setGuardandoEditar(false) }
  }

  /** Crea una nueva tarea (y sus instancias recurrentes si aplica) vía POST. */
  async function guardarTarea() {
    if (!formTarea.titulo) return
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos/${codigo}/tareas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body: JSON.stringify({
          ...formTarea,
          fecha_fin:        formTarea.fecha_fin        || null,
          hora_inicio:      formTarea.hora_inicio      || null,
          hora_fin:         formTarea.hora_fin         || null,
          recurrencia_tipo: formTarea.recurrencia_tipo || null,
          recurrencia_fin:  formTarea.recurrencia_fin  || null,
        })
      })
      if (r.ok) {
        setModalTarea(false)
        setFormTarea({ titulo: '', descripcion: '', asignado_id: '', asignado_nombre: '', fecha: '', fecha_fin: '', hora_inicio: '', hora_fin: '', recurrencia_tipo: '', recurrencia_fin: '', tipo_consumo: 'contratado' })
        cargar()
      }
    } catch (e) { console.error(e) }
  }

  /** Aplica un cambio de campo a una instancia individual o a toda la serie pendiente/en_progreso. */
  async function aplicarCambioSerie(tarea, campo, valor, soloEsta) {
    const idsPadre = tarea.recurrencia_padre_id ?? tarea.id
    const url = soloEsta
      ? `${CP_API}/api/servicios/tareas/${tarea.id}`
      : `${CP_API}/api/servicios/tareas/serie/${idsPadre}`

    await fetch(url, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
      body:    JSON.stringify({ [campo]: valor }),
    })
    setModalPropagar(null)
    await cargar()
  }

  /** Cambia el estado de una tarea; si pertenece a una serie pregunta si aplica solo a esta instancia o a toda la serie. */
  async function cambiarEstadoTarea(tarea, nuevoEstado) {
    // Si es parte de una serie, preguntar si aplica solo a esta o a toda la serie
    if (tarea.recurrencia_tipo || tarea.recurrencia_padre_id) {
      setModalPropagar({ tarea, campo: 'estado', valor: nuevoEstado })
      return
    }
    try {
      await fetch(`${CP_API}/api/servicios/tareas/${tarea.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body: JSON.stringify({ estado: nuevoEstado })
      })
      cargar()
    } catch (e) { console.error(e) }
  }

  /** Elimina una tarea de servicio — desactiva recursos y cancela ticket asociado en el backend. */
  async function eliminarTarea(tarea) {
    try {
      const r = await fetch(`${CP_API}/api/servicios/tareas/${tarea.id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
      })
      if (r.ok) {
        cargar()
      } else {
        const err = await r.json().catch(() => ({}))
        alert(err.error || 'Error al eliminar la tarea')
      }
    } catch (e) {
      console.error('[eliminarTarea]', e)
      alert('Error al eliminar la tarea')
    }
  }

  /** Abre el modal de edición de una tarea, carga sus recursos adicionales y pre-carga usuarios si es necesario. */
  async function abrirEditarTarea(t) {
    if (usuarios.length === 0) await cargarUsuarios()
    setFormEditarTarea({
      titulo:          t.titulo,
      fecha:           t.fecha ?? '',
      fecha_fin:       t.fecha_fin ?? '',
      asignado_id:     t.asignado_id ?? '',
      asignado_nombre: t.asignado_nombre ?? '',
      tipo_consumo:    t.tipo_consumo ?? 'contratado',
    })
    setSubFormVisible(false)
    setSubFormData({})
    setSubDispData(null)
    setEditandoRecurso(null)
    setModalEditarTarea(t)
    try {
      const r = await fetch(`${CP_API}/api/recursos/servicio-tarea/${t.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` }
      })
      const data = r.ok ? await r.json() : []
      setRecursosEnTarea(Array.isArray(data) ? data : [])
    } catch { setRecursosEnTarea([]) }
  }

  /** Persiste los cambios de la tarea (título, fecha, asignado, tipo_consumo) vía PATCH. */
  async function guardarEditarTarea() {
    if (!formEditarTarea.titulo.trim()) return
    setGuardandoEditarTarea(true)
    try {
      const r = await fetch(`${CP_API}/api/servicios/tareas/${modalEditarTarea.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body:    JSON.stringify({
          titulo:          formEditarTarea.titulo.trim(),
          fecha:           formEditarTarea.fecha     || null,
          fecha_fin:       formEditarTarea.fecha_fin || null,
          asignado_id:     formEditarTarea.asignado_id     || null,
          asignado_nombre: formEditarTarea.asignado_nombre || null,
          tipo_consumo:    formEditarTarea.tipo_consumo    ?? 'contratado',
        }),
      })
      if (r.ok) {
        setModalEditarTarea(null)
        await cargar()
      }
    } finally {
      setGuardandoEditarTarea(false)
    }
  }

  /** Agrega un recurso adicional a la tarea; si la tarea es recurrente abre el modal de propagación para preguntar el alcance. */
  async function agregarRecursoServicio() {
    setErrorRecurso('')
    const { tipo_recurso, recurso_id, fecha_inicio, fecha_fin, dedicacion_pct } = subFormData
    if (!recurso_id || !tipo_recurso || !fecha_inicio || !fecha_fin) return
    const recurso = usuarios.find(r => String(r.id) === String(recurso_id))

    if (modalEditarTarea && (modalEditarTarea.recurrencia_tipo || modalEditarTarea.recurrencia_padre_id)) {
      const payload = {
        servicio_tarea_id: modalEditarTarea.id,
        usuario_id:        String(recurso_id),
        usuario_nombre:    recurso?.nombre ?? '',
        tipo_recurso,
        fecha_inicio,
        fecha_fin,
        dedicacion_pct:       parseInt(dedicacion_pct) || 100,
        incluir_fines_semana: subFormData.incluir_fines_semana ? 1 : 0,
        forzado:              subFormData.forzar ? 1 : 0,
        conflicto_nota:       subFormData.conflicto_nota ?? null,
      }
      setModalPropagar({ accion: 'agregar', recurso: payload, tarea: modalEditarTarea })
      return
    }

    try {
      const r = await fetch(`${CP_API}/api/recursos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body: JSON.stringify({
          servicio_tarea_id: modalEditarTarea.id,
          usuario_id:        String(recurso_id),
          usuario_nombre:    recurso?.nombre ?? '',
          tipo_recurso,
          fecha_inicio,
          fecha_fin,
          dedicacion_pct:       parseInt(dedicacion_pct) || 100,
          incluir_fines_semana: subFormData.incluir_fines_semana ? 1 : 0,
          forzado:              subFormData.forzar ? 1 : 0,
          conflicto_nota:       subFormData.conflicto_nota ?? null,
        }),
      })
      if (r.ok) {
        const nuevo = await r.json()
        setRecursosEnTarea(list => [...list, nuevo])
        setSubFormVisible(false)
        setSubFormData({})
        setErrorRecurso('')
      } else {
        const err = await r.json().catch(() => ({}))
        setErrorRecurso(err.error || 'Error al agregar el recurso')
      }
    } catch (e) { console.error(e) }
  }

  /** Elimina un recurso de la tarea; si la tarea es recurrente abre el modal de propagación para preguntar el alcance. */
  async function eliminarRecursoServicio(recursoId) {
    const r = recursosEnTarea.find(x => x.id === recursoId)
    if (modalEditarTarea && (modalEditarTarea.recurrencia_tipo || modalEditarTarea.recurrencia_padre_id) && r) {
      setModalPropagar({ accion: 'eliminar', recurso: r, tarea: modalEditarTarea })
      return
    }
    try {
      await fetch(`${CP_API}/api/recursos/${recursoId}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
      })
      setRecursosEnTarea(list => list.filter(x => x.id !== recursoId))
    } catch (e) { console.error(e) }
  }

  /** Actualiza fechas y dedicación de un recurso existente vía PATCH. */
  async function guardarEdicionRecursoServicio(recursoId) {
    try {
      const r = await fetch(`${CP_API}/api/recursos/${recursoId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body: JSON.stringify(formRecurso),
      })
      if (r.ok) {
        setRecursosEnTarea(prev => prev.map(rec => rec.id === recursoId ? { ...rec, ...formRecurso } : rec))
        setEditandoRecurso(null)
      } else {
        const err = await r.json().catch(() => ({}))
        console.error('[guardarEdicionRecursoServicio] Error:', r.status, err)
      }
    } catch (e) { console.error('[guardarEdicionRecursoServicio]', e) }
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
          <div className="flex items-center gap-2">
            {puedeGestionar && (
              <button
                onClick={abrirEditar}
                className="px-3 py-1.5 border border-[#4E738A] text-[#4E738A] text-sm rounded-lg hover:bg-[#4E738A] hover:text-white transition-colors"
              >
                Editar
              </button>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              contrato.estado === 'activo'  ? 'bg-green-100 text-green-700' :
              contrato.estado === 'vencido' ? 'bg-orange-100 text-orange-700' :
              contrato.estado === 'cerrado' ? 'bg-gray-100 text-gray-600' :
                                              'bg-yellow-100 text-yellow-700'
            }`}>{contrato.estado}</span>
          </div>
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

        {(contrato.modalidad === 'bajo_demanda' || contrato.modalidad === 'mixto') && contrato.cantidad_demanda_limite && (
          <div>
            <span className="text-[#9aa1a9]">Límite bajo demanda</span>
            <p className="text-[#2C3A43] font-medium mt-0.5">
              {contrato.cantidad_demanda_limite} {contrato.tipo === 'contrato_visitas' ? 'visitas' : 'h'}
            </p>
          </div>
        )}
        {(contrato.modalidad === 'bajo_demanda' || contrato.modalidad === 'mixto') && (
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
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-[#2C3A43] text-sm">{t.titulo}</p>
                          {contrato?.modalidad === 'mixto' && (
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                              t.tipo_consumo === 'bajo_demanda'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {t.tipo_consumo === 'bajo_demanda' ? 'Bajo demanda' : 'Contratado'}
                            </span>
                          )}
                          {t.recurrencia_tipo && t.recurrencia_padre_id === null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">
                              🔁 {t.recurrencia_tipo}
                            </span>
                          )}
                          {t.recurrencia_padre_id !== null && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-[#5f6b75]">
                              instancia
                            </span>
                          )}
                          {puedeGestionar && (
                            <button
                              onClick={() => abrirEditarTarea(t)}
                              className="text-[10px] text-[#4E738A] hover:underline shrink-0"
                            >
                              Editar
                            </button>
                          )}
                          {puedeGestionar && (
                            <button
                              onClick={() => setConfirmandoEliminarTarea(t)}
                              className="text-[10px] text-red-500 hover:underline shrink-0"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                        {t.zammad_ticket_id && (
                          <a
                            href={`${import.meta.env.VITE_TICKETS_URL ?? '/tickets'}/tickets/${t.zammad_ticket_id}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#4E738A]/10 text-[#4E738A] hover:bg-[#4E738A]/20 transition-colors"
                          >
                            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                            </svg>
                            #{t.zammad_ticket_id}
                          </a>
                        )}
                        {t.asignado_nombre && (
                          <p className="text-xs text-[#9aa1a9] mt-0.5">
                            {t.asignado_nombre}
                            {(t.recursos || []).slice(1).map(r => (
                              <span key={r.id} className="ml-2">· {r.usuario_nombre}</span>
                            ))}
                          </p>
                        )}
                        {t.fecha && (
                          <p className="text-xs text-[#9aa1a9] mt-0.5">
                            {t.fecha_fin && t.fecha_fin !== t.fecha ? `${t.fecha} → ${t.fecha_fin}` : t.fecha}
                            {(!t.fecha_fin || t.fecha_fin === t.fecha) && t.hora_inicio ? ` · ${t.hora_inicio}${t.hora_fin ? ` - ${t.hora_fin}` : ''}` : ''}
                          </p>
                        )}
                      </div>
                      <select
                        value={t.estado}
                        onChange={e => cambiarEstadoTarea(t, e.target.value)}
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

      {modalEditar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-[#2C3A43] mb-4">Editar contrato</h2>

            {errorEditar && <p className="text-red-500 text-sm mb-3">{errorEditar}</p>}

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Nombre *</label>
                  <input value={formEditar.nombre ?? ''} onChange={e => setFormEditar(f => ({ ...f, nombre: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Cliente nombre *</label>
                  <input value={formEditar.cliente_nombre ?? ''} onChange={e => setFormEditar(f => ({ ...f, cliente_nombre: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Código cliente</label>
                  <input value={formEditar.cliente_codigo ?? ''} onChange={e => setFormEditar(f => ({ ...f, cliente_codigo: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Tipo *</label>
                  <select value={formEditar.tipo ?? ''} onChange={e => setFormEditar(f => ({ ...f, tipo: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                    <option value="">Seleccionar</option>
                    <option value="contrato_horas">Contrato horas</option>
                    <option value="contrato_visitas">Contrato visitas</option>
                    <option value="soporte">Soporte</option>
                    <option value="proyecto">Proyecto</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Modalidad</label>
                  <select value={formEditar.modalidad ?? ''} onChange={e => setFormEditar(f => ({ ...f, modalidad: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                    <option value="">Sin modalidad</option>
                    {formEditar.tipo === 'contrato_horas' ? (
                      <>
                        <option value="prepago">Horas contratadas (prepago)</option>
                        <option value="bajo_demanda">Bajo demanda</option>
                        <option value="mixto">Mixto (contratadas + bajo demanda)</option>
                      </>
                    ) : formEditar.tipo === 'contrato_visitas' ? (
                      <>
                        <option value="contratado">Visitas contratadas</option>
                        <option value="bajo_demanda">Bajo demanda</option>
                        <option value="mixto">Mixto (contratadas + bajo demanda)</option>
                      </>
                    ) : null}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Periodo</label>
                  <select value={formEditar.periodo ?? 'unico'} onChange={e => setFormEditar(f => ({ ...f, periodo: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                    <option value="unico">Único</option>
                    <option value="mensual">Mensual</option>
                    <option value="bimensual">Bimensual</option>
                    <option value="trimestral">Trimestral</option>
                    <option value="cuatrimestral">Cuatrimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Cantidad contratada</label>
                  <input type="number" min="0" step="0.5" value={formEditar.cantidad_contratada ?? ''}
                    onChange={e => setFormEditar(f => ({ ...f, cantidad_contratada: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Cantidad disponible</label>
                  <input type="number" min="0" step="0.5" value={formEditar.cantidad_disponible ?? ''}
                    onChange={e => setFormEditar(f => ({ ...f, cantidad_disponible: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              {(formEditar.modalidad === 'bajo_demanda' || formEditar.modalidad === 'mixto') && (
                <div>
                  <label className="text-sm text-[#5f6b75]">
                    Límite bajo demanda <span className="text-[#9aa1a9]">(opcional)</span>
                  </label>
                  <input type="number" min="0" step="0.5"
                    value={formEditar.cantidad_demanda_limite ?? ''}
                    onChange={e => setFormEditar(f => ({ ...f, cantidad_demanda_limite: e.target.value }))}
                    placeholder="Sin límite"
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-[#5f6b75]">Fecha inicio</label>
                  <input type="date" value={formEditar.fecha_inicio ?? ''} onChange={e => setFormEditar(f => ({ ...f, fecha_inicio: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
                <div>
                  <label className="text-sm text-[#5f6b75]">Fecha fin</label>
                  <input type="date" value={formEditar.fecha_fin ?? ''} onChange={e => setFormEditar(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div>
                <label className="text-sm text-[#5f6b75]">Estado</label>
                <select value={formEditar.estado ?? 'activo'} onChange={e => setFormEditar(f => ({ ...f, estado: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                  <option value="activo">Activo</option>
                  <option value="suspendido">Suspendido</option>
                  <option value="vencido">Vencido</option>
                  <option value="cerrado">Cerrado</option>
                </select>
              </div>

              <div>
                <label className="text-sm text-[#5f6b75]">Notas</label>
                <textarea value={formEditar.notas ?? ''} onChange={e => setFormEditar(f => ({ ...f, notas: e.target.value }))}
                  rows={2} className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalEditar(false)} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">
                Cancelar
              </button>
              <button
                onClick={guardarEdicion}
                disabled={guardandoEditar}
                className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e] disabled:opacity-50"
              >
                {guardandoEditar ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <label className="text-sm text-[#5f6b75]">Fecha inicio</label>
                <input
                  type="date" lang="es-CR"
                  value={formTarea.fecha}
                  onChange={e => setFormTarea(f => ({ ...f, fecha: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm text-[#5f6b75]">Fecha fin (opcional — para tareas de varios días)</label>
                <input
                  type="date"
                  value={formTarea.fecha_fin}
                  min={formTarea.fecha || undefined}
                  onChange={e => setFormTarea(f => ({ ...f, fecha_fin: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {(!formTarea.fecha_fin || formTarea.fecha_fin === formTarea.fecha) && (
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
              )}
              {contrato?.modalidad === 'mixto' && (
                <div>
                  <label className="text-sm text-[#5f6b75]">Tipo de consumo</label>
                  <select
                    value={formTarea.tipo_consumo}
                    onChange={e => setFormTarea(f => ({ ...f, tipo_consumo: e.target.value }))}
                    className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="contratado">Contratado (descuenta saldo)</option>
                    <option value="bajo_demanda">Bajo demanda (para facturar)</option>
                  </select>
                </div>
              )}
              <div>
                <label className="text-sm text-[#5f6b75]">Descripción</label>
                <textarea
                  value={formTarea.descripcion}
                  onChange={e => setFormTarea(f => ({ ...f, descripcion: e.target.value }))}
                  rows={2}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm resize-none"
                />
              </div>
              <div className="border-t border-[#E8EAEC] pt-3">
                <label className="flex items-center gap-2 text-sm text-[#5f6b75] cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={!!formTarea.recurrencia_tipo}
                    onChange={e => setFormTarea(f => ({ ...f, recurrencia_tipo: e.target.checked ? 'mensual' : '', recurrencia_fin: '' }))}
                  />
                  Tarea recurrente
                </label>
                {formTarea.recurrencia_tipo && (
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm text-[#5f6b75]">Frecuencia</label>
                      <select
                        value={formTarea.recurrencia_tipo}
                        onChange={e => setFormTarea(f => ({ ...f, recurrencia_tipo: e.target.value }))}
                        className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="semanal">Semanal</option>
                        <option value="quincenal">Quincenal</option>
                        <option value="mensual">Mensual</option>
                        <option value="bimensual">Bimensual</option>
                        <option value="trimestral">Trimestral</option>
                        <option value="cuatrimestral">Cuatrimestral</option>
                        <option value="semestral">Semestral</option>
                        <option value="anual">Anual</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm text-[#5f6b75]">Repetir hasta</label>
                      <input
                        type="date"
                        value={formTarea.recurrencia_fin}
                        onChange={e => setFormTarea(f => ({ ...f, recurrencia_fin: e.target.value }))}
                        className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setModalTarea(false)} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">Cancelar</button>
              <button onClick={guardarTarea} className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e]">Guardar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal edición de tarea */}
      {modalEditarTarea && (
        <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-[#2C3A43]">Editar tarea</h3>

            <div>
              <label className="text-sm text-[#5f6b75]">Título *</label>
              <input
                value={formEditarTarea.titulo}
                onChange={e => setFormEditarTarea(f => ({ ...f, titulo: e.target.value }))}
                className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-[#5f6b75]">Fecha inicio</label>
              <input
                type="date"
                value={formEditarTarea.fecha}
                onChange={e => setFormEditarTarea(f => ({ ...f, fecha: e.target.value }))}
                className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-[#5f6b75]">Fecha fin (opcional — para tareas de varios días)</label>
              <input
                type="date"
                value={formEditarTarea.fecha_fin}
                min={formEditarTarea.fecha || undefined}
                onChange={e => setFormEditarTarea(f => ({ ...f, fecha_fin: e.target.value }))}
                className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="text-sm text-[#5f6b75]">Recurso asignado</label>
              <select
                value={formEditarTarea.asignado_id ?? ''}
                onChange={e => {
                  const u = usuarios.find(u => String(u.id) === e.target.value)
                  setFormEditarTarea(f => ({
                    ...f,
                    asignado_id:     e.target.value,
                    asignado_nombre: u?.nombre ?? '',
                  }))
                }}
                className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Sin asignar</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>

            {contrato?.modalidad === 'mixto' && (
              <div>
                <label className="text-sm text-[#5f6b75]">Tipo de consumo</label>
                <select
                  value={formEditarTarea.tipo_consumo ?? 'contratado'}
                  onChange={e => setFormEditarTarea(f => ({ ...f, tipo_consumo: e.target.value }))}
                  className="mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
                >
                  <option value="contratado">Contratado (descuenta saldo)</option>
                  <option value="bajo_demanda">Bajo demanda (para facturar)</option>
                </select>
              </div>
            )}

            {/* Recursos adicionales */}
            <div className="border-t border-[#E8EAEC] pt-3">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-[#5f6b75]">Recursos adicionales</label>
                {!subFormVisible && (
                  <button
                    type="button"
                    onClick={() => {
                      // C1: pre-poblar fechas con la fecha de la tarea para que la validación no falle
                      const fechaTarea = modalEditarTarea?.fecha?.slice(0, 10) || ''
                      setSubFormVisible(true)
                      setSubFormData({ fecha_inicio: fechaTarea, fecha_fin: fechaTarea })
                      setSubDispData(null)
                    }}
                    className="text-xs text-[#4E738A] hover:underline"
                  >
                    + Agregar
                  </button>
                )}
              </div>

              {recursosEnTarea.length > 0 && (
                <div className="space-y-1.5 mb-2">
                  {recursosEnTarea.map(r => (
                    <div key={r.id} className="border border-[#E8EAEC] rounded-lg p-2">
                      {editandoRecurso === r.id ? (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] text-[#5f6b75] mb-0.5">Fecha inicio</label>
                              <input type="date" value={formRecurso.fecha_inicio ?? ''}
                                onChange={e => setFormRecurso(f => ({ ...f, fecha_inicio: e.target.value }))}
                                className="w-full border border-[#E8EAEC] rounded px-2 py-1 text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#5f6b75] mb-0.5">Fecha fin</label>
                              <input type="date" value={formRecurso.fecha_fin ?? ''}
                                onChange={e => setFormRecurso(f => ({ ...f, fecha_fin: e.target.value }))}
                                className="w-full border border-[#E8EAEC] rounded px-2 py-1 text-xs" />
                            </div>
                            <div>
                              <label className="block text-[10px] text-[#5f6b75] mb-0.5">Dedicación (%)</label>
                              <input type="number" min="1" max="100" value={formRecurso.dedicacion_pct ?? 100}
                                onChange={e => setFormRecurso(f => ({ ...f, dedicacion_pct: parseInt(e.target.value) || 100 }))}
                                className="w-full border border-[#E8EAEC] rounded px-2 py-1 text-xs" />
                            </div>
                          </div>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setEditandoRecurso(null)}
                              className="text-xs text-[#5f6b75] hover:text-[#2C3A43]">Cancelar</button>
                            <button type="button" onClick={() => guardarEdicionRecursoServicio(r.id)}
                              className="text-xs bg-[#4E738A] text-white px-3 py-1 rounded hover:bg-[#3d5c70]">Guardar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="text-xs text-[#2C3A43]">{r.usuario_nombre} · {r.tipo_recurso} · {r.dedicacion_pct}%</span>
                            <div className="text-[11px] text-[#9aa1a9] mt-0.5">
                              {r.fecha_inicio ? String(r.fecha_inicio).slice(0,10) : '—'} → {r.fecha_fin ? String(r.fecha_fin).slice(0,10) : '—'}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3 shrink-0">
                            <button type="button"
                              onClick={() => {
                                setFormRecurso({
                                  fecha_inicio:   r.fecha_inicio ? String(r.fecha_inicio).slice(0,10) : '',
                                  fecha_fin:      r.fecha_fin    ? String(r.fecha_fin).slice(0,10)    : '',
                                  dedicacion_pct: r.dedicacion_pct ?? 100,
                                })
                                setEditandoRecurso(r.id)
                              }}
                              className="text-xs text-[#4E738A] hover:underline">Editar</button>
                            <button type="button"
                              onClick={() => eliminarRecursoServicio(r.id)}
                              className="text-[#9aa1a9] hover:text-red-500 text-lg leading-none">×</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {subFormVisible && (
                <div className="bg-[#4E738A]/5 border border-[#4E738A]/20 rounded-lg p-3 space-y-2">
                  <div>
                    <label className="block text-xs text-[#5f6b75] mb-1">Tipo de recurso</label>
                    <select value={subFormData.tipo_recurso || ''}
                      onChange={e => { setSubFormData(f => ({ ...f, tipo_recurso: e.target.value, recurso_id: '' })); setSubDispData(null) }}
                      className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                      <option value="">— Seleccionar —</option>
                      <option value="ingenieria">Ingeniería</option>
                      <option value="planos">Planos</option>
                      <option value="diseno">Diseño</option>
                      <option value="ensamble">Técnico de ensamble</option>
                      <option value="campo">Técnico de campo</option>
                    </select>
                  </div>
                  {subFormData.tipo_recurso && (
                    <div>
                      <label className="block text-xs text-[#5f6b75] mb-1">Recurso</label>
                      <select value={subFormData.recurso_id || ''}
                        onChange={e => { const v = e.target.value; setSubFormData(f => ({ ...f, recurso_id: v })); verificarSubForm({ ...subFormData, recurso_id: v }) }}
                        className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm">
                        <option value="">— Seleccionar —</option>
                        {usuarios.filter(r => r.tipos?.includes(subFormData.tipo_recurso)).map(r => (
                          <option key={r.id} value={r.id}>{r.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs text-[#5f6b75] mb-1">Fecha inicio</label>
                      <input type="date" value={subFormData.fecha_inicio || modalEditarTarea?.fecha?.slice(0,10) || ''}
                        onChange={e => setSubFormData(f => ({ ...f, fecha_inicio: e.target.value }))}
                        className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs text-[#5f6b75] mb-1">Fecha fin</label>
                      <input type="date" value={subFormData.fecha_fin || modalEditarTarea?.fecha?.slice(0,10) || ''}
                        onChange={e => setSubFormData(f => ({ ...f, fecha_fin: e.target.value }))}
                        className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-[#5f6b75] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!subFormData.incluir_fines_semana}
                      onChange={e => setSubFormData(f => ({ ...f, incluir_fines_semana: e.target.checked ? 1 : 0 }))}
                      className="rounded"
                    />
                    Incluir fines de semana
                  </label>
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
                            <p key={i} className="text-orange-600">
                              {s.proyecto_codigo} {s.pm_nombre ? `(${s.pm_nombre})` : ''} — {s.tarea} · {s.dedicacion_pct}%
                            </p>
                          ))}
                          <label className="flex items-center gap-2 mt-2 cursor-pointer">
                            <input type="checkbox" checked={!!subFormData.forzar} onChange={e => setSubFormData(f => ({ ...f, forzar: e.target.checked }))} className="accent-[#EE7623]" />
                            <span className="text-orange-700 font-medium">Forzar asignación</span>
                          </label>
                          {subFormData.forzar && (
                            <div><label className="block text-xs text-gray-500 mb-1">Nota para el PM</label>
                              <input value={subFormData.conflicto_nota || ''} onChange={e => setSubFormData(f => ({ ...f, conflicto_nota: e.target.value }))} className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm" placeholder="Razón del solapamiento..." /></div>
                          )}
                        </div>
                  )}

                  {errorRecurso && (
                    <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{errorRecurso}</p>
                  )}
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => { setSubFormVisible(false); setSubFormData({}); setSubDispData(null) }}
                      className="text-xs text-[#5f6b75] hover:text-[#2C3A43]">Cancelar</button>
                    <button type="button" onClick={agregarRecursoServicio}
                      className="text-xs bg-[#4E738A] text-white px-3 py-1 rounded hover:bg-[#3d5c70]">Agregar</button>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setModalEditarTarea(null)}
                className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]"
              >
                Cancelar
              </button>
              <button
                onClick={guardarEditarTarea}
                disabled={guardandoEditarTarea || !formEditarTarea.titulo.trim()}
                className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e] disabled:opacity-50"
              >
                {guardandoEditarTarea ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmación eliminar tarea */}
      {confirmandoEliminarTarea && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-[#2C3A43] mb-2">Eliminar tarea</h3>
            <p className="text-sm text-[#5f6b75] mb-5">
              ¿Eliminar la tarea "{confirmandoEliminarTarea.titulo}"? Esto desactivará los recursos asignados y cancelará el ticket asociado si existe. Esta acción no se puede deshacer desde aquí.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setConfirmandoEliminarTarea(null)}
                className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]"
              >
                Cancelar
              </button>
              <button
                onClick={() => { const t = confirmandoEliminarTarea; setConfirmandoEliminarTarea(null); eliminarTarea(t) }}
                className="px-4 py-2 bg-[#d9534f] hover:bg-red-700 text-white text-sm rounded-lg"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal propagación a serie */}
      {modalPropagar && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h3 className="font-semibold text-[#2C3A43] mb-2">Tarea recurrente</h3>
            <p className="text-sm text-[#5f6b75] mb-5">¿Modificar solo esta instancia o toda la serie?</p>
            {errorRecurso && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5 mb-2">{errorRecurso}</p>
            )}
            <div className="flex flex-col gap-2">
              <button
                onClick={async () => {
                  if (modalPropagar.accion === 'agregar') {
                    // C2: agregar recurso solo a esta instancia
                    try {
                      const r = await fetch(`${CP_API}/api/recursos`, {
                        method:  'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
                        body:    JSON.stringify(modalPropagar.recurso),
                      })
                      if (r.ok) {
                        const nuevo = await r.json()
                        setRecursosEnTarea(list => [...list, nuevo])
                        setSubFormVisible(false)
                        setSubFormData({})
                        setSubDispData(null)
                      } else {
                        const err = await r.json().catch(() => ({}))
                        setErrorRecurso(err.error || 'Error al agregar el recurso')
                      }
                    } catch (e) { console.error('[modalPropagar agregar instancia]', e) }
                    setModalPropagar(null)
                  } else if (modalPropagar.accion === 'eliminar') {
                    // C2: eliminar recurso solo de esta instancia
                    try {
                      await fetch(`${CP_API}/api/recursos/${modalPropagar.recurso.id}`, {
                        method:  'DELETE',
                        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
                      })
                      setRecursosEnTarea(list => list.filter(x => x.id !== modalPropagar.recurso.id))
                    } catch (e) { console.error('[modalPropagar eliminar instancia]', e) }
                    setModalPropagar(null)
                  } else {
                    // Cambio de campo (estado, etc.) — comportamiento original
                    aplicarCambioSerie(modalPropagar.tarea, modalPropagar.campo, modalPropagar.valor, true)
                  }
                }}
                className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e]"
              >
                Solo esta instancia
              </button>
              <button
                onClick={async () => {
                  if (modalPropagar.accion === 'agregar') {
                    // C2: agregar recurso a todas las instancias pendientes/en_progreso de la serie
                    try {
                      const padreId = modalPropagar.tarea.recurrencia_padre_id ?? modalPropagar.tarea.id
                      const instRes = await fetch(`${CP_API}/api/servicios/tareas/serie/${padreId}/instancias`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` }
                      })
                      if (instRes.ok) {
                        const instancias = await instRes.json()
                        for (const inst of instancias) {
                          const fechaInst = inst.fecha ? String(inst.fecha).slice(0, 10) : modalPropagar.recurso.fecha_inicio
                          await fetch(`${CP_API}/api/recursos`, {
                            method:  'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
                            body:    JSON.stringify({
                              ...modalPropagar.recurso,
                              servicio_tarea_id: inst.id,
                              fecha_inicio:      fechaInst,
                              fecha_fin:         fechaInst,
                            }),
                          }).catch(() => {})
                        }
                      } else {
                        const err = await instRes.json().catch(() => ({}))
                        setErrorRecurso(err.error || 'Error al agregar el recurso')
                      }
                      // Recargar recursos de la tarea actual
                      const r = await fetch(`${CP_API}/api/recursos/servicio-tarea/${modalPropagar.tarea.id}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` }
                      })
                      if (r.ok) setRecursosEnTarea(await r.json())
                      setSubFormVisible(false)
                      setSubFormData({})
                      setSubDispData(null)
                    } catch (e) { console.error('[modalPropagar agregar serie]', e) }
                    setModalPropagar(null)
                  } else if (modalPropagar.accion === 'eliminar') {
                    // C2: eliminar recurso de todas las instancias pendientes/en_progreso de la serie
                    try {
                      const padreId = modalPropagar.tarea.recurrencia_padre_id ?? modalPropagar.tarea.id
                      await fetch(`${CP_API}/api/servicios/tareas/serie/${padreId}/recursos/${modalPropagar.recurso.usuario_id}`, {
                        method:  'DELETE',
                        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
                      })
                      const r = await fetch(`${CP_API}/api/recursos/servicio-tarea/${modalPropagar.tarea.id}`, {
                        headers: { Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` }
                      })
                      if (r.ok) setRecursosEnTarea(await r.json())
                    } catch (e) { console.error('[modalPropagar eliminar serie]', e) }
                    setModalPropagar(null)
                  } else {
                    // Cambio de campo (estado, etc.) — comportamiento original
                    aplicarCambioSerie(modalPropagar.tarea, modalPropagar.campo, modalPropagar.valor, false)
                  }
                }}
                className="px-4 py-2 border border-[#4E738A] text-[#4E738A] text-sm rounded-lg hover:bg-[#4E738A]/5"
              >
                Toda la serie (pendientes y en progreso)
              </button>
              <button onClick={() => setModalPropagar(null)} className="text-sm text-[#5f6b75] hover:text-[#2C3A43] mt-1">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
