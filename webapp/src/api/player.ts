import { apiFetch } from './apiClient';

export interface PlayerStats {
    id: string;
    userId: string;
    nickname: string | null;
    eloRating: number;
    matchesPlayed: number;
    matchesWon: number;
    walletBalance: string | number;
    pendingDues?: number;
    user: {
        fullName: string | null;
        email: string;
    };
}

export interface WalletTransaction {
    id: string;
    playerId: string;
    amount: string;
    type: 'DEPOSIT' | 'WITHDRAWAL' | 'SESSION_PAYMENT' | 'REFUND';
    referenceId: string | null;
    createdAt: string;
}

export interface WalletData {
    balance: string;
    history: WalletTransaction[];
}

export const playerService = {
    getStats: async (userId: string): Promise<PlayerStats> => {
        return apiFetch(`/player/stats/${userId}`);
    },

    getWallet: async (): Promise<WalletData> => {
        return apiFetch(`/wallet`);
    },

    rechargeWallet: async (amount: number): Promise<{ orderId: string, amount: number, currency: string }> => {
        return apiFetch(`/wallet/recharge`, {
            method: 'POST',
            body: JSON.stringify({ amount })
        });
    }
};
