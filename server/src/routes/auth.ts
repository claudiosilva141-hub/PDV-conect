import { Router } from 'express';
import { query } from '../db';
import bcrypt from 'bcryptjs';
import { generateToken } from '../middleware/auth';

const router = Router();

// Login
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const result = await query('SELECT * FROM app_users WHERE username = $1', [username]);

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.rows[0];
        const isValidPassword = await bcrypt.compare(String(password), user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token
        const token = generateToken(user.id, user.role);

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        res.json({ ...userWithoutPassword, token });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Register
router.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(String(password), 10);
        const result = await query(
            'INSERT INTO app_users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, role || 'user']
        );

        const newUser = result.rows[0];

        // Generate JWT token
        const token = generateToken(newUser.id, newUser.role);

        res.status(201).json({ ...newUser, token });
    } catch (err: any) {
        if (err.code === '23505') { // Unique violation
            return res.status(400).json({ message: 'Username already exists' });
        }
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
