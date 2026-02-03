// Script para ejecutar la migración multi-empresa
require('dotenv').config();
const { Client } = require('pg');

async function runMigration() {
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

        console.log('📝 Ejecutando migración multi-empresa...\n');

        // 1. Crear tabla empresas
        console.log('1️⃣  Creando tabla empresas...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS empresas (
                id VARCHAR(50) PRIMARY KEY,
                nombre VARCHAR(200) NOT NULL,
                descripcion TEXT,
                logo_url VARCHAR(500),
                activa BOOLEAN DEFAULT TRUE,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ Tabla empresas creada\n');

        // 2. Crear índices
        console.log('2️⃣  Creando índices...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_empresas_nombre ON empresas(nombre)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_empresas_activa ON empresas(activa)`);
        console.log('   ✅ Índices creados\n');

        // 3. Agregar columna empresa_id a comedores
        console.log('3️⃣  Agregando columna empresa_id a comedores...');
        try {
            await client.query(`ALTER TABLE comedores ADD COLUMN IF NOT EXISTS empresa_id VARCHAR(50)`);
            console.log('   ✅ Columna agregada\n');
        } catch (error) {
            if (error.code === '42701') {
                console.log('   ⚠️  Columna ya existe\n');
            } else {
                throw error;
            }
        }

        // 4. Insertar empresa demo
        console.log('4️⃣  Insertando empresa demo...');
        await client.query(`
            INSERT INTO empresas (id, nombre, descripcion, activa) 
            VALUES ('empresa_demo_01', 'Empresa Demo', 'Empresa de demostración del sistema', TRUE)
            ON CONFLICT (id) DO NOTHING
        `);
        console.log('   ✅ Empresa demo creada\n');

        // 5. Actualizar comedores existentes
        console.log('5️⃣  Asignando comedores a empresa demo...');
        const updateResult = await client.query(`
            UPDATE comedores 
            SET empresa_id = 'empresa_demo_01' 
            WHERE empresa_id IS NULL
        `);
        console.log(`   ✅ ${updateResult.rowCount} comedores actualizados\n`);

        // 6. Agregar constraint de foreign key
        console.log('6️⃣  Agregando foreign key...');
        try {
            await client.query(`
                ALTER TABLE comedores 
                ADD CONSTRAINT fk_comedores_empresa 
                FOREIGN KEY (empresa_id) REFERENCES empresas(id) ON DELETE CASCADE
            `);
            console.log('   ✅ Foreign key agregada\n');
        } catch (error) {
            if (error.code === '42710') {
                console.log('   ⚠️  Foreign key ya existe\n');
            } else {
                throw error;
            }
        }

        // 7. Crear índice en empresa_id
        console.log('7️⃣  Creando índice en comedores.empresa_id...');
        await client.query(`CREATE INDEX IF NOT EXISTS idx_comedores_empresa ON comedores(empresa_id)`);
        console.log('   ✅ Índice creado\n');

        // 8. Hacer empresa_id NOT NULL
        console.log('8️⃣  Haciendo empresa_id NOT NULL...');
        try {
            await client.query(`ALTER TABLE comedores ALTER COLUMN empresa_id SET NOT NULL`);
            console.log('   ✅ Constraint NOT NULL agregada\n');
        } catch (error) {
            console.log('   ⚠️  Ya es NOT NULL\n');
        }

        // 9. Crear vistas actualizadas
        console.log('9️⃣  Creando vistas...');

        await client.query(`
            CREATE OR REPLACE VIEW v_empleados_completo AS
            SELECT 
                e.internal_id,
                e.name AS empleado_nombre,
                e.number AS empleado_numero,
                e.type AS empleado_tipo,
                CASE WHEN e.pin IS NOT NULL THEN 'Sí' ELSE 'No' END AS tiene_pin,
                e.last_active_date,
                CURRENT_DATE - e.last_active_date::DATE AS dias_inactivo,
                c.id AS comedor_id,
                c.name AS comedor_nombre,
                emp.id AS empresa_id,
                emp.nombre AS empresa_nombre,
                e.created_at AS fecha_registro
            FROM empleados e
            JOIN comedores c ON e.comedor_id = c.id
            JOIN empresas emp ON c.empresa_id = emp.id
        `);

        await client.query(`
            CREATE OR REPLACE VIEW v_comedores_empresa AS
            SELECT 
                c.id AS comedor_id,
                c.name AS comedor_nombre,
                c.require_pin,
                emp.id AS empresa_id,
                emp.nombre AS empresa_nombre,
                emp.activa AS empresa_activa,
                c.created_at,
                c.updated_at
            FROM comedores c
            JOIN empresas emp ON c.empresa_id = emp.id
        `);
        console.log('   ✅ Vistas creadas\n');

        // 10. Crear funciones
        console.log('🔟 Creando funciones...');

        await client.query(`
            CREATE OR REPLACE FUNCTION sp_get_comedores_by_empresa(p_empresa_id VARCHAR(50))
            RETURNS TABLE(
                comedor_id VARCHAR(50),
                comedor_nombre VARCHAR(100),
                require_pin BOOLEAN,
                total_empleados BIGINT,
                created_at TIMESTAMP WITH TIME ZONE
            ) AS $$
            BEGIN
                RETURN QUERY
                SELECT 
                    c.id,
                    c.name,
                    c.require_pin,
                    COUNT(e.internal_id) AS total_empleados,
                    c.created_at
                FROM comedores c
                LEFT JOIN empleados e ON c.id = e.comedor_id
                WHERE c.empresa_id = p_empresa_id
                GROUP BY c.id, c.name, c.require_pin, c.created_at
                ORDER BY c.name;
            END;
            $$ LANGUAGE plpgsql
        `);

        await client.query(`
            CREATE OR REPLACE FUNCTION sp_get_empresa_stats(p_empresa_id VARCHAR(50))
            RETURNS TABLE(
                total_comedores BIGINT,
                total_empleados BIGINT,
                total_consumos_hoy BIGINT,
                total_consumos_semana BIGINT
            ) AS $$
            DECLARE
                v_week_id VARCHAR(20);
            BEGIN
                v_week_id := get_week_id(CURRENT_DATE);
                
                RETURN QUERY
                SELECT 
                    (SELECT COUNT(*) FROM comedores WHERE empresa_id = p_empresa_id),
                    (SELECT COUNT(*) 
                     FROM empleados e 
                     JOIN comedores c ON e.comedor_id = c.id 
                     WHERE c.empresa_id = p_empresa_id),
                    (SELECT COALESCE(SUM(consumption_count), 0)
                     FROM consumption_logs cl
                     JOIN comedores c ON cl.comedor_id = c.id
                     WHERE c.empresa_id = p_empresa_id
                     AND cl.consumption_date = CURRENT_DATE),
                    (SELECT COALESCE(SUM(consumption_count), 0)
                     FROM consumption_logs cl
                     JOIN comedores c ON cl.comedor_id = c.id
                     WHERE c.empresa_id = p_empresa_id
                     AND cl.week_id = v_week_id);
            END;
            $$ LANGUAGE plpgsql
        `);
        console.log('   ✅ Funciones creadas\n');

        // 11. Crear trigger
        console.log('1️⃣1️⃣  Creando trigger...');
        await client.query(`
            DROP TRIGGER IF EXISTS trg_empresas_updated_at ON empresas
        `);
        await client.query(`
            CREATE TRIGGER trg_empresas_updated_at
                BEFORE UPDATE ON empresas
                FOR EACH ROW
                EXECUTE FUNCTION update_updated_at_column()
        `);
        console.log('   ✅ Trigger creado\n');

        console.log('✅ ¡Migración completada exitosamente!\n');

        // Verificar resultados
        console.log('📊 Verificando estructura...\n');

        const empresasResult = await client.query('SELECT * FROM empresas');
        console.log('📋 Empresas:', empresasResult.rows.length);
        console.table(empresasResult.rows);

        const comedoresResult = await client.query('SELECT id, name, empresa_id FROM comedores');
        console.log('\n📋 Comedores:', comedoresResult.rows.length);
        console.table(comedoresResult.rows);

        const statsResult = await client.query("SELECT * FROM sp_get_empresa_stats('empresa_demo_01')");
        console.log('\n📊 Estadísticas de Empresa Demo:');
        console.table(statsResult.rows);

    } catch (error) {
        console.error('\n❌ Error durante la migración:');
        console.error('Código:', error.code);
        console.error('Mensaje:', error.message);
        console.error('\nDetalles:', error);
    } finally {
        await client.end();
        console.log('\n🔌 Conexión cerrada');
    }
}

runMigration();
