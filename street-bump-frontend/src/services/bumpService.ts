const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Bump {
  id: string;
  imageUrl: string;
  location: {
    lat: number;
    lng: number;
  };
  verified: boolean;
  createdAt: string;
  address?: string;
}

export const bumpService = {
  async getAllBumps(): Promise<Bump[]> {
    try {
      console.log('Fetching bumps from:', `${API_URL}/bumps`); // Debug log
      const response = await fetch(`${API_URL}/bumps`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch bumps: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received bumps:', data); // Debug log
      return data;
    } catch (error) {
      console.error('Error fetching bumps:', error);
      throw error;
    }
  },

  async createBump(data: { image: string; lat: number; lng: number; address?: string }): Promise<Bump> {
    const response = await fetch(`${API_URL}/bumps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to create bump');
    }

    return response.json();
  },

  // `null` when the bump does not exist or has not been approved.
  async getBump(id: string): Promise<(Omit<Bump, 'verified'> & { fixed: boolean }) | null> {
    const response = await fetch(`${API_URL}/bumps/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new Error(`Failed to fetch bump: ${response.status}`);
    }
    return response.json();
  },

  async markFixed(id: string): Promise<void> {
    const response = await fetch(`${API_URL}/bumps/${encodeURIComponent(id)}/fixed`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to mark bump as fixed: ${response.status}`);
    }
  },

  async getNearbyBumps(center: { lat: number; lng: number }, radius: number = 5): Promise<Bump[]> {
    try {
      const response = await fetch(
        `${API_URL}/bumps/nearby?lat=${center.lat}&lng=${center.lng}&radius=${radius}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch nearby bumps');
      }

      return response.json();
    } catch (error) {
      console.error('Failed to fetch nearby bumps:', error);
      throw error;
    }
  }
};