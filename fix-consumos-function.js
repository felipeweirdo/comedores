// Script para eliminar y recrear funciones de consumos
require('dotenv').config();
const { Client } = require('pg');

async function recreateConsumosFunctions() {
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

        // 1. Eliminar funciones existentes
        console.log('1️⃣  Eliminando funciones existentes...');
        await client.query('DROP FUNCTION IF EXISTS sp_consumos_semana_actual(VARCHAR) CASCADE');
        await client.query('DROP FUNCTION IF EXISTS get_week_id(DATE) CASCADE');
        console.log('   ✅ Funciones eliminadas\n');

        // 2. Crear función get_week_id
        console.log('2️⃣  Creando función get_week_id...');
        await client.query(`
            CREATE FUNCTION get_week_id(p_date DATE DEFAULT CURRENT_DATE)
            RETURNS VARCHAR(20) AS $$
            DECLARE
                v_monday DATE;
            BEGIN
                v_monday := p_date - ((EXTRACT(DOW FROM p_date)::INTEGER + 6) % 7);
                RETURN TO_CHAR(v_monday, 'YYYY') || '-' || 
                       EXTRACT(MONTH FROM v_monday)::TEXT || '-' || 
                       EXTRACT(DAY FROM v_monday)::TEXT;
            END;
            $$ LANGUAGE plpgsql IMMUTABLE;
        `);
        console.log('   ✅ Función get_week_id creada\n');

        // 3. Crear función sp_consumos_semana_actual
        console.log('3️⃣  Creando función sp_consumos_semana_actual...');
        await client.query(`
            CREATE FUNCTION sp_consumos_semana_actual(p_comedor_id VARCHAR(50))
            RETURNS TABLE(
                employee_id VARCHAR(50),
                employee_name VARCHAR(200),
                employee_number VARCHAR(50),
                day_name VARCHAR(20),
                consumption_count INTEGER,
                consumption_date DATE,
                week_id VARCHAR(20)
            ) AS $$
            DECLARE
                v_week_id VARCHAR(20);
            BEGIN
                v_week_id := get_week_id(CURRENT_DATE);
                
                RETURN QUERY
                SELECT 
                    cl.employee_id,
                    e.name AS employee_name,
                    e.number AS employee_number,
                    cl.day_name,
                    cl.consumption_count,
                    cl.consumption_date,
                    cl.week_id
                FROM consumption_logs cl
                JOIN empleados e ON cl.employee_id = e.internal_id
                WHERE cl.comedor_id = p_comedor_id
                AND cl.week_id = v_week_id
                ORDER BY e.name, cl.consumption_date;
            END;
            $$ LANGUAGE plpgsql;
        `);
        console.log('   ✅ Función sp_consumos_semana_actual creada\n');

        // 4. Verificar week_id actual
        console.log('4️⃣  Week ID actual:');
        const weekIdResult = await client.query('SELECT get_week_id(CURRENT_DATE) as week_id, CURRENT_DATE as fecha');
        console.table(weekIdResult.rows);

        // 5. Ver consumption_logs
        console.log('5️⃣  Registros en consumption_logs:');
        const logsCount = await client.query('SELECT COUNT(*) as total FROM consumption_logs');
        console.log(`   Total de registros: ${logsCount.rows[0].total}\n`);

        if (parseInt(logsCount.rows[0].total) > 0) {
            const logsResult = await client.query(`
                SELECT 
                    cl.week_id,
                    cl.day_name,
                    cl.consumption_date,
                    cl.comedor_id,
                    COUNT(*) as registros
                FROM consumption_logs cl
                GROUP BY cl.week_id, cl.day_name, cl.consumption_date, cl.comedor_id
                ORDER BY cl.consumption_date DESC
                LIMIT 5
            `);
            console.log('   Últimos registros:');
            console.table(logsResult.rows);
        } else {
            console.log('   ⚠️  No hay registros. Registra consumos desde el frontend.\n');
        }

        // 6. Probar la función
        console.log('6️⃣  Probando función sp_consumos_semana_actual...');
        const comedoresResult = await client.query('SELECT id, name FROM comedores LIMIT 1');

        if (comedoresResult.rows.length > 0) {
            const comedorId = comedoresResult.rows[0].id;
            console.log(`   Comedor: ${comedoresResult.rows[0].name} (${comedorId})\n`);

            const testResult = await client.query('SELECT * FROM sp_consumos_semana_actual($1)', [comedorId]);
            console.log(`   ✅ Registros encontrados: ${testResult.rows.length}\n`);

            if (testResult.rows.length > 0) {
                console.log('   Datos:');
                console.table(testResult.rows);
            } else {
                console.log('   ℹ️  No hay consumos esta semana para este comedor');
                console.log('   💡 Registra algunos consumos desde el frontend\n');
            }
        }

        console.log('✅ ¡Funciones recreadas exitosamente!\n');

    } catch (error) {
        console.error('\n❌ Error:', error.message);
        console.error('Código:', error.code);
        if (error.hint) console.error('Sugerencia:', error.hint);
    } finally {
        await client.end();
        console.log('🔌 Conexión cerrada');
    }
}

recreateConsumosFunctions();
