'use client';

import { useState, useEffect, useCallback } from 'react';
import { geocodingService } from '@/services/geocodingService';

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

export default function LocationDisplay({ location, onAddressResolved }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  const debouncedFetchAddress = useCallback(
    debounce(async (lat, lng) => {
      const addr = await geocodingService.getAddressFromCoordinates(lat, lng);
      setAddress(addr);
      setLoading(false);
    }, 1000),
    []
  );

  useEffect(() => {
    if (location?.lat && location?.lng) {
      setLoading(true);
      setAddress(null);
      // The previous point's address no longer applies to the new one.
      onAddressResolved?.(null);
      debouncedFetchAddress(location.lat, location.lng);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, debouncedFetchAddress]);

  // Let the parent keep the resolved address so it can be stored with the bump
  // (avoids re-geocoding it every time the map is loaded).
  useEffect(() => {
    if (!loading) onAddressResolved?.(address);
  }, [address, loading, onAddressResolved]);

  if (!location?.lat || !location?.lng) {
    return <p className="text-gray-600">Aún no hay ubicación. Elígela en el mapa.</p>;
  }

  if (loading) {
    return <p className="text-gray-600">Obteniendo dirección...</p>;
  }

  return (
    <p className="text-gray-900">
      {address || `Lat: ${location?.lat.toFixed(6)}, Lng: ${location?.lng.toFixed(6)}`}
    </p>
  );
}