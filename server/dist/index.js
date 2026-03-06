"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 8000;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Basic health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'healthy', timestamp: new Date() });
});
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const sessionRoutes_1 = __importDefault(require("./routes/sessionRoutes"));
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const playerRoutes_1 = __importDefault(require("./routes/playerRoutes"));
const organizationRoutes_1 = __importDefault(require("./routes/organizationRoutes"));
const branchRoutes_1 = __importDefault(require("./routes/branchRoutes"));
const tableRoutes_1 = __importDefault(require("./routes/tableRoutes"));
const matchRoutes_1 = __importDefault(require("./routes/matchRoutes"));
const walletRoutes_1 = __importDefault(require("./routes/walletRoutes"));
const inventoryRoutes_1 = __importDefault(require("./routes/inventoryRoutes"));
const shiftRoutes_1 = __importDefault(require("./routes/shiftRoutes"));
const expenseRoutes_1 = __importDefault(require("./routes/expenseRoutes"));
const analyticsRoutes_1 = __importDefault(require("./routes/analyticsRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const duesRoutes_1 = __importDefault(require("./routes/duesRoutes"));
const pricingRoutes_1 = __importDefault(require("./routes/pricingRoutes"));
const accountingRoutes_1 = __importDefault(require("./routes/accountingRoutes"));
const assetMaintenanceRoutes_1 = __importDefault(require("./routes/assetMaintenanceRoutes"));
const ownerRoutes_1 = __importDefault(require("./routes/ownerRoutes"));
const upiRoutes_1 = __importDefault(require("./routes/upiRoutes"));
const fraudService_1 = require("./services/fraudService");
// Import routes mapped for MVP
app.use('/auth', authRoutes_1.default);
app.use('/organizations', organizationRoutes_1.default);
app.use('/branches', branchRoutes_1.default);
app.use('/tables', tableRoutes_1.default);
app.use('/sessions', sessionRoutes_1.default);
app.use('/payments', paymentRoutes_1.default);
app.use('/dashboard', dashboardRoutes_1.default);
app.use('/player', playerRoutes_1.default);
app.use('/matches', matchRoutes_1.default);
app.use('/wallet', walletRoutes_1.default);
app.use('/inventory', inventoryRoutes_1.default);
app.use('/shifts', shiftRoutes_1.default);
app.use('/expenses', expenseRoutes_1.default);
app.use('/analytics', analyticsRoutes_1.default);
app.use('/admin', adminRoutes_1.default);
app.use('/dues', duesRoutes_1.default);
app.use('/accounting', accountingRoutes_1.default);
app.use('/maintenance', assetMaintenanceRoutes_1.default);
app.use('/pricing', pricingRoutes_1.default);
app.use('/owner', ownerRoutes_1.default);
app.use('/upi', upiRoutes_1.default);
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    // Start background jobs/services
    // E.g., Run fraud sweep every 12 hours (43200000 ms)
    setInterval(() => {
        (0, fraudService_1.runFraudDetectionSweep)();
    }, 43200000);
    // Run an initial sweep 10 seconds after server start
    setTimeout(fraudService_1.runFraudDetectionSweep, 10000);
});
