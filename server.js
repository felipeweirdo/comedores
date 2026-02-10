// ============================================================================
// API REST - Sistema de Registro de Comida Multi-Empresa
// ============================================================================
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS, JS, imágenes, etc.)
app.use(express.static(__dirname));

// Ruta raíz - servir el archivo HTML principal
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index-refactored-v2.html');
});

// Pool de conexiones a PostgreSQL
console.log('🔌 Intentando conectar a la base de datos con:', {
    connectionString: process.env.DATABASE_URL ? '[REDACTED]' : 'undefined',
    host: process.env.HOST || 'undefined',
    port: process.env.DB_PORT || 5432,
    database: process.env.DATABASE || 'undefined',
    user: process.env.DB_USER || 'undefined'
});

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    host: process.env.HOST,
    port: process.env.DB_PORT || 5432, // Changed from process.env.PORT to avoid conflict with API port
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000, // Increased to 10s
    ssl: {
        rejectUnauthorized: false
    }
});

// Probar conexión
pool.on('connect', () => {
    console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
    console.error('❌ Error inesperado en el pool de PostgreSQL:', err);
});

// ============================================================================
// ENDPOINTS - AUTENTICACIÓN
// ============================================================================

// POST: Login de usuario
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son requeridos' });
        }

        // Buscar usuario por email
        const result = await pool.query(
            'SELECT id, email, full_name, role, comedor_id, active, password_hash FROM users WHERE email = $1 AND active = TRUE',
            [email]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = result.rows[0];

        // Verificar contraseña con bcrypt
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.full_name,
                role: user.role,
                comedorId: user.comedor_id
            }
        });
    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Verificar contraseña (para acciones sensibles como logout o eliminación)
app.post('/api/auth/verify-password', async (req, res) => {
    try {
        const { userId, password } = req.body;

        if (!userId || !password) {
            return res.status(400).json({ error: 'User ID y contraseña son requeridos' });
        }

        const result = await pool.query(
            'SELECT password_hash FROM users WHERE id = $1 AND active = TRUE',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];
        const match = await bcrypt.compare(password, user.password_hash);

        if (!match) {
            return res.status(401).json({ error: 'Contraseña incorrecta', valid: false });
        }

        res.json({ success: true, valid: true });

    } catch (error) {
        console.error('Error verificando password:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Verificar sesión (opcional, para futuras mejoras)
app.get('/api/auth/me', async (req, res) => {
    try {
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: 'User ID requerido' });
        }

        const result = await pool.query(
            'SELECT id, email, full_name, role, comedor_id, active FROM users WHERE id = $1 AND active = TRUE',
            [userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        const user = result.rows[0];

        res.json({
            id: user.id,
            email: user.email,
            fullName: user.full_name,
            role: user.role,
            comedorId: user.comedor_id
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - GESTIÓN DE USUARIOS
// ============================================================================

// GET: Obtener todos los usuarios
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, email, full_name, role, comedor_id, active, created_at FROM users ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear usuario
app.post('/api/users', async (req, res) => {
    try {
        const { email, password, full_name, role, comedor_id } = req.body;

        // Validación básica
        if (!email || !password || !full_name || !role) {
            return res.status(400).json({ error: 'Faltan campos requeridos' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, role, comedor_id, active)
             VALUES ($1, $2, $3, $4, $5, TRUE)
             RETURNING id, email, full_name, role, comedor_id, active`,
            [email, passwordHash, full_name, role, comedor_id]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando usuario:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'El email ya está registrado' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT: Actualizar usuario
app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { email, full_name, role, comedor_id, active } = req.body;

        const result = await pool.query(
            `UPDATE users 
             SET email = $1, full_name = $2, role = $3, comedor_id = $4, active = $5, updated_at = CURRENT_TIMESTAMP
             WHERE id = $6
             RETURNING id, email, full_name, role, comedor_id, active`,
            [email, full_name, role, comedor_id, active, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT: Cambiar contraseña
app.put('/api/users/:id/password', async (req, res) => {
    try {
        const { id } = req.params;
        const { password } = req.body;

        if (!password) {
            return res.status(400).json({ error: 'La contraseña es requerida' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const result = await pool.query(
            `UPDATE users 
             SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2
             RETURNING id`,
            [passwordHash, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
        console.error('Error cambiando password:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar usuario (Soft delete)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `UPDATE users SET active = FALSE, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Usuario no encontrado' });
        }

        res.json({ success: true, message: 'Usuario desactivado correctamente' });
    } catch (error) {
        console.error('Error eliminando usuario:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - EMPRESAS
// ============================================================================

// GET: Obtener todas las empresas
app.get('/api/empresas', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM empresas WHERE activa = TRUE ORDER BY nombre');
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener una empresa por ID
app.get('/api/empresas/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM empresas WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empresa no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener estadísticas de una empresa
app.get('/api/empresas/:id/stats', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM sp_get_empresa_stats($1)', [id]);
        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear una nueva empresa
app.post('/api/empresas', async (req, res) => {
    try {
        const { id, nombre, descripcion, logo_url } = req.body;

        const result = await pool.query(
            `INSERT INTO empresas (id, nombre, descripcion, logo_url, activa)
             VALUES ($1, $2, $3, $4, TRUE)
             RETURNING *`,
            [id, nombre, descripcion || null, logo_url || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - COMEDORES
// ============================================================================

// GET: Obtener todos los comedores (opcionalmente filtrados por empresa)
app.get('/api/comedores', async (req, res) => {
    try {
        const { empresa_id } = req.query;

        let query = 'SELECT * FROM v_comedores_empresa';
        let params = [];

        if (empresa_id) {
            query += ' WHERE empresa_id = $1';
            params.push(empresa_id);
        }

        query += ' ORDER BY comedor_nombre';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear nuevo comedor
app.post('/api/comedores', async (req, res) => {
    try {
        const { id, name, empresa_id, require_pin } = req.body;

        if (!id || !name || !empresa_id) {
            return res.status(400).json({ error: 'ID, nombre y empresa_id son requeridos' });
        }

        const result = await pool.query(
            `INSERT INTO COMEDORES (comedor_id, comedor_nombre, empresa_id, require_pin)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, name, empresa_id, require_pin !== undefined ? require_pin : true]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error creando comedor:', error);
        if (error.code === '23505') {
            res.status(400).json({ error: 'Ya existe un comedor con ese ID' });
        } else if (error.code === '23503') {
            res.status(400).json({ error: 'La empresa especificada no existe' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// PUT: Actualizar comedor
app.put('/api/comedores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, empresa_id, require_pin } = req.body;

        let updates = [];
        let params = [];
        let paramCount = 1;

        if (name !== undefined) {
            updates.push(`comedor_nombre = $${paramCount++}`);
            params.push(name);
        }
        if (empresa_id !== undefined) {
            updates.push(`empresa_id = $${paramCount++}`);
            params.push(empresa_id);
        }
        if (require_pin !== undefined) {
            updates.push(`require_pin = $${paramCount++}`);
            params.push(require_pin);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        params.push(id);
        const query = `UPDATE COMEDORES SET ${updates.join(', ')} WHERE comedor_id = $${paramCount} RETURNING *`;

        const result = await pool.query(query, params);

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Comedor no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando comedor:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar comedor
app.delete('/api/comedores/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM COMEDORES WHERE comedor_id = $1 RETURNING *',
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Comedor no encontrado' });
        }

        res.json({ success: true, message: 'Comedor eliminado' });
    } catch (error) {
        console.error('Error eliminando comedor:', error);
        if (error.code === '23503') {
            res.status(400).json({ error: 'No se puede eliminar el comedor porque tiene empleados o usuarios asignados' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// GET: Obtener un comedor por ID
app.get('/api/comedores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM v_comedores_empresa WHERE comedor_id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comedor no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear un nuevo comedor
app.post('/api/comedores', async (req, res) => {
    try {
        const { id, name, empresa_id, require_pin } = req.body;

        const result = await pool.query(
            `INSERT INTO comedores (id, name, empresa_id, require_pin)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id, name, empresa_id, require_pin !== false]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT: Actualizar un comedor
app.put('/api/comedores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, require_pin } = req.body;

        const result = await pool.query(
            `UPDATE comedores 
             SET name = $1, require_pin = $2, updated_at = CURRENT_TIMESTAMP
             WHERE id = $3
             RETURNING *`,
            [name, require_pin, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comedor no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar un comedor
app.delete('/api/comedores/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM comedores WHERE id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Comedor no encontrado' });
        }

        res.json({ message: 'Comedor eliminado', comedor: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - EMPLEADOS
// ============================================================================

// GET: Obtener empleados (filtrados por comedor)
app.get('/api/empleados', async (req, res) => {
    try {
        const { comedor_id, search } = req.query;

        let query = 'SELECT * FROM empleados WHERE 1=1';
        let params = [];
        let paramCount = 1;

        if (comedor_id) {
            query += ` AND comedor_id = $${paramCount}`;
            params.push(comedor_id);
            paramCount++;
        }

        if (search) {
            query += ` AND (name ILIKE $${paramCount} OR number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
            paramCount++;
        }

        query += ' ORDER BY name';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener un empleado por ID
app.get('/api/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM empleados WHERE internal_id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear un nuevo empleado
app.post('/api/empleados', async (req, res) => {
    try {
        const { internal_id, comedor_id, name, number, type, pin, tipo_id } = req.body;

        const result = await pool.query(
            `INSERT INTO empleados (internal_id, comedor_id, name, number, type, pin, tipo_id, last_active_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
             RETURNING *`,
            [internal_id, comedor_id, name, number || null, type || null, pin || null, tipo_id || null]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT: Actualizar un empleado
app.put('/api/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const bodyFields = req.body;

        console.log('PUT /api/empleados/:id - Datos recibidos:', { id, body: bodyFields });

        // Construir la consulta dinámicamente solo con los campos proporcionados
        let updates = [];
        let params = [];
        let paramCount = 1;

        // Solo agregar campos que existan en el body (no undefined)
        if ('name' in bodyFields && bodyFields.name !== undefined) {
            updates.push(`name = $${paramCount++}`);
            params.push(bodyFields.name);
        }
        if ('number' in bodyFields && bodyFields.number !== undefined) {
            updates.push(`number = $${paramCount++}`);
            params.push(bodyFields.number || null);
        }
        if ('type' in bodyFields && bodyFields.type !== undefined) {
            updates.push(`type = $${paramCount++}`);
            params.push(bodyFields.type || null);
        }
        if ('pin' in bodyFields && bodyFields.pin !== undefined) {
            updates.push(`pin = $${paramCount++}`);
            params.push(bodyFields.pin || null);
        }
        if ('tipo_id' in bodyFields && bodyFields.tipo_id !== undefined) {
            updates.push(`tipo_id = $${paramCount++}`);
            params.push(bodyFields.tipo_id || null);
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No hay campos para actualizar' });
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);
        params.push(id);

        const query = `UPDATE empleados SET ${updates.join(', ')} WHERE internal_id = $${paramCount} RETURNING *`;

        console.log('Query SQL:', query);
        console.log('Params:', params);

        const result = await pool.query(query, params);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error actualizando empleado:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar un empleado
app.delete('/api/empleados/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM empleados WHERE internal_id = $1 RETURNING *', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json({ message: 'Empleado eliminado', empleado: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Empleados inactivos
app.get('/api/empleados/inactivos/list', async (req, res) => {
    try {
        const { comedor_id } = req.query;

        let query = 'SELECT * FROM v_empleados_inactivos';
        let params = [];

        if (comedor_id) {
            query += ' WHERE comedor_id = $1';
            params.push(comedor_id);
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - CONSUMOS
// ============================================================================

// POST: Registrar un consumo
app.post('/api/consumos', async (req, res) => {
    try {
        const { employee_id, comedor_id, consumption_date } = req.body;

        const result = await pool.query(
            'SELECT * FROM sp_registrar_consumo($1, $2, $3)',
            [employee_id, comedor_id, consumption_date || new Date().toISOString().split('T')[0]]
        );

        // Emitir evento de nuevo consumo a todos los clientes conectados
        try {
            // Buscamos información extra para enviar en el evento
            // Esto es opcional pero útil para que el cliente no tenga que hacer otra query
            if (result.rows[0].success) {
                const consumptionDetails = await pool.query(
                    `SELECT e.name, e.number, e.type, c.name as comedor_name
                     FROM empleados e
                     JOIN comedores c ON c.id = $2
                     WHERE e.internal_id = $1`,
                    [employee_id, comedor_id]
                );
                console.log('Consumo registrado', consumptionDetails.rows);
                if (consumptionDetails.rows.length > 0) {
                    const details = consumptionDetails.rows[0];
                    io.emit('new_consumption', {
                        employee_name: details.name,
                        employee_number: details.number,
                        employee_type: details.type,
                        comedor_name: details.comedor_name,
                        consumption_date: consumption_date || new Date().toISOString(),
                        timestamp: new Date()
                    });
                }
            }
        } catch (socketError) {
            console.error('Error emitiendo evento socket:', socketError);
            // No fallamos la request si falla el socket
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener consumos de la semana actual
app.get('/api/consumos/semana-actual/:comedor_id', async (req, res) => {
    try {
        console.log('Obteniendo consumos de la semana actual', req.params);
        const { comedor_id } = req.params;
        const result = await pool.query('SELECT * FROM sp_consumos_semana_actual($1)', [comedor_id]);
        console.log('Consumos obtenidos', result.rows);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener consumos del día actual (para Verificador)
app.get('/api/consumos/hoy', async (req, res) => {
    try {
        const { comedor_id, search } = req.query;

        let query = `
            SELECT cl.*, e.name as employee_name, e.number as employee_number, e.type as employee_type, c.name as comedor_name
            FROM consumption_logs cl
            JOIN empleados e ON cl.employee_id = e.internal_id
            JOIN comedores c ON cl.comedor_id = c.id
            WHERE cl.consumption_date = CURRENT_DATE
        `;
        let params = [];
        let paramCount = 1;

        if (comedor_id) {
            query += ` AND cl.comedor_id = $${paramCount++}`;
            params.push(comedor_id);
        }

        if (search) {
            query += ` AND (e.name ILIKE $${paramCount} OR e.number ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        query += ' ORDER BY cl.created_at DESC';

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error obteniendo consumos de hoy:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - HISTORIAL
// ============================================================================

// GET: Obtener lista de historiales (semanas guardadas)
app.get('/api/historial', async (req, res) => {
    try {
        const { comedor_id, limit } = req.query;

        let query = `
            SELECT h.*, c.name as comedor_nombre 
            FROM consumption_histories h
            JOIN comedores c ON h.comedor_id = c.id
        `;
        let params = [];
        let paramCount = 1;

        if (comedor_id) {
            query += ` WHERE h.comedor_id = $${paramCount++}`;
            params.push(comedor_id);
        }

        query += ` ORDER BY h.week_id DESC LIMIT $${paramCount}`;
        params.push(limit || 20);

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener detalles de un historial específico
app.get('/api/historial/:id/detalles', async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT SUM(hd.consumption_count) as consumption_count,
                e.name as empleado_nombre, 
                e.number as empleado_numero,
                e.type as empleado_tipo
            FROM consumption_history_details hd
            LEFT JOIN empleados e ON hd.employee_id = e.internal_id
            WHERE hd.history_id = $1
            GROUP BY e.internal_id ;
                     
        `;

        const result = await pool.query(query, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - TIPOS
// ============================================================================

// GET: Obtener todos los tipos
app.get('/api/tipos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM tipo WHERE activo = TRUE ORDER BY descripcion');
        res.json(result.rows);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener un tipo por ID
app.get('/api/tipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM tipo WHERE id_tipo = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tipo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Crear un nuevo tipo
app.post('/api/tipos', async (req, res) => {
    try {
        const { descripcion } = req.body;

        const result = await pool.query(
            `INSERT INTO tipo (descripcion, activo)
             VALUES ($1, TRUE)
             RETURNING *`,
            [descripcion]
        );

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// PUT: Actualizar un tipo
app.put('/api/tipos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { descripcion } = req.body;

        const result = await pool.query(
            `UPDATE tipo 
             SET descripcion = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id_tipo = $2
             RETURNING *`,
            [descripcion, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tipo no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// DELETE: Eliminar (desactivar) un tipo
app.delete('/api/tipos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar si hay empleados usando este tipo
        const checkResult = await pool.query(
            'SELECT COUNT(*) as count FROM empleados WHERE tipo_id = $1',
            [id]
        );

        if (parseInt(checkResult.rows[0].count) > 0) {
            return res.status(400).json({
                error: 'No se puede eliminar este tipo porque hay empleados asociados'
            });
        }

        const result = await pool.query(
            'UPDATE tipo SET activo = FALSE WHERE id_tipo = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tipo no encontrado' });
        }

        res.json({ message: 'Tipo desactivado', tipo: result.rows[0] });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINTS - TABLETS
// ============================================================================

// GET: Obtener configuración de tablet
app.get('/api/tablets/:tablet_id', async (req, res) => {
    try {
        const { tablet_id } = req.params;
        const result = await pool.query('SELECT * FROM tablet_configs WHERE tablet_id = $1', [tablet_id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Tablet no encontrada' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// POST: Registrar/actualizar configuración de tablet
app.post('/api/tablets', async (req, res) => {
    try {
        const { tablet_id, active_comedor_id, nickname } = req.body;

        const result = await pool.query(
            `INSERT INTO tablet_configs (tablet_id, active_comedor_id, nickname)
             VALUES ($1, $2, $3)
             ON CONFLICT (tablet_id)
             DO UPDATE SET 
                active_comedor_id = EXCLUDED.active_comedor_id,
                nickname = EXCLUDED.nickname,
                updated_at = CURRENT_TIMESTAMP
             RETURNING *`,
            [tablet_id, active_comedor_id || null, nickname || 'Sin sobrenombre']
        );

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// ENDPOINT DE SALUD
// ============================================================================

app.get('/api/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');
        res.json({
            status: 'OK',
            database: 'Connected',
            timestamp: result.rows[0].now
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            database: 'Disconnected',
            error: error.message
        });
    }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

server.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('🚀  API REST - Sistema de Comedor Multi-Empresa');
    console.log('🚀 ============================================');
    console.log(`🌐  Servidor corriendo en: http://localhost:${PORT}`);
    console.log(`📡  Socket.IO activo`);
    console.log(`📊  Health check: http://localhost:${PORT}/api/health`);
    console.log(`📚  Base de datos: ${process.env.DATABASE}`);
    console.log(`🏢  Host: ${process.env.HOST}`);
    console.log('🚀 ============================================');
    console.log('');
});

// Manejo de errores no capturados
process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err);
});

process.on('SIGTERM', () => {
    console.log('👋 SIGTERM recibido. Cerrando servidor...');
    pool.end(() => {
        console.log('🔌 Pool de PostgreSQL cerrado');
        process.exit(0);
    });
});
