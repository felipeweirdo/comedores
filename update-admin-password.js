require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

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

async function updatePassword() {
    try {
        const newPassword = 'admin123';
        const email = 'admin@comedor.com';

        console.log('🔐 Actualizando contraseña...\n');

        // Generar hash de la nueva contraseña
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Actualizar en la base de datos
        const result = await pool.query(
            'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING email, full_name, role',
            [passwordHash, email]
        );

        if (result.rowCount > 0) {
            console.log('✅ Contraseña actualizada exitosamente!\n');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`📧 Email: ${result.rows[0].email}`);
            console.log(`👤 Nombre: ${result.rows[0].full_name}`);
            console.log(`🎭 Rol: ${result.rows[0].role}`);
            console.log(`🔑 Nueva Contraseña: ${newPassword}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            console.log('✨ Ahora puedes iniciar sesión con estas credenciales!');
        } else {
            console.log('❌ No se encontró el usuario');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

updatePassword();
