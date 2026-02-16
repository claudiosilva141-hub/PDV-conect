import { Router } from 'express';
import { query } from '../db';

const router = Router();

// Get all products
router.get('/', async (req, res) => {
    try {
        const result = await query(`
      SELECT 
        id, 
        name, 
        description, 
        price::float, 
        cost_price::float as "costPrice", 
        stock::int, 
        image_url as "imageUrl", 
        created_at as "createdAt"
      FROM products 
      ORDER BY created_at DESC
    `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create product
router.post('/', async (req, res) => {
    const { name, description, price, costPrice, stock, imageUrl } = req.body;
    try {
        const result = await query(
            'INSERT INTO products (name, description, price, cost_price, stock, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
            [name, description, price, costPrice, stock, imageUrl]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description, price, costPrice, stock, imageUrl } = req.body;
    try {
        const result = await query(
            'UPDATE products SET name = $1, description = $2, price = $3, cost_price = $4, stock = $5, image_url = $6 WHERE id = $7 RETURNING *',
            [name, description, price, costPrice, stock, imageUrl, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ message: 'Product not found' });
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await query('DELETE FROM products WHERE id = $1', [id]);
        res.status(204).send();
    } catch (err) {
        res.status(500).json({ message: 'Server error' });
    }
});

export default router;
