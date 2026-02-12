const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Probar conexión
db.connect((err) => {
  if (err) {
    console.error("Error al conectar con MySQL:", err);
  } else {
    console.log(" Conectado a la base de datos MySQL:", process.env.DB_NAME);
  }
});

// ===== FUNCIONES DE VALIDACIÓN =====

// Validar que solo contenga letras, espacios y acentos
const validarTexto = (texto) => {
  const regex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  return regex.test(texto);
};

// Validar teléfono: exactamente 10 dígitos numéricos
const validarTelefono = (telefono) => {
  const regex = /^\d{10}$/;
  return regex.test(telefono);
};

// Función para validar datos del cliente
const validarDatosCliente = (datos) => {
  const errores = [];

  // Validar nombre
  if (!datos.nombre || datos.nombre.trim() === "") {
    errores.push("El nombre es obligatorio");
  } else if (!validarTexto(datos.nombre)) {
    errores.push("El nombre solo debe contener letras");
  }

  // Validar primer apellido
  if (!datos.primerAp || datos.primerAp.trim() === "") {
    errores.push("El primer apellido es obligatorio");
  } else if (!validarTexto(datos.primerAp)) {
    errores.push("El primer apellido solo debe contener letras");
  }

  // Validar segundo apellido (opcional, pero si existe debe ser válido)
  if (datos.segundoAp && datos.segundoAp.trim() !== "" && !validarTexto(datos.segundoAp)) {
    errores.push("El segundo apellido solo debe contener letras");
  }

  // Validar teléfono
  if (!datos.telefono || datos.telefono.trim() === "") {
    errores.push("El teléfono es obligatorio");
  } else if (!validarTelefono(datos.telefono)) {
    errores.push("El teléfono debe contener exactamente 10 dígitos numéricos");
  }

  return errores;
};

// ===== RUTAS =====

// Ruta principal
app.get("/", (req, res) => {
  res.json({ message: "Servidor Node.js + MySQL funcionando correctamente" });
});

// GET - Obtener todos los clientes
app.get("/clientes", (req, res) => {
  const sql = "SELECT * FROM clientes";
  
  db.query(sql, (err, results) => {
    if (err) {
      console.error("Error al obtener clientes:", err);
      return res.status(500).json({ error: "Error al obtener clientes" });
    }
    res.json(results);
  });
});

// GET - Obtener un cliente por ID
app.get("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const sql = "SELECT * FROM clientes WHERE id = ?";
  
  db.query(sql, [id], (err, results) => {
    if (err) {
      console.error("Error al obtener cliente:", err);
      return res.status(500).json({ error: "Error al obtener cliente" });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }
    
    res.json(results[0]);
  });
});

// POST - Agregar nuevo cliente (con validaciones)
app.post("/clientes", (req, res) => {
  const { nombre, primerAp, segundoAp, telefono, usuarioFacebook, usuarioInstagram } = req.body;

  // Validar datos
  const errores = validarDatosCliente(req.body);
  
  if (errores.length > 0) {
    return res.status(400).json({ 
      error: "Errores de validación", 
      detalles: errores 
    });
  }

  const sql = `INSERT INTO clientes (nombre, primerAp, segundoAp, telefono, usuarioFacebook, usuarioInstagram)
               VALUES (?, ?, ?, ?, ?, ?)`;

  db.query(sql, [nombre, primerAp, segundoAp || null, telefono, usuarioFacebook || null, usuarioInstagram || null], (err, result) => {
    if (err) {
      console.error("Error al insertar cliente:", err);
      return res.status(500).json({ error: "Error al agregar cliente" });
    }
    res.status(201).json({ 
      message: "Cliente agregado correctamente", 
      id: result.insertId 
    });
  });
});

// PUT - Actualizar cliente existente
app.put("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const { nombre, primerAp, segundoAp, telefono, usuarioFacebook, usuarioInstagram } = req.body;

  // Validar datos
  const errores = validarDatosCliente(req.body);
  
  if (errores.length > 0) {
    return res.status(400).json({ 
      error: "Errores de validación", 
      detalles: errores 
    });
  }

  const sql = `UPDATE clientes 
               SET nombre = ?, primerAp = ?, segundoAp = ?, telefono = ?, 
                   usuarioFacebook = ?, usuarioInstagram = ?
               WHERE id = ?`;

  db.query(sql, [nombre, primerAp, segundoAp || null, telefono, usuarioFacebook || null, usuarioInstagram || null, id], (err, result) => {
    if (err) {
      console.error("Error al actualizar cliente:", err);
      return res.status(500).json({ error: "Error al actualizar cliente" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ message: "Cliente actualizado correctamente" });
  });
});

// DELETE - Eliminar cliente
app.delete("/clientes/:id", (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM clientes WHERE id = ?";

  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error("Error al eliminar cliente:", err);
      return res.status(500).json({ error: "Error al eliminar cliente" });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Cliente no encontrado" });
    }

    res.json({ message: "Cliente eliminado correctamente" });
  });
});
// PATCH - Actualización parcial de cliente
app.patch("/clientes/:id", (req, res) => {
    const { id } = req.params;
    const campos = req.body; 

    const keys = Object.keys(campos);
    if (keys.length === 0) {
        return res.status(400).json({ error: "No se enviaron datos para actualizar" });
    }

    const setClause = keys.map(key => `${key} = ?`).join(", ");
    const values = [...Object.values(campos), id];

    const sql = `UPDATE clientes SET ${setClause} WHERE id = ?`;

    db.query(sql, values, (err, result) => {
        if (err) {
            console.error("Error en PATCH:", err);
            return res.status(500).json({ error: "Error al actualizar" });
        }
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Cliente no encontrado" });
        }
        res.json({ message: "Cliente actualizado con PATCH" });
    });
});

// Puerto
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));