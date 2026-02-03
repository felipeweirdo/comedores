// ============================================================================
// API REST - Sistema de Registro de Comida Multi-Empresa
// ============================================================================
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Pool de conexiones a PostgreSQL
const pool = new Pool({
    host: process.env.HOST,
    port: process.env.PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
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
        const { internal_id, comedor_id, name, number, type, pin } = req.body;

        const result = await pool.query(
            `INSERT INTO empleados (internal_id, comedor_id, name, number, type, pin, last_active_date)
             VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP)
             RETURNING *`,
            [internal_id, comedor_id, name, number || null, type || null, pin || null]
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
        const { name, number, type, pin } = req.body;

        const result = await pool.query(
            `UPDATE empleados 
             SET name = $1, number = $2, type = $3, pin = $4, updated_at = CURRENT_TIMESTAMP
             WHERE internal_id = $5
             RETURNING *`,
            [name, number || null, type || null, pin || null, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
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

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// GET: Obtener consumos de la semana actual
app.get('/api/consumos/semana-actual/:comedor_id', async (req, res) => {
    try {
        const { comedor_id } = req.params;
        const result = await pool.query('SELECT * FROM sp_consumos_semana_actual($1)', [comedor_id]);
        res.json(result.rows);
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

app.listen(PORT, () => {
    console.log('');
    console.log('🚀 ============================================');
    console.log('🚀  API REST - Sistema de Comedor Multi-Empresa');
    console.log('🚀 ============================================');
    console.log(`🌐  Servidor corriendo en: http://localhost:${PORT}`);
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
