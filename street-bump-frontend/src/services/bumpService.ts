const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Bump {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  timestamp: string;
}

interface BumpData {
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  timestamp: string;
}

export const bumpService = {
  async getAllBumps(): Promise<Bump[]> {
    const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bumps`);
    if (!response.ok) {
      throw new Error('Failed to fetch bumps');
    }
    const data = await response.json();
    console.log('Raw API response:', data);
    return Array.isArray(data) ? data : [];
  },

  async createBump(formData: FormData): Promise<BumpData> {
    const response = await fetch(`${API_URL}/api/bumps`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) throw new Error('Failed to create bump');
    return response.json();
  }
};