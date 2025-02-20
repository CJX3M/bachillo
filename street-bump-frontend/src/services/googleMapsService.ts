export const googleMapsService = {
  getAddressFromCoordinates: async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&language=es`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]) {
        const addressComponents = data.results[0].address_components;
        const streetNumber = addressComponents.find((c: { types: string[], long_name: string }) => c.types.includes('street_number'))?.long_name || '';
        const route = addressComponents.find((c: { types: string[], long_name: string }) => c.types.includes('route'))?.long_name || '';
        
        if (route) {
          if (streetNumber) {
            return `${route} ${streetNumber}`;
          }
          // Check if it's an intersection
          const intersectingRoute = addressComponents.find((c: { types: string[], long_name: string }) => 
            c.types.includes('route') && c.long_name !== route
          )?.long_name;
          
          if (intersectingRoute) {
            return `${route} y ${intersectingRoute}`;
          }
          return route;
        }
      }
      return null;
    } catch (error) {
      console.error('Error getting address:', error);
      return null;
    }
  },

  getCoordinatesFromAddress: async (address: string): Promise<{ lat: number; lng: number } | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&language=es`
      );
      const data = await response.json();
      
      if (data.results && data.results[0]?.geometry?.location) {
        const { lat, lng } = data.results[0].geometry.location;
        return { lat, lng };
      }
      return null;
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  }
};