import { useState, useEffect, useCallback, Fragment, useRef } from "react"
import "./Citas.css"

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://192.168.100.64:5000"

// Helper: headers con JWT para peticiones autenticadas
function authHeaders(extra = {}) {
  const token = sessionStorage.getItem("token") || ""
  return { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, ...extra }
}

const DIAS  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
               "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

function generarHoras(inicio = "09:00", fin = "18:00", intervalo = 30) {
  const horas = []
  const [hi, mi] = inicio.split(":").map(Number)
  const [hf, mf] = fin.split(":").map(Number)
  let mins = hi * 60 + mi
  const finMins = hf * 60 + mf
  while (mins < finMins) {
    horas.push(`${String(Math.floor(mins/60)).padStart(2,"0")}:${String(mins%60).padStart(2,"0")}`)
    mins += intervalo
  }
  return horas
}

function getWeekDates(baseDate) {
  const d = new Date(baseDate)
  const day = d.getDay()
  const monday = new Date(d)
  monday.setDate(d.getDate() - day + 1)
  return Array.from({ length: 6 }, (_, i) => {
    const dd = new Date(monday)
    dd.setDate(monday.getDate() + i)
    return dd
  })
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function formatFecha(d) {
  return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`
}

// ── Búsqueda de cliente con debounce ─────────────────────────────
function ClienteSearch({ barberiaId, value, onChange }) {
  const [query, setQuery]       = useState("")
  const [resultados, setResultados] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [mostrar, setMostrar]   = useState(false)
  const timerRef = useRef(null)
  const wrapRef  = useRef(null)

  // Cerrar dropdown al click afuera
  useEffect(() => {
    function handler(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMostrar(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  function handleInput(e) {
    const q = e.target.value
    setQuery(q)
    onChange(null) // limpiar selección
    clearTimeout(timerRef.current)
    if (q.trim().length < 2) { setResultados([]); setMostrar(false); return }
    setBuscando(true)
    timerRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/barberia/${barberiaId}/clientes/buscar?q=${encodeURIComponent(q)}`)
        const data = await r.json()
        setResultados(Array.isArray(data) ? data : [])
        setMostrar(true)
      } catch (_) { setResultados([]) }
      setBuscando(false)
    }, 300)
  }

  function seleccionar(cliente) {
    setQuery(`${cliente.nombre} ${cliente.primerAp}`)
    setResultados([])
    setMostrar(false)
    onChange(cliente)
  }

  return (
    <div className="cliente-search-wrap" ref={wrapRef}>
      <div className="cliente-search-input-row">
        <input
          type="text"
          className="cliente-search-input"
          placeholder="Escribe el nombre del cliente..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
        />
        {buscando && <i className="fas fa-spinner fa-spin cs-spin" />}
        {value && <i className="fas fa-check-circle cs-ok" />}
      </div>
      {mostrar && resultados.length > 0 && (
        <ul className="cliente-dropdown">
          {resultados.map(c => (
            <li key={c.id} onMouseDown={() => seleccionar(c)}>
              <i className="fas fa-user" />
              <span className="cd-nombre">{c.nombre} {c.primerAp}</span>
              {c.telefono && <span className="cd-tel">{c.telefono}</span>}
            </li>
          ))}
        </ul>
      )}
      {mostrar && resultados.length === 0 && query.length >= 2 && !buscando && (
        <div className="cliente-no-results">
          <i className="fas fa-user-slash" /> Sin resultados para "{query}"
        </div>
      )}
    </div>
  )
}

export default function Citas({ barberia }) {
  const [citas, setCitas]       = useState([])
  const [servicios, setServicios] = useState([])
  const [loading, setLoading]   = useState(true)
  const [baseDate, setBaseDate] = useState(new Date())
  const [vistaMode, setVistaMode] = useState("semana")
  const [modalOpen, setModalOpen] = useState(false)
  const [slotSeleccionado, setSlotSeleccionado] = useState(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [horario, setHorario]   = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30 })

  const [form, setForm]         = useState({ clienteObj: null, id_servicio: "", fechaInicio: "", hora: "", nota: "" })
  const [formError, setFormError] = useState("")
  const [guardando, setGuardando] = useState(false)
  const [citaDetalle, setCitaDetalle] = useState(null)

  const baseUrl    = window.location.origin
  const linkPublico = `${baseUrl}/cita?barberia=${barberia?.id}`

  const HORAS = generarHoras(horario.horaInicio, horario.horaFin, horario.intervaloMinutos)

  const cargarDatos = useCallback(async () => {
    setLoading(true)
    try {
      const [rCitas, rServicios, rHorario] = await Promise.all([
        fetch(`${API}/public/citas-barberia/${barberia.id}`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/public/servicios/${barberia.id}`).then(r => r.json()),
        fetch(`${API}/barberia/${barberia.id}/horario`).then(r => r.json()).catch(() => null),
      ])
      setCitas(Array.isArray(rCitas) ? rCitas : [])
      setServicios(Array.isArray(rServicios) ? rServicios : [])
      if (rHorario && rHorario.horaInicio) setHorario(rHorario)
    } catch (_) { setCitas([]); setServicios([]) }
    setLoading(false)
  }, [barberia?.id])

  useEffect(() => {
    if (!barberia?.id) return
    cargarDatos()
    const intervalo = setInterval(cargarDatos, 30000)
    return () => clearInterval(intervalo)
  }, [barberia?.id, cargarDatos])

  const semana = getWeekDates(baseDate)

  function citasDelSlot(dia, hora) {
    return citas.filter(c => {
      const f = new Date(c.fechaInicio)
      const hh = `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
      return isSameDay(f, dia) && hh === hora
    })
  }

  // Horas ocupadas en la fecha seleccionada del form
  function horasOcupadasEnFecha(fechaStr) {
    if (!fechaStr) return new Set()
    return new Set(
      citas
        .filter(c => {
          const f = new Date(c.fechaInicio)
          const d = `${f.getFullYear()}-${String(f.getMonth()+1).padStart(2,"0")}-${String(f.getDate()).padStart(2,"0")}`
          return d === fechaStr && c.estado !== "cancelada"
        })
        .map(c => {
          const f = new Date(c.fechaInicio)
          return `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
        })
    )
  }

  // Abrir modal desde el botón "Nueva cita" — sin verificar slot
  function abrirModalNuevo() {
    const hoy = new Date()
    const fechaStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,"0")}-${String(hoy.getDate()).padStart(2,"0")}`
    setForm({ clienteObj: null, id_servicio: "", fechaInicio: fechaStr, hora: "", nota: "" })
    setSlotSeleccionado(null)
    setFormError("")
    setModalOpen(true)
  }

  // Abrir modal desde un slot del calendario — verifica si está libre
  function abrirNuevaCita(dia, hora) {
    const slotCitas = citasDelSlot(dia, hora)
    if (slotCitas.length > 0) return // slot ocupado, no abrir modal
    const fechaStr = `${dia.getFullYear()}-${String(dia.getMonth()+1).padStart(2,"0")}-${String(dia.getDate()).padStart(2,"0")}`
    setForm({ clienteObj: null, id_servicio: "", fechaInicio: fechaStr, hora, nota: "" })
    setSlotSeleccionado({ dia, hora })
    setFormError("")
    setModalOpen(true)
  }

  async function guardarCita() {
    if (!form.clienteObj || !form.id_servicio || !form.fechaInicio || !form.hora) {
      setFormError("Completa todos los campos obligatorios")
      return
    }
    setGuardando(true)
    try {
      const servicio = servicios.find(s => s.id == form.id_servicio)
      const fechaInicio = new Date(`${form.fechaInicio}T${form.hora}:00`)
      const mins = servicio?.hora_estimada || 30
      const fechaFin = new Date(fechaInicio.getTime() + mins * 60000)

      const res = await fetch(`${API}/public/citas`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({
          id_barberia: barberia.id,
          id_cliente: form.clienteObj.id,
          id_servicio: form.id_servicio,
          fechaInicio: fechaInicio.toISOString(),
          fechaFin: fechaFin.toISOString()
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al guardar")
      setModalOpen(false)
      cargarDatos()
    } catch (e) {
      setFormError(e.message)
    }
    setGuardando(false)
  }

  async function cambiarEstado(id, estado) {
    await fetch(`${API}/public/citas/${id}/estado`, {
      method: "PUT", headers: authHeaders(),
      body: JSON.stringify({ estado })
    })
    cargarDatos()
    setCitaDetalle(null)
  }

  function copiarLink() {
    const copy = (txt) => {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(txt).then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) }).catch(fallback)
      } else fallback()
    }
    const fallback = () => {
      const ta = document.createElement("textarea"); ta.value = linkPublico
      ta.style.cssText = "position:fixed;left:-9999px;top:-9999px"
      document.body.appendChild(ta); ta.select()
      if (document.execCommand("copy")) { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) }
      document.body.removeChild(ta)
    }
    copy(linkPublico)
  }

  const estadoColor = { pendiente:"#f59e0b", confirmada:"#10b981", cancelada:"#ef4444", completada:"#6366f1" }
  const citasHoy       = citas.filter(c => isSameDay(new Date(c.fechaInicio), new Date()))
  const citasPendientes = citas.filter(c => c.estado === "pendiente")
  const ocupadasEnForm  = horasOcupadasEnFecha(form.fechaInicio)

  return (
    <div className="citas-root">

      {/* ── Top bar ── */}
      <div className="citas-topbar">
        <div className="citas-topbar-left">
          <h1 className="citas-title">
            <i className="fas fa-calendar-alt" /> Gestión de Citas
          </h1>
          <div className="citas-stats">
            <div className="stat-chip">
              <span className="stat-n">{citasHoy.length}</span>
              <span className="stat-l">Hoy</span>
            </div>
            <div className="stat-chip pending">
              <span className="stat-n">{citasPendientes.length}</span>
              <span className="stat-l">Pendientes</span>
            </div>
            <div className="stat-chip total">
              <span className="stat-n">{citas.length}</span>
              <span className="stat-l">Total</span>
            </div>
          </div>
        </div>

        <div className="citas-topbar-right">
          <div className="link-facebook">
            <i className="fab fa-facebook" />
            <span className="link-label">Link para Facebook:</span>
            <span className="link-url">{linkPublico}</span>
            <button className={`btn-copiar ${linkCopiado ? "copiado" : ""}`} onClick={copiarLink}>
              <i className={`fas ${linkCopiado ? "fa-check" : "fa-copy"}`} />
              {linkCopiado ? "¡Copiado!" : "Copiar"}
            </button>
          </div>

          <div className="topbar-actions">
            <div className="vista-toggle">
              <button className={vistaMode==="semana"?"active":""} onClick={()=>setVistaMode("semana")}>
                <i className="fas fa-th" /> Semana
              </button>
              <button className={vistaMode==="lista"?"active":""} onClick={()=>setVistaMode("lista")}>
                <i className="fas fa-list" /> Lista
              </button>
            </div>
            <button className="btn-nueva-cita" onClick={abrirModalNuevo}>
              <i className="fas fa-plus" /> Nueva cita
            </button>
          </div>
        </div>
      </div>

      {/* ── Vista Semana ── */}
      {vistaMode === "semana" && (
        <div className="semana-wrap">
          <div className="semana-nav">
            <button onClick={()=>{ const d=new Date(baseDate); d.setDate(d.getDate()-7); setBaseDate(d) }}>
              <i className="fas fa-chevron-left" />
            </button>
            <span className="semana-rango">{formatFecha(semana[0])} — {formatFecha(semana[5])}</span>
            <button onClick={()=>{ const d=new Date(baseDate); d.setDate(d.getDate()+7); setBaseDate(d) }}>
              <i className="fas fa-chevron-right" />
            </button>
            <button className="btn-hoy" onClick={()=>setBaseDate(new Date())}>Hoy</button>
          </div>

          <div className="calendario-grid">
            <div className="cal-corner" />
            {semana.map((dia, i) => {
              const esHoy = isSameDay(dia, new Date())
              return (
                <div key={i} className={`cal-dia-header ${esHoy?"hoy":""}`}>
                  <span className="cal-dia-nombre">{DIAS[dia.getDay()]}</span>
                  <span className="cal-dia-num">{dia.getDate()}</span>
                  {esHoy && <span className="hoy-badge">Hoy</span>}
                </div>
              )
            })}

            {HORAS.map(hora => (
              <Fragment key={`row-${hora}`}>
                <div className="cal-hora-label">{hora}</div>
                {semana.map((dia, di) => {
                  const slotCitas = citasDelSlot(dia, hora)
                  const esPasado  = dia < new Date() && !isSameDay(dia, new Date())
                  const ocupado   = slotCitas.length > 0
                  return (
                    <div
                      key={`${hora}-${di}`}
                      className={`cal-slot ${esPasado?"pasado":""} ${ocupado?"ocupado":""}`}
                      onClick={()=> !esPasado && !ocupado && abrirNuevaCita(dia, hora)}
                      title={ocupado ? "Horario ocupado" : esPasado ? "Fecha pasada" : "Clic para agendar"}
                    >
                      {slotCitas.map(c => (
                        <div
                          key={c.id}
                          className="cita-chip"
                          style={{ borderLeftColor: estadoColor[c.estado] || "#9b30d9" }}
                          onClick={e=>{ e.stopPropagation(); setCitaDetalle(c) }}
                        >
                          <span className="chip-cliente">{c.cliente_nombre || "Cliente"}</span>
                          <span className="chip-servicio">{c.servicio_desc || ""}</span>
                        </div>
                      ))}
                      {!esPasado && !ocupado && (
                        <div className="slot-add-hint"><i className="fas fa-plus" /></div>
                      )}
                      {ocupado && !slotCitas.length && (
                        <div className="slot-ocupado-icon"><i className="fas fa-lock" /></div>
                      )}
                    </div>
                  )
                })}
              </Fragment>
            ))}
          </div>

          {/* Leyenda */}
          <div className="cal-leyenda">
            <span><span className="ley-dot" style={{background:"#f59e0b"}} />Pendiente</span>
            <span><span className="ley-dot" style={{background:"#10b981"}} />Confirmada</span>
            <span><span className="ley-dot" style={{background:"#6366f1"}} />Completada</span>
            <span><span className="ley-dot" style={{background:"#ef4444"}} />Cancelada</span>
            <span><span className="ley-dot ocupado-ley" />Ocupado</span>
          </div>
        </div>
      )}

      {/* ── Vista Lista ── */}
      {vistaMode === "lista" && (
        <div className="lista-wrap">
          <div className="lista-filtros">
            <span className="lista-count">{citas.length} citas en total</span>
          </div>
          {loading ? (
            <div className="loading-citas"><i className="fas fa-spinner fa-spin" /> Cargando citas...</div>
          ) : citas.length === 0 ? (
            <div className="empty-citas">
              <i className="fas fa-calendar-times" />
              <p>No hay citas registradas aún.</p>
              <p>Comparte el link de Facebook para recibir reservas.</p>
            </div>
          ) : (
            <div className="lista-citas">
              {[...citas].sort((a,b)=>new Date(b.fechaInicio)-new Date(a.fechaInicio)).map(c => {
                const f = new Date(c.fechaInicio)
                return (
                  <div key={c.id} className="lista-item" onClick={()=>setCitaDetalle(c)}>
                    <div className="lista-fecha">
                      <span className="lf-dia">{f.getDate()}</span>
                      <span className="lf-mes">{MESES[f.getMonth()].slice(0,3)}</span>
                    </div>
                    <div className="lista-info">
                      <span className="li-nombre">{c.cliente_nombre || "Sin nombre"}</span>
                      <span className="li-servicio"><i className="fas fa-cut" /> {c.servicio_desc || "Servicio"}</span>
                      <span className="li-hora"><i className="fas fa-clock" /> {String(f.getHours()).padStart(2,"0")}:{String(f.getMinutes()).padStart(2,"0")}</span>
                    </div>
                    <div className="lista-estado">
                      <span className="estado-badge" style={{background: estadoColor[c.estado]+"22", color: estadoColor[c.estado], borderColor: estadoColor[c.estado]}}>
                        {c.estado}
                      </span>
                    </div>
                    <div className="lista-precio">${parseFloat(c.precio||0).toFixed(2)}</div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Modal Nueva Cita ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={()=>setModalOpen(false)}>
          <div className="modal-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-calendar-plus" /> Nueva Cita</h2>
              <button className="modal-close" onClick={()=>setModalOpen(false)}>
                <i className="fas fa-times" />
              </button>
            </div>

            <div className="modal-body">
              {/* Búsqueda de cliente */}
              <div className="form-row">
                <label>Cliente * <span className="label-hint">Busca por nombre o teléfono</span></label>
                <ClienteSearch
                  barberiaId={barberia?.id}
                  value={form.clienteObj}
                  onChange={c => setForm({...form, clienteObj: c})}
                />
              </div>

              <div className="form-row">
                <label>Servicio *</label>
                <select value={form.id_servicio} onChange={e=>setForm({...form, id_servicio:e.target.value})}>
                  <option value="">— Selecciona servicio —</option>
                  {servicios.map(s=>(
                    <option key={s.id} value={s.id}>
                      {s.descripcion} — ${s.precio} ({s.hora_estimada} min)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row-2">
                <div className="form-row">
                  <label>Fecha *</label>
                  <input type="date" value={form.fechaInicio}
                    onChange={e=>setForm({...form, fechaInicio:e.target.value, hora:""})} />
                </div>
                <div className="form-row">
                  <label>Hora *</label>
                  <select value={form.hora} onChange={e=>setForm({...form, hora:e.target.value})}>
                    <option value="">— Hora —</option>
                    {HORAS.map(h => {
                      const isOcupada = ocupadasEnForm.has(h)
                      return (
                        <option key={h} value={h} disabled={isOcupada}
                          style={isOcupada ? {color:"#aaa", background:"#f8eef8"} : {}}>
                          {h}{isOcupada ? " — ocupado" : ""}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {formError && (
                <p className="form-error"><i className="fas fa-exclamation-circle" /> {formError}</p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancelar" onClick={()=>setModalOpen(false)}>Cancelar</button>
              <button className="btn-guardar" onClick={guardarCita} disabled={guardando}>
                {guardando
                  ? <><i className="fas fa-spinner fa-spin" /> Guardando...</>
                  : <><i className="fas fa-check" /> Guardar cita</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Detalle Cita ── */}
      {citaDetalle && (
        <div className="modal-overlay" onClick={()=>setCitaDetalle(null)}>
          <div className="modal-box detalle-box" onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="fas fa-info-circle" /> Detalle de Cita</h2>
              <button className="modal-close" onClick={()=>setCitaDetalle(null)}>
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="modal-body">
              <div className="detalle-grid">
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-user" /> Cliente</span>
                  <span className="di-val">{citaDetalle.cliente_nombre || "—"}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-cut" /> Servicio</span>
                  <span className="di-val">{citaDetalle.servicio_desc || "—"}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-calendar" /> Fecha</span>
                  <span className="di-val">{new Date(citaDetalle.fechaInicio).toLocaleString("es-MX")}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-dollar-sign" /> Precio</span>
                  <span className="di-val">${parseFloat(citaDetalle.precio||0).toFixed(2)}</span>
                </div>
                <div className="detalle-item">
                  <span className="di-label"><i className="fas fa-tag" /> Estado</span>
                  <span className="di-val">
                    <span className="estado-badge" style={{background: estadoColor[citaDetalle.estado]+"22", color: estadoColor[citaDetalle.estado], borderColor: estadoColor[citaDetalle.estado]}}>
                      {citaDetalle.estado}
                    </span>
                  </span>
                </div>
                {citaDetalle.telefono && (
                  <div className="detalle-item">
                    <span className="di-label"><i className="fas fa-phone" /> Teléfono</span>
                    <span className="di-val">{citaDetalle.telefono}</span>
                  </div>
                )}
              </div>
              <div className="detalle-acciones">
                <p className="acciones-label">Cambiar estado:</p>
                <div className="acciones-btns">
                  {["pendiente","confirmada","completada","cancelada"].map(est=>(
                    <button key={est}
                      className={`btn-estado ${citaDetalle.estado===est?"activo":""}`}
                      style={{"--ec": estadoColor[est]}}
                      onClick={()=>cambiarEstado(citaDetalle.id, est)}
                    >{est}</button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}