import { useNavigate, useLocation, Routes, Route, Navigate } from "react-router-dom"
import { useEffect, useState } from "react"
import Header from "../../components/Header/Header"
import Footer from "../../components/Footer/Footer"
import Citas from "../Citas/Citas"
import Negocio from "../Negocio/Negocio"
import "./Dashboard.css"

const API = import.meta.env.VITE_API_URL || "http://localhost:5000"
function authHeaders() {
  const token = sessionStorage.getItem("token") || ""
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}` }
}

function HomeDashboard({ barberia, onNavigate }) {
  const [stats, setStats] = useState({ hoy: 0, semana: 0, pendientes: 0, total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!barberia?.id) return
    fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() })
      .then(r => r.json())
      .then(citas => {
        if (!Array.isArray(citas)) return
        const hoy = new Date()
        const inicioSemana = new Date(hoy); inicioSemana.setDate(hoy.getDate() - hoy.getDay())
        const finSemana    = new Date(inicioSemana); finSemana.setDate(inicioSemana.getDate() + 6)

        setStats({
          hoy:        citas.filter(c => { const f = new Date(c.fechaInicio); return f.toDateString() === hoy.toDateString() }).length,
          semana:     citas.filter(c => { const f = new Date(c.fechaInicio); return f >= inicioSemana && f <= finSemana }).length,
          pendientes: citas.filter(c => c.estado === "pendiente").length,
          total:      citas.length
        })
        setLoading(false)
      }).catch(() => setLoading(false))
  }, [barberia?.id])

  const hora = new Date().getHours()
  const saludo = hora < 12 ? "¡Buenos días" : hora < 19 ? "¡Buenas tardes" : "¡Buenas noches"

  const quickCards = [
    {
      id: "citas",
      icon: "fa-calendar-alt",
      label: "Gestión de Citas",
      desc: "Agenda, revisa y administra todas las citas",
      color: "#9b30d9",
      badge: stats.pendientes > 0 ? `${stats.pendientes} pendientes` : null,
      badgeColor: "#f59e0b"
    },
    {
      id: "negocio",
      icon: "fa-store",
      label: "Mi Negocio",
      desc: "Servicios, horarios y días laborales",
      color: "#4a0080",
      badge: null
    },
    {
      id: "productos",
      icon: "fa-box-open",
      label: "Productos",
      desc: "Inventario y catálogo de productos",
      color: "#6366f1",
      badge: "Próximamente",
      badgeColor: "#6366f1"
    }
  ]

  return (
    <div className="home-root">
      {/* Bienvenida */}
      <div className="home-welcome-banner">
        <div className="hw-left">
          <h2 className="hw-greeting">
            {saludo}, <span>{barberia?.nombre_encargado || "Encargado"}</span>! 👋
          </h2>
          <p className="hw-sub">{barberia?.nombre || "Tu barbería"} — Panel de control</p>
        </div>
        <div className="hw-date">
          <i className="fas fa-calendar" />
          {new Date().toLocaleDateString("es-MX", { weekday:"long", day:"numeric", month:"long" })}
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="home-stats-row">
        <div className="hs-card">
          <i className="fas fa-calendar-day" />
          <div>
            <span className="hs-num">{loading ? "—" : stats.hoy}</span>
            <span className="hs-label">Citas hoy</span>
          </div>
        </div>
        <div className="hs-card">
          <i className="fas fa-calendar-week" />
          <div>
            <span className="hs-num">{loading ? "—" : stats.semana}</span>
            <span className="hs-label">Esta semana</span>
          </div>
        </div>
        <div className="hs-card warning">
          <i className="fas fa-clock" />
          <div>
            <span className="hs-num">{loading ? "—" : stats.pendientes}</span>
            <span className="hs-label">Pendientes</span>
          </div>
        </div>
        <div className="hs-card total">
          <i className="fas fa-chart-bar" />
          <div>
            <span className="hs-num">{loading ? "—" : stats.total}</span>
            <span className="hs-label">Total citas</span>
          </div>
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="home-section-title">
        <i className="fas fa-th-large" /> Accesos rápidos
      </div>
      <div className="home-quick-cards">
        {quickCards.map(card => (
          <button
            key={card.id}
            className={`hq-card ${card.id === "productos" ? "disabled" : ""}`}
            onClick={() => card.id !== "productos" && onNavigate(card.id)}
            style={{"--cc": card.color}}
          >
            <div className="hq-icon"><i className={`fas ${card.icon}`} /></div>
            <div className="hq-info">
              <span className="hq-label">{card.label}</span>
              <span className="hq-desc">{card.desc}</span>
            </div>
            {card.badge && (
              <span className="hq-badge" style={{background: card.badgeColor+"22", color: card.badgeColor, border: `1px solid ${card.badgeColor}44`}}>
                {card.badge}
              </span>
            )}
            {card.id !== "productos" && <i className="fas fa-chevron-right hq-arrow" />}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Dashboard({ barberia, onLogout, onUpdate }) {
  const navigate  = useNavigate()
  const location  = useLocation()
  const segmento  = location.pathname.split("/")[2] || "home"
  const setVista  = (v) => navigate(v === "home" ? "/dashboard" : `/dashboard/${v}`)

  return (
    <div className="dashboard-container">
      <Header barberia={barberia} onLogout={onLogout} vista={segmento} setVista={setVista} onUpdate={onUpdate} />

      <main className="main-content" style={segmento === "citas" ? { padding: 0 } : {}}>
        <Routes>
          <Route path="/" element={<HomeDashboard barberia={barberia} onNavigate={setVista} />} />
          <Route path="/citas"    element={<Citas barberia={barberia} />} />
          <Route path="/negocio"  element={<Negocio barberia={barberia} />} />
          <Route path="/productos" element={
            <div className="coming-soon">
              <i className="fas fa-box-open" />
              <h3>Productos — próximamente</h3>
            </div>
          } />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>

      {segmento === "home" && <Footer />}
    </div>
  )
}