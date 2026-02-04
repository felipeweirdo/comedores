require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.HOST,
    port: process.env.PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    ssl: {
        rejectUnauthorized: false
    }
});

async function checkUsersTable() {
    try {
        console.log('🔍 Verificando tabla users...\n');

        // Obtener estructura de la tabla
        const structure = await pool.query(`
            SELECT column_name, data_type, character_maximum_length, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'users'
            ORDER BY ordinal_position;
        `);

        console.log('📋 Columnas de la tabla users:');
        structure.rows.forEach(col => {
            console.log(`  - ${col.column_name} (${col.data_type}${col.character_maximum_length ? `(${col.character_maximum_length})` : ''})`);
        });

        // Obtener todos los datos sin filtrar columnas específicas
        const users = await pool.query(`SELECT * FROM users LIMIT 5;`);

        console.log('\n👥 Primeros 5 usuarios:');
        console.log(JSON.stringify(users.rows, null, 2));

        console.log('\n📊 Total de usuarios:', users.rowCount);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await pool.end();
    }
}

checkUsersTable();
