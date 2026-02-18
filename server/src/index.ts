import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for easier integration if needed, can be refined later
}));

// CORS configuration - Allow all for now, but can be restricted to Vercel URL
app.use(cors({
    origin: '*', // In production, replace with your Vercel URL: ['https://your-app.vercel.app']
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});
// Increase limit for base64 images

// Routes
import { query } from './db';
import authRoutes from './routes/auth';
import productRoutes from './routes/products';
import clientRoutes from './routes/clients';
import orderRoutes from './routes/orders';
import companyRoutes from './routes/company';
import userRoutes from './routes/users';
import rawMaterialRoutes from './routes/raw-materials';
import permissionRoutes from './routes/permissions';

import { authenticateToken, requireAdmin } from './middleware/auth';

app.use('/api/auth', authRoutes);
app.use('/api/products', authenticateToken, productRoutes);
app.use('/api/clients', authenticateToken, clientRoutes);
app.use('/api/orders', authenticateToken, orderRoutes);
app.use('/api/company', companyRoutes); // Unprotected for login page
app.use('/api/users', authenticateToken, requireAdmin, userRoutes);
app.use('/api/raw-materials', authenticateToken, rawMaterialRoutes);
app.use('/api/permissions', authenticateToken, requireAdmin, permissionRoutes);

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Accessible locally at http://localhost:${PORT}`);

    // Test database connection
    try {
        const result = await query('SELECT NOW()');
        console.log(`[${new Date().toISOString()}] Database connected successfully: ${result.rows[0].now}`);
    } catch (err) {
        console.error(`[${new Date().toISOString()}] CRITICAL: Database connection failed!`, (err as Error).message);
    }
});
