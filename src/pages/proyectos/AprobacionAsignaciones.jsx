import { useEffect, useState } from 'react'
import { getAsignaciones, aprobarAsignacion, rechazarAsignacion, cancelarAsignacion } from '../../services/api'
import { formatFecha, formatFechaHora } from '../../utils/fecha'

const ESTADO_ESTILOS = {
  pendiente: 'bg-yellow-100 text-yellow-700',
  aprobada:  'bg-green-100 text-green-700',
  rechazada: 'bg-red-100 text-red-700',
}

const ESTADO_LABEL = { pendiente: 'Pendiente', aprobada: 'Aprobada', rechazada: 'Rechazada' }

/** Texto de un choque: con qué proyecto o servicio y tarea choca y en qué fechas */
function textoChoque(c) {
  return `${c.proyecto_codigo ?? '—'} — ${c.tarea} (${formatFecha(c.fecha_inicio)} al ${formatFecha(c.fecha_fin)})${c.pm_nombre ? ` · PM ${c.pm_nombre}` : ''}`
}

/** Pantalla de asignaciones forzadas: quien aprueba ve "Por aprobar" y "Resueltas"; todos ven sus propias solicitudes */
export default function AprobacionAsignaciones({ puedeAprobar }) {
  const subtabs = puedeAprobar
    ? [{ key: 'pendientes', label: 'Por aprobar' }, { key: 'resueltas', label: 'Resueltas' }, { key: 'mias', label: 'Mis solicitudes' }]
    : [{ key: 'mias', label: 'Mis solicitudes' }]
  const [vista, setVista] = useState(subtabs[0].key)
  const [lista, setLista] = useState([])
  const [cargando, setCargando] = useState(true)
  const [accion, setAccion] = useState(null) // { tipo: 'aprobar' | 'rechazar' | 'cancelar', sol }
  const [motivo, setMotivo] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')

  /** Carga la lista de la vista activa */
  function cargar(v = vista) {
    setCargando(true)
    getAsignaciones(v)
      .then(d => setLista(Array.isArray(d) ? d : []))
      .catch(() => setLista([]))
      .finally(() => setCargando(false))
  }

  useEffect(() => { cargar(vista) }, [vista])

  /** Abre la ventana de confirmación de una acción sobre una solicitud */
  function abrir(tipo, sol) {
    setAccion({ tipo, sol })
    setMotivo('')
    setError('')
  }

  /** Ejecuta la acción confirmada (aprobar, rechazar con motivo o cancelar) y recarga la lista */
  async function confirmar() {
    if (!accion) return
    if (accion.tipo === 'rechazar' && !motivo.trim()) { setError('Escribí el motivo del rechazo'); return }
    setProcesando(true)
    setError('')
    try {
      const { ok, data } = accion.tipo === 'aprobar' ? await aprobarAsignacion(accion.sol.id)
        : accion.tipo === 'rechazar' ? await rechazarAsignacion(accion.sol.id, motivo.trim())
        : await cancelarAsignacion(accion.sol.id)
      if (!ok) { setError(data?.error ?? 'No se pudo completar la acción'); return }
      setAccion(null)
      cargar()
    } catch {
      setError('Error de conexión')
    } finally {
      setProcesando(false)
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-[#2c3e50] mb-4">Asignaciones forzadas</h2>

      <div className="flex border-b border-gray-200 mb-6">
        {subtabs.map(t => (
          <button
            key={t.key}
            onClick={() => setVista(t.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              vista === t.key ? 'border-[#4E738A] text-[#4E738A]' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex items-center justify-center py-16 text-[#5f6b75] text-sm">Cargando...</div>
      ) : lista.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-[#5f6b75] text-sm">
          {vista === 'pendientes' ? 'No hay solicitudes por aprobar.' : vista === 'resueltas' ? 'No hay solicitudes resueltas en los últimos 60 días.' : 'No tenés solicitudes.'}
        </div>
      ) : (
        <div className="space-y-4">
          {lista.map(s => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[#2c3e50]">#{s.id} · {s.resumen}</p>
                  <p className="text-xs text-[#5f6b75] mt-0.5">
                    {[s.contexto?.codigo, s.contexto?.nombre].filter(Boolean).join(' — ') || '—'}
                    {s.contexto?.tarea ? ` · Tarea: ${s.contexto.tarea}` : ''}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full whitespace-nowrap ${ESTADO_ESTILOS[s.estado] ?? ''}`}>
                  {ESTADO_LABEL[s.estado] ?? s.estado}
                </span>
              </div>

              <p className="text-xs text-[#5f6b75]">La pidió {s.solicitado_por_nombre} · {formatFechaHora(s.solicitado_en)}</p>

              <div className="text-sm">
                <p className="text-xs font-medium text-[#5f6b75] mb-1">Justificación del PM</p>
                <p className="text-[#2c3e50] whitespace-pre-wrap">{s.justificacion}</p>
              </div>

              <div>
                <p className="text-xs font-medium text-[#5f6b75] mb-1">Choca con</p>
                <ul className="text-sm text-[#2c3e50] space-y-1">
                  {(s.detalle_choque ?? []).map((c, i) => (
                    <li key={i} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">{textoChoque(c)}</li>
                  ))}
                </ul>
                {s.estado === 'pendiente' && s.choque_actual && (
                  s.choque_actual.length === 0
                    ? <p className="text-xs text-green-700 mt-2">Hoy ya no hay choque con otras asignaciones.</p>
                    : <p className="text-xs text-[#5f6b75] mt-2">Hoy el recurso tiene {s.choque_actual.length} asignación(es) en esas fechas.</p>
                )}
              </div>

              {s.estado !== 'pendiente' && (
                <p className="text-xs text-[#5f6b75]">
                  {s.estado === 'aprobada' ? 'Aprobada' : 'Rechazada'} por {s.resuelto_por_nombre} · {formatFechaHora(s.resuelto_en)}
                  {s.motivo_resolucion ? ` — Motivo: ${s.motivo_resolucion}` : ''}
                </p>
              )}

              {s.estado === 'pendiente' && vista === 'pendientes' && (
                <div className="flex gap-2 pt-1">
                  <button onClick={() => abrir('aprobar', s)} className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e]">Aprobar</button>
                  <button onClick={() => abrir('rechazar', s)} className="px-4 py-2 border border-red-300 text-red-600 text-sm rounded-lg hover:bg-red-50">Rechazar</button>
                </div>
              )}
              {s.estado === 'pendiente' && vista === 'mias' && (
                <div className="pt-1">
                  <button onClick={() => abrir('cancelar', s)} className="px-4 py-2 border border-gray-300 text-[#5f6b75] text-sm rounded-lg hover:bg-gray-50">Cancelar solicitud</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {accion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="font-semibold text-[#2C3A43]">
              {accion.tipo === 'aprobar' ? 'Aprobar asignación forzada' : accion.tipo === 'rechazar' ? 'Rechazar asignación forzada' : 'Cancelar solicitud'}
            </h3>
            <p className="text-sm text-[#5f6b75]">#{accion.sol.id} · {accion.sol.resumen}</p>
            {accion.tipo === 'aprobar' && (
              <p className="text-sm text-[#5f6b75]">Al aprobar, la asignación se aplica de inmediato y el ticket, si corresponde, se crea a nombre de {accion.sol.solicitado_por_nombre}.</p>
            )}
            {accion.tipo === 'cancelar' && (
              <p className="text-sm text-[#5f6b75]">La solicitud se elimina y la asignación no se aplicará.</p>
            )}
            {accion.tipo === 'rechazar' && (
              <textarea
                value={motivo}
                onChange={e => setMotivo(e.target.value)}
                rows={3}
                placeholder="Motivo del rechazo (obligatorio)"
                className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
              />
            )}
            {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-2 py-1.5">{error}</p>}
            <div className="flex justify-end gap-2">
              <button onClick={() => setAccion(null)} disabled={procesando} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">Volver</button>
              <button
                onClick={confirmar}
                disabled={procesando}
                className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e] disabled:opacity-50"
              >
                {procesando ? 'Procesando...' : accion.tipo === 'aprobar' ? 'Aprobar' : accion.tipo === 'rechazar' ? 'Rechazar' : 'Cancelar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
