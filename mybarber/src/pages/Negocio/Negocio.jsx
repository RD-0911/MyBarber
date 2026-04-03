import { useState, useEffect, useCallback } from "react"
import "./Negocio.css"

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://192.168.100.64:5000"

const DIAS_SEMANA = [
  { id: 0, label: "Dom" }, { id: 1, label: "Lun" }, { id: 2, label: "Mar" },
  { id: 3, label: "Mié" }, { id: 4, label: "Jue" }, { id: 5, label: "Vie" }, { id: 6, label: "Sáb" }
]

const INTERVALOS = [
  { val: 15, label: "15 min" }, { val: 20, label: "20 min" },
  { val: 30, label: "30 min" }, { val: 45, label: "45 min" }, { val: 60, label: "1 hora" }
]

// ── Generador de opciones de hora ─────────────────────────────────
function generarOpcionesHora() {
  const opts = []
  for (let h = 6; h <= 23; h++) {
    for (let m of [0, 30]) {
      if (h === 23 && m === 30) continue
      opts.push(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`)
    }
  }
  return opts
}
const HORAS_OPTS = generarOpcionesHora()

// ── Modal de servicio (crear/editar) ─────────────────────────────
function ModalServicio({ servicio, onSave, onClose }) {
  const [form, setForm]     = useState(servicio
    ? { descripcion: servicio.descripcion, precio: servicio.precio, hora_estimada: servicio.hora_estimada }
    : { descripcion: "", precio: "", hora_estimada: 30 })
  const [error, setError]   = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!form.descripcion.trim() || !form.precio || !form.hora_estimada) {
      setError("Todos los campos son requeridos"); return
    }
    if (isNaN(parseFloat(form.precio)) || parseFloat(form.precio) <= 0) {
      setError("El precio debe ser un número positivo"); return
    }
    setSaving(true)
    try {
      await onSave({ ...form, precio: parseFloat(form.precio), hora_estimada: parseInt(form.hora_estimada) })
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2><i className={`fas ${servicio ? "fa-edit" : "fa-plus-circle"}`} />
            {servicio ? " Editar servicio" : " Nuevo servicio"}
          </h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <label>Descripción del servicio *</label>
            <input type="text" placeholder="Ej: Corte clásico, Fade, Barba..."
              value={form.descripcion} onChange={e=>setForm({...form, descripcion:e.target.value})} />
          </div>
          <div className="form-row-2">
            <div className="form-row">
              <label>Precio ($) *</label>
              <input type="number" min="0" step="0.50" placeholder="0.00"
                value={form.precio} onChange={e=>setForm({...form, precio:e.target.value})} />
            </div>
            <div className="form-row">
              <label>Duración (min) *</label>
              <select value={form.hora_estimada} onChange={e=>setForm({...form, hora_estimada:e.target.value})}>
                {[15,20,30,45,60,90,120].map(m=>(
                  <option key={m} value={m}>{m} min{m>=60?" ("+Math.floor(m/60)+"h"+(m%60?` ${m%60}m`:"")+")":""}</option>
                ))}
              </select>
            </div>
          </div>
          {error && <p className="form-error"><i className="fas fa-exclamation-circle" /> {error}</p>}
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-guardar" onClick={handleSave} disabled={saving}>
            {saving ? <><i className="fas fa-spinner fa-spin" /> Guardando...</> : <><i className="fas fa-check" /> Guardar</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Confirmación de eliminación ───────────────────────────────────
function ModalConfirmar({ mensaje, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box confirm-box" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <h2><i className="fas fa-trash-alt" style={{color:"#ef4444"}} /> Eliminar servicio</h2>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">
          <p className="confirm-msg">{mensaje}</p>
          <p className="confirm-warn"><i className="fas fa-exclamation-triangle" /> Esta acción no se puede deshacer</p>
        </div>
        <div className="modal-footer">
          <button className="btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="btn-eliminar-conf" onClick={onConfirm}>
            <i className="fas fa-trash" /> Eliminar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function Negocio({ barberia }) {
  const [tab, setTab]           = useState("servicios")
  const [servicios, setServicios] = useState([])
  const [loadingS, setLoadingS] = useState(true)
  const [errorS, setErrorS]     = useState("")
  const [modalServ, setModalServ] = useState(null)   // null | "nuevo" | servicio
  const [confirmar, setConfirmar] = useState(null)    // null | servicio a eliminar
  const [toastMsg, setToastMsg] = useState("")

  // Horario
  const [horario, setHorario]   = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30 })
  const [loadingH, setLoadingH] = useState(true)
  const [guardandoH, setGuardandoH] = useState(false)
  const [horarioGuardado, setHorarioGuardado] = useState(false)

  function mostrarToast(msg) {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(""), 3000)
  }

  // ── Cargar servicios ─────────────────────────────────────────
  const cargarServicios = useCallback(async () => {
    if (!barberia?.id) return
    setLoadingS(true); setErrorS("")
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/servicios`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error al cargar servicios")
      setServicios(Array.isArray(d) ? d : [])
    } catch (e) {
      setErrorS(e.message)
    }
    setLoadingS(false)
  }, [barberia?.id])

  // ── Cargar horario ───────────────────────────────────────────
  const cargarHorario = useCallback(async () => {
    if (!barberia?.id) return
    setLoadingH(true)
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/horario`)
      const d = await r.json()
      if (r.ok && d.horaInicio) setHorario(d)
    } catch (_) {}
    setLoadingH(false)
  }, [barberia?.id])

  useEffect(() => { cargarServicios(); cargarHorario() }, [cargarServicios, cargarHorario])

  // ── CRUD Servicios ───────────────────────────────────────────
  async function crearServicio(data) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios`, {
      method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(data)
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al crear")
    mostrarToast("✅ Servicio agregado correctamente")
    setModalServ(null)
    cargarServicios()
  }

  async function editarServicio(id, data) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${id}`, {
      method:"PUT", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ ...data, activo: modalServ.activo ?? 1 })
    })
    const d = await r.json()
    if (!r.ok) throw new Error(d.error || "Error al editar")
    mostrarToast("✅ Servicio actualizado")
    setModalServ(null)
    cargarServicios()
  }

  async function toggleServicio(serv) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${serv.id}/toggle`, { method:"PATCH" })
    const d = await r.json()
    if (!r.ok) { mostrarToast("⚠️ " + (d.error || "Error")); return }
    mostrarToast(d.activo ? "✅ Servicio activado" : "⚠️ Servicio desactivado")
    cargarServicios()
  }

  async function eliminarServicio(serv) {
    const r = await fetch(`${API}/barberia/${barberia.id}/servicios/${serv.id}`, { method:"DELETE" })
    const d = await r.json()
    if (!r.ok) { mostrarToast("❌ " + (d.error || "Error al eliminar")); setConfirmar(null); return }
    mostrarToast("🗑️ Servicio eliminado")
    setConfirmar(null)
    cargarServicios()
  }

  // ── Guardar horario ──────────────────────────────────────────
  async function guardarHorario() {
    setGuardandoH(true)
    try {
      const r = await fetch(`${API}/barberia/${barberia.id}/horario`, {
        method:"PUT", headers:{"Content-Type":"application/json"}, body: JSON.stringify(horario)
      })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error || "Error")
      setHorarioGuardado(true)
      mostrarToast("✅ Horario guardado correctamente")
      setTimeout(() => setHorarioGuardado(false), 2500)
    } catch (e) {
      mostrarToast("❌ " + e.message)
    }
    setGuardandoH(false)
  }

  function toggleDia(id) {
    setHorario(h => ({
      ...h,
      diasLaborales: h.diasLaborales.includes(id)
        ? h.diasLaborales.filter(d => d !== id)
        : [...h.diasLaborales, id].sort()
    }))
  }

  return (
    <div className="negocio-root">
      {/* Toast */}
      {toastMsg && <div className="negocio-toast">{toastMsg}</div>}

      {/* Header */}
      <div className="negocio-header">
        <h1 className="negocio-title">
          <i className="fas fa-store" /> Mi Negocio
        </h1>
        <p className="negocio-sub">Administra los servicios y horarios de {barberia?.nombre || "tu barbería"}</p>
      </div>

      {/* Tabs */}
      <div className="negocio-tabs">
        <button className={tab==="servicios"?"active":""} onClick={()=>setTab("servicios")}>
          <i className="fas fa-cut" /> Servicios
        </button>
        <button className={tab==="horario"?"active":""} onClick={()=>setTab("horario")}>
          <i className="fas fa-clock" /> Horario de trabajo
        </button>
      </div>

      {/* ─── TAB: SERVICIOS ──────────────────────────────────────── */}
      {tab === "servicios" && (
        <div className="tab-content">
          <div className="tab-topbar">
            <span className="tab-count">
              {servicios.length} servicio{servicios.length !== 1 ? "s" : ""} registrado{servicios.length !== 1 ? "s" : ""}
            </span>
            <button className="btn-nuevo-serv" onClick={()=>setModalServ("nuevo")}>
              <i className="fas fa-plus" /> Agregar servicio
            </button>
          </div>

          {loadingS ? (
            <div className="negocio-loading"><i className="fas fa-spinner fa-spin" /> Cargando...</div>
          ) : errorS ? (
            <div className="negocio-error"><i className="fas fa-exclamation-circle" /> {errorS}</div>
          ) : servicios.length === 0 ? (
            <div className="negocio-empty">
              <i className="fas fa-cut" />
              <p>No hay servicios registrados.</p>
              <button className="btn-nuevo-serv" onClick={()=>setModalServ("nuevo")}>
                <i className="fas fa-plus" /> Agregar primer servicio
              </button>
            </div>
          ) : (
            <div className="servicios-grid">
              {servicios.map(s => (
                <div key={s.id} className={`serv-card ${s.activo == 0 ? "inactivo" : ""}`}>
                  <div className="serv-card-left">
                    <div className="serv-icon"><i className="fas fa-cut" /></div>
                    <div className="serv-info">
                      <span className="serv-nombre">{s.descripcion}</span>
                      <div className="serv-meta">
                        <span className="serv-precio"><i className="fas fa-dollar-sign" />${parseFloat(s.precio).toFixed(2)}</span>
                        <span className="serv-duracion"><i className="fas fa-clock" />{s.hora_estimada} min</span>
                        <span className={`serv-estado ${s.activo == 0 ? "off" : "on"}`}>
                          {s.activo == 0 ? "Desactivado" : "Activo"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="serv-acciones">
                    <button className="btn-sa edit" title="Editar" onClick={()=>setModalServ(s)}>
                      <i className="fas fa-edit" />
                    </button>
                    <button
                      className={`btn-sa toggle ${s.activo == 0 ? "activate" : "deactivate"}`}
                      title={s.activo == 0 ? "Activar" : "Desactivar"}
                      onClick={()=>toggleServicio(s)}
                    >
                      <i className={`fas ${s.activo == 0 ? "fa-toggle-off" : "fa-toggle-on"}`} />
                    </button>
                    <button className="btn-sa delete" title="Eliminar" onClick={()=>setConfirmar(s)}>
                      <i className="fas fa-trash" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: HORARIO ────────────────────────────────────────── */}
      {tab === "horario" && (
        <div className="tab-content">
          {loadingH ? (
            <div className="negocio-loading"><i className="fas fa-spinner fa-spin" /> Cargando horario...</div>
          ) : (
            <div className="horario-form">

              {/* Días laborales */}
              <div className="horario-section">
                <h3 className="horario-section-title">
                  <i className="fas fa-calendar-week" /> Días laborales
                </h3>
                <p className="horario-hint">Selecciona los días en que trabajas</p>
                <div className="dias-grid">
                  {DIAS_SEMANA.map(dia => (
                    <button
                      key={dia.id}
                      className={`dia-btn ${horario.diasLaborales.includes(dia.id) ? "activo" : ""}`}
                      onClick={()=>toggleDia(dia.id)}
                    >
                      {dia.label}
                    </button>
                  ))}
                </div>
                {horario.diasLaborales.length === 0 && (
                  <p className="horario-warn"><i className="fas fa-exclamation-triangle" /> Debes seleccionar al menos un día</p>
                )}
              </div>

              {/* Horas de trabajo */}
              <div className="horario-section">
                <h3 className="horario-section-title">
                  <i className="fas fa-business-time" /> Horario de atención
                </h3>
                <p className="horario-hint">Define tu hora de apertura y cierre</p>
                <div className="horas-row">
                  <div className="form-row">
                    <label><i className="fas fa-sun" /> Hora de apertura</label>
                    <select value={horario.horaInicio} onChange={e=>setHorario({...horario, horaInicio:e.target.value})}>
                      {HORAS_OPTS.map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                  <div className="horas-separator">—</div>
                  <div className="form-row">
                    <label><i className="fas fa-moon" /> Hora de cierre</label>
                    <select value={horario.horaFin} onChange={e=>setHorario({...horario, horaFin:e.target.value})}>
                      {HORAS_OPTS.filter(h=>h > horario.horaInicio).map(h=><option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              {/* Intervalo */}
              <div className="horario-section">
                <h3 className="horario-section-title">
                  <i className="fas fa-stopwatch" /> Intervalo entre citas
                </h3>
                <p className="horario-hint">Cada cuánto tiempo se pueden agendar citas</p>
                <div className="intervalos-row">
                  {INTERVALOS.map(iv => (
                    <button
                      key={iv.val}
                      className={`intervalo-btn ${horario.intervaloMinutos === iv.val ? "activo" : ""}`}
                      onClick={()=>setHorario({...horario, intervaloMinutos: iv.val})}
                    >
                      {iv.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview de horas */}
              <div className="horario-section">
                <h3 className="horario-section-title">
                  <i className="fas fa-eye" /> Vista previa de slots disponibles
                </h3>
                <div className="slots-preview">
                  {(() => {
                    const slots = []
                    const [hi, mi] = horario.horaInicio.split(":").map(Number)
                    const [hf, mf] = horario.horaFin.split(":").map(Number)
                    let m = hi*60 + mi
                    const fin = hf*60 + mf
                    while (m < fin) {
                      slots.push(`${String(Math.floor(m/60)).padStart(2,"0")}:${String(m%60).padStart(2,"0")}`)
                      m += horario.intervaloMinutos
                    }
                    return slots.map(s => <span key={s} className="slot-preview-chip">{s}</span>)
                  })()}
                </div>
              </div>

              <button
                className={`btn-guardar-horario ${horarioGuardado ? "guardado" : ""}`}
                onClick={guardarHorario}
                disabled={guardandoH || horario.diasLaborales.length === 0}
              >
                {guardandoH
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : horarioGuardado
                  ? <><i className="fas fa-check-circle" /> ¡Horario guardado!</>
                  : <><i className="fas fa-save" /> Guardar horario</>
                }
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modales */}
      {modalServ && (
        <ModalServicio
          servicio={modalServ === "nuevo" ? null : modalServ}
          onSave={modalServ === "nuevo"
            ? crearServicio
            : (data) => editarServicio(modalServ.id, data)}
          onClose={()=>setModalServ(null)}
        />
      )}

      {confirmar && (
        <ModalConfirmar
          mensaje={`¿Eliminar el servicio "${confirmar.descripcion}"?`}
          onConfirm={()=>eliminarServicio(confirmar)}
          onClose={()=>setConfirmar(null)}
        />
      )}
    </div>
  )
}