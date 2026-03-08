import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
            ? process.env.ALLOWED_ORIGINS.split(',')
            : ['http://localhost:5173'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));
app.use(express.json());

// Basic health check endpoint
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});

import authRoutes from './routes/authRoutes';
import sessionRoutes from './routes/sessionRoutes';
import paymentRoutes from './routes/paymentRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import playerRoutes from './routes/playerRoutes';
import organizationRoutes from './routes/organizationRoutes';
import branchRoutes from './routes/branchRoutes';
import tableRoutes from './routes/tableRoutes';
import matchRoutes from './routes/matchRoutes';
import walletRoutes from './routes/walletRoutes';
import inventoryRoutes from './routes/inventoryRoutes';
import shiftRoutes from './routes/shiftRoutes';
import expenseRoutes from './routes/expenseRoutes';
import analyticsRoutes from './routes/analyticsRoutes';
import adminRoutes from './routes/adminRoutes';
import duesRoutes from './routes/duesRoutes';
import pricingRoutes from './routes/pricingRoutes';
import accountingRoutes from './routes/accountingRoutes';
import assetMaintenanceRoutes from './routes/assetMaintenanceRoutes';
import ownerRoutes from './routes/ownerRoutes';
import upiRoutes from './routes/upiRoutes';
import webhookRoutes from './routes/webhookRoutes';
import { runFraudDetectionSweep } from './services/fraudService';

// Import routes mapped for MVP
app.use('/auth', authRoutes);
app.use('/organizations', organizationRoutes);
app.use('/branches', branchRoutes);
app.use('/tables', tableRoutes);
app.use('/sessions', sessionRoutes);
app.use('/payments', paymentRoutes);
app.use('/dashboard', dashboardRoutes);
app.use('/player', playerRoutes);
app.use('/matches', matchRoutes);
app.use('/wallet', walletRoutes);
app.use('/inventory', inventoryRoutes);
app.use('/shifts', shiftRoutes);
app.use('/expenses', expenseRoutes);
app.use('/analytics', analyticsRoutes);
app.use('/admin', adminRoutes);
app.use('/dues', duesRoutes);
app.use('/accounting', accountingRoutes);
app.use('/maintenance', assetMaintenanceRoutes);
app.use('/pricing', pricingRoutes);
app.use('/owner', ownerRoutes);
app.use('/upi', upiRoutes);

// Webhook routes should NOT have standard authentication
app.use('/api/webhooks', webhookRoutes);

app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);

    // Start background jobs/services
    // E.g., Run fraud sweep every 12 hours (43200000 ms)
    setInterval(() => {
        runFraudDetectionSweep();
    }, 43200000);
    // Run an initial sweep 10 seconds after server start
    setTimeout(runFraudDetectionSweep, 10000);
});
