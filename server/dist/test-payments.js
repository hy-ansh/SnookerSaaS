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
const paymentController_1 = require("./controllers/paymentController");
const prisma_1 = __importDefault(require("./config/prisma"));
const run = () => __awaiter(void 0, void 0, void 0, function* () {
    const req = {
        user: { role: 'SUPER_ADMIN' },
        query: { period: 'all' }
    };
    const res = {
        json: (data) => {
            console.log(JSON.stringify(data, null, 2));
        },
        status: (code) => ({
            json: (err) => console.log(`Error ${code}:`, err)
        })
    };
    yield (0, paymentController_1.getPaymentSummary)(req, res);
    yield prisma_1.default.$disconnect();
});
run().catch(console.error);
