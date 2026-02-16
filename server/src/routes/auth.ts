import { Router } from 'express';
import { query } from '../db';

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user && user.password === password) { // In production, use bcrypt.compare
            // Return user without password
            const { password, ...userWithoutPassword } = user;
            res.json(userWithoutPassword);
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register (Admin only in production, or public for MVP)
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;
    try {
        const result = await query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, password, role || 'user'] // In production, hash password
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
