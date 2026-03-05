import { apiFetch } from './apiClient';

export interface TableData {
    id: string;
    branchId: string;
    nameOrNumber: string;
    status: 'AVAILABLE' | 'PLAYING' | 'RESERVED' | 'MAINTENANCE';
    customHourlyRate?: number;
}

export const tableService = {
    getTables: (): Promise<TableData[]> => {
        return apiFetch('/tables');
    },
    updateTable: (tableId: string, updates: { nameOrNumber?: string, status?: string, customHourlyRate?: number | null }): Promise<TableData> => {
        return apiFetch(`/tables/${tableId}`, {
            method: 'PUT',
            body: JSON.stringify(updates)
        });
    },
};
