import { bumpService, Bump } from './bumpService';

interface Coordinates {
  lat: number;
  lng: number;
}

// Geocoding backend: LocationIQ (Nominatim-compatible, generous free tier)
// when NEXT_PUBLIC_LOCATIONIQ_KEY is set, otherwise the public Nominatim
// instance. Nominatim's usage policy wants the app identified by a custom
// User-Agent or a Referer -- browsers block scripts from overriding
// User-Agent, but they always send Referer on requests, which satisfies the
// policy for this low-volume, client-side use. See
// docs/google-maps-migration-plan.md section 3 for the full rationale.
const locationIqKey = process.env.NEXT_PUBLIC_LOCATIONIQ_KEY;

function reverseGeocodeUrl(lat: number, lng: number): string {
  return locationIqKey
    ? `https://us1.locationiq.com/v1/reverse?key=${locationIqKey}&lat=${lat}&lon=${lng}&format=json`
    : `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`;
}

function forwardGeocodeUrl(address: string): string {
  const query = encodeURIComponent(address);
  return locationIqKey
    ? `https://us1.locationiq.com/v1/search?key=${locationIqKey}&q=${query}&format=json&limit=1`
    : `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`;
}

interface NominatimAddress {
  road?: string;
  house_number?: string;
  [key: string]: string | undefined;
}

interface NominatimReverseResult {
  display_name?: string;
  address?: NominatimAddress;
}

interface NominatimSearchResult {
  lat: string;
  lon: string;
}

// --- Address cache + serialized background resolution ----------------------
const CACHE_KEY = 'bump-address-cache-v1';
const memoryCache = new Map<string, string>();
let cacheLoaded = false;

function coordKey(lat: number, lng: number): string {
  return `${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function loadCache() {
  if (cacheLoaded || typeof window === 'undefined') return;
  cacheLoaded = true;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) Object.entries(JSON.parse(raw)).forEach(([k, v]) => memoryCache.set(k, v as string));
  } catch {
    // Corrupt or unavailable storage: just start with an empty cache.
  }
}

function persistCache() {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(memoryCache)));
  } catch {
    // Storage full or blocked: the in-memory cache still works.
  }
}

function readCachedAddress(lat: number, lng: number): string | undefined {
  loadCache();
  return memoryCache.get(coordKey(lat, lng));
}

// Public Nominatim allows ~1 request/second; space requests accordingly.
const MIN_GEOCODE_INTERVAL_MS = 1100;
const pending = new Set<string>();
const queue: Array<{ bump: Bump; onAddress: (id: string, address: string) => void }> = [];
let draining = false;

function enqueueResolution(bumps: Bump[], onAddress: (id: string, address: string) => void) {
  for (const bump of bumps) {
    if (pending.has(bump.id)) continue;
    pending.add(bump.id);
    queue.push({ bump, onAddress });
  }
  if (!draining) void drainQueue();
}

async function drainQueue() {
  draining = true;
  while (queue.length) {
    const { bump, onAddress } = queue.shift()!;
    pending.delete(bump.id);
    const { lat, lng } = bump.location;
    // Another request may have resolved this coordinate in the meantime.
    let address = readCachedAddress(lat, lng) ?? null;
    if (!address) {
      address = await geocodingService.getAddressFromCoordinates(lat, lng);
      if (address) {
        memoryCache.set(coordKey(lat, lng), address);
        persistCache();
      }
      await new Promise((r) => setTimeout(r, MIN_GEOCODE_INTERVAL_MS));
    }
    if (address) onAddress(bump.id, address);
  }
  draining = false;
}


export const geocodingService = {
  getAddressFromCoordinates: async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(reverseGeocodeUrl(lat, lng));
      if (!response.ok) {
        console.error('Reverse geocoding request failed');
        return null;
      }

      const data: NominatimReverseResult = await response.json();
      const road = data.address?.road;

      if (road) {
        const houseNumber = data.address?.house_number;
        return houseNumber ? `${road} ${houseNumber}` : road;
      }

      return data.display_name || null;
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  },

  getCoordinatesFromAddress: async (address: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch(forwardGeocodeUrl(address));
      if (!response.ok) {
        console.error('Forward geocoding request failed');
        return null;
      }

      const results: NominatimSearchResult[] = await response.json();
      if (!results?.[0]) {
        console.error('No results found');
        return null;
      }

      return {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon)
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

  // Returns nearby bumps right away. Addresses stored with the bump (set at
  // report time) are used as-is; the rest are resolved in the background, one
  // at a time and cached, and reported through `onAddress` as they arrive.
  // This keeps reverse-geocoding volume low enough for free-tier providers.
  async fetchBumpsInRadius(
    center: { lat: number; lng: number },
    radius: number = 5,
    onAddress?: (bumpId: string, address: string) => void
  ) {
    try {
      const bumps = await bumpService.getNearbyBumps(center, radius);
      return geocodingService.withAddresses(bumps, onAddress);
    } catch (error) {
      console.error('Failed to fetch nearby bumps:', error);
      throw error;
    }
  },

  withAddresses(bumps: Bump[], onAddress?: (bumpId: string, address: string) => void): Bump[] {
    const result = bumps.map((bump) => {
      if (bump.address) return bump;
      const cached = readCachedAddress(bump.location.lat, bump.location.lng);
      return cached ? { ...bump, address: cached } : bump;
    });

    const missing = result.filter((b) => !b.address);
    if (missing.length && onAddress) {
      enqueueResolution(missing, onAddress);
    }
    return result;
  }
};

// Export types for use in other files
export type GeocodingService = typeof geocodingService;
