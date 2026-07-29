import { BrowserRouter, Routes, Route, Navigate, NavLink } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AppHeader from './components/layout/AppHeader'
import { NavModulos } from './components/layout/NavModulos'
import SinSesion from './components/SinSesion'
import ListaProyectos from './pages/proyectos/ListaProyectos'
import FichaProyecto from './pages/proyectos/FichaProyecto'
import NuevoProyecto from './pages/proyectos/NuevoProyecto'
import TransferenciasPendientes from './pages/proyectos/TransferenciasPendientes'
import Configuracion from './pages/proyectos/Configuracion'
import CalendarioRecursos from './pages/proyectos/CalendarioRecursos'

function Layout({ children, user, puedeVerProyectos, puedeAprobar, puedeConfigurar, puedeVerRecursos }) {
  const tabs = [
    { to: '/proyectos',                label: 'Proyectos',               mostrar: puedeVerProyectos },
    { to: '/transferencias-pendientes', label: 'Transferencias', mostrar: puedeAprobar },
    { to: '/recursos',                 label: 'Recursos',                 mostrar: puedeVerRecursos },
    { to: '/configuracion',            label: 'Configuración',            mostrar: puedeConfigurar },
  ].filter(t => t.mostrar)

  return (
    <div className="min-h-screen bg-[#F4F5F6] flex flex-col">
      <NavModulos
        modulos={user?.modulos ?? []}
        shellUrl={import.meta.env.VITE_SHELL_URL ?? ''}
        usuarioNombre={user?.nombre ?? ''}
      />
      <AppHeader
        titulo="Control de Proyectos"
        subtitulo={user?.nombre}
      />

      {tabs.length > 1 && (
        <nav className="bg-white border-b border-gray-200 px-4 sm:px-6 flex gap-0 overflow-x-auto">
          {tabs.map(t => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                `px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  isActive
                    ? 'border-[#4E738A] text-[#4E738A]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>
      )}

      <main className="flex-1 px-4 sm:px-6 py-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  )
}

export default function App() {
  const { user, loading, tokenExpirado, tienePermiso } = useAuth()

  if (loading) return (
    <div className="min-h-screen bg-[#F4F5F6] flex items-center justify-center">
      <div className="text-[#5f6b75] text-sm">Cargando...</div>
    </div>
  )

  if (!user) return <SinSesion tokenExpirado={tokenExpirado} />

  const esAdmin             = user?.rol === 'admin'
  const puedeVerProyectos   = esAdmin || tienePermiso('control-proyectos', 'ver_asignados') || tienePermiso('control-proyectos', 'ver_todos')
  const puedeAprobar        = esAdmin || tienePermiso('control-proyectos', 'aprobar_transferencia')
  const puedeConfigurar     = esAdmin || tienePermiso('control-proyectos', 'configurar')
  const puedeVerRecursos    = esAdmin || tienePermiso('control-proyectos', 'gestionar_proyecto')

  const defaultRoute = puedeVerProyectos ? '/proyectos'
    : puedeAprobar ? '/transferencias-pendientes'
    : '/sin-acceso'

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Layout
        user={user}
        puedeVerProyectos={puedeVerProyectos}
        puedeAprobar={puedeAprobar}
        puedeConfigurar={puedeConfigurar}
        puedeVerRecursos={puedeVerRecursos}
      >
        <Routes>
          <Route path="/" element={<Navigate to={defaultRoute} replace />} />

          {puedeVerProyectos && <>
            <Route path="/proyectos" element={<ListaProyectos />} />
            <Route path="/proyectos/nuevo" element={<NuevoProyecto />} />
            <Route path="/proyectos/:id" element={<FichaProyecto />} />
          </>}

          {puedeAprobar && (
            <Route path="/transferencias-pendientes" element={<TransferenciasPendientes />} />
          )}

          {puedeVerRecursos && (
            <Route path="/recursos" element={<CalendarioRecursos />} />
          )}

          {puedeConfigurar && (
            <Route path="/configuracion" element={<Configuracion />} />
          )}

          <Route path="*" element={<Navigate to={defaultRoute} replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  )
}
