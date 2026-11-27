// Server-side reverse geocoding with LocationIQ. No Nominatim fallback: its
// usage policy does not fit unattended server traffic.
function createReverseGeocoder({ apiKey, fetchImpl = fetch }) {
    return async (lat, lng) => {
        if (!apiKey) return null;
        const url = `https://us1.locationiq.com/v1/reverse?key=${apiKey}&lat=${lat}&lon=${lng}&format=json`;
        const response = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
        if (!response.ok) return null;
        const data = await response.json();
        return data.display_name || null;
    };
}

module.exports = { createReverseGeocoder };
