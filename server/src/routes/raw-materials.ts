import { Router, Request, Response } from 'express';
import { query } from '../db';

const router = Router();

// Helper to convert keys to camelCase (basic implementation)
const toCamelCase = (row: any) => {
    const newRow: any = {};
    for (const key in row) {
        newRow[key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = row[key];
    }
    return newRow;
};

// Get All Raw Materials
router.get('/', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT id, name, description, unit, quantity::float, cost_per_unit::float, supplier, created_at, updated_at FROM raw_materials');
        res.json(result.rows.map(toCamelCase));
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch raw materials' });
    }
});

// Create Raw Material
router.post('/', async (req: Request, res: Response) => {
    const { name, description, unit, quantity, costPerUnit, supplier } = req.body;
    try {
        const result = await query(
            'INSERT INTO raw_materials (name, description, unit, quantity, cost_per_unit, supplier) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, unit, quantity, costPerUnit, supplier]
        );
        res.status(201).json(toCamelCase(result.rows[0]));
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to create raw material' });
    }
});

// Update Raw Material
router.put('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, description, unit, quantity, costPerUnit, supplier } = req.body;
    try {
        const result = await query(
            `UPDATE raw_materials 
       SET name = $1, description = $2, unit = $3, quantity = $4, cost_per_unit = $5, supplier = $6, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $7 RETURNING *`,
            [name, description, unit, quantity, costPerUnit, supplier, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Raw material not found' });
        }
        res.json(toCamelCase(result.rows[0]));
    } catch (err) {
        res.status(500).json({ error: 'Failed to update raw material' });
    }
});

// Delete Raw Material
router.delete('/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        const result = await query('DELETE FROM raw_materials WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Raw material not found' });
        }
        res.json({ message: 'Raw material deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete raw material' });
    }
});

export default router;
