import { Router } from 'express';
import { query } from '../db';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Get All Users (Admin only? For now public for simplicity)
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT id, username, role, created_at FROM users');
        // Note: Not returning passwords
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

// Create User (Admin functionality)
router.post('/', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        // Generate UUID if not using database default (DB default is uuid_generate_v4(), so we can omit ID)
        const result = await query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role, created_at',
            [username, password, role]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update User
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { username, role, password } = req.body;

    try {
        let result;
        if (password) {
            result = await query(
                'UPDATE users SET username = $1, role = $2, password = $3 WHERE id = $4 RETURNING id, username, role, created_at',
                [username, role, password, id]
            );
        } else {
            result = await query(
                'UPDATE users SET username = $1, role = $2 WHERE id = $3 RETURNING id, username, role, created_at',
                [username, role, id]
            );
        }

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete User
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

export default router;
