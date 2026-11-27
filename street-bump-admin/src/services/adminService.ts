import { auth } from '@/config/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export const NOT_ADMIN_MESSAGE = 'Esta cuenta no tiene permiso de administrador.';

const assertAllowed = (response: Response) => {
  if (response.status === 403) throw new Error(NOT_ADMIN_MESSAGE);
};

export const adminService = {
  async getUnverifiedBumps() {
    try {
      const token = await auth.currentUser?.getIdToken(true); // Force token refresh
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(`${API_URL}/admin/bumps/unverified`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      assertAllowed(response);
      if (!response.ok) {
        console.error('API Error:', response.status, await response.text());
        throw new Error(`Failed to fetch unverified bumps: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error in getUnverifiedBumps:', error);
      throw error;
    }
  },

  async verifyBump(id: string): Promise<{ success: boolean }> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('No authentication token available');

    const response = await fetch(`${API_URL}/admin/bumps/${id}/verify`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assertAllowed(response);
    if (!response.ok) {
      throw new Error('Failed to verify bump');
    }

    return response.json();
  },

  async deleteBump(id: string): Promise<{ success: boolean }> {
    const token = await auth.currentUser?.getIdToken();
    if (!token) throw new Error('No authentication token available');

    const response = await fetch(`${API_URL}/admin/bumps/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    assertAllowed(response);
    if (!response.ok) {
      throw new Error('Failed to delete bump');
    }

    return response.json();
  }
};