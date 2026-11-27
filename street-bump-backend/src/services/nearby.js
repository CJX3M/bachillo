// Distance between two coordinates in kilometers.
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Approved, still-unfixed bumps within radiusKm of the point, nearest first.
function selectNearby(bumps, { lat, lng }, radiusKm) {
    return bumps
        .filter((bump) => bump.verified === true && bump.fixed !== true)
        .map((bump) => ({ ...bump, distance: calculateDistance(lat, lng, bump.location.lat, bump.location.lng) }))
        .filter((bump) => bump.distance <= radiusKm)
        .sort((a, b) => a.distance - b.distance);
}

module.exports = { selectNearby };
