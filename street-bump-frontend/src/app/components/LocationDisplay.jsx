'use client';

import { useState, useEffect } from 'react';
import { googleMapsService } from '@/services/googleMapsService';

export default function LocationDisplay({ location }) {
  const [address, setAddress] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAddress = async () => {
      if (location?.lat && location?.lng) {
        setLoading(true);
        const addr = await googleMapsService.getAddressFromCoordinates(location.lat, location.lng);
        setAddress(addr);
        setLoading(false);
      }
    };
    fetchAddress();
  }, [location]);

  if (loading) {
    return <p className="text-gray-600">Obteniendo dirección...</p>;
  }

  return (
    <p className="text-gray-900">
      {address || `Lat: ${location?.lat.toFixed(6)}, Lng: ${location?.lng.toFixed(6)}`}
    </p>
  );
}