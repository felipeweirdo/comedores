require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const readline = require('readline');

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

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function createUser() {
    try {
        console.log('\n👤 ═══════════════════════════════════════════');
        console.log('   CREAR NUEVO USUARIO');
        console.log('═══════════════════════════════════════════\n');

        // Solicitar datos
        const email = await question('📧 Email: ');
        const password = await question('🔑 Contraseña: ');
        const fullName = await question('👤 Nombre completo: ');
        const phone = await question('📱 Teléfono (opcional): ');

        console.log('\n🎭 Roles disponibles:');
        console.log('  1. administrador - Acceso completo');
        console.log('  2. monitor - Solo registro de comida');
        console.log('  3. usuario - Solo registro de comida');

        const roleChoice = await question('\nSeleccione rol (1-3): ');

        const roles = {
            '1': 'administrador',
            '2': 'monitor',
            '3': 'usuario'
        };

        const role = roles[roleChoice] || 'monitor';

        const comedorId = await question('🏢 Comedor ID (default: comedor1): ') || 'comedor1';

        console.log('\n⏳ Creando usuario...\n');

        // Generar hash de la contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Insertar usuario
        const result = await pool.query(
            `INSERT INTO users (email, password_hash, full_name, phone, role, comedor_id, active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             RETURNING id, email, full_name, role, comedor_id, active`,
            [
                email,
                passwordHash,
                fullName,
                phone || null,
                role,
                comedorId,
                true
            ]
        );

        console.log('✅ Usuario creado exitosamente!\n');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`📧 Email:      ${result.rows[0].email}`);
        console.log(`🔑 Contraseña: ${password}`);
        console.log(`👤 Nombre:     ${result.rows[0].full_name}`);
        console.log(`🎭 Rol:        ${result.rows[0].role}`);
        console.log(`🏢 Comedor:    ${result.rows[0].comedor_id}`);
        console.log(`✅ Activo:     ${result.rows[0].active}`);
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

        console.log('💡 Guarda estas credenciales en un lugar seguro!\n');

    } catch (error) {
        if (error.code === '23505') {
            console.error('\n❌ Error: Ya existe un usuario con ese email.\n');
        } else if (error.code === '23514') {
            console.error('\n❌ Error: El rol especificado no es válido.\n');
            console.error('💡 Roles permitidos: administrador, monitor, usuario\n');
        } else {
            console.error('\n❌ Error:', error.message);
        }
    } finally {
        rl.close();
        await pool.end();
    }
}

createUser();
