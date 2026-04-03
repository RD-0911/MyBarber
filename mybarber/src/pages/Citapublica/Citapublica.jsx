import { useState, useEffect, useRef } from "react"
import "./CitaPublica.css"

const API =
  window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "http://192.168.100.64:5000"

const MESSENGER_PAGE_ID = "61575405185355"

const DIAS_ES  = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
                  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

const PASOS = ["servicio","fecha","hora","datos","confirmar"]

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

function getNextDays(n = 21) {
  const days = []
  const hoy  = new Date()
  for (let i = 0; i < n; i++) {
    const d = new Date(hoy)
    d.setDate(hoy.getDate() + i)
    days.push(d)
  }
  return days
}

function isSameDay(a, b) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function toFechaStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`
}


// ── Validaciones ─────────────────────────────────────────────────
const soloLetras  = (v) => /^[a-zA-ZáéíóúÁÉÍÓÚüÜñÑ\s]*$/.test(v)
const soloNumeros = (v) => /^[0-9]*$/.test(v)
// Facebook: letras, números, puntos, guiones, guion bajo, @ (reglas de Meta)
const esFacebookValido = (v) => /^[a-zA-Z0-9áéíóúÁÉÍÓÚñÑ@._\-\s]*$/.test(v)
const contieneHtml     = (v) => /<|>|script|javascript|onerror|onload/i.test(v)

function FormDatos({ form, setForm, onAtras, onSiguiente }) {
  const [tocados, setTocados] = useState({ nombre: false, primerAp: false, telefono: false, usuarioFacebook: false })

  const errores = {
    nombre:   !form.nombre.trim()                  ? "El nombre es obligatorio"
              : !soloLetras(form.nombre)             ? "Solo letras, sin números ni símbolos"
              : form.nombre.trim().length < 2        ? "Mínimo 2 letras"
              : null,
    primerAp: !form.primerAp.trim()                ? "El apellido es obligatorio"
              : !soloLetras(form.primerAp)           ? "Solo letras, sin números ni símbolos"
              : form.primerAp.trim().length < 2      ? "Mínimo 2 letras"
              : null,
    telefono: !form.telefono.trim()                ? "El teléfono es obligatorio"
              : !soloNumeros(form.telefono)          ? "Solo números, sin espacios ni guiones"
              : form.telefono.length !== 10          ? "Debe tener exactamente 10 dígitos"
              : null,
    usuarioFacebook: !form.usuarioFacebook.trim()          ? "El usuario de Facebook es obligatorio"
              : form.usuarioFacebook.trim().length < 3      ? "Mínimo 3 caracteres"
              : contieneHtml(form.usuarioFacebook)           ? "Contiene caracteres no permitidos"
              : !esFacebookValido(form.usuarioFacebook)      ? "Solo letras, números, puntos, guiones y @"
              : null,
  }

  const formValido = !errores.nombre && !errores.primerAp && !errores.telefono && !errores.usuarioFacebook

  function marcar(campo) {
    setTocados(t => ({ ...t, [campo]: true }))
  }

  function handleNombre(e) {
    const val = e.target.value
    // Solo permite letras y espacios mientras escribe
    if (soloLetras(val)) setForm({ ...form, nombre: val })
  }

  function handleApellido(e) {
    const val = e.target.value
    if (soloLetras(val)) setForm({ ...form, primerAp: val })
  }

  function handleTelefono(e) {
    const val = e.target.value.replace(/\D/g, "").slice(0, 10)
    setForm({ ...form, telefono: val })
  }

  function handleFacebook(e) {
    const val = e.target.value
    // Filtrar caracteres no permitidos en tiempo real
    const limpio = val.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ@._\-\s]/g, "")
    setForm({ ...form, usuarioFacebook: limpio })
    marcar("usuarioFacebook")
  }

  function handleSiguiente() {
    // Marcar todos como tocados para mostrar errores
    setTocados({ nombre: true, primerAp: true, telefono: true, usuarioFacebook: true })
    if (formValido) onSiguiente()
  }

  return (
    <section className="cp-section">
      <h2 className="cp-section-title">Tus datos de contacto</h2>
      <div className="form-cliente">

        {/* Nombre */}
        <div className="fc-group">
          <label><i className="fas fa-user" /> Nombre *</label>
          <input
            type="text"
            placeholder="Tu nombre"
            value={form.nombre}
            onChange={handleNombre}
            onBlur={() => marcar("nombre")}
            className={tocados.nombre && errores.nombre ? "input-error" : tocados.nombre && !errores.nombre ? "input-ok" : ""}
            maxLength={40}
          />
          {tocados.nombre && errores.nombre && (
            <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.nombre}</span>
          )}
          {tocados.nombre && !errores.nombre && (
            <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>
          )}
        </div>

        {/* Apellido */}
        <div className="fc-group">
          <label><i className="fas fa-user" /> Apellido *</label>
          <input
            type="text"
            placeholder="Tu apellido"
            value={form.primerAp}
            onChange={handleApellido}
            onBlur={() => marcar("primerAp")}
            className={tocados.primerAp && errores.primerAp ? "input-error" : tocados.primerAp && !errores.primerAp ? "input-ok" : ""}
            maxLength={40}
          />
          {tocados.primerAp && errores.primerAp && (
            <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.primerAp}</span>
          )}
          {tocados.primerAp && !errores.primerAp && (
            <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>
          )}
        </div>

        {/* Teléfono */}
        <div className="fc-group">
          <label><i className="fas fa-phone" /> Teléfono * <span className="fc-hint">10 dígitos</span></label>
          <div className="fc-tel-wrap">
            <span className="fc-lada">🇲🇽 +52</span>
            <input
              type="tel"
              inputMode="numeric"
              placeholder="3120000000"
              value={form.telefono}
              onChange={handleTelefono}
              onBlur={() => marcar("telefono")}
              className={tocados.telefono && errores.telefono ? "input-error" : tocados.telefono && !errores.telefono ? "input-ok" : ""}
              maxLength={10}
            />
          </div>
          <span className="fc-counter">{form.telefono.length}/10</span>
          {tocados.telefono && errores.telefono && (
            <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.telefono}</span>
          )}
          {tocados.telefono && !errores.telefono && (
            <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>
          )}
        </div>

        {/* Facebook — obligatorio */}
        <div className="fc-group">
          <label><i className="fab fa-facebook" /> Usuario de Facebook *</label>
          <input
            type="text"
            placeholder="@tunombre o tu.nombre"
            value={form.usuarioFacebook}
            onChange={handleFacebook}
            onBlur={() => marcar("usuarioFacebook")}
            className={tocados.usuarioFacebook && errores.usuarioFacebook ? "input-error" : tocados.usuarioFacebook && !errores.usuarioFacebook ? "input-ok" : ""}
            maxLength={60}
            autoCapitalize="none"
            autoCorrect="off"
          />

          {tocados.usuarioFacebook && errores.usuarioFacebook && (
            <span className="fc-error"><i className="fas fa-exclamation-circle" /> {errores.usuarioFacebook}</span>
          )}
          {tocados.usuarioFacebook && !errores.usuarioFacebook && (
            <span className="fc-ok"><i className="fas fa-check-circle" /> Correcto</span>
          )}
        </div>
      </div>

      <div className="cp-nav">
        <button className="btn-atras" onClick={onAtras}>
          <i className="fas fa-arrow-left" /> Atrás
        </button>
        <button className="btn-siguiente" onClick={handleSiguiente}>
          Revisar cita <i className="fas fa-arrow-right" />
        </button>
      </div>
    </section>
  )
}

export default function CitaPublica() {
  const params      = new URLSearchParams(window.location.search)
  const id_barberia = params.get("barberia")

  const [barberia,  setBarberia]  = useState(null)
  const [servicios, setServicios] = useState([])
  const [horario,   setHorario]   = useState({ diasLaborales:[1,2,3,4,5,6], horaInicio:"09:00", horaFin:"18:00", intervaloMinutos:30 })
  const [cargando,  setCargando]  = useState(true)
  const [error404,  setError404]  = useState(false)

  const [paso,     setPaso]     = useState(0)
  const [exito,    setExito]    = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [errMsg,   setErrMsg]   = useState("")

  // Disponibilidad del día seleccionado
  const [horasOcupadas,    setHorasOcupadas]    = useState(new Set())
  const [cargandoHoras,    setCargandoHoras]    = useState(false)

  const dias = getNextDays(21)

  const [servicioSel, setServicioSel] = useState(null)
  const [diaSel,      setDiaSel]      = useState(null)
  const [horaSel,     setHoraSel]     = useState(null)
  const [form, setForm] = useState({ nombre:"", primerAp:"", telefono:"", usuarioFacebook:"" })

  const scrollRef = useRef(null)

  // ── Carga inicial ────────────────────────────────────────────
  useEffect(() => {
    if (!id_barberia) { setError404(true); setCargando(false); return }
    Promise.all([
      fetch(`${API}/public/barberia/${id_barberia}`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/public/servicios/${id_barberia}`).then(r => r.json()),
      fetch(`${API}/barberia/${id_barberia}/horario`).then(r => r.json()).catch(() => null),
    ]).then(([b, s, h]) => {
      setBarberia(b)
      setServicios(Array.isArray(s) ? s : [])
      if (h && h.horaInicio) setHorario(h)
    }).catch(() => setError404(true))
      .finally(() => setCargando(false))
  }, [id_barberia])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" })
  }, [paso])

  // ── Cargar disponibilidad cuando se elige un día ─────────────
  useEffect(() => {
    if (!diaSel || !id_barberia) return
    setCargandoHoras(true)
    setHoraSel(null)
    setHorasOcupadas(new Set())

    fetch(`${API}/public/disponibilidad/${id_barberia}?fecha=${toFechaStr(diaSel)}`)
      .then(r => r.json())
      .then(data => {
        if (!Array.isArray(data)) return
        const ocupadas = new Set(
          data.map(c => {
            const f = new Date(c.fechaInicio)
            return `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
          })
        )
        setHorasOcupadas(ocupadas)
      })
      .catch(() => {})
      .finally(() => setCargandoHoras(false))
  }, [diaSel, id_barberia])

  async function confirmarCita() {
    if (!form.nombre || !form.primerAp || !form.telefono || !form.usuarioFacebook) {
      setErrMsg("Por favor completa todos los campos obligatorios.")
      return
    }
    setEnviando(true); setErrMsg("")
    try {
      const fechaInicio = new Date(`${toFechaStr(diaSel)}T${horaSel}:00`)
      const res = await fetch(`${API}/public/citas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_barberia, id_servicio: servicioSel.id,
          fechaInicio: fechaInicio.toISOString(),
          nombre: form.nombre.trim(), primerAp: form.primerAp.trim(),
          telefono: form.telefono.trim(),
          usuarioFacebook: form.usuarioFacebook.trim() || null,
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Error al crear la cita")
      setExito(true)
    } catch (e) {
      setErrMsg(e.message)
      // Si el error es de horario ocupado, regresar al paso de hora
      if (e.message.toLowerCase().includes("ocupado")) {
        setPaso(2)
        // Recargar disponibilidad
        if (diaSel) {
          setCargandoHoras(true)
          fetch(`${API}/public/disponibilidad/${id_barberia}?fecha=${toFechaStr(diaSel)}`)
            .then(r => r.json()).then(data => {
              if (!Array.isArray(data)) return
              setHorasOcupadas(new Set(data.map(c => {
                const f = new Date(c.fechaInicio)
                return `${String(f.getHours()).padStart(2,"0")}:${String(f.getMinutes()).padStart(2,"0")}`
              })))
            }).finally(() => setCargandoHoras(false))
        }
      }
    }
    setEnviando(false)
  }

  const HORAS = generarHoras(horario.horaInicio, horario.horaFin, horario.intervaloMinutos)
  const horasDisponibles = HORAS.filter(h => !horasOcupadas.has(h))

  // ── Loading ──────────────────────────────────────────────────
  if (cargando) return (
    <div className="cp-loading">
      <div className="cp-spinner" />
      <p>Cargando información...</p>
    </div>
  )

  if (error404) return (
    <div className="cp-error">
      <i className="fas fa-store-slash" />
      <h2>Barbería no encontrada</h2>
      <p>El enlace puede ser incorrecto o la barbería ya no está disponible.</p>
    </div>
  )

  if (exito) {
    // Construir mensaje pre-escrito para Messenger
    const fechaTexto = `${DIAS_ES[diaSel.getDay()]} ${diaSel.getDate()} de ${MESES_ES[diaSel.getMonth()]}`
    const nl = "%0A"
    const mensajeMessenger = `¡Hola! Acabo de agendar una cita en ${barberia.nombre} 💈${nl}${nl}📋 Resumen de mi cita:${nl}✂️ Servicio: ${servicioSel.descripcion}${nl}📅 Fecha: ${fechaTexto}${nl}⏰ Hora: ${horaSel} hrs${nl}💵 Precio: $${parseFloat(servicioSel.precio).toFixed(2)}${nl}${nl}👤 Nombre: ${form.nombre} ${form.primerAp}${nl}📱 Teléfono: ${form.telefono}${nl}${nl}¡Espero su confirmación! 🙏`

    const messengerUrl = `https://m.me/${MESSENGER_PAGE_ID}?text=${mensajeMessenger}`

    return (
      <div className="cp-exito">
        <div className="exito-card">
          <div className="exito-icon-wrap"><i className="fas fa-check" /></div>
          <h2>¡Cita reservada!</h2>
          <p className="exito-sub">Te esperamos en <strong>{barberia.nombre}</strong></p>

          <div className="exito-resumen">
            <div className="er-item"><i className="fas fa-cut" /><span>{servicioSel.descripcion}</span></div>
            <div className="er-item"><i className="fas fa-calendar" /><span>{fechaTexto}</span></div>
            <div className="er-item"><i className="fas fa-clock" /><span>{horaSel} hrs</span></div>
            <div className="er-item"><i className="fas fa-dollar-sign" /><span>${parseFloat(servicioSel.precio).toFixed(2)}</span></div>
          </div>

          {/* Bloque Messenger */}
          <div className="exito-messenger">
            <div className="em-header">
              <i className="fab fa-facebook-messenger em-icon" />
              <div>
                <p className="em-title">¡Confirma tu cita por Messenger!</p>
                <p className="em-desc">Envía tu resumen a <strong>{barberia.nombre}</strong> y recibe confirmación directa.</p>
              </div>
            </div>
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-messenger"
            >
              <i className="fab fa-facebook-messenger" />
              Enviar confirmación por Messenger
            </a>
            <p className="em-hint">
              <i className="fas fa-info-circle" /> Se abrirá Messenger con el mensaje listo — solo dale <strong>Enviar</strong>
            </p>
          </div>

          <p className="exito-nota">
            <i className="fas fa-clock" /> Tu cita está <strong>pendiente de confirmación</strong> hasta que el negocio la apruebe.
          </p>
        </div>
      </div>
    )
  }

  const pasoLabels = ["Servicio","Fecha","Hora","Tus datos","Confirmar"]

  return (
    <div className="cp-root" ref={scrollRef}>
      <div className="cp-grain" />

      {/* Header */}
      <header className="cp-header">
        <div className="cp-header-inner">
          <div className="cp-brand">
            <i className="fas fa-cut cp-scissors" />
            <div>
              <h1 className="cp-barberia-nombre">{barberia.nombre}</h1>
              <a
                className="cp-barberia-dir"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(barberia.nombre + ' ' + barberia.direccion)}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Ver en Google Maps"
              >
                <i className="fas fa-map-marker-alt" /> {barberia.direccion}
                <i className="fas fa-external-link-alt cp-dir-ext" />
              </a>
            </div>
          </div>
          <div className="cp-header-badge"><i className="fas fa-calendar-check" /> Reserva tu cita</div>
        </div>
      </header>

      {/* Progress */}
      <div className="cp-progress">
        {pasoLabels.map((lbl, i) => (
          <div key={i} className={`cp-step ${i < paso ? "done" : ""} ${i === paso ? "active" : ""}`}>
            <div className="cp-step-dot">
              {i < paso ? <i className="fas fa-check" /> : <span>{i + 1}</span>}
            </div>
            <span className="cp-step-lbl">{lbl}</span>
          </div>
        ))}
        <div className="cp-progress-bar">
          <div className="cp-progress-fill" style={{ width: `${(paso / (PASOS.length - 1)) * 100}%` }} />
        </div>
      </div>

      <main className="cp-main">

        {/* PASO 0 — Servicio */}
        {paso === 0 && (
          <section className="cp-section">
            <h2 className="cp-section-title">¿Qué servicio deseas?</h2>
            <div className="servicios-grid">
              {servicios.map(s => (
                <button key={s.id}
                  className={`servicio-card ${servicioSel?.id === s.id ? "selected" : ""}`}
                  onClick={() => setServicioSel(s)}
                >
                  <div className="sc-icon"><i className="fas fa-cut" /></div>
                  <div className="sc-info">
                    <span className="sc-nombre">{s.descripcion}</span>
                    <span className="sc-meta">
                      <span className="sc-precio">${parseFloat(s.precio).toFixed(2)}</span>
                      <span className="sc-dur"><i className="fas fa-clock" /> {s.hora_estimada} min</span>
                    </span>
                  </div>
                  {servicioSel?.id === s.id && <div className="sc-check"><i className="fas fa-check" /></div>}
                </button>
              ))}
            </div>
            <div className="cp-nav">
              <button className="btn-siguiente" disabled={!servicioSel} onClick={() => setPaso(1)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO 1 — Fecha */}
        {paso === 1 && (
          <section className="cp-section">
            <h2 className="cp-section-title">¿Qué día prefieres?</h2>
            <p className="cp-section-sub">Solo se muestran los días en que atendemos</p>
            <div className="dias-grid">
              {dias.map((d, i) => {
                const esHoy    = isSameDay(d, new Date())
                const selec    = diaSel && isSameDay(d, diaSel)
                const diaNum   = d.getDay()
                const cerrado  = !horario.diasLaborales.includes(diaNum)
                return (
                  <button key={i}
                    className={`dia-card ${selec ? "selected" : ""} ${cerrado ? "cerrado" : ""}`}
                    onClick={() => !cerrado && setDiaSel(d)}
                    disabled={cerrado}
                  >
                    <span className="dc-mes">{MESES_ES[d.getMonth()].slice(0,3)}</span>
                    <span className="dc-num">{d.getDate()}</span>
                    <span className="dc-dia">{DIAS_ES[d.getDay()]}</span>
                    {esHoy && !cerrado && <span className="dc-hoy">Hoy</span>}
                    {cerrado && <span className="dc-cerrado">Cerrado</span>}
                  </button>
                )
              })}
            </div>
            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(0)}>
                <i className="fas fa-arrow-left" /> Atrás
              </button>
              <button className="btn-siguiente" disabled={!diaSel} onClick={() => setPaso(2)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO 2 — Hora */}
        {paso === 2 && (
          <section className="cp-section">
            <h2 className="cp-section-title">
              Horarios disponibles
              {diaSel && <span className="cp-fecha-sel"> — {DIAS_ES[diaSel.getDay()]} {diaSel.getDate()} de {MESES_ES[diaSel.getMonth()]}</span>}
            </h2>

            {cargandoHoras ? (
              <div className="horas-cargando">
                <div className="cp-spinner small" />
                <span>Verificando disponibilidad...</span>
              </div>
            ) : (
              <>
                {/* Horas disponibles */}
                {horasDisponibles.length > 0 ? (
                  <>
                    <p className="cp-section-sub">
                      <i className="fas fa-check-circle" style={{color:"#10b981"}} /> {horasDisponibles.length} horario{horasDisponibles.length !== 1 ? "s" : ""} disponible{horasDisponibles.length !== 1 ? "s" : ""}
                    </p>
                    <div className="horas-grid">
                      {HORAS.map(h => {
                        const ocupada = horasOcupadas.has(h)
                        return (
                          <button key={h}
                            className={`hora-btn ${horaSel === h ? "selected" : ""} ${ocupada ? "ocupada" : ""}`}
                            onClick={() => !ocupada && setHoraSel(h)}
                            disabled={ocupada}
                            title={ocupada ? "Horario no disponible" : "Seleccionar este horario"}
                          >
                            {ocupada
                              ? <><i className="fas fa-lock" /> {h}</>
                              : <><i className="fas fa-clock" /> {h}</>
                            }
                          </button>
                        )
                      })}
                    </div>
                    {/* Leyenda */}
                    <div className="horas-leyenda">
                      <span className="hl-item disponible"><span className="hl-dot" />Disponible</span>
                      <span className="hl-item ocupado"><span className="hl-dot" /><i className="fas fa-lock" style={{fontSize:10}} /> Ocupado</span>
                      {horaSel && <span className="hl-item seleccionado"><span className="hl-dot" />Seleccionado: {horaSel}</span>}
                    </div>
                  </>
                ) : (
                  <div className="horas-sin-disponibilidad">
                    <i className="fas fa-calendar-times" />
                    <p>No hay horarios disponibles para este día.</p>
                    <p className="hsd-sub">Por favor selecciona otra fecha.</p>
                    <button className="btn-atras inline" onClick={() => { setPaso(1); setDiaSel(null) }}>
                      <i className="fas fa-calendar-alt" /> Elegir otra fecha
                    </button>
                  </div>
                )}
              </>
            )}

            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(1)}>
                <i className="fas fa-arrow-left" /> Atrás
              </button>
              <button className="btn-siguiente" disabled={!horaSel || cargandoHoras} onClick={() => setPaso(3)}>
                Siguiente <i className="fas fa-arrow-right" />
              </button>
            </div>
          </section>
        )}

        {/* PASO 3 — Datos del cliente */}
        {paso === 3 && (
          <FormDatos form={form} setForm={setForm}
            onAtras={() => setPaso(2)}
            onSiguiente={() => { setErrMsg(""); setPaso(4) }}
          />
        )}

        {/* PASO 4 — Confirmar */}
        {paso === 4 && (
          <section className="cp-section">
            <h2 className="cp-section-title">Confirma tu cita</h2>
            <div className="resumen-cita">
              <div className="rc-barberia"><i className="fas fa-store" /> {barberia.nombre}</div>
              <div className="rc-items">
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-cut" /> Servicio</span>
                  <span className="rc-val">{servicioSel?.descripcion}</span>
                </div>
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-calendar" /> Fecha</span>
                  <span className="rc-val">
                    {diaSel && `${DIAS_ES[diaSel.getDay()]} ${diaSel.getDate()} de ${MESES_ES[diaSel.getMonth()]}`}
                  </span>
                </div>
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-clock" /> Hora</span>
                  <span className="rc-val">{horaSel} hrs</span>
                </div>
                <div className="rc-item">
                  <span className="rc-label"><i className="fas fa-hourglass-half" /> Duración</span>
                  <span className="rc-val">{servicioSel?.hora_estimada} minutos</span>
                </div>
                <div className="rc-item precio">
                  <span className="rc-label"><i className="fas fa-dollar-sign" /> Total</span>
                  <span className="rc-val">${parseFloat(servicioSel?.precio || 0).toFixed(2)}</span>
                </div>
              </div>
              <div className="rc-cliente">
                <p><i className="fas fa-user" /> {form.nombre} {form.primerAp}</p>
                <p><i className="fas fa-phone" /> {form.telefono}</p>
                {form.usuarioFacebook && <p><i className="fab fa-facebook" /> {form.usuarioFacebook}</p>}
              </div>
            </div>

            {errMsg && (
              <div className="cp-err-msg">
                <i className="fas fa-exclamation-circle" /> {errMsg}
              </div>
            )}

            <div className="cp-nav">
              <button className="btn-atras" onClick={() => setPaso(3)}>
                <i className="fas fa-arrow-left" /> Modificar
              </button>
              <button className="btn-confirmar" onClick={confirmarCita} disabled={enviando}>
                {enviando
                  ? <><i className="fas fa-spinner fa-spin" /> Reservando...</>
                  : <><i className="fas fa-calendar-check" /> Confirmar reserva</>}
              </button>
            </div>
          </section>
        )}
      </main>

      <footer className="cp-footer">
        <p>Powered by <strong>MyBarber</strong> · {barberia.telefono}</p>
      </footer>
    </div>
  )
}