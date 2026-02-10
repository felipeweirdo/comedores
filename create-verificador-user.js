require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

async function createVerificadorUser() {
    try {
        console.log('Creating verificador user...');

        const email = 'verificador@comedor.com';
        const password = 'verificador123';
        const hashedPassword = await bcrypt.hash(password, 10);

        // Check if user exists
        const userCheck = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (userCheck.rows.length > 0) {
            console.log('User already exists. Updating password and role...');
            await pool.query(
                'UPDATE users SET password_hash = $1, role = $2, active = TRUE WHERE email = $3',
                [hashedPassword, 'verificador', email]
            );
        } else {
            console.log('Creating new user...');
            await pool.query(
                `INSERT INTO users (email, password_hash, full_name, role, comedor_id, active, created_at, updated_at)
                 VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
                [email, hashedPassword, 'Verificador', 'verificador', 'comedor_principal_01', true]
            );
        }

        console.log('Verificador user created/updated successfully.');
    } catch (error) {
        console.error('Error creating user:', error);
    } finally {
        await pool.end();
    }
}
console.log(process.env.DATABASE_URL);
createVerificadorUser();
