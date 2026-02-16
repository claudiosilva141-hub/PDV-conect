import { Router } from 'express';
import { query } from '../db';

const router = Router();

// Get Company Info
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM company_info ORDER BY id LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0]);
        } else {
            res.json({ name: 'Minha Confecção', logo: null }); // Default
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch company info' });
    }
});

// Update Company Info
router.put('/', async (req, res) => {
    const { name, logo } = req.body;
    try {
        // Check if exists
        const check = await query('SELECT id FROM company_info ORDER BY id LIMIT 1');
        if (check.rows.length > 0) {
            const result = await query(
                'UPDATE company_info SET name = $1, logo = $2 WHERE id = $3 RETURNING *',
                [name, logo, check.rows[0].id]
            );
            res.json(result.rows[0]);
        } else {
            const result = await query(
                'INSERT INTO company_info (name, logo) VALUES ($1, $2) RETURNING *',
                [name, logo]
            );
            res.json(result.rows[0]);
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update company info' });
    }
});

export default router;
