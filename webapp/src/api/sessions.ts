import { apiFetch } from './apiClient';

export interface SessionData {
    id: string;
    tableId: string;
    status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
    startedAt: string;
    endedAt?: string;
    durationMinutes?: number;
    pausedDurationSecs: number;
    hourlyRateApplied: number;
    totalAmount?: number;
    updatedAt: string;
    table?: { nameOrNumber: string; branchId: string; };
    players?: any[];
}

export interface CheckoutPayload {
    paymentMethod: 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'DUES' | 'SPLIT';
    splitPayments?: { playerId: string; method: string; amount: number }[];
    gameType?: 'LTP' | 'SPLIT' | 'SOLO' | 'CUSTOM';
    winnerIds?: string[];
}

export const sessionService = {
    getActiveSessions: (): Promise<SessionData[]> => apiFetch('/sessions/active'),

    startSession: (tableId: string, playerIds?: string[], gameType?: string): Promise<{ message: string; session: SessionData }> =>
        apiFetch('/sessions/start', { method: 'POST', body: JSON.stringify({ table_id: tableId, player_ids: playerIds, game_type: gameType }) }),

    pauseSession: (sessionId: string): Promise<{ message: string }> =>
        apiFetch(`/sessions/${sessionId}/pause`, { method: 'POST' }),

    resumeSession: (sessionId: string): Promise<{ message: string; accumulated_pause_seconds: number }> =>
        apiFetch(`/sessions/${sessionId}/resume`, { method: 'POST' }),

    updateRate: (sessionId: string, newRate: number): Promise<{ message: string; session: SessionData }> =>
        apiFetch(`/sessions/${sessionId}/rate`, { method: 'PUT', body: JSON.stringify({ newRate }) }),

    endSession: (sessionId: string, checkout: CheckoutPayload): Promise<{ message: string; session: SessionData; totalAmount: number; durationMinutes: number }> =>
        apiFetch(`/sessions/${sessionId}/end`, { method: 'POST', body: JSON.stringify(checkout) }),

    getCompletedSessions: (): Promise<SessionData[]> => apiFetch('/sessions/completed'),

    getSessionById: (sessionId: string): Promise<SessionData> => apiFetch(`/sessions/${sessionId}`),

    addPlayer: (sessionId: string, playerId: string): Promise<{ message: string; session: SessionData }> =>
        apiFetch(`/sessions/${sessionId}/players`, { method: 'POST', body: JSON.stringify({ playerId }) }),

    removePlayer: (sessionId: string, playerId: string): Promise<{ message: string; session: SessionData }> =>
        apiFetch(`/sessions/${sessionId}/players`, { method: 'DELETE', body: JSON.stringify({ playerId }) }),

    searchPlayers: (q?: string): Promise<any[]> =>
        apiFetch(`/sessions/search-players${q ? `?q=${encodeURIComponent(q)}` : ''}`),
};

