import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
const CP_API    = import.meta.env.VITE_API_URL ?? 'http://localhost:3011'
const TOKEN_KEY = 'soati_shell_token'

const PERIODOS = [
  { value: 'unico',         label: 'Único' },
  { value: 'mensual',       label: 'Mensual' },
  { value: 'bimensual',     label: 'Bimensual' },
  { value: 'trimestral',    label: 'Trimestral' },
  { value: 'cuatrimestral', label: 'Cuatrimestral' },
  { value: 'semestral',     label: 'Semestral' },
  { value: 'anual',         label: 'Anual' },
]

export default function NuevoServicio() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    nombre: '', cliente_nombre: '', cliente_codigo: '',
    tipo: '', modalidad: '', periodo: 'unico',
    cantidad_contratada: '', cantidad_disponible: '',
    cantidad_demanda_limite: '',
    fecha_inicio: '', fecha_fin: '', notas: ''
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError]         = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Derivaciones lógicas
  const esVisitas    = form.tipo === 'contrato_visitas'
  const esHoras      = form.tipo === 'contrato_horas'

  const mostrarModalidad   = esVisitas || esHoras
  const esContratado       = form.modalidad === 'contratado' || form.modalidad === 'prepago'
  const esBajoDemanda      = form.modalidad === 'bajo_demanda'
  const esMixto            = form.modalidad === 'mixto'

  const mostrarCantContratada  = esContratado || esMixto
  const mostrarLimiteDemanda   = esBajoDemanda || esMixto

  const labelCantidad = esVisitas ? 'visitas' : 'horas'

  async function guardar() {
    if (!form.nombre || !form.cliente_nombre || !form.cliente_codigo || !form.tipo) {
      setError('Nombre, cliente y tipo son requeridos')
      return
    }
    if (mostrarModalidad && !form.modalidad) {
      setError('Modalidad es requerida')
      return
    }
    if (mostrarCantContratada && !form.cantidad_contratada) {
      setError(`Cantidad de ${labelCantidad} contratadas es requerida`)
      return
    }
    setGuardando(true)
    setError('')
    try {
      const r = await fetch(`${CP_API}/api/servicios/contratos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem(TOKEN_KEY) ?? ''}` },
        body: JSON.stringify({
          ...form,
          cantidad_contratada:     mostrarCantContratada  && form.cantidad_contratada     ? parseFloat(form.cantidad_contratada)     : null,
          cantidad_disponible:     mostrarCantContratada  && form.cantidad_disponible     ? parseFloat(form.cantidad_disponible)     : null,
          cantidad_demanda_limite: mostrarLimiteDemanda   && form.cantidad_demanda_limite ? parseFloat(form.cantidad_demanda_limite) : null,
          fecha_inicio: form.fecha_inicio || null,
          fecha_fin:    form.fecha_fin    || null,
          modalidad:    form.modalidad    || null,
        })
      })
      const data = await r.json()
      if (!r.ok) { setError(data.error ?? 'Error al crear contrato'); return }
      navigate(`/servicios/${data.codigo}`)
    } catch { setError('Error de conexión') }
    finally { setGuardando(false) }
  }

  const inp = 'mt-1 w-full border border-[#E8EAEC] rounded-lg px-3 py-2 text-sm'

  return (
    <div className="max-w-xl mx-auto">
      <div className="flex items-center gap-2 text-sm text-[#9aa1a9] mb-4">
        <button onClick={() => navigate('/servicios')} className="hover:text-[#4E738A]">Servicios</button>
        <span>/</span>
        <span className="text-[#2C3A43]">Nuevo contrato</span>
      </div>

      <div className="bg-white rounded-xl border border-[#E8EAEC] p-6 space-y-4">
        <h1 className="text-lg font-semibold text-[#2C3A43]">Nuevo contrato de servicio</h1>

        <div>
          <label className="text-sm text-[#5f6b75]">Nombre del contrato *</label>
          <input value={form.nombre} onChange={e => set('nombre', e.target.value)} className={inp} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-[#5f6b75]">Nombre del cliente *</label>
            <input value={form.cliente_nombre} onChange={e => set('cliente_nombre', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-sm text-[#5f6b75]">Código cliente (3-4 letras) *</label>
            <input
              value={form.cliente_codigo}
              onChange={e => set('cliente_codigo', e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4))}
              maxLength={4} placeholder="ESPH"
              className={`${inp} font-mono uppercase`}
            />
          </div>
        </div>

        <div>
          <label className="text-sm text-[#5f6b75]">Tipo de contrato *</label>
          <select value={form.tipo} onChange={e => { set('tipo', e.target.value); set('modalidad', '') }} className={inp}>
            <option value="">Seleccionar...</option>
            <option value="contrato_horas">Horas de servicio</option>
            <option value="contrato_visitas">Visitas de servicio</option>
            <option value="ejecucion">Ejecución puntual</option>
          </select>
        </div>

        {mostrarModalidad && (
          <div>
            <label className="text-sm text-[#5f6b75]">Modalidad *</label>
            <select value={form.modalidad} onChange={e => set('modalidad', e.target.value)} className={inp}>
              <option value="">Seleccionar...</option>
              {esHoras ? (
                <>
                  <option value="prepago">{esHoras ? 'Horas contratadas (prepago)' : 'Contratado'}</option>
                  <option value="bajo_demanda">Bajo demanda</option>
                  <option value="mixto">Mixto (contratadas + bajo demanda)</option>
                </>
              ) : (
                <>
                  <option value="contratado">Visitas contratadas</option>
                  <option value="bajo_demanda">Bajo demanda</option>
                  <option value="mixto">Mixto (contratadas + bajo demanda)</option>
                </>
              )}
            </select>
          </div>
        )}

        {mostrarCantContratada && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-[#5f6b75]">
                {esVisitas ? 'Visitas contratadas' : 'Horas contratadas'} *
              </label>
              <input type="number" min="1" step={esVisitas ? '1' : '0.5'}
                value={form.cantidad_contratada} onChange={e => set('cantidad_contratada', e.target.value)}
                className={inp} />
            </div>
            <div>
              <label className="text-sm text-[#5f6b75]">Saldo actual (si ya hubo consumo previo)</label>
              <input type="number" min="0" step={esVisitas ? '1' : '0.5'}
                value={form.cantidad_disponible} onChange={e => set('cantidad_disponible', e.target.value)}
                placeholder={form.cantidad_contratada || ''}
                className={inp} />
            </div>
          </div>
        )}

        {mostrarLimiteDemanda && (
          <div>
            <label className="text-sm text-[#5f6b75]">
              Límite bajo demanda <span className="text-[#9aa1a9]">(opcional — {esVisitas ? 'visitas' : 'horas'} máximas bajo demanda)</span>
            </label>
            <input type="number" min="0" step={esVisitas ? '1' : '0.5'}
              value={form.cantidad_demanda_limite} onChange={e => set('cantidad_demanda_limite', e.target.value)}
              placeholder="Sin límite"
              className={inp} />
          </div>
        )}

        <div>
          <label className="text-sm text-[#5f6b75]">Periodo</label>
          <select value={form.periodo} onChange={e => set('periodo', e.target.value)} className={inp}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-sm text-[#5f6b75]">Fecha inicio (opcional)</label>
            <input type="date" lang="es-CR" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className={inp} />
          </div>
          <div>
            <label className="text-sm text-[#5f6b75]">Fecha fin (opcional)</label>
            <input type="date" lang="es-CR" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} className={inp} />
          </div>
        </div>

        <div>
          <label className="text-sm text-[#5f6b75]">Notas</label>
          <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={3}
            className={`${inp} resize-none`} />
        </div>

        {error && <p className="text-sm text-[#d9534f]">{error}</p>}

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={() => navigate('/servicios')} className="px-4 py-2 text-sm text-[#5f6b75] hover:text-[#2C3A43]">Cancelar</button>
          <button onClick={guardar} disabled={guardando}
            className="px-4 py-2 bg-[#4E738A] text-white text-sm rounded-lg hover:bg-[#3a5a6e] disabled:opacity-50">
            {guardando ? 'Guardando...' : 'Crear contrato'}
          </button>
        </div>
      </div>
    </div>
  )
}
