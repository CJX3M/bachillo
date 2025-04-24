import { bumpService, Bump } from './bumpService';

interface Coordinates {
  lat: number;
  lng: number;
}

let geocoder: google.maps.Geocoder | null = null;

export const googleMapsService = {
  getAddressFromCoordinates: async (lat: number, lng: number): Promise<string | null> => {
    try {
      if (!geocoder && typeof google !== 'undefined') {
        geocoder = new google.maps.Geocoder();
      }

      if (!geocoder) {
        console.error('Geocoder not initialized');
        return null;
      }

      const result = await geocoder.geocode({
        location: { lat, lng }
      });

      if (!result.results?.[0]) {
        console.error('No results found');
        return null;
      }

      const addressComponents = result.results[0].address_components;
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

      return result.results[0].formatted_address || null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  getCoordinatesFromAddress: async (address: string): Promise<Coordinates | null> => {
    try {
      if (!geocoder && typeof google !== 'undefined') {
        geocoder = new google.maps.Geocoder();
      }

      if (!geocoder) {
        console.error('Geocoder not initialized');
        return null;
      }

      const result = await geocoder.geocode({
        address: address
      });

      if (!result.results?.[0]?.geometry?.location) {
        console.error('No results found');
        return null;
      }

      const location = result.results[0].geometry.location;
      return {
        lat: location.lat(),
        lng: location.lng()
      };
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