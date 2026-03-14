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
exports.walletWebhook = exports.rechargeWallet = exports.getWalletBalance = void 0;
const prisma_1 = __importDefault(require("../config/prisma"));
const getWalletBalance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        let profile = yield prisma_1.default.playerProfile.findUnique({ where: { userId } });
        if (!profile) {
            profile = yield prisma_1.default.playerProfile.create({ data: { userId } });
        }
        const txns = yield prisma_1.default.walletTransaction.findMany({
            where: { playerId: userId },
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json({ balance: profile.walletBalance, history: txns });
    }
    catch (error) {
        console.error('Error getting wallet balance:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.getWalletBalance = getWalletBalance;
const rechargeWallet = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { amount } = req.body;
        if (!userId || !amount) {
            res.status(400).json({ error: 'Missing amount or unauthorized' });
            return;
        }
        // Mocking Razorpay Order Creation
        const mockOrderId = "order_" + Math.random().toString(36).substring(7);
        res.json({ orderId: mockOrderId, amount, currency: 'INR' });
    }
    catch (error) {
        console.error('Error creating recharge order:', error);
        res.status(500).json({ error: 'Failed to create recharge order' });
    }
});
exports.rechargeWallet = rechargeWallet;
const walletWebhook = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId, amount, paymentId, status } = req.body;
        if (status !== 'SUCCESS') {
            // For webhooks, we usually shouldn't return an error to Razorpay for failed payments, just 200 OK so it doesn't retry
            res.status(200).json({ status: 'ignored', message: 'Payment not successful' });
            return;
        }
        // Idempotency Check: Prevent processing the same webhook twice
        const existingTxn = yield prisma_1.default.walletTransaction.findFirst({
            where: { referenceId: paymentId }
        });
        if (existingTxn) {
            console.log(`[WalletWebhook] Idempotency catch: paymentId ${paymentId} already processed.`);
            res.status(200).json({ status: 'ignored', message: 'Already processed' });
            return;
        }
        yield prisma_1.default.$transaction((tx) => __awaiter(void 0, void 0, void 0, function* () {
            // Update balance
            yield tx.playerProfile.update({
                where: { userId },
                data: { walletBalance: { increment: amount } }
            });
            // Insert Txn
            yield tx.walletTransaction.create({
                data: {
                    playerId: userId,
                    amount,
                    type: 'DEPOSIT',
                    referenceId: paymentId
                }
            });
        }));
        res.status(200).json({ status: 'ok', message: 'Recharge successful' });
    }
    catch (error) {
        console.error('Error processing webhook:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.walletWebhook = walletWebhook;
