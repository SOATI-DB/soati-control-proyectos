export function formatFecha(fecha, opciones = {}) {
  if (!fecha) return '—'
  const d = new Date(typeof fecha === 'string' && fecha.length === 10
    ? `${fecha}T12:00:00`
    : fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CR', opciones)
}

export function formatFechaHora(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CR')
}
