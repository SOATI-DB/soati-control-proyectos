const SHELL_URL = import.meta.env.VITE_SHELL_URL ?? 'http://localhost:5173'

export default function SinSesion({ tokenExpirado = false }) {
  return (
    <div className="min-h-screen bg-[#F4F5F6] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className={`px-8 py-8 flex flex-col items-center gap-3 ${tokenExpirado ? 'bg-[#d99a0b]' : 'bg-[#4E738A]'}`}>
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center">
            {tokenExpirado ? (
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            )}
          </div>
          <h1 className="text-white font-bold text-lg leading-tight text-center">
            {tokenExpirado ? 'Tu sesión expiró' : 'Sesión no encontrada'}
          </h1>
        </div>
        <div className="px-8 py-8 flex flex-col items-center gap-5 text-center">
          <p className="text-[13px] sm:text-sm text-[#5f6b75] leading-relaxed">
            {tokenExpirado
              ? 'Tu sesión en SOATI APPS ha expirado. Volvé a ingresar para continuar.'
              : 'Para acceder a Control de Proyectos debés iniciar sesión en SOATI APPS primero.'}
          </p>
          <a
            href={SHELL_URL}
            className="w-full py-[11px] rounded-lg font-semibold text-sm text-white text-center transition-all bg-[#EE7623] hover:bg-[#d9671a] active:scale-[0.98] block"
          >
            Ir a SOATI APPS
          </a>
          <p className="text-[11px] text-[#9aa1a9]">{SHELL_URL}</p>
        </div>
      </div>
    </div>
  )
}
