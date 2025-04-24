'use client';

import { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript } from '@react-google-maps/api';
import { googleMapsService } from '@/services/googleMapsService';

const libraries = ['places'];

export default function MapPicker({ onLocationSelect, initialLocation }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries
  });

  if (loadError) {
    return (
      <div className="p-4 bg-red-50 rounded-lg">
        <p className="text-red-700">Error cargando el mapa. Por favor intenta de nuevo.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-700">Cargando mapa...</p>
      </div>
    );
  }

  const [map, setMap] = useState(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [center, setCenter] = useState(initialLocation || {
    lat: 16.7569,
    lng: -93.1292
  });

  useEffect(() => {
    if (initialLocation) {
      setCenter(initialLocation);
      if (map) {
        map.panTo(initialLocation);
      }
    } else {
      const initLocation = async () => {
        try {
          const userLocation = await googleMapsService.getCurrentLocation();
          setCenter(userLocation);
          if (map) {
            map.panTo(userLocation);
          }
          // Call onLocationSelect with the initial location
          onLocationSelect(userLocation);
        } catch (error) {
          console.error('Error getting current location:', error);
        }
      };

      initLocation();
    }
  }, [map, initialLocation, onLocationSelect]);

  const mapStyles = {
    width: '100%',
    height: '400px',
  };

  const centerPinStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#FF0000',
    fontSize: '2rem',
    zIndex: 1,
    pointerEvents: 'none',
  };

  const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    streetViewControl: false,
    mapTypeControl: true,
    fullscreenControl: false,
    zoom: 15,
  };

  // Update location when the map is dragged
  const onDragEnd = () => {
    if (map && hasInitialized) {
      const center = map.getCenter();
      const location = {
        lat: center.lat(),
        lng: center.lng(),
      };
      setCenter(location);
      onLocationSelect(location);
    }
  };

  const onLoad = (map) => {
    setMap(map);
    // Set hasInitialized after a short delay to prevent initial center change from triggering updates
    setTimeout(() => setHasInitialized(true), 500);
  };

  const onUnmount = () => {
    setMap(null);
    setHasInitialized(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <GoogleMap
        mapContainerStyle={mapStyles}
        center={center}
        options={mapOptions}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragEnd={onDragEnd}
      >
      </GoogleMap>
      <div style={centerPinStyle}>📍</div>
    </div>
  );
}