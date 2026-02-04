const bcrypt = require('bcrypt');

// La contraseña hasheada de la base de datos
const hashedPassword = '$2a$10$jVRy4xKDnRQ4MOtTut0S6uQ9fdhPvHRMjihqWFM3LSI7IMeVCdkI6';

// Contraseñas comunes para probar
const commonPasswords = [
    'admin',
    'admin123',
    'password',
    '123456',
    'comedor',
    'comedor123',
    'Admin123',
    'orbital',
    'Orbital123'
];

async function findPassword() {
    console.log('🔍 Probando contraseñas comunes...\n');

    for (const password of commonPasswords) {
        const match = await bcrypt.compare(password, hashedPassword);
        if (match) {
            console.log('✅ ¡CONTRASEÑA ENCONTRADA!');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            console.log(`🔑 Contraseña: ${password}`);
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
            return;
        }
    }

    console.log('❌ No se encontró la contraseña entre las comunes.');
    console.log('\n💡 Generando nueva contraseña...\n');

    // Generar nueva contraseña
    const newPassword = 'admin123';
    const newHash = await bcrypt.hash(newPassword, 10);

    console.log('✅ Nueva contraseña generada:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🔑 Contraseña: ${newPassword}`);
    console.log(`🔐 Hash: ${newHash}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('📝 Ejecuta este SQL para actualizar:');
    console.log(`UPDATE users SET password_hash = '${newHash}' WHERE email = 'admin@comedor.com';`);
}

findPassword();
