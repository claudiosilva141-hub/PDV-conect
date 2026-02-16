import { getClient, query } from './src/db';
import fs from 'fs';
import path from 'path';

async function migrate() {
    console.log('Testing database connection...');
    try {
        const client = await getClient();
        console.log('Connected successfully!');
        client.release();

        console.log('Reading schema.sql...');
        const schemaPath = path.resolve(__dirname, 'src/db/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        console.log('Executing schema migration...');
        await query(schemaSql);
        console.log('Schema migration completed successfully! Tables created.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
