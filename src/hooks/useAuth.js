import { useState, useEffect } from 'react'

const TOKEN_KEY = 'soati_shell_token'
const USER_KEY  = 'soati_shell_user'

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

function leerTokenDeUrl() {
  const params = new URLSearchParams(window.location.search)
  const token = params.get('shell_token')
  if (!token) return null
  params.delete('shell_token')
  const nuevaUrl = window.location.pathname + (params.toString() ? `?${params}` : '')
  window.history.replaceState({}, '', nuevaUrl)
  return token
}

function decodificarUser(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]))
  } catch {
    return null
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tokenExpirado, setTokenExpirado] = useState(false)

  useEffect(() => {
    const tokenUrl = leerTokenDeUrl()
    if (tokenUrl && !isTokenExpired(tokenUrl)) {
      localStorage.setItem(TOKEN_KEY, tokenUrl)
      const userPayload = decodificarUser(tokenUrl)
      if (userPayload) localStorage.setItem(USER_KEY, JSON.stringify(userPayload))
    }

    const token = localStorage.getItem(TOKEN_KEY)
    if (token && !isTokenExpired(token)) {
      const tokenUser = decodificarUser(token)
      if (tokenUser) setUser(tokenUser)
    } else if (token) {
      setTokenExpirado(true)
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }

    setLoading(false)
  }, [])

  function logout() {
    window.location.href = import.meta.env.VITE_SHELL_URL ?? 'http://localhost:5173'
  }

  function tienePermiso(modulo, permiso) {
    if (user?.rol === 'admin') return true
    return (user?.permisos?.[modulo] ?? []).includes(permiso)
  }

  return { user, loading, tokenExpirado, logout, tienePermiso }
}
