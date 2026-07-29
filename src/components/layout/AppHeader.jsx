const SHELL_URL = import.meta.env.VITE_SHELL_URL ?? 'http://localhost:5173'

export default function AppHeader({ titulo, subtitulo, derecha }) {
  return (
    <header
      className="bg-[#4E738A] text-white px-3 sm:px-6 flex items-stretch shadow-md shrink-0"
      style={{ minHeight: '64px' }}
    >
      <a
        href={SHELL_URL}
        className="flex items-center border-r border-white/15 pr-4 sm:pr-6 mr-4 sm:mr-6 shrink-0 cursor-pointer"
      >
        <img
          src="/assets/brand/logo-soati-blanco.svg"
          alt="SOATI"
          className="h-8 sm:h-9 w-auto block"
        />
      </a>

      <div className="flex flex-col justify-center min-w-0 flex-1">
        <h1 className="text-[15px] sm:text-[17px] font-semibold leading-tight truncate">
          {titulo}
        </h1>
        {subtitulo && (
          <p className="text-[11px] text-white/60 leading-tight truncate hidden sm:block">
            {subtitulo}
          </p>
        )}
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3 shrink-0 pl-2">
        {derecha}
        <a
          href={SHELL_URL}
          title="Volver a SOATI APPS"
          className="flex items-center gap-1.5 text-[12px] text-white/70 hover:text-white border border-white/20 hover:border-white/40 px-2.5 py-1.5 rounded-md transition-all shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span className="hidden sm:inline">SOATI APPS</span>
        </a>
      </div>
    </header>
  )
}
