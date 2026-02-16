import { Router } from 'express';
import { query } from '../db';

const router = Router();

router.get('/', async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        id, name, contact, cpf, 
        zip_code as "zipCode", 
        street, number, neighborhood, city, state,
        created_at as "createdAt"
      FROM clients 
      ORDER BY name ASC
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

router.post('/', async (req, res) => {
    const { name, contact, cpf, zipCode, street, number, neighborhood, city, state } = req.body;
    try {
        const result = await query(
            'INSERT INTO clients (name, contact, cpf, zip_code, street, number, neighborhood, city, state) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *',
            [name, contact, cpf, zipCode, street, number, neighborhood, city, state]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update client
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, contact, cpf, zipCode, street, number, neighborhood, city, state } = req.body;
    try {
        const result = await query(
            'UPDATE clients SET name = $1, contact = $2, cpf = $3, zip_code = $4, street = $5, number = $6, neighborhood = $7, city = $8, state = $9 WHERE id = $10 RETURNING *',
            [name, contact, cpf, zipCode, street, number, neighborhood, city, state, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Client not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete client
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM clients WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
