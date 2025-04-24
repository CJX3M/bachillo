'use client';

import { useState, useEffect, useCallback } from 'react';
import { googleMapsService } from '@/services/googleMapsService';

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function LocationDisplay({ location }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const debouncedFetchAddress = useCallback(
    debounce(async (lat, lng) => {
      const addr = await googleMapsService.getAddressFromCoordinates(lat, lng);
      setAddress(addr);
      setLoading(false);
    }, 1000),
    []
  );

  useEffect(() => {
    if (location?.lat && location?.lng) {
      setLoading(true);
      debouncedFetchAddress(location.lat, location.lng);
    }
  }, [location, debouncedFetchAddress]);

  if (loading) {
    return <p className="text-gray-600">Obteniendo dirección...</p>;
  }

  return (
    <p className="text-gray-900">
      {address || `Lat: ${location?.lat.toFixed(6)}, Lng: ${location?.lng.toFixed(6)}`}
    </p>
  );
}