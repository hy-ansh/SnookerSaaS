import { apiFetch } from './apiClient';

export interface DashboardSummary {
    today_earnings: number;
    weekly_earnings: number;
    monthly_earnings: number;
    today_sessions: number;
    active_sessions_count: number;
    unpaid_dues: number;
}

export interface TableRevenue {
    table_name: string;
    revenue: number;
}

export const dashboardService = {
    /**
     * Fetch summary metrics for today/week earnings and active session counts.
     */
    getSummary: async (): Promise<DashboardSummary> => {
        return apiFetch('/dashboard/summary');
    },

    /**
     * Fetch revenue grouped by table (MVP: total amounts from completed sessions)
     */
    getRevenue: async (): Promise<TableRevenue[]> => {
        return apiFetch('/dashboard/revenue');
    }
};
