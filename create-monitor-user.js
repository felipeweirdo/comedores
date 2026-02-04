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

async function createMonitorUser() {
    try {
        console.log('👤 Creando usuario con rol "monitor"...\n');

        // Datos del nuevo usuario
        const userData = {
            email: 'monitor@comedor.com',
            password: 'monitor123',
            fullName: 'Usuario Monitor',
            phone: '1234567890',
            role: 'monitor',
            comedorId: 'comedor1',
            active: true
        };

        // Generar hash de la contraseña
        const passwordHash = await bcrypt.hash(userData.password, 10);

        // Insertar usuario
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role, comedor_id, active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, full_name, role, comedor_id, active`,
            [
                userData.email,
                passwordHash,
                userData.fullName,
                userData.phone,
                userData.role,
                userData.comedorId,
                userData.active
            ]
        );

        console.log('✅ Usuario creado exitosamente!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email: ${result.rows[0].email}`);
        console.log(`🔑 Contraseña: ${userData.password}`);
        console.log(`👤 Nombre: ${result.rows[0].full_name}`);
        console.log(`🎭 Rol: ${result.rows[0].role}`);
        console.log(`🏢 Comedor: ${result.rows[0].comedor_id}`);
        console.log(`✅ Activo: ${result.rows[0].active}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    } catch (error) {
        if (error.code === '23514') {
            console.error('❌ Error: El rol "monitor" no está permitido en la base de datos.');
            console.error('💡 Necesitas actualizar la restricción CHECK en la tabla users.\n');
            console.error('📝 Ejecuta este SQL para permitir el rol "monitor":');
            console.error('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;');
            console.error('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (\'administrador\', \'usuario\', \'monitor\'));');
        } else if (error.code === '23505') {
            console.error('❌ Error: Ya existe un usuario con ese email.');
        } else {
            console.error('❌ Error:', error.message);
            console.error('Código:', error.code);
        }
    } finally {
        await pool.end();
    }
}

createMonitorUser();
