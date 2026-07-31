export function formatFecha(fecha, opciones = {}) {
  if (!fecha) return '—'
  // Tomar solo YYYY-MM-DD para evitar desfase de timezone
  const str = typeof fecha === 'string' ? fecha.slice(0, 10) : null
  const d = str
    ? new Date(`${str}T12:00:00`)
    : new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-CR', opciones)
}

export function formatFechaHora(fecha) {
  if (!fecha) return '—'
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-CR')
}
