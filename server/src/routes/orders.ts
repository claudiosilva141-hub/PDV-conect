import { Router } from 'express';
import { query, getClient } from '../db';

const router = Router();

// Helper to convert snake_case to camelCase
const toCamelCase = (row: any) => {
    const newRow: any = {};
    for (const key in row) {
        newRow[key.replace(/_([a-z])/g, (g) => g[1].toUpperCase())] = row[key];
    }
    return newRow;
};

// Get all orders with optional items
router.get('/', async (req, res) => {
    try {
        const includeItems = req.query.includeItems === 'true';
        const ordersResult = await query('SELECT id, type, client_name, client_contact, client_cpf, client_zip_code, client_street, client_number, client_neighborhood, client_city, client_state, total::float, status, created_at, updated_at FROM orders ORDER BY created_at DESC');
        const orders = ordersResult.rows.map(toCamelCase);

        if (includeItems) {
            // Fetch items and production details for each order
            for (const order of orders) {
                const itemsResult = await query(
                    'SELECT id, product_id as "productId", product_name as "productName", quantity::int, price::float FROM order_items WHERE order_id = $1',
                    [order.id]
                );
                const productionResult = await query(
                    'SELECT id, name, type, unit, quantity_used::float as "quantityUsed", cost_per_unit::float as "costPerUnit", notes FROM production_items WHERE order_id = $1',
                    [order.id]
                );
                order.items = itemsResult.rows;
                order.productionDetails = productionResult.rows.map(toCamelCase);
            }
        }

        res.json(orders);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create order with items
router.post('/', async (req, res) => {
    const {
        type,
        clientName,
        clientContact,
        clientCpf,
        clientZipCode,
        clientStreet,
        clientNumber,
        clientNeighborhood,
        clientCity,
        clientState,
        items,
        productionDetails,
        total,
        status
    } = req.body;

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Validate stock availability for sales BEFORE creating the order
        const isActiveOrder = status !== 'Orçamento' && status !== 'Cancelada';
        if (isActiveOrder && type === 'sale' && items && items.length > 0) {
            for (const item of items) {
                if (item.id) {
                    const stockResult = await client.query(
                        'SELECT stock FROM products WHERE id = $1',
                        [item.id]
                    );
                    if (stockResult.rows.length === 0) {
                        await client.query('ROLLBACK');
                        client.release();
                        return res.status(400).json({
                            message: `Produto "${item.name}" não encontrado.`
                        });
                    }
                    const currentStock = stockResult.rows[0].stock;
                    if (currentStock < item.quantity) {
                        await client.query('ROLLBACK');
                        client.release();
                        return res.status(400).json({
                            message: `Estoque insuficiente para "${item.name}". Disponível: ${currentStock}, Solicitado: ${item.quantity}`
                        });
                    }
                }
            }
        }

        // Insert order
        const orderResult = await client.query(
            `INSERT INTO orders (
                type, client_name, client_contact, client_cpf,
                client_zip_code, client_street, client_number,
                client_neighborhood, client_city, client_state,
                total, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            RETURNING *`,
            [
                type, clientName, clientContact, clientCpf,
                clientZipCode, clientStreet, clientNumber,
                clientNeighborhood, clientCity, clientState,
                total, status
            ]
        );
        const order = orderResult.rows[0];

        // Insert order items (for sale/budget) and update stock if not a budget

        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ($1, $2, $3, $4, $5)',
                    [order.id, item.id || null, item.name, item.quantity, item.price]
                );

                // Update product stock for sales
                if (isActiveOrder && type === 'sale' && item.id) {
                    await client.query(
                        'UPDATE products SET stock = stock - $1 WHERE id = $2',
                        [item.quantity, item.id]
                    );
                }
            }
        }

        // Insert production items (for service orders) and update raw materials stock
        if (productionDetails && productionDetails.length > 0) {
            for (const item of productionDetails) {
                await client.query(
                    'INSERT INTO production_items (order_id, name, type, unit, quantity_used, cost_per_unit, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [order.id, item.name, item.type, item.unit, item.quantityUsed, item.costPerUnit, item.notes || null]
                );

                // Update raw materials stock for Service Orders (only if type is raw_material)
                if (isActiveOrder && type === 'service-order' && item.type === 'raw_material') {
                    await client.query(
                        'UPDATE raw_materials SET quantity = quantity - $1 WHERE name = $2',
                        [item.quantityUsed, item.name]
                    );
                }
            }
        }

        await client.query('COMMIT');
        res.status(201).json(toCamelCase(order));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Update order
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const {
        type,
        clientName,
        clientContact,
        clientCpf,
        clientZipCode,
        clientStreet,
        clientNumber,
        clientNeighborhood,
        clientCity,
        clientState,
        items,
        productionDetails,
        total,
        status
    } = req.body;

    const client = await getClient();
    try {
        // Fetch old order and items to restore stock
        const oldOrderResult = await client.query('SELECT type, status FROM orders WHERE id = $1', [id]);
        if (oldOrderResult.rows.length === 0) {
            return res.status(404).json({ message: 'Order not found' });
        }
        const oldOrder = oldOrderResult.rows[0];
        const wasActive = oldOrder.status !== 'Orçamento' && oldOrder.status !== 'Cancelada';

        if (wasActive) {
            // Restore product stock
            if (oldOrder.type === 'sale') {
                const oldItems = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
                for (const item of oldItems.rows) {
                    if (item.product_id) {
                        await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
                    }
                }
            }
            // Restore raw materials
            if (oldOrder.type === 'service-order') {
                const oldProduction = await client.query('SELECT name, quantity_used FROM production_items WHERE order_id = $1 AND type = \'raw_material\'', [id]);
                for (const item of oldProduction.rows) {
                    await client.query('UPDATE raw_materials SET quantity = quantity + $1 WHERE name = $2', [item.quantity_used, item.name]);
                }
            }
        }

        await client.query('BEGIN');

        // Update order
        const orderResult = await client.query(
            `UPDATE orders SET
                type = $1, client_name = $2, client_contact = $3, client_cpf = $4,
                client_zip_code = $5, client_street = $6, client_number = $7,
                client_neighborhood = $8, client_city = $9, client_state = $10,
                total = $11, status = $12, updated_at = CURRENT_TIMESTAMP
            WHERE id = $13
            RETURNING *`,
            [
                type, clientName, clientContact, clientCpf,
                clientZipCode, clientStreet, clientNumber,
                clientNeighborhood, clientCity, clientState,
                total, status, id
            ]
        );

        if (orderResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ message: 'Order not found' });
        }

        const order = orderResult.rows[0];
        const isActive = status !== 'Orçamento' && status !== 'Cancelada';

        // Delete existing items and production details
        await client.query('DELETE FROM order_items WHERE order_id = $1', [id]);
        await client.query('DELETE FROM production_items WHERE order_id = $1', [id]);

        // Re-insert items
        if (items && items.length > 0) {
            for (const item of items) {
                await client.query(
                    'INSERT INTO order_items (order_id, product_id, product_name, quantity, price) VALUES ($1, $2, $3, $4, $5)',
                    [id, item.id || null, item.name, item.quantity, item.price]
                );

                if (isActive && type === 'sale' && (item.id || item.productId)) {
                    await client.query('UPDATE products SET stock = stock - $1 WHERE id = $2', [item.quantity, item.id || item.productId]);
                }
            }
        }

        // Re-insert production details
        if (productionDetails && productionDetails.length > 0) {
            for (const item of productionDetails) {
                await client.query(
                    'INSERT INTO production_items (order_id, name, type, unit, quantity_used, cost_per_unit, notes) VALUES ($1, $2, $3, $4, $5, $6, $7)',
                    [id, item.name, item.type, item.unit, item.quantityUsed, item.costPerUnit, item.notes || null]
                );

                if (isActive && type === 'service-order' && item.type === 'raw_material') {
                    await client.query('UPDATE raw_materials SET quantity = quantity - $1 WHERE name = $2', [item.quantityUsed, item.name]);
                }
            }
        }

        await client.query('COMMIT');
        res.json(toCamelCase(order));
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

// Delete order with stock restoration
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Restore stock before deleting
        const orderResult = await client.query('SELECT type, status FROM orders WHERE id = $1', [id]);
        if (orderResult.rows.length > 0) {
            const order = orderResult.rows[0];
            if (order.status !== 'Orçamento' && order.status !== 'Cancelada') {
                if (order.type === 'sale') {
                    const items = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [id]);
                    for (const item of items.rows) {
                        if (item.product_id) {
                            await client.query('UPDATE products SET stock = stock + $1 WHERE id = $2', [item.quantity, item.product_id]);
                        }
                    }
                }
                if (order.type === 'service-order') {
                    const production = await client.query('SELECT name, quantity_used FROM production_items WHERE order_id = $1 AND type = \'raw_material\'', [id]);
                    for (const item of production.rows) {
                        await client.query('UPDATE raw_materials SET quantity = quantity + $1 WHERE name = $2', [item.quantity_used, item.name]);
                    }
                }
            }
        }

        await client.query('DELETE FROM orders WHERE id = $1', [id]);
        await client.query('COMMIT');
        res.status(204).send();
    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    } finally {
        client.release();
    }
});

export default router;
