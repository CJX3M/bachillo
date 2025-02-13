const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UnverifiedBump extends BumpData {
  id: string;
}

interface BumpData {
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  timestamp: string;
}

export const adminService = {
  async getUnverifiedBumps(token: string): Promise<UnverifiedBump[]> {
    const response = await fetch(`${API_URL}/api/admin/bumps/unverified`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to fetch unverified bumps');
    return response.json();
  },

  async verifyBump(id: string, token: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/api/admin/bumps/${id}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to verify bump');
    return response.json();
  },

  async deleteBump(id: string, token: string): Promise<{ success: boolean }> {
    const response = await fetch(`${API_URL}/api/admin/bumps/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Failed to delete bump');
    return response.json();
  }
};