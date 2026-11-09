import { useEffect, useState } from 'react'
import { suscribir } from '../utils/avisosAprobacion'
import { formatFecha } from '../utils/fecha'

/** Ventanas globales: avisos de asignaciones pendientes o no asignadas, y justificación obligatoria al forzar una asignación con choque */
export default function AvisoAprobacion() {
  const [avisos, setAvisos] = useState([])
  const [pedido, setPedido] = useState(null) // { solapamientos, resolver }
  const [nota, setNota] = useState('')

  useEffect(() => suscribir({
    avisos: (mensajes) => setAvisos(lista => [...lista, ...mensajes]),
    justificacion: (p) => { setNota(''); setPedido(p) },
  }), [])

  /** Cierra la petición de justificación y devuelve el resultado a quien la pidió */
  function cerrarPedido(valor) {
    pedido?.resolver(valor)
    setPedido(null)
  }

  return (
    <>
      {pedido && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-semibold text-[#2C3A43]">El recurso tiene choque de fechas</h3>
            <ul className="text-sm text-[#5f6b75] space-y-1 max-h-40 overflow-y-auto">
              {(pedido.solapamientos ?? []).map((c, i) => (
                <li key={i} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5">
                  {c.proyecto_codigo} — {c.tarea} ({formatFecha(c.fecha_inicio)} al {formatFecha(c.fecha_fin)})
                  {c.pm_nombre ? ` · PM ${c.pm_nombre}` : ''}
                </li>
              ))}
            </ul>
            <p className="text-sm text-[#5f6b75]">
              Para forzar la asignación escribí la justificación. No se asignará hasta que la apruebe quien tiene el permiso de aprobar asignaciones forzadas.
            </p>
            <textarea
              value={nota}
              onChange={e => setNota(e.target.value)}
              rows={3}
              placeholder="Justificación del choque (obligatoria)"
              className="w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => cerrarPedido(null)} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">
                Cancelar
              </button>
              <button
                onClick={() => cerrarPedido(nota.trim())}
                disabled={!nota.trim()}
                className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e] disabled:opacity-50"
              >
                Solicitar aprobación
              </button>
            </div>
          </div>
        </div>
      )}

      {avisos.length > 0 && !pedido && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-semibold text-[#2C3A43]">Asignaciones que requieren tu atención</h3>
            <ul className="text-sm text-[#2C3A43] space-y-2 max-h-72 overflow-y-auto">
              {avisos.map((m, i) => (
                <li key={i} className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">{m}</li>
              ))}
            </ul>
            <div className="flex justify-end">
              <button onClick={() => setAvisos([])} className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e]">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
