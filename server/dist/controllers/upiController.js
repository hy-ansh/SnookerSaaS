"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQrData = exports.saveUpiConfig = exports.getUpiConfig = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
/**
 * GET /upi/config
 * Returns the UPI config for the current user's organization.
 */
const getUpiConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orgId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const config = yield prisma_1.default.upiConfig.findUnique({
            where: { organizationId: orgId }
        });
        res.json(config || null);
    }
    catch (err) {
        console.error('Get UPI Config Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getUpiConfig = getUpiConfig;
/**
 * PUT /upi/config
 * Save or update UPI configuration for the org.
 */
const saveUpiConfig = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orgId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const { upiId, merchantName } = req.body;
        if (!upiId || !merchantName) {
            res.status(400).json({ error: 'upiId and merchantName are required' });
            return;
        }
        const config = yield prisma_1.default.upiConfig.upsert({
            where: { organizationId: orgId },
            update: { upiId, merchantName },
            create: { organizationId: orgId, upiId, merchantName }
        });
        res.json({ message: 'UPI config saved', config });
    }
    catch (err) {
        console.error('Save UPI Config Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.saveUpiConfig = saveUpiConfig;
/**
 * GET /upi/qr?amount=X
 * Returns UPI deep-link string for QR code generation.
 * The frontend can use any JS QR library to render this.
 */
const generateQrData = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const orgId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.storeId;
        if (!orgId) {
            res.status(403).json({ error: 'Forbidden' });
            return;
        }
        const amount = Number(req.query.amount);
        if (!amount || amount <= 0) {
            res.status(400).json({ error: 'A positive amount is required' });
            return;
        }
        const config = yield prisma_1.default.upiConfig.findUnique({
            where: { organizationId: orgId }
        });
        if (!config) {
            res.status(404).json({ error: 'UPI not configured. Please set up UPI details first.' });
            return;
        }
        // UPI deep-link format (works with Google Pay, PhonePe, Paytm, etc.)
        const upiLink = `upi://pay?pa=${encodeURIComponent(config.upiId)}&pn=${encodeURIComponent(config.merchantName)}&am=${amount.toFixed(2)}&cu=INR`;
        res.json({
            upiLink,
            upiId: config.upiId,
            merchantName: config.merchantName,
            amount
        });
    }
    catch (err) {
        console.error('Generate QR Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.generateQrData = generateQrData;
