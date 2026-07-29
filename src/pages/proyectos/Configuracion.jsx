import { useEffect, useState } from 'react'
import { getConfig, actualizarConfig } from '../../services/api'

export default function Configuracion() {
  const [config, setConfig] = useState(null)
  const [form, setForm] = useState({ consecutivo_actual: '', ano_actual: '' })
  const [guardando, setGuardando] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    getConfig()
      .then(data => {
        setConfig(data)
        setForm({ consecutivo_actual: data.consecutivo_actual || '', ano_actual: data.ano_actual || '' })
      })
      .catch(() => setError('No se pudo cargar la configuración'))
  }, [])

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setOk(false)
    setError(null)
    try {
      const updated = await actualizarConfig({
        consecutivo_actual: form.consecutivo_actual,
        ano_actual: form.ano_actual,
      })
      setConfig(updated)
      setOk(true)
    } catch {
      setError('Error al guardar')
    } finally {
      setGuardando(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#4E738A]/30'

  return (
    <div className="max-w-lg">
      <h2 className="text-lg font-semibold text-[#2c3e50] mb-2">Configuración</h2>
      <p className="text-sm text-gray-500 mb-6">Numeración y parámetros del módulo de proyectos.</p>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800 mb-6">
        Solo modificar si se está sincronizando manualmente con Dolibarr. Un consecutivo incorrecto puede generar códigos duplicados.
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg mb-4">{error}</div>}
      {ok && <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg mb-4">Configuración guardada correctamente.</div>}

      {config && (
        <form onSubmit={guardar} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Próximo consecutivo</label>
            <p className="text-xs text-gray-400 mb-2">El siguiente proyecto tendrá el consecutivo actual + 1.</p>
            <input
              type="number"
              value={form.consecutivo_actual}
              onChange={e => setForm(f => ({ ...f, consecutivo_actual: e.target.value }))}
              className={inp}
              min="0"
            />
            <p className="text-xs text-gray-400 mt-1">Valor actual: {config.consecutivo_actual}</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Año activo (2 dígitos)</label>
            <p className="text-xs text-gray-400 mb-2">Se usa en el código del proyecto. Ej: 26 → P26-XXXXXX-CL-XXXX</p>
            <input
              type="text"
              value={form.ano_actual}
              onChange={e => setForm(f => ({ ...f, ano_actual: e.target.value }))}
              className={inp}
              maxLength={2}
              placeholder="26"
            />
            <p className="text-xs text-gray-400 mt-1">Valor actual: {config.ano_actual}</p>
          </div>

          <button
            type="submit"
            disabled={guardando}
            className="w-full py-2 text-sm bg-[#4E738A] text-white rounded-lg hover:bg-[#3d5c70] disabled:opacity-40 transition-colors"
          >
            {guardando ? 'Guardando...' : 'Guardar configuración'}
          </button>
        </form>
      )}
    </div>
  )
}
