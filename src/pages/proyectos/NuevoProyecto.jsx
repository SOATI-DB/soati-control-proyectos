import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getUsuarios, getIngenieros } from '../../services/api'

const BASE      = import.meta.env.VITE_API_URL      || 'http://localhost:3011'
const SHELL_API = import.meta.env.VITE_SHELL_API_URL || 'http://localhost:3001'
const token = () => localStorage.getItem('soati_shell_token')

async function cargarProyectosShell() {
  const res = await fetch(`${SHELL_API}/api/proyectos`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  if (!res.ok) return []
  const data = await res.json()
  return Array.isArray(data) ? data : []
}

function extraerClienteCodigo(codigo) {
  if (!codigo) return ''
  const partes = codigo.split('-CL-')
  return partes.length > 1 ? partes[1].slice(0, 4).toUpperCase() : ''
}

function campoReq() {
  return <span className="text-red-500 ml-0.5">*</span>
}

export default function NuevoProyecto() {
  const navigate     = useNavigate()
  const nombreRef    = useRef(null)
  const wrapperRef   = useRef(null)

  const [guardando,      setGuardando]      = useState(false)
  const [errores,        setErrores]        = useState({})
  const [usuarios,       setUsuarios]       = useState([])
  const [ingenieros,     setIngenieros]     = useState([])
  const [todosProyectos, setTodosProyectos] = useState([])
  const [sugerencias,    setSugerencias]    = useState([])
  const [mostrarLista,   setMostrarLista]   = useState(false)

  const [form, setForm] = useState({
    codigo:             '',
    nombre:             '',
    tipo_contratacion:  'contratacion_privada',
    cliente_nombre:     '',
    cliente_codigo:     '',
    pm_id:              '',
    ingeniero_cargo_id: '',
    lugar_geografico:   '',
    fecha_inicio_plan:  '',
    fecha_entrega_plan: '',
    presupuesto_usd:    '',
    requiere_diseno:    false,
    requiere_planos:    false,
    descripcion:        '',
    shell_proyecto_id:  null,
  })

  useEffect(() => {
    getUsuarios().then(setUsuarios)
    getIngenieros().then(setIngenieros)
    cargarProyectosShell().then(setTodosProyectos).catch(() => {})
  }, [])

  useEffect(() => {
    function onClickOut(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setMostrarLista(false)
      }
    }
    document.addEventListener('mousedown', onClickOut)
    return () => document.removeEventListener('mousedown', onClickOut)
  }, [])

  function handleNombreChange(valor) {
    setField('nombre', valor)
    const q = valor.trim().toLowerCase()
    if (!q) { setSugerencias([]); setMostrarLista(false); return }
    const filtrados = todosProyectos
      .filter(p => p.codigo?.toLowerCase().includes(q) || p.nombre?.toLowerCase().includes(q))
      .slice(0, 10)
    setSugerencias(filtrados)
    setMostrarLista(true)
  }

  function seleccionarDesdeShell(p) {
    setMostrarLista(false)
    setSugerencias([])
    setForm(f => ({
      ...f,
      codigo:            p.codigo                       || f.codigo,
      nombre:            p.nombre                       || f.nombre,
      cliente_nombre:    p.cliente                      || f.cliente_nombre,
      cliente_codigo:    extraerClienteCodigo(p.codigo) || f.cliente_codigo,
      shell_proyecto_id: p.id ?? null,
    }))
    setErrores({})
  }

  function cerrarYContinuar() {
    setMostrarLista(false)
    setSugerencias([])
  }

  function setField(k, v) {
    setForm(f => ({ ...f, [k]: v }))
    if (errores[k]) setErrores(e => ({ ...e, [k]: null }))
  }

  function validar() {
    const e = {}
    if (!form.codigo.trim())         e.codigo         = 'Requerido'
    if (!form.nombre.trim())         e.nombre         = 'Requerido'
    if (!form.tipo_contratacion)     e.tipo_contratacion = 'Requerido'
    if (!form.cliente_nombre.trim()) e.cliente_nombre = 'Requerido'
    if (!form.cliente_codigo.trim()) e.cliente_codigo = 'Requerido'
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function guardar(e) {
    e.preventDefault()
    if (!validar()) return
    setGuardando(true)
    try {
      const pmSel  = usuarios.find(u => String(u.id) === String(form.pm_id))
      const ingSel = ingenieros.find(u => String(u.id) === String(form.ingeniero_cargo_id))

      const body = {
        codigo:                 form.codigo.trim(),
        nombre:                 form.nombre.trim(),
        tipo_contratacion:      form.tipo_contratacion,
        cliente_nombre:         form.cliente_nombre.trim(),
        cliente_codigo:         form.cliente_codigo.trim().toUpperCase(),
        pm_id:                  form.pm_id || null,
        pm_nombre:              pmSel?.nombre || null,
        ingeniero_cargo_id:     form.ingeniero_cargo_id || null,
        ingeniero_cargo_nombre: ingSel?.nombre || null,
        lugar_geografico:       form.lugar_geografico.trim() || null,
        fecha_inicio_plan:      form.fecha_inicio_plan  || null,
        fecha_entrega_plan:     form.fecha_entrega_plan || null,
        presupuesto_usd:        form.presupuesto_usd ? parseFloat(form.presupuesto_usd) : null,
        requiere_diseno:        form.requiere_diseno,
        requiere_planos:        form.requiere_planos,
        descripcion:            form.descripcion.trim() || null,
        shell_proyecto_id:      form.shell_proyecto_id  ?? null,
      }

      const r = await fetch(`${BASE}/api/proyectos`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body:    JSON.stringify(body),
      })
      const data = await r.json()
      if (!r.ok) {
        setErrores({ _general: data.error || 'Error al crear el proyecto' })
        setGuardando(false)
        return
      }
      navigate('/proyectos')
    } catch {
      setErrores({ _general: 'Error al guardar el proyecto' })
      setGuardando(false)
    }
  }

  const inp = (k) =>
    `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30 ${errores[k] ? 'border-red-400' : 'border-gray-300'}`

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate('/proyectos')} className="text-[#4E738A] hover:underline text-sm">
          Proyectos
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-sm text-gray-600">Nuevo proyecto</span>
      </div>

      <h2 className="text-lg font-semibold text-[#2c3e50] mb-6">Nuevo proyecto</h2>

      {errores._general && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">
          {errores._general}
        </div>
      )}

      <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-sm font-semibold text-[#2c3e50] mb-4">Datos del proyecto</h3>
          <div className="space-y-4">

            {/* Nombre — doble función: busca en shell y es el campo del formulario */}
            <div ref={wrapperRef} className="relative">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre del proyecto {campoReq()}
              </label>
              <input
                ref={nombreRef}
                value={form.nombre}
                onChange={e => handleNombreChange(e.target.value)}
                onFocus={() => { if (sugerencias.length > 0) setMostrarLista(true) }}
                className={inp('nombre')}
                placeholder="Buscá por nombre o código, o escribí directamente…"
                autoComplete="off"
              />
              {errores.nombre && <p className="text-red-500 text-xs mt-1">{errores.nombre}</p>}

              {mostrarLista && (
                <ul className="absolute z-20 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                  {sugerencias.map(p => (
                    <li
                      key={p.id ?? p.codigo}
                      onMouseDown={() => seleccionarDesdeShell(p)}
                      className="px-4 py-2.5 hover:bg-[#4E738A]/5 cursor-pointer border-b border-gray-50 last:border-0"
                    >
                      <span className="font-mono text-xs text-[#4E738A] font-semibold mr-2">{p.codigo}</span>
                      <span className="text-sm text-gray-700">{p.nombre}</span>
                      {p.cliente && <div className="text-xs text-gray-400 mt-0.5">{p.cliente}</div>}
                    </li>
                  ))}
                  <li
                    onMouseDown={cerrarYContinuar}
                    className="px-4 py-2.5 cursor-pointer hover:bg-orange-50 flex items-center gap-2 text-xs text-[#EE7623] font-medium border-t border-gray-100"
                  >
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                    No encontrado — continuar manualmente
                  </li>
                </ul>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Código del proyecto {campoReq()}
              </label>
              <input
                value={form.codigo}
                onChange={e => setField('codigo', e.target.value)}
                className={inp('codigo')}
                placeholder="P26-000387-CL-ACOS"
              />
              {errores.codigo && <p className="text-red-500 text-xs mt-1">{errores.codigo}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Tipo de contratación {campoReq()}
              </label>
              <select
                value={form.tipo_contratacion}
                onChange={e => setField('tipo_contratacion', e.target.value)}
                className={inp('tipo_contratacion')}
              >
                <option value="contratacion_privada">Contratación Privada</option>
                <option value="licitacion_publica">Licitación Pública</option>
                <option value="otra">Otra</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cliente nombre {campoReq()}
                </label>
                <input
                  value={form.cliente_nombre}
                  onChange={e => setField('cliente_nombre', e.target.value)}
                  className={inp('cliente_nombre')}
                  placeholder="Nombre del cliente"
                />
                {errores.cliente_nombre && <p className="text-red-500 text-xs mt-1">{errores.cliente_nombre}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Código cliente {campoReq()}
                </label>
                <input
                  value={form.cliente_codigo}
                  onChange={e => setField('cliente_codigo', e.target.value.toUpperCase())}
                  className={inp('cliente_codigo')}
                  placeholder="ACOS"
                  maxLength={4}
                />
                {errores.cliente_codigo && <p className="text-red-500 text-xs mt-1">{errores.cliente_codigo}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 pb-4">
          <h3 className="text-sm font-semibold text-[#2c3e50] mb-4">Asignación y fechas</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">PM asignado</label>
                <select
                  value={form.pm_id}
                  onChange={e => setField('pm_id', e.target.value)}
                  className={inp('pm_id')}
                >
                  <option value="">Sin asignar</option>
                  {usuarios.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Ingeniero a cargo</label>
                <select
                  value={form.ingeniero_cargo_id}
                  onChange={e => setField('ingeniero_cargo_id', e.target.value)}
                  className={inp('ingeniero_cargo_id')}
                >
                  <option value="">Sin asignar</option>
                  {ingenieros.map(u => (
                    <option key={u.id} value={u.id}>{u.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Lugar geográfico</label>
              <input
                value={form.lugar_geografico}
                onChange={e => setField('lugar_geografico', e.target.value)}
                className={inp('lugar_geografico')}
                placeholder="Ej: San José, Costa Rica"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha inicio planificada</label>
                <input
                  type="date"
                  value={form.fecha_inicio_plan}
                  onChange={e => setField('fecha_inicio_plan', e.target.value)}
                  className={inp('fecha_inicio_plan')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fecha entrega planificada</label>
                <input
                  type="date"
                  value={form.fecha_entrega_plan}
                  onChange={e => setField('fecha_entrega_plan', e.target.value)}
                  className={inp('fecha_entrega_plan')}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-[#2c3e50] mb-4">Detalles adicionales</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Presupuesto (USD)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.presupuesto_usd}
                onChange={e => setField('presupuesto_usd', e.target.value)}
                className={inp('presupuesto_usd')}
                placeholder="0.00"
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiere_diseno}
                  onChange={e => setField('requiere_diseno', e.target.checked)}
                  className="accent-[#4E738A] w-4 h-4"
                />
                Requiere diseño gráfico
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiere_planos}
                  onChange={e => setField('requiere_planos', e.target.checked)}
                  className="accent-[#4E738A] w-4 h-4"
                />
                Requiere planos
              </label>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción / alcance</label>
              <textarea
                value={form.descripcion}
                onChange={e => setField('descripcion', e.target.value)}
                rows={4}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30"
                placeholder="Descripción del alcance del proyecto..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <button
            type="button"
            onClick={() => navigate('/proyectos')}
            className="px-4 py-2 text-sm border border-[#E8EAEC] text-[#6B7A83] rounded-lg hover:bg-[#F4F5F6] transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={guardando}
            className="px-6 py-2 text-sm border-[1.5px] border-[#4E738A] text-[#4E738A] rounded-lg hover:bg-[#4E738A] hover:text-white disabled:opacity-40 transition-all"
          >
            {guardando ? 'Guardando...' : 'Guardar proyecto'}
          </button>
        </div>
      </form>
    </div>
  )
}
