import { useEffect, useState } from 'react'
import { getTransferenciasPendientes, getTransferenciaPendiente } from '../../services/api'
import { formatFecha, formatFechaHora } from '../../utils/fecha'

const BASE_COMERCIAL = import.meta.env.VITE_COMERCIAL_API_URL || 'http://localhost:3017'
const token = () => localStorage.getItem('soati_shell_token')

async function revisarTransferencia(id, data) {
  const r = await fetch(`${BASE_COMERCIAL}/api/transferencias/${id}/revisar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
    body: JSON.stringify(data),
  })
  return r.json()
}

async function descargarAdjunto(id, nombre) {
  const res = await fetch(`${BASE_COMERCIAL}/api/adjuntos/${id}/descargar`, {
    headers: { Authorization: `Bearer ${token()}` },
  })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url; link.download = nombre; link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const SUBTABS = [
  { key: 'pendientes', label: 'Pendientes',  estados: ['enviada', 'en_revision'] },
  { key: 'aprobadas',  label: 'Aprobadas',   estados: ['aprobada'] },
  { key: 'rechazadas', label: 'Rechazadas',  estados: ['rechazada'] },
]

const ESTADO_ESTILOS = {
  enviada:     'bg-blue-100 text-blue-700',
  en_revision: 'bg-yellow-100 text-yellow-700',
  aprobada:    'bg-green-100 text-green-700',
  rechazada:   'bg-red-100 text-red-700',
}

const ESTADO_LABEL = {
  enviada:     'Enviada',
  en_revision: 'En revisión',
  aprobada:    'Aprobada',
  rechazada:   'Rechazada',
}

export default function TransferenciasPendientes() {
  const [transferencias, setTransferencias] = useState([])
  const [cargando, setCargando] = useState(true)
  const [subTab, setSubTab] = useState('pendientes')
  const [modal, setModal] = useState(null)
  const [detalle, setDetalle] = useState(null)
  const [comentario, setComentario] = useState('')
  const [pmId, setPmId] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [usuarios, setUsuarios] = useState([])

  const SHELL_API = import.meta.env.VITE_SHELL_API_URL ?? 'http://localhost:3001'

  useEffect(() => {
    fetch(`${SHELL_API}/api/users/pms`, {
      headers: { Authorization: `Bearer ${token()}` }
    }).then(r => r.json()).then(data => setUsuarios(Array.isArray(data) ? data : [])).catch(() => {})
  }, [])

  const extraer = (res) => {
    if (Array.isArray(res)) return res
    if (res?.value && Array.isArray(res.value)) return res.value
    return []
  }

  function cargar() {
    setCargando(true)
    Promise.all([
      getTransferenciasPendientes({ estado: 'enviada' }),
      getTransferenciasPendientes({ estado: 'en_revision' }),
      getTransferenciasPendientes({ estado: 'aprobada' }),
      getTransferenciasPendientes({ estado: 'rechazada' }),
    ]).then(([env, rev, apr, rec]) => {
      const all = [
        ...extraer(env),
        ...extraer(rev),
        ...extraer(apr),
        ...extraer(rec),
      ]
      setTransferencias(all)
      setCargando(false)
    }).catch(() => setCargando(false))
  }

  useEffect(() => { cargar() }, [])

  const tab = SUBTABS.find(t => t.key === subTab)
  const lista = transferencias.filter(t => tab.estados.includes(t.estado))

  async function abrirDetalle(t) {
    setModal(t)
    setComentario('')
    setPmId('')
    setResultado(null)
    const d = await getTransferenciaPendiente(t.id)
    setDetalle(d)
    if (d.pm_id) setPmId(d.pm_id)
  }

  async function ejecutarAccion(accion) {
    if (!modal) return
    if (accion === 'aprobar' && !pmId) {
      setResultado({ ok: false, error: 'Debe seleccionar un PM para aprobar' })
      return
    }
    setProcesando(true)
    const r = await revisarTransferencia(modal.id, { accion, comentario, pm_id: pmId || null })
    setProcesando(false)
    if (r.ok) {
      setResultado({ ok: true, accion, codigo: r.codigo })
      await cargar()
    } else {
      setResultado({ ok: false, error: r.error })
    }
  }

  if (cargando) return <div className="flex items-center justify-center py-16 text-[#5f6b75] text-sm">Cargando...</div>

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2c3e50] mb-4">Transferencias</h2>

      {/* Sub-tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        {SUBTABS.map(t => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              subTab === t.key
                ? 'border-[#4E738A] text-[#4E738A]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              subTab === t.key ? 'bg-[#4E738A]/10 text-[#4E738A]' : 'bg-gray-100 text-gray-500'
            }`}>
              {transferencias.filter(x => t.estados.includes(x.estado)).length}
            </span>
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-[#5f6b75] text-sm">
          {subTab === 'pendientes'
            ? 'No hay transferencias pendientes de revisión.'
            : subTab === 'aprobadas'
              ? 'No hay transferencias aprobadas.'
              : 'No hay transferencias rechazadas.'}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Número</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Proyecto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Cliente</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Enviada por</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Fecha envío</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Estado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {lista.map(t => (
                <tr key={t.id}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{t.numero_trans}</td>
                  <td className="px-4 py-3 font-medium text-[#2c3e50]">{t.nombre_proyecto}</td>
                  <td className="px-4 py-3 text-gray-600">{t.cliente_nombre || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{t.creado_por_nombre || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{formatFechaHora(t.fecha_envio)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ESTADO_ESTILOS[t.estado] || 'bg-gray-100 text-gray-600'}`}>
                      {ESTADO_LABEL[t.estado] || t.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => abrirDetalle(t)}
                      className="text-xs text-[#4E738A] border border-[#4E738A] px-3 py-1.5 rounded-lg hover:bg-[#4E738A]/5"
                    >
                      {subTab === 'pendientes' ? 'Revisar' : 'Ver detalle'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de revisión / detalle */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4 py-8">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-[#2c3e50]">{modal.nombre_proyecto}</h3>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-600">
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {!detalle && <p className="text-sm text-gray-400">Cargando detalle...</p>}

              {detalle && (() => {
                const fmt = v => v != null ? `$${parseFloat(v).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'
                const siNo = v => v === 1 ? 'Sí' : v === 0 ? 'No' : '—'
                return <>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ['Número', detalle.numero_trans],
                    ['Cliente', detalle.cliente_nombre],
                    ['Tipo', detalle.tipo_contratacion?.replace(/_/g,' ')],
                    ['Lugar', detalle.lugar_geografico],
                    ['Inicio est.', formatFecha(detalle.fecha_inicio_est)],
                    ['Entrega est.', formatFecha(detalle.fecha_entrega_est)],
                    ['Cotización', detalle.cotizacion_ref],
                    ['Licitación', detalle.numero_licitacion],
                    ['No. OC CRM', detalle.numero_oc_crm],
                  ].map(([l, v]) => v ? (
                    <div key={l}>
                      <p className="text-xs text-gray-400">{l}</p>
                      <p className="text-[#2c3e50]">{v}</p>
                    </div>
                  ) : null)}
                </div>

                {detalle.descripcion_acuerdos && (
                  <div>
                    <p className="text-xs text-gray-400 mb-1">Acuerdos</p>
                    <p className="text-sm text-[#2c3e50] whitespace-pre-wrap">{detalle.descripcion_acuerdos}</p>
                  </div>
                )}

                {(detalle.proveedor_nombre || detalle.presupuesto_bruto != null || detalle.subcontrato_mo != null) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Proveedor y recursos</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      {detalle.proveedor_nombre && (
                        <div>
                          <p className="text-xs text-gray-400">Proveedor</p>
                          <p className="text-[#2c3e50]">{detalle.proveedor_nombre}</p>
                        </div>
                      )}
                      {detalle.presupuesto_bruto != null && (
                        <div>
                          <p className="text-xs text-gray-400">Presupuesto bruto</p>
                          <p className="text-[#2c3e50]">{fmt(detalle.presupuesto_bruto)}</p>
                        </div>
                      )}
                      {[
                        ['Subcontrato MO', siNo(detalle.subcontrato_mo)],
                        ['Requiere diseño', siNo(detalle.requiere_diseno)],
                        ['Técnico campo', siNo(detalle.requiere_tecnico_campo)],
                        ['Ensamble', siNo(detalle.requiere_ensamble)],
                      ].map(([l, v]) => (
                        <div key={l}>
                          <p className="text-xs text-gray-400">{l}</p>
                          <p className="text-[#2c3e50]">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(detalle.costo_licenciamiento != null || detalle.costo_equipos != null || detalle.costo_accesorios != null || detalle.costo_subcontrato != null || detalle.costo_viaticos != null || detalle.otros_costos != null || detalle.imprevistos != null || detalle.presupuesto_total_sin_mo != null) && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Presupuesto detallado</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden text-sm">
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-100">
                          {[
                            ['Licenciamiento', detalle.costo_licenciamiento],
                            ['Equipos', detalle.costo_equipos],
                            ['Accesorios', detalle.costo_accesorios],
                            ['Subcontrato', detalle.costo_subcontrato],
                            ['Viáticos', detalle.costo_viaticos],
                            ['Otros costos', detalle.otros_costos],
                            ['Imprevistos', detalle.imprevistos],
                          ].filter(([, v]) => v != null).map(([l, v]) => (
                            <tr key={l} className="hover:bg-gray-50">
                              <td className="px-3 py-1.5 text-gray-500 text-xs">{l}</td>
                              <td className="px-3 py-1.5 text-right font-medium text-[#2c3e50]">{fmt(v)}</td>
                            </tr>
                          ))}
                          {detalle.otros_costos_detalle && (
                            <tr><td colSpan="2" className="px-3 py-1 text-xs text-gray-400 italic">{detalle.otros_costos_detalle}</td></tr>
                          )}
                          {detalle.presupuesto_total_sin_mo != null && (
                            <tr className="bg-gray-50 font-semibold">
                              <td className="px-3 py-2 text-xs text-[#2c3e50]">Total sin MO SOATI</td>
                              <td className="px-3 py-2 text-right text-[#2c3e50]">{fmt(detalle.presupuesto_total_sin_mo)}</td>
                            </tr>
                          )}
                          {detalle.costo_mo_soati != null && (
                            <tr>
                              <td className="px-3 py-1.5 text-xs text-gray-500">Costo MO SOATI</td>
                              <td className="px-3 py-1.5 text-right font-medium text-[#2c3e50]">{fmt(detalle.costo_mo_soati)}</td>
                            </tr>
                          )}
                          {detalle.ganancia_esperada != null && (
                            <tr className="bg-green-50">
                              <td className="px-3 py-2 text-xs text-green-700 font-semibold">Ganancia esperada</td>
                              <td className="px-3 py-2 text-right font-bold text-green-700">{fmt(detalle.ganancia_esperada)}</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {detalle.contactos?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Contactos</p>
                    <div className="space-y-1">
                      {detalle.contactos.map(c => (
                        <div key={c.id} className="p-2 border border-gray-100 rounded-lg text-sm">
                          <p className="font-medium text-[#2c3e50]">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{[c.cargo, c.email, c.telefono].filter(Boolean).join(' · ')}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detalle.adjuntos?.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Adjuntos</p>
                    <div className="space-y-1">
                      {detalle.adjuntos.map(a => (
                        <div key={a.id} className="flex items-center justify-between p-2 border border-gray-100 rounded-lg text-sm">
                          <span className="text-[#2c3e50]">{a.nombre_original}</span>
                          <button onClick={() => descargarAdjunto(a.id, a.nombre_original)} className="text-xs text-[#4E738A] hover:text-[#3d5c70]">Descargar</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {resultado && (
                  <div className={`rounded-lg px-4 py-3 text-sm ${resultado.ok ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
                    {resultado.ok
                      ? resultado.accion === 'aprobar'
                        ? `Aprobada. Proyecto creado: ${resultado.codigo}`
                        : resultado.accion === 'rechazar'
                          ? 'Transferencia rechazada.'
                          : 'Se solicitaron correcciones.'
                      : resultado.error}
                  </div>
                )}

                {subTab === 'pendientes' && !resultado && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">PM asignado — requerido al aprobar</label>
                      <select
                        value={pmId}
                        onChange={e => setPmId(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30"
                      >
                        <option value="">— Seleccionar PM —</option>
                        {usuarios.map(u => (
                          <option key={u.id} value={u.id}>{u.nombre}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Comentario</label>
                      <textarea
                        value={comentario}
                        onChange={e => setComentario(e.target.value)}
                        rows={3}
                        placeholder="Motivo o comentario (requerido para rechazar o pedir correcciones)"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30"
                      />
                    </div>
                  </>
                )}
              </>
              })()}
            </div>

            {subTab === 'pendientes' && !resultado && detalle && (
              <div className="px-6 py-4 border-t border-gray-100 flex gap-2 justify-end">
                <button
                  onClick={() => ejecutarAccion('rechazar')}
                  disabled={procesando || !comentario.trim()}
                  className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-40"
                >
                  Rechazar
                </button>
                {modal.estado === 'enviada' && (
                  <button
                    onClick={() => ejecutarAccion('correccion')}
                    disabled={procesando || !comentario.trim()}
                    className="px-4 py-2 text-sm bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:opacity-40"
                  >
                    Pedir correcciones
                  </button>
                )}
                <button
                  onClick={() => ejecutarAccion('aprobar')}
                  disabled={procesando}
                  className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-40"
                >
                  {procesando ? 'Procesando...' : 'Aprobar'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
