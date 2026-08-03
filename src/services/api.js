const BASE           = import.meta.env.VITE_API_URL           || 'http://localhost:3011'
const BASE_COMERCIAL = import.meta.env.VITE_COMERCIAL_API_URL || 'http://localhost:3017'
const SHELL_API      = import.meta.env.VITE_SHELL_API_URL     || 'http://localhost:3001'

const token = () => localStorage.getItem('soati_shell_token')
const headers = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token()}`,
})

// Proyectos
export const getProyectos = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return fetch(`${BASE}/api/proyectos${qs ? '?' + qs : ''}`, { headers: headers() }).then(r => r.json())
}

export const getProyecto = (id) =>
  fetch(`${BASE}/api/proyectos/${id}`, { headers: headers() }).then(r => r.json())

export const actualizarFicha = (id, data) =>
  fetch(`${BASE}/api/proyectos/${id}/ficha`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const getCostosProyecto = (id) =>
  fetch(`${BASE}/api/proyectos/${id}/costos`, { headers: headers() }).then(r => r.json())

// Fases
export const getFases = (proyectoId) =>
  fetch(`${BASE}/api/fases/proyecto/${proyectoId}`, { headers: headers() }).then(r => r.json())

export const crearFase = (proyectoId, data) =>
  fetch(`${BASE}/api/fases/proyecto/${proyectoId}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const actualizarFase = (id, data) =>
  fetch(`${BASE}/api/fases/${id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const eliminarFase = (id) =>
  fetch(`${BASE}/api/fases/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Subproyectos
export const crearSubproyecto = (data) =>
  fetch(`${BASE}/api/subproyectos`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const actualizarSubproyecto = (id, data) =>
  fetch(`${BASE}/api/subproyectos/${id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const eliminarSubproyecto = (id) =>
  fetch(`${BASE}/api/subproyectos/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Tareas
export const getTareas = (proyectoId, params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return fetch(`${BASE}/api/tareas/proyecto/${proyectoId}${qs ? '?' + qs : ''}`, { headers: headers() }).then(r => r.json())
}

export const crearTarea = (proyectoId, data) =>
  fetch(`${BASE}/api/tareas/proyecto/${proyectoId}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const actualizarTarea = (id, data) =>
  fetch(`${BASE}/api/tareas/${id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const eliminarTarea = (id) =>
  fetch(`${BASE}/api/tareas/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Contactos
export const getContactos = (proyectoId) =>
  fetch(`${BASE}/api/contactos/proyecto/${proyectoId}`, { headers: headers() }).then(r => r.json())

export const crearContacto = (proyectoId, data) =>
  fetch(`${BASE}/api/contactos/proyecto/${proyectoId}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const actualizarContacto = (id, data) =>
  fetch(`${BASE}/api/contactos/${id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const eliminarContacto = (id) =>
  fetch(`${BASE}/api/contactos/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Facturación
export const getFacturacion = (proyectoId) =>
  fetch(`${BASE}/api/facturacion/proyecto/${proyectoId}`, { headers: headers() }).then(r => r.json())

export const crearHito = (proyectoId, data) =>
  fetch(`${BASE}/api/facturacion/proyecto/${proyectoId}`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const actualizarHito = (id, data) =>
  fetch(`${BASE}/api/facturacion/${id}`, {
    method: 'PATCH', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

export const eliminarHito = (id) =>
  fetch(`${BASE}/api/facturacion/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Adjuntos
export const getAdjuntosProyecto = (proyectoId) =>
  fetch(`${BASE}/api/adjuntos/proyecto/${proyectoId}`, { headers: headers() }).then(r => r.json())

export const subirAdjuntoProyecto = (proyectoId, formData) =>
  fetch(`${BASE}/api/adjuntos/proyecto/${proyectoId}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token()}` },
    body: formData,
  }).then(r => r.json())

export const descargarAdjuntoProyecto = async (id, nombre) => {
  const res = await fetch(`${BASE}/api/adjuntos/${id}/descargar`, { headers: headers() })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nombre
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

export const eliminarAdjuntoProyecto = (id) =>
  fetch(`${BASE}/api/adjuntos/${id}`, { method: 'DELETE', headers: headers() }).then(r => r.json())

// Transferencias pendientes (bandeja admin) — usan comercial-api
export const getTransferenciasPendientes = (params = {}) => {
  const qs = new URLSearchParams(params).toString()
  return fetch(`${BASE_COMERCIAL}/api/transferencias${qs ? '?' + qs : ''}`, { headers: headers() }).then(r => r.json())
}

export const getTransferenciaPendiente = (id) =>
  fetch(`${BASE_COMERCIAL}/api/transferencias/${id}`, { headers: headers() }).then(r => r.json())

// Configuración
export const getConfig = () =>
  fetch(`${BASE}/api/config`, { headers: headers() }).then(r => r.json())

export const actualizarConfig = (data) =>
  fetch(`${BASE}/api/config`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data),
  }).then(r => r.json())

// Usuarios (desde shell-api)
export const getPMs = () =>
  fetch(`${SHELL_API}/api/users/pms`, { headers: headers() })
    .then(r => r.json())
    .then(users => Array.isArray(users) ? users : [])
    .catch(() => [])

export const getRecursosIngenieria = () =>
  fetch(`${SHELL_API}/api/users/recursos?tipo=ingenieria`, { headers: headers() })
    .then(r => r.json())
    .then(users => Array.isArray(users) ? users : [])
    .catch(() => [])

export const getIngenieros = () =>
  fetch(`${SHELL_API}/api/users/lista-basica`, { headers: headers() })
    .then(r => r.json())
    .then(users => Array.isArray(users) ? users.filter(u => ['ingeniero', 'lider_ingenieria', 'admin'].includes(u.rol)) : [])
    .catch(() => [])

export const getUsuarios = () =>
  fetch(`${SHELL_API}/api/users/lista-basica`, { headers: headers() })
    .then(r => r.json())
    .then(users => Array.isArray(users) ? users : [])
    .catch(() => [])

// Recursos
export const getRecursosDisponibles = (tipo) =>
  fetch(`${BASE}/api/recursos/disponibles${tipo ? `?tipo=${tipo}` : ''}`,
    { headers: headers() }).then(r => r.json())

export const verificarDisponibilidad = (usuario_id, fecha_inicio, fecha_fin, tarea_id, proyecto_id) => {
  const params = new URLSearchParams({ usuario_id, fecha_inicio, fecha_fin })
  if (tarea_id) params.append('tarea_id', tarea_id)
  if (proyecto_id) params.append('proyecto_id', proyecto_id)
  return fetch(`${BASE}/api/recursos/disponibilidad?${params}`,
    { headers: headers() }).then(r => r.json())
}

export const getCalendarioRecursos = (mes, tipo) => {
  const params = new URLSearchParams({ mes })
  if (tipo) params.append('tipo', tipo)
  return fetch(`${BASE}/api/recursos/calendario?${params}`,
    { headers: headers() }).then(r => r.json())
}

export const asignarRecurso = (data) =>
  fetch(`${BASE}/api/recursos`, {
    method: 'POST', headers: headers(), body: JSON.stringify(data)
  }).then(r => r.json())

export const eliminarRecurso = (id) =>
  fetch(`${BASE}/api/recursos/${id}`, {
    method: 'DELETE', headers: headers()
  }).then(r => r.json())

export const getRecursosTarea = (tareaId) =>
  fetch(`${BASE}/api/recursos/tarea/${tareaId}`, { headers: headers() }).then(r => r.json())
