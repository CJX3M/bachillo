'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer } from 'react-leaflet';
import { geocodingService } from '@/services/geocodingService';
import { tileLayerUrl, tileLayerAttribution } from '@/services/mapTileConfig';

// Fallback map center when neither the photo nor the device gives a location.
const DEFAULT_CENTER = { lat: 29.0729, lng: -110.9559 };

const isValidLocation = (loc) =>
  !!loc &&
  Number.isFinite(loc.lat) && Number.isFinite(loc.lng) &&
  Math.abs(loc.lat) <= 90 && Math.abs(loc.lng) <= 180;

export default function MapPicker({ onLocationSelect, onGeolocationError, initialLocation }) {
  const [map, setMap] = useState(null);
  const [hint, setHint] = useState(null);

  // Keep the latest callbacks in refs so the map listener never goes stale.
  const onSelectRef = useRef(onLocationSelect);
  const onGeoErrorRef = useRef(onGeolocationError);
  onSelectRef.current = onLocationSelect;
  onGeoErrorRef.current = onGeolocationError;

  // The map's initial center is fixed at mount; later moves come from the user.
  const [initialCenter] = useState(isValidLocation(initialLocation) ? initialLocation : DEFAULT_CENTER);
  const hasInitialLocation = isValidLocation(initialLocation);

  // On mount without a known location: try the device's position once. If it
  // is unavailable (denied, or insecure http page on a phone) the user simply
  // picks the point by moving the map.
  useEffect(() => {
    if (!map) return;
    if (hasInitialLocation) return;

    let cancelled = false;
    geocodingService
      .getCurrentLocation()
      .then((pos) => {
        if (cancelled || !isValidLocation(pos)) return;
        map.setView([pos.lat, pos.lng], 17);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Error getting current location:', err);
        setHint('No pudimos obtener tu ubicación. Mueve el mapa para colocar el pin en el bache.');
        onGeoErrorRef.current?.(err);
      });

    return () => {
      cancelled = true;
    };
    // Only run when the map instance becomes available.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Report the point under the center pin whenever the map settles after a
  // pan, zoom or programmatic move.
  useEffect(() => {
    if (!map) return;
    const report = () => {
      const c = map.getCenter();
      const loc = { lat: c.lat, lng: c.lng };
      // A map measured while its container has no size (e.g. inside a dialog that
      // is still animating open) can report a NaN center; ignore those.
      if (isValidLocation(loc)) onSelectRef.current?.(loc);
    };
    map.on('moveend', report);
    // The picker mounts inside a dialog; re-measure once it has its final size.
    const t = setTimeout(() => map.invalidateSize(), 250);
    return () => {
      clearTimeout(t);
      map.off('moveend', report);
    };
  }, [map]);

  const centerPinStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    // Anchor the tip of the pin (not its middle) on the map center.
    transform: 'translate(-50%, -100%)',
    fontSize: '2rem',
    lineHeight: 1,
    zIndex: 1000,
    pointerEvents: 'none',
  };

  return (
    <div style={{ position: 'relative' }}>
      <MapContainer
        center={initialCenter}
        zoom={hasInitialLocation ? 17 : 15}
        style={{ width: '100%', height: '320px', borderRadius: '0.75rem' }}
        ref={setMap}
      >
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} />
      </MapContainer>
      <div style={centerPinStyle}>📍</div>
      {hint && <p className="mt-2 text-xs text-amber-700">{hint}</p>}
      <p className="mt-2 text-xs text-gray-500">
        Mueve el mapa hasta que el pin quede sobre el bache.
      </p>
    </div>
  );
}
