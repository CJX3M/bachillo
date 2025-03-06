import { bumpService, Bump } from './bumpService';

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

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GMAPS_API_KEY;

export const googleMapsService = {
  getAddressFromCoordinates: async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`
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
      console.error('Geocoding error:', error);
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
  },

  async fetchBumpsInRadius(center: { lat: number; lng: number }, radius: number = 5) {
    try {
      // Use bumpService for the API call
      const bumps = await bumpService.getNearbyBumps(center, radius);
      
      // Add addresses to bumps using Google Maps geocoding
      const bumpsWithAddresses = await Promise.all(
        bumps.map(async (bump: Bump) => ({
          ...bump,
          address: await this.getAddressFromCoordinates(
            bump.location.lat,
            bump.location.lng
          )
        }))
      );

      return bumpsWithAddresses;
    } catch (error) {
      console.error('Failed to fetch nearby bumps:', error);
      throw error;
    }
  }
};

// Export types for use in other files
export type GoogleMapsService = typeof googleMapsService;