import { query } from './src/db';

async function checkUsers() {
    try {
        const result = await query('SELECT username, role FROM app_users');
        console.log('--- USUÁRIOS NO BANCO ---');
        console.table(result.rows);
        if (result.rows.length === 0) {
            console.log('Nenhum usuário encontrado. O sistema deve mostrar a tela de configuração inicial.');
        }
    } catch (err) {
        console.error('Erro ao verificar usuários:', err);
    } finally {
        process.exit();
    }
}

checkUsers();
