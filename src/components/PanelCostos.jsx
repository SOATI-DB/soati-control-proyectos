// Panel de costos operativos (compras, alquiler de vehiculos, gastos y horas extra) de un proyecto o servicio.
// Compartido por FichaProyecto (tab Costos) y FichaServicio (tab Costos). Los totales vienen calculados por el API.

const CATEGORIA_GASTO = {
  viaticos: 'Viáticos', hospedaje: 'Hospedaje', gasolina: 'Gasolina', materiales: 'Materiales',
  transporte: 'Transporte', peajes: 'Peajes', parqueos: 'Parqueos', otro: 'Otro', sin_categoria: 'Sin categoría',
}

export const fmtCRC = (v) => `₡${Number(v ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
export const fmtUSD = (v) => `$${Number(v ?? 0).toLocaleString('es-CR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

/** Tarjeta de una fuente de costo */
function Tarjeta({ titulo, children }) {
  return (
    <div className="rounded-xl border border-[#E8EAEC] bg-white p-5">
      <h4 className="text-sm font-semibold text-[#2C3A43] mb-3">{titulo}</h4>
      {children}
    </div>
  )
}

/** Fila con una etiqueta y los montos en dólares y colones */
function Fila({ etiqueta, usd, crc }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-1 text-sm">
      <span className="text-[#5f6b75]">{etiqueta}</span>
      <span className="flex gap-6 text-[#2C3A43] font-medium whitespace-nowrap">
        <span>{usd != null ? fmtUSD(usd) : ''}</span>
        <span>{crc != null ? fmtCRC(crc) : ''}</span>
      </span>
    </div>
  )
}

/** Detalle de órdenes de material (lista y resumen de compras-api): complemento de la tarjeta de compras en un proyecto */
export function DetalleOrdenes({ mos = [], resumen = null }) {
  return (
    <div className="mt-3 pt-3 border-t border-[#E8EAEC] space-y-3">
      {resumen && (
        <div className="grid grid-cols-3 gap-3">
          {[
            ['Cotizado total', resumen.cotizado_total, 'text-[#2c3e50]'],
            ['Ingresado', resumen.ingreso_total, 'text-green-700'],
            ['Pendiente', resumen.pendiente_total, 'text-yellow-700'],
          ].map(([l, v, cls]) => (
            <div key={l} className="rounded-lg border border-gray-100 p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{l}</p>
              <p className={`font-semibold text-sm ${cls}`}>{v != null ? fmtUSD(v) : '—'}</p>
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
        ))}
    </div>
  )
}

/**
 * costos: objeto devuelto por el API (calcularCostosPorCodigo). detalleCompras: contenido opcional dentro de la tarjeta de compras.
 */
export default function PanelCostos({ costos, detalleCompras = null }) {
  if (!costos) return null
  const { compras, vehiculos, gastos, horas_extra: horas, avisos = [] } = costos
  const sinTasa = (gastos?.sin_tasa ?? 0) + (horas?.sin_tasa ?? 0)

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-[#4E738A]/30 bg-[#4E738A]/5 p-5">
        <p className="text-xs font-semibold text-[#4E738A] uppercase tracking-wide mb-2">Costo total</p>
        <div className="flex flex-wrap items-baseline gap-x-10 gap-y-1">
          <p className="text-2xl font-bold text-[#2C3A43]">{fmtCRC(costos.total_consolidado_crc)}</p>
          <p className="text-2xl font-bold text-[#2C3A43]">{fmtUSD(costos.total_consolidado_usd)}</p>
        </div>
        <p className="text-[11px] text-[#5f6b75] mt-2">
          Suma de las cuatro fuentes en ambas monedas. Cada costo usa el tipo de cambio de su fecha real (orden de compra, factura u hora trabajada), no el de hoy.
        </p>
      </div>

      {avisos.length > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          No se pudo consultar: {avisos.join(', ')}. El total no incluye esas fuentes.
        </p>
      )}
      {sinTasa > 0 && (
        <p className="text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {sinTasa} registro{sinTasa === 1 ? '' : 's'} de gastos u horas extra no tiene{sinTasa === 1 ? '' : 'n'} tipo de cambio: se cuenta{sinTasa === 1 ? '' : 'n'} en su moneda original, pero no suma{sinTasa === 1 ? '' : 'n'} al equivalente en la otra moneda.
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Tarjeta titulo="Compras (órdenes de material)">
          {compras
            ? <Fila etiqueta={`${compras.cantidad} orden${compras.cantidad === 1 ? '' : 'es'}`} usd={compras.costo_usd} crc={compras.costo_crc} />
            : <p className="text-sm text-gray-400">Sin datos</p>}
          {detalleCompras}
        </Tarjeta>

        <Tarjeta titulo="Alquiler de vehículos">
          {vehiculos
            ? <Fila etiqueta={`${vehiculos.cantidad} alquiler${vehiculos.cantidad === 1 ? '' : 'es'}`} usd={vehiculos.costo_usd} crc={vehiculos.costo_crc} />
            : <p className="text-sm text-gray-400">Sin datos</p>}
        </Tarjeta>

        <Tarjeta titulo="Gastos operativos">
          {gastos ? (
            <>
              <Fila etiqueta={`${gastos.cantidad} gasto${gastos.cantidad === 1 ? '' : 's'}`} />
              <Fila etiqueta="Nativo en colones" crc={gastos.total_crc} />
              <Fila etiqueta="Nativo en dólares" usd={gastos.total_usd} />
              <Fila etiqueta="Equivalente consolidado" usd={gastos.total_usd_consolidado} crc={gastos.total_crc_consolidado} />
              {gastos.por_categoria.length > 0 && (
                <div className="mt-3 pt-3 border-t border-[#E8EAEC]">
                  <p className="text-xs text-[#9aa1a9] mb-1">Por categoría (monto nativo)</p>
                  {gastos.por_categoria.map((c) => (
                    <Fila key={c.categoria} etiqueta={CATEGORIA_GASTO[c.categoria] ?? c.categoria} usd={c.total_usd > 0 ? c.total_usd : null} crc={c.total_crc > 0 ? c.total_crc : null} />
                  ))}
                </div>
              )}
            </>
          ) : <p className="text-sm text-gray-400">Sin datos</p>}
        </Tarjeta>

        <Tarjeta titulo="Horas extra">
          {horas ? (
            <>
              <Fila etiqueta={`${horas.cantidad} registro${horas.cantidad === 1 ? '' : 's'} aprobado${horas.cantidad === 1 ? '' : 's'}`} usd={horas.total_usd_consolidado} crc={horas.total_crc} />
              <p className="text-[11px] text-[#9aa1a9] mt-2">Total agregado: no se desglosa por colaborador.</p>
            </>
          ) : <p className="text-sm text-gray-400">Sin datos</p>}
        </Tarjeta>
      </div>
    </div>
  )
}
