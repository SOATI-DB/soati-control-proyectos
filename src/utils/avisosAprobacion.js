// Comunicación entre cualquier pantalla y las ventanas globales de <AvisoAprobacion /> (avisos y justificación al forzar).
// Una pantalla anuncia mensajes o pide la justificación de un choque sin tener que montar sus propias ventanas.
const oyentes = new Set()

/** Registra los manejadores de las ventanas globales; devuelve la función para quitarlos */
export function suscribir(manejadores) {
  oyentes.add(manejadores)
  return () => oyentes.delete(manejadores)
}

/** Muestra una lista de mensajes al usuario (asignación pendiente de aprobación, tarea no asignada por choque) */
export function anunciarAvisos(mensajes) {
  const lista = (mensajes ?? []).filter(Boolean)
  if (!lista.length) return
  oyentes.forEach(o => o.avisos?.(lista))
}

/** Pide la justificación de un choque de recursos; devuelve el texto escrito o null si el usuario cancela */
export function pedirJustificacion(solapamientos) {
  return new Promise(resolver => {
    if (!oyentes.size) { resolver(null); return }
    oyentes.forEach(o => o.justificacion?.({ solapamientos, resolver }))
  })
}
