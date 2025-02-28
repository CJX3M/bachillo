'use client';

import { useState, useEffect } from 'react';
import { GoogleMap } from '@react-google-maps/api';
import { googleMapsService } from '@/services/googleMapsService';

export default function MapPicker({ onLocationSelect, initialLocation }) {
  const [map, setMap] = useState(null);
  const [center, setCenter] = useState(initialLocation || {
    lat: 16.7569,
    lng: -93.1292
  });

  useEffect(() => {
    const initLocation = async () => {
      try {
        const userLocation = await googleMapsService.getCurrentLocation();
        setCenter(userLocation);
        if (map) {
          map.panTo(userLocation);
        }
      } catch (error) {
        console.error('Error getting current location:', error);
      }
    };

    initLocation();
  }, [map]);

  // ... rest of the component (mapStyles, centerPinStyle, onMapIdle)
}