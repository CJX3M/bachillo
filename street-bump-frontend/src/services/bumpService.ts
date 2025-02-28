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

export const bumpService = {
  async getAllBumps(): Promise<Bump[]> {
    const response = await fetch(`${API_URL}/api/bumps`);
    if (!response.ok) {
      throw new Error('Failed to fetch bumps');
    }
    const data = await response.json();
    console.log('Raw API response:', data);
    return Array.isArray(data) ? data : [];
  },

  createBump: async (bumpData: { image: string; lat: number; lng: number }) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/bumps`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bumpData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error in createBump:', error);
      throw error;
    }
  }
};