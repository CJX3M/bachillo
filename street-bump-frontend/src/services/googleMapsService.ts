// Types for Google Maps API responses
interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GeocodeResult {
  address_components: AddressComponent[];
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

interface GeocodeResponse {
  results: GeocodeResult[];
  status: string;
}

interface Coordinates {
  lat: number;
  lng: number;
}

export const googleMapsService = {
  getAddressFromCoordinates: async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&language=es`
      );
      const data: GeocodeResponse = await response.json();
      
      if (data.results?.[0]) {
        const addressComponents = data.results[0].address_components;
        const streetNumber = addressComponents.find(c => c.types.includes('street_number'))?.long_name;
        const route = addressComponents.find(c => c.types.includes('route'))?.long_name;
        
        if (route) {
          if (streetNumber) {
            return `${route} ${streetNumber}`;
          }
          
          const intersectingRoute = addressComponents.find(c => 
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

  getCoordinatesFromAddress: async (address: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&language=es`
      );
      const data: GeocodeResponse = await response.json();
      
      if (data.results?.[0]?.geometry?.location) {
        return data.results[0].geometry.location;
      }
      return null;
    } catch (error) {
      console.error('Error getting coordinates:', error);
      return null;
    }
  },

  getCurrentLocation: (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error: GeolocationPositionError) => reject(error),
        { enableHighAccuracy: true }
      );
    });
  },

  parseEXIFCoordinate: (coordinate: number[] | null): number | null => {
    if (!coordinate || coordinate.length !== 3) return null;
    
    const [degrees, minutes, seconds] = coordinate;
    return degrees + minutes/60 + seconds/3600;
  }
};

// Export types for use in other files
export type GoogleMapsService = typeof googleMapsService;