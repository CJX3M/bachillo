import { useEffect, useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { bumpService } from '@/services/bumpService';
import { geocodingService } from '@/services/geocodingService';
import { tileLayerUrl, tileLayerAttribution } from '@/services/mapTileConfig';
import { motion, AnimatePresence } from 'framer-motion';
import { ListBulletIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 10;
const MIN_DISTANCE_TO_UPDATE = 0.5; // 500 meters in kilometers
const MIN_TIME_BETWEEN_UPDATES = 10000; // 10 seconds

// Small circular marker instead of Leaflet's default pin -- avoids the
// well-known issue where Leaflet's default marker image paths don't resolve
// correctly through Next.js's bundler.
const bumpIcon = L.divIcon({
  className: '',
  html: '<div style="width:14px;height:14px;border-radius:9999px;background:#ea580c;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.4);"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
  popupAnchor: [0, -7],
});

// Helper function to calculate distance between two points
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function BumpMap() {
  const [map, setMap] = useState(null);
  const [bumps, setBumps] = useState([]);
  const [selectedBump, setSelectedBump] = useState(null);
  const [visibleBumps, setVisibleBumps] = useState([]);
  const [page, setPage] = useState(1);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshingNearby, setRefreshingNearby] = useState(false);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);
  const [center] = useState({
    lat: 29.0729,
    lng: -110.9559
  });
  const [zoom, setZoom] = useState(14);

  const lastFetchRef = useRef({
    position: null,
    timestamp: 0
  });

  // Addresses resolved in the background (bumps reported before addresses were
  // stored with them) get merged into both the map markers and the list.
  const applyResolvedAddress = useCallback((bumpId, address) => {
    const merge = (list) => list.map((b) => (b.id === bumpId ? { ...b, address } : b));
    setBumps(merge);
    setVisibleBumps(merge);
    setSelectedBump((sel) => (sel && sel.id === bumpId ? { ...sel, address } : sel));
  }, []);

  // Handle map idle state (Leaflet's `moveend` fires after both pan and zoom
  // settle, same as Google Maps' `idle`)
  const onMapIdle = useCallback(() => {
    if (!map) return;

    const mapCenter = map.getCenter();
    const currentPosition = {
      lat: mapCenter.lat,
      lng: mapCenter.lng
    };

    // Note: we intentionally do NOT feed this back into the `center` state.
    // `center` is only used for the map's *initial* position; re-rendering
    // MapContainer with a new `center` prop does not recenter an existing
    // map instance, so there is no loop risk here, but we still avoid
    // treating it as a controlled value for consistency with `zoom` below.
    setZoom(map.getZoom());

    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current.timestamp;

    // Skip if we haven't moved far enough or if not enough time has passed
    if (lastFetchRef.current.position) {
      const distance = calculateDistance(
        lastFetchRef.current.position.lat,
        lastFetchRef.current.position.lng,
        currentPosition.lat,
        currentPosition.lng
      );

      if (distance < MIN_DISTANCE_TO_UPDATE && timeSinceLastFetch < MIN_TIME_BETWEEN_UPDATES) {
        return;
      }
    }

    const fetchNearbyBumps = async () => {
      try {
        setRefreshingNearby(true);
        const nearbyBumps = await geocodingService.fetchBumpsInRadius(
          currentPosition,
          5,
          applyResolvedAddress
        );
        setVisibleBumps(nearbyBumps);

        // Update last fetch reference
        lastFetchRef.current = {
          position: currentPosition,
          timestamp: now
        };
      } catch (error) {
        // Non-blocking: keep showing the map and the last known markers
        console.error('Failed to fetch nearby bumps:', error);
      } finally {
        setRefreshingNearby(false);
      }
    };

    fetchNearbyBumps();
  }, [map, applyResolvedAddress]);

  useEffect(() => {
    if (!map) return;
    map.on('moveend', onMapIdle);
    return () => map.off('moveend', onMapIdle);
  }, [map, onMapIdle]);

  useEffect(() => {
    const fetchBumps = async () => {
      try {
        const data = await bumpService.getAllBumps();
        console.log('API Response:', data);
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API');
        }
        // Use stored/cached addresses only; the rest are resolved lazily for
        // the items actually shown (see the list effect below).
        const withKnown = geocodingService.withAddresses(data);
        setBumps(withKnown);
        setVisibleBumps(withKnown.slice(0, ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Failed to fetch bumps:', error);
        setError('Failed to fetch bumps');
        setBumps([]);
        setVisibleBumps([]);
      } finally {
        setInitialLoading(false);
      }
    };
    fetchBumps();
  }, []);

  // Resolve missing addresses only for the list rows that are on screen.
  useEffect(() => {
    if (!showList) return;
    geocodingService.withAddresses(bumps.slice(0, page * ITEMS_PER_PAGE), applyResolvedAddress);
    // `bumps` intentionally omitted: it changes on every resolved address, and
    // the queue already de-duplicates, so only list/page changes should trigger this.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList, page, applyResolvedAddress]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderMap = () => {
    return (
      <MapContainer
        center={center}
        zoom={zoom}
        style={{ width: "100%", height: "100%" }}
        ref={setMap}
      >
        <TileLayer url={tileLayerUrl} attribution={tileLayerAttribution} />

        {visibleBumps.map((bump) => (
          <Marker
            key={bump.id}
            position={[bump.location.lat, bump.location.lng]}
            icon={bumpIcon}
            eventHandlers={{ click: () => setSelectedBump(bump) }}
          />
        ))}

        {selectedBump && (
          <Popup
            position={[selectedBump.location.lat, selectedBump.location.lng]}
            eventHandlers={{ remove: () => setSelectedBump(null) }}
          >
            <div className="max-w-xs">
              <img
                src={selectedBump.imageUrl}
                alt="Bump"
                className="w-full h-32 object-cover rounded-lg mb-2"
              />
              <p className="text-sm font-medium mb-1">
                {selectedBump.address || "Loading address..."}
              </p>
              <p className="text-xs text-gray-600">
                {formatDate(selectedBump.createdAt)}
              </p>
            </div>
          </Popup>
        )}
      </MapContainer>
    );
  };

  if (initialLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-primary-50">
        <p className="text-primary-900">Cargando datos...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-primary-50">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-0">
        {renderMap()}
      </div>

      {/* Non-blocking indicator while nearby bumps refresh in the background */}
      {refreshingNearby && (
        <div className="fixed top-24 left-1/2 z-30 -translate-x-1/2 rounded-full bg-white/90 px-4 py-1.5 text-xs font-medium text-primary-900 shadow-lg backdrop-blur-md">
          Actualizando baches cercanos...
        </div>
      )}

      {/* List Toggle Button */}
      <button
        onClick={() => setShowList(true)}
        className="fixed bottom-6 left-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-white text-primary-900 shadow-2xl hover:bg-primary-50 transition-colors"
        aria-label="Ver lista de baches cercanos"
      >
        <ListBulletIcon className="w-6 h-6" />
      </button>

      {/* Overlay when list is shown */}
      {showList && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={() => setShowList(false)}
        />
      )}

      {/* Sliding List Panel */}
      <AnimatePresence>
        {showList && (
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25 }}
            className="fixed left-0 top-0 h-full w-80 max-w-[85vw] bg-white shadow-xl z-50"
          >
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Nearby Bumps</h2>
                <button onClick={() => setShowList(false)}>
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="overflow-y-auto h-[calc(100vh-5rem)]">
                {bumps.slice(0, page * ITEMS_PER_PAGE).map((bump) => (
                  <div
                    key={bump.id}
                    className="flex items-center p-2 border-b cursor-pointer hover:bg-gray-100"
                    onClick={() => {
                      setSelectedBump(bump);
                      map?.panTo([bump.location.lat, bump.location.lng]);
                      setShowList(false);
                    }}
                  >
                    <img
                      src={bump.imageUrl}
                      alt="Bump"
                      className="w-16 h-16 object-cover rounded mr-4"
                    />
                    <div>
                      <p className="font-medium">{bump.address || "Loading address..."}</p>
                      <p className="text-sm text-gray-600">
                        {formatDate(bump.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}

                {refreshingNearby ? (
                  <p className="text-center py-4">Loading...</p>
                ) : (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    className="w-full py-2 mt-4 bg-blue-500 text-white rounded"
                  >
                    Load More
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
