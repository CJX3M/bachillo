// Reverse geocoding backend: LocationIQ (Nominatim-compatible, generous free
// tier) when NEXT_PUBLIC_LOCATIONIQ_KEY is set, otherwise the public
// Nominatim instance. See docs/google-maps-migration-plan.md section 3.
const LOCATIONIQ_KEY = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;

interface NominatimReverseResult {
  display_name?: string;
}

export const getAddressFromCoords = async (lat: number, lng: number): Promise<string | null> => {
  try {
    const url = LOCATIONIQ_KEY
      ? `https://us1.locationiq.com/v1/reverse?key=${LOCATIONIQ_KEY}&lat=${lat}&lon=${lng}&format=json`
      : `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: NominatimReverseResult = await response.json();
    return data.display_name || null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};
