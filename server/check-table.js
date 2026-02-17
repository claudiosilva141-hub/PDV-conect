require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
});

async function checkUsersTable() {
    try {
        // Check if users table exists
        const tableCheck = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'users'
            );
        `);

        console.log('Tabela users existe?', tableCheck.rows[0].exists);

        if (tableCheck.rows[0].exists) {
            // Get table structure
            const structure = await pool.query(`
                SELECT column_name, data_type, is_nullable
                FROM information_schema.columns
                WHERE table_name = 'users'
                ORDER BY ordinal_position;
            `);

            console.log('\nEstrutura da tabela users:');
            structure.rows.forEach(col => {
                console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
            });

            // Count users
            const count = await pool.query('SELECT COUNT(*) FROM users');
            console.log(`\nTotal de usuários: ${count.rows[0].count}`);
        }

        await pool.end();
    } catch (err) {
        console.error('ERRO:', err.message);
        await pool.end();
    }
}

checkUsersTable();
