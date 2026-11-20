// Tile layer config for react-leaflet. Uses MapTiler when a free API key is
// configured (NEXT_PUBLIC_MAPTILER_KEY) -- better suited for real traffic,
// see docs/google-maps-migration-plan.md section 2. Falls back to the public
// OpenStreetMap tile server otherwise, which is fine for local development
// but not meant for production load (OSM's fair-use policy).
const maptilerKey = process.env.NEXT_PUBLIC_MAPTILER_KEY;

export const tileLayerUrl = maptilerKey
  ? `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${maptilerKey}`
  : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const tileLayerAttribution =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' +
  (maptilerKey ? ' &copy; <a href="https://www.maptiler.com/copyright/">MapTiler</a>' : '');
