import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { getContadorAsignaciones } from '../services/api'

/** Contador de solicitudes pendientes en la pestaña Asignaciones; solo se muestra y consulta para quien tiene el permiso de aprobar */
export default function ContadorAsignaciones() {
  const { user } = useAuth()
  const [pendientes, setPendientes] = useState(0)
  const aprueba = [...(user?.permisos?.['control-proyectos'] ?? []), ...(user?.permisos_extra?.['control-proyectos'] ?? [])].includes('aprobar_asignacion_forzada')

  useEffect(() => {
    if (!aprueba) return undefined
    let activo = true
    const cargar = () => getContadorAsignaciones()
      .then(d => { if (activo) setPendientes(d?.pendientes ?? 0) })
      .catch(() => {})
    cargar()
    const temporizador = setInterval(cargar, 60_000)
    return () => { activo = false; clearInterval(temporizador) }
  }, [aprueba])

  if (!aprueba || !pendientes) return null
  return <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700">{pendientes}</span>
}
