import { apiFetch } from './apiClient';

export const authService = {
    // Other auth flows are mostly handled by Supabase directly in AuthContext,
    // but this one requires the high-privilege backend endpoint.
    registerUserByAdmin: (data: { email: string, password: string, full_name: string, role: string, branch_id?: string }): Promise<any> => {
        return apiFetch('/auth/create-user', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
