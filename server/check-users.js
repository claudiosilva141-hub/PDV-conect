const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: { rejectUnauthorized: false }
});

async function check() {
    try {
        await client.connect();
        const res = await client.query('SELECT username, password FROM app_users');
        res.rows.forEach(r => {
            const isHashed = r.password.startsWith('$2');
            console.log(`USUARIO: ${r.username} | PASSWORD: ${isHashed ? '[HASHED]' : r.password}`);
        });
    } catch (err) {
        console.error('ERRO:', err.message);
    } finally {
        await client.end();
    }
}

check();
