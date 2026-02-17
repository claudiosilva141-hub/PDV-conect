require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function fixUsersTable() {
    try {
        console.log('Criando tabela app_users...');

        // Create app_users table
        await pool.query(`
            CREATE TABLE IF NOT EXISTS app_users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                username VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role VARCHAR(50) NOT NULL DEFAULT 'user',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);

        console.log('✅ Tabela app_users criada!');

        // Migrate existing users from users table
        console.log('\nMigrando usuários existentes...');
        const existingUsers = await pool.query(`
            SELECT DISTINCT ON (username) username, password, role 
            FROM users 
            WHERE username IS NOT NULL AND password IS NOT NULL
        `);

        for (const user of existingUsers.rows) {
            try {
                await pool.query(`
                    INSERT INTO app_users (username, password, role)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (username) DO NOTHING
                `, [user.username, user.password, user.role || 'user']);
                console.log(`  ✅ Migrado: ${user.username}`);
            } catch (err) {
                console.log(`  ⚠️  Erro ao migrar ${user.username}: ${err.message}`);
            }
        }

        // Check final count
        const count = await pool.query('SELECT COUNT(*) FROM app_users');
        console.log(`\n✅ Total de usuários em app_users: ${count.rows[0].count}`);

        await pool.end();
    } catch (err) {
        console.error('ERRO:', err.message);
        await pool.end();
    }
}

fixUsersTable();
