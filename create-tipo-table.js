// Script para crear la tabla tipo y agregar los datos iniciales
require('dotenv').config();
const { Client } = require('pg');

async function createTipoTable() {
    const client = new Client({
        host: process.env.HOST,
        port: process.env.PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        console.log('🔌 Conectando a PostgreSQL...');
        await client.connect();
        console.log('✅ Conectado\n');

        // 1. Crear tabla tipo
        console.log('1️⃣  Creando tabla tipo...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS tipo (
                id_tipo SERIAL PRIMARY KEY,
                descripcion VARCHAR(100) NOT NULL UNIQUE,
                activo BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Tabla tipo creada\n');

        // 2. Insertar datos iniciales
        console.log('2️⃣  Insertando datos iniciales...');
        await client.query(`
            INSERT INTO tipo (id_tipo, descripcion) VALUES
            (1, 'Guardia'),
            (2, 'Enfermera'),
            (3, 'Externo')
            ON CONFLICT (descripcion) DO NOTHING
        `);
        console.log('   ✅ Datos insertados\n');

        // 3. Modificar tabla empleados para agregar tipo_id
        console.log('3️⃣  Modificando tabla empleados...');

        // Verificar si la columna ya existe
        const columnCheck = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'empleados' 
            AND column_name = 'tipo_id'
        `);

        if (columnCheck.rows.length === 0) {
            await client.query(`
                ALTER TABLE empleados 
                ADD COLUMN tipo_id INTEGER REFERENCES tipo(id_tipo)
            `);
            console.log('   ✅ Columna tipo_id agregada a empleados\n');
        } else {
            console.log('   ℹ️  Columna tipo_id ya existe en empleados\n');
        }

        // 4. Crear índice
        console.log('4️⃣  Creando índice...');
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_empleados_tipo_id 
            ON empleados(tipo_id)
        `);
        console.log('   ✅ Índice creado\n');

        // 5. Actualizar vista v_empleados_completo
        console.log('5️⃣  Actualizando vista v_empleados_completo...');
        await client.query('DROP VIEW IF EXISTS v_empleados_completo CASCADE');
        await client.query(`
            CREATE VIEW v_empleados_completo AS
            SELECT 
                e.internal_id,
                e.name AS empleado_nombre,
                e.number AS empleado_numero,
                e.type AS empleado_tipo,
                e.tipo_id,
                t.descripcion AS tipo_descripcion,
                CASE WHEN e.pin IS NOT NULL THEN 'Sí' ELSE 'No' END AS tiene_pin,
                e.last_active_date,
                CASE 
                    WHEN e.last_active_date IS NOT NULL 
                    THEN CURRENT_DATE - e.last_active_date::DATE 
                    ELSE NULL 
                END AS dias_inactivo,
                c.id AS comedor_id,
                c.name AS comedor_nombre,
                c.empresa_id,
                COALESCE(emp.nombre, 'Sin Empresa') AS empresa_nombre,
                e.created_at AS fecha_registro
            FROM empleados e
            JOIN comedores c ON e.comedor_id = c.id
            LEFT JOIN empresas emp ON c.empresa_id = emp.id
            LEFT JOIN tipo t ON e.tipo_id = t.id_tipo
        `);
        console.log('   ✅ Vista actualizada\n');

        // 6. Verificar datos
        console.log('6️⃣  Verificando datos en tabla tipo...');
        const result = await client.query('SELECT * FROM tipo ORDER BY id_tipo');
        console.table(result.rows);

        console.log('✅ ¡Tabla tipo creada y configurada exitosamente!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Código:', error.code);
        if (error.detail) console.error('Detalle:', error.detail);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

createTipoTable();
