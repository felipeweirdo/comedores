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

async function createComedor2User() {
    try {
        console.log('👤 Creando usuario para Comedor Secundario 02...\n');

        // Datos del nuevo usuario
        const userData = {
            email: 'comedor2@comedor.com',
            password: 'comedor123',
            fullName: 'Usuario Comedor 2',
            phone: '1234567890',
            role: 'monitor',
            comedorId: 'comedor_secundario_02',
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
        console.log(`📧 Email:      ${result.rows[0].email}`);
        console.log(`🔑 Contraseña: ${userData.password}`);
        console.log(`👤 Nombre:     ${result.rows[0].full_name}`);
        console.log(`🎭 Rol:        ${result.rows[0].role}`);
        console.log(`🏢 Comedor:    ${result.rows[0].comedor_id}`);
        console.log(`✅ Activo:     ${result.rows[0].active}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('💡 Este usuario solo verá empleados del comedor: comedor_secundario_02');
        console.log('💡 Guarda estas credenciales en un lugar seguro!\n');

    } catch (error) {
        if (error.code === '23505') {
            console.error('\n❌ Error: Ya existe un usuario con ese email.\n');
            console.log('💡 Si deseas actualizar el usuario, primero elimínalo o usa otro email.\n');
        } else if (error.code === '23514') {
            console.error('\n❌ Error: El rol especificado no es válido.\n');
            console.error('💡 Roles permitidos: administrador, monitor, usuario\n');
        } else if (error.code === '23503') {
            console.error('\n❌ Error: El comedor_id especificado no existe en la base de datos.\n');
            console.error('💡 Verifica que el comedor "comedor_secundario_02" exista en la tabla comedores.\n');
        } else {
            console.error('\n❌ Error:', error.message);
            console.error('Código:', error.code);
        }
    } finally {
        await pool.end();
    }
}

createComedor2User();
