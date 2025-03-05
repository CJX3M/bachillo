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
}

export const bumpService = {
  async getAllBumps(): Promise<Bump[]> {
    const response = await fetch(`${API_URL}/bumps`);
    if (!response.ok) {
      throw new Error('Failed to fetch bumps');
    }
    return response.json();
  },

  async createBump(data: { image: string; lat: number; lng: number }): Promise<Bump> {
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

  async getNearbyBumps(lat: number, lng: number, radius: number = 5): Promise<Bump[]> {
    const response = await fetch(
      `${API_URL}/bumps/nearby?lat=${lat}&lng=${lng}&radius=${radius}`
    );

    if (!response.ok) {
      throw new Error('Failed to fetch nearby bumps');
    }

    return response.json();
  }
};