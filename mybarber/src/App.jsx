import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login/Login'
import Dashboard from './pages/Dashboard/Dashboard'
import CitaPublica from './pages/Citapublica/Citapublica'

function RutaPrivada({ barberia, children }) {
  if (!barberia) return <Navigate to="/login" replace />
  return children
}
function RutaPublica({ barberia, children }) {
  if (barberia) return <Navigate to="/dashboard" replace />
  return children
}

export default function App() {
  const [barberia, setBarberia] = useState(() => {
    const saved  = sessionStorage.getItem('barberia')
    const token  = sessionStorage.getItem('token')
    if (!saved || !token) return null
    // Verificar que el token no esté expirado (decodificar sin validar firma)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        sessionStorage.removeItem('barberia')
        sessionStorage.removeItem('token')
        return null
      }
    } catch (_) {}
    return JSON.parse(saved)
  })

  const handleLogin = (data, token) => {
    sessionStorage.setItem('barberia', JSON.stringify(data))
    if (token) sessionStorage.setItem('token', token)
    setBarberia(data)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('barberia')
    sessionStorage.removeItem('token')
    setBarberia(null)
  }

  // Actualiza los datos de barbería en sesión (desde el panel de cuenta)
  const handleUpdate = (nuevosDatos) => {
    const actualizado = { ...barberia, ...nuevosDatos }
    sessionStorage.setItem('barberia', JSON.stringify(actualizado))
    setBarberia(actualizado)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/cita" element={<CitaPublica />} />

        <Route path="/login" element={
          <RutaPublica barberia={barberia}>
            <Login onLogin={handleLogin} />
          </RutaPublica>
        } />

        <Route path="/dashboard/*" element={
          <RutaPrivada barberia={barberia}>
            <Dashboard barberia={barberia} onLogout={handleLogout} onUpdate={handleUpdate} />
          </RutaPrivada>
        } />

        <Route path="/" element={
          barberia ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
        } />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}