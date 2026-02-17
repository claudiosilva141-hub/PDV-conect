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
        const result = await query('SELECT * FROM users WHERE username = $1', [username]);
        const user = result.rows[0];

        if (user) {
            // Check if password matches (handling both hashed and temporary plain-text for migration)
            // @ts-ignore
            const isMatch = await (bcrypt as any).compare(String(password), String(user.password));

            // Temporary fallback for plain text (remove after first login of all users)
            const isPlainTextMatch = user.password === password;

            if (isMatch || isPlainTextMatch) {
                // If it was a plain text match, we should ideally hash it now
                if (isPlainTextMatch && !isMatch) {
                    // @ts-ignore
                    const hashedPassword = await (bcrypt as any).hash(String(password), 10);
                    await query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, user.id]);
                }

                // Generate JWT token
                const token = generateToken(user.id, user.role);

                // Return user without password + token
                const { password: _, ...userWithoutPassword } = user;
                res.json({ ...userWithoutPassword, token });
            } else {
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }
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
        // @ts-ignore
        const hashedPassword = await (bcrypt as any).hash(String(password), 10);
        const result = await query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
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
