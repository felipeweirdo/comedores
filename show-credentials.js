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

async function showUserCredentials() {
    try {
        console.log('🔍 Obteniendo credenciales de usuarios...\n');

        const users = await pool.query(`
            SELECT id, email, password_hash, full_name, role, active
            FROM users
            WHERE active = TRUE
            ORDER BY created_at;
        `);

        console.log('👥 Usuarios en la base de datos:\n');

        users.rows.forEach(user => {
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📧 Email: ${user.email}`);
            console.log(`🔑 Contraseña: ${user.password_hash}`);
            console.log(`👤 Nombre: ${user.full_name}`);
            console.log(`🎭 Rol: ${user.role}`);
            console.log(`✅ Activo: ${user.active}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        });

        console.log(`\n📊 Total de usuarios activos: ${users.rowCount}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

showUserCredentials();
