// Script para crear las vistas faltantes en PostgreSQL
require('dotenv').config();
const { Client } = require('pg');

async function createViews() {
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

        // 1. Eliminar vistas existentes si hay conflictos
        console.log('1️⃣  Eliminando vistas antiguas...');
        await client.query('DROP VIEW IF EXISTS v_empleados_completo CASCADE');
        await client.query('DROP VIEW IF EXISTS v_comedores_empresa CASCADE');
        await client.query('DROP VIEW IF EXISTS v_empleados_inactivos CASCADE');
        await client.query('DROP VIEW IF EXISTS v_consumos_semana CASCADE');
        await client.query('DROP VIEW IF EXISTS v_total_consumos_empleado CASCADE');
        console.log('   ✅ Vistas eliminadas\n');

        // 2. Crear vista v_comedores_empresa
        console.log('2️⃣  Creando vista v_comedores_empresa...');
        await client.query(`
            CREATE VIEW v_comedores_empresa AS
            SELECT 
                c.id AS comedor_id,
                c.name AS comedor_nombre,
                c.require_pin,
                c.empresa_id,
                COALESCE(emp.nombre, 'Sin Empresa') AS empresa_nombre,
                COALESCE(emp.activa, TRUE) AS empresa_activa,
                c.created_at,
                c.updated_at
            FROM comedores c
            LEFT JOIN empresas emp ON c.empresa_id = emp.id
        `);
        console.log('   ✅ Vista v_comedores_empresa creada\n');

        // 3. Crear vista v_empleados_completo
        console.log('3️⃣  Creando vista v_empleados_completo...');
        await client.query(`
            CREATE VIEW v_empleados_completo AS
            SELECT 
                e.internal_id,
                e.name AS empleado_nombre,
                e.number AS empleado_numero,
                e.type AS empleado_tipo,
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
        `);
        console.log('   ✅ Vista v_empleados_completo creada\n');

        // 4. Crear vista v_empleados_inactivos
        console.log('4️⃣  Creando vista v_empleados_inactivos...');
        await client.query(`
            CREATE VIEW v_empleados_inactivos AS
            SELECT 
                e.internal_id,
                e.name AS empleado_nombre,
                e.number AS empleado_numero,
                e.type AS empleado_tipo,
                e.last_active_date,
                CURRENT_DATE - e.last_active_date::DATE AS dias_inactivo,
                c.id AS comedor_id,
                c.name AS comedor_nombre
            FROM empleados e
            JOIN comedores c ON e.comedor_id = c.id
            WHERE e.last_active_date IS NOT NULL
            AND CURRENT_DATE - e.last_active_date::DATE > 21
            ORDER BY dias_inactivo DESC
        `);
        console.log('   ✅ Vista v_empleados_inactivos creada\n');

        // 5. Crear vista v_consumos_semana
        console.log('5️⃣  Creando vista v_consumos_semana...');
        await client.query(`
            CREATE VIEW v_consumos_semana AS
            SELECT 
                cl.week_id,
                cl.comedor_id,
                c.name AS comedor_nombre,
                cl.day_name,
                SUM(cl.consumption_count) AS total_consumos,
                COUNT(DISTINCT cl.employee_id) AS total_empleados,
                cl.consumption_date
            FROM consumption_logs cl
            JOIN comedores c ON cl.comedor_id = c.id
            GROUP BY cl.week_id, cl.comedor_id, c.name, cl.day_name, cl.consumption_date
            ORDER BY cl.consumption_date DESC
        `);
        console.log('   ✅ Vista v_consumos_semana creada\n');

        // 6. Crear vista v_total_consumos_empleado
        console.log('6️⃣  Creando vista v_total_consumos_empleado...');
        await client.query(`
            CREATE VIEW v_total_consumos_empleado AS
            SELECT 
                e.internal_id,
                e.name AS empleado_nombre,
                e.number AS empleado_numero,
                e.comedor_id,
                c.name AS comedor_nombre,
                COALESCE(SUM(cl.consumption_count), 0) AS total_consumos
            FROM empleados e
            JOIN comedores c ON e.comedor_id = c.id
            LEFT JOIN consumption_logs cl ON e.internal_id = cl.employee_id
            GROUP BY e.internal_id, e.name, e.number, e.comedor_id, c.name
            ORDER BY total_consumos DESC
        `);
        console.log('   ✅ Vista v_total_consumos_empleado creada\n');

        console.log('✅ ¡Todas las vistas creadas exitosamente!\n');

        // Verificar vistas creadas
        console.log('📊 Verificando vistas...\n');
        const result = await client.query(`
            SELECT table_name 
            FROM information_schema.views 
            WHERE table_schema = 'public'
            ORDER BY table_name
        `);

        console.log('Vistas disponibles:');
        result.rows.forEach(row => console.log(`  ✓ ${row.table_name}`));
        console.log('');

        // Probar una vista
        console.log('🧪 Probando vista v_comedores_empresa...');
        const testResult = await client.query('SELECT * FROM v_comedores_empresa LIMIT 3');
        console.table(testResult.rows);

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Código:', error.code);
        console.error('\nDetalles:', error);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

createViews();
