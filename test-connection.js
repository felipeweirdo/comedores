// Script para probar la conexión a PostgreSQL y listar bases de datos
require('dotenv').config();
const { Client } = require('pg');

async function testConnection() {
    console.log('🔌 Intentando conectar a PostgreSQL...');
    console.log('📍 Host:', process.env.HOST);
    console.log('👤 Usuario:', process.env.DB_USER);
    console.log('🔢 Puerto:', process.env.PORT);
    console.log('');

    // Primero conectar a la base de datos 'postgres' (siempre existe)
    const client = new Client({
        host: process.env.HOST,
        port: process.env.PORT || 5432,
        user: process.env.DB_USER,
        password: process.env.PASSWORD,
        database: 'postgres', // Base de datos por defecto
        ssl: {
            rejectUnauthorized: false
        }
    });

    try {
        await client.connect();
        console.log('✅ ¡Conexión exitosa a PostgreSQL!');
        console.log('');

        // Obtener versión
        const versionResult = await client.query('SELECT version()');
        console.log('📊 Versión de PostgreSQL:');
        console.log(versionResult.rows[0].version.split(',')[0]);
        console.log('');

        // Listar todas las bases de datos
        const dbQuery = `
            SELECT datname, pg_size_pretty(pg_database_size(datname)) as size
            FROM pg_database
            WHERE datistemplate = false
            ORDER BY datname
        `;
        const dbResult = await client.query(dbQuery);

        console.log('📋 Bases de datos disponibles:');
        console.table(dbResult.rows);
        console.log('');

        // Verificar si existe la base de datos 'comedor'
        const comedorExists = dbResult.rows.some(row => row.datname === process.env.DATABASE);

        if (comedorExists) {
            console.log(`✅ La base de datos "${process.env.DATABASE}" existe`);
            console.log('');

            // Cerrar conexión a postgres y conectar a comedor
            await client.end();

            const comedorClient = new Client({
                host: process.env.HOST,
                port: process.env.PORT || 5432,
                user: process.env.DB_USER,
                password: process.env.PASSWORD,
                database: process.env.DATABASE,
                ssl: {
                    rejectUnauthorized: false
                }
            });

            await comedorClient.connect();
            console.log(`🔌 Conectado a la base de datos "${process.env.DATABASE}"`);
            console.log('');

            // Listar tablas
            const tablesQuery = `
                SELECT 
                    table_name,
                    pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
                FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_type = 'BASE TABLE'
                ORDER BY table_name
            `;
            const tablesResult = await comedorClient.query(tablesQuery);

            if (tablesResult.rows.length > 0) {
                console.log('📋 Tablas en la base de datos:');
                console.table(tablesResult.rows);
                console.log('');

                // Verificar tabla 'comedor'
                const comedorTableExists = tablesResult.rows.some(row => row.table_name === 'comedor');

                if (comedorTableExists) {
                    console.log('✅ La tabla "comedor" existe');

                    // Mostrar estructura
                    const structureQuery = `
                        SELECT 
                            column_name, 
                            data_type,
                            character_maximum_length,
                            is_nullable,
                            column_default
                        FROM information_schema.columns
                        WHERE table_name = 'comedor'
                        ORDER BY ordinal_position
                    `;
                    const structureResult = await comedorClient.query(structureQuery);
                    console.log('');
                    console.log('📋 Estructura de la tabla "comedor":');
                    console.table(structureResult.rows);

                    // Contar registros
                    const countResult = await comedorClient.query('SELECT COUNT(*) FROM comedor');
                    console.log('');
                    console.log(`📈 Total de registros: ${countResult.rows[0].count}`);

                    // Mostrar primeros registros
                    if (parseInt(countResult.rows[0].count) > 0) {
                        const dataResult = await comedorClient.query('SELECT * FROM comedor LIMIT 5');
                        console.log('');
                        console.log('📄 Primeros 5 registros:');
                        console.table(dataResult.rows);
                    } else {
                        console.log('⚠️  La tabla está vacía');
                    }
                } else {
                    console.log('⚠️  La tabla "comedor" NO existe');
                }
            } else {
                console.log('⚠️  No hay tablas en la base de datos');
                console.log('💡 Puedes ejecutar el script create_database_postgresql.sql para crear las tablas');
            }

            await comedorClient.end();

        } else {
            console.log(`❌ La base de datos "${process.env.DATABASE}" NO existe`);
            console.log('');
            console.log('💡 Opciones:');
            console.log('   1. Crear la base de datos manualmente:');
            console.log(`      CREATE DATABASE ${process.env.DATABASE};`);
            console.log('');
            console.log('   2. Cambiar el nombre en .env a una base de datos existente');
        }

    } catch (error) {
        console.error('❌ Error al conectar a PostgreSQL:');
        console.error('');
        console.error('Código de error:', error.code);
        console.error('Mensaje:', error.message);
        console.error('');

        // Sugerencias según el tipo de error
        if (error.code === 'ENOTFOUND') {
            console.error('💡 Sugerencia: Verifica que el HOST sea correcto y que tengas conexión a internet');
        } else if (error.code === 'ECONNREFUSED') {
            console.error('💡 Sugerencia: El servidor PostgreSQL no está aceptando conexiones en ese puerto');
        } else if (error.code === '28P01') {
            console.error('💡 Sugerencia: Error de autenticación. Verifica:');
            console.error('   - Usuario (DB_USER) en .env');
            console.error('   - Contraseña (PASSWORD) en .env');
        } else if (error.code === '3D000') {
            console.error('💡 Sugerencia: La base de datos no existe');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('💡 Sugerencia: Timeout de conexión. Verifica:');
            console.error('   1. Que el Security Group de AWS RDS permita tu IP');
            console.error('   2. Que el RDS sea públicamente accesible');
            console.error('   3. Tu conexión a internet');
        }

    } finally {
        if (client._connected) {
            await client.end();
        }
        console.log('');
        console.log('🔌 Conexión cerrada');
    }
}

// Ejecutar el test
testConnection();
