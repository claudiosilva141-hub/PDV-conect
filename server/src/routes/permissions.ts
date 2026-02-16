import { Router } from 'express';
import { query } from '../db';

const router = Router();

// Get Global Permissions
router.get('/', async (req, res) => {
    try {
        const result = await query('SELECT * FROM global_permissions ORDER BY id LIMIT 1');
        if (result.rows.length > 0) {
            res.json(result.rows[0].permissions);
        } else {
            // Return default empty object or default permissions
            res.json({});
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch global permissions' });
    }
});

// Update Global Permissions
router.put('/', async (req, res) => {
    const permissions = req.body; // Expects JSON object directly
    try {
        const check = await query('SELECT id FROM global_permissions ORDER BY id LIMIT 1');
        if (check.rows.length > 0) {
            const result = await query(
                'UPDATE global_permissions SET permissions = $1 WHERE id = $2 RETURNING permissions',
                [JSON.stringify(permissions), check.rows[0].id]
            );
            res.json(result.rows[0].permissions);
        } else {
            const result = await query(
                'INSERT INTO global_permissions (permissions) VALUES ($1) RETURNING permissions',
                [JSON.stringify(permissions)]
            );
            res.json(result.rows[0].permissions);
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to update global permissions' });
    }
});

export default router;
