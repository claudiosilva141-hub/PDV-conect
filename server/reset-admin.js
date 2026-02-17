const { Client } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

async function reset() {
    const newPassword = 'admin123';
    try {
        await client.connect();
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const res = await client.query(
            'UPDATE app_users SET password = $1 WHERE username = $2 RETURNING username',
            [hashedPassword, 'pai']
        );

        if (res.rowCount > 0) {
            console.log(`Password for user "${res.rows[0].username}" has been reset to: ${newPassword}`);
        } else {
            console.log('User "admin" not found.');
        }
    } catch (err) {
        console.error('ERRO:', err.message);
    } finally {
        await client.end();
    }
}

reset();
