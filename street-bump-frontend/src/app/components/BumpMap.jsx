import { useEffect, useState, useCallback } from 'react';
import { GoogleMap, LoadScript, Marker, InfoWindow } from "@react-google-maps/api";
import { bumpService } from '@/services/bumpService';
import { googleMapsService } from '@/services/googleMapsService';
import { motion, AnimatePresence } from 'framer-motion';
import { ListBulletIcon, XMarkIcon } from '@heroicons/react/24/outline';

/**
 * @typedef {Object} Bump
 * @property {string} id
 * @property {Object} location
 * @property {number} location.lat
 * @property {number} location.lng
 * @property {string} imageUrl
 * @property {string} timestamp
 */

export default function BumpMap() {
  const [map, setMap] = useState(null);
  const [bumps, setBumps] = useState([]);
  const [selectedBump, setSelectedBump] = useState(null);
  const [visibleBumps, setVisibleBumps] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);

  const mapCenter = {
    lat: 29.0729,
    lng: -110.9559
  };

  useEffect(() => {
    const fetchBumps = async () => {
      try {
        const data = await bumpService.getAllBumps();
        console.log('API Response:', data);
        if (!Array.isArray(data)) {
          throw new Error('Invalid data format received from API');
        }
        setBumps(data);
        setVisibleBumps(data.slice(0, ITEMS_PER_PAGE));
      } catch (error) {
        console.error('Failed to fetch bumps:', error);
        setError('Failed to fetch bumps');
        setBumps([]);
        setVisibleBumps([]);
      } finally {
        setLoading(false);
      }
    };
    fetchBumps();
  }, []);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>{error}</div>;

  // Handle map bounds changed
  const onBoundsChanged = useCallback(() => {
    if (!map) return;
    const center = map.getCenter();
    fetchBumpsInRadius({
      lat: center.lat(),
      lng: center.lng()
    });
  }, [map, fetchBumpsInRadius]);

  // Get address from coordinates
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const address = await googleMapsService.getAddressFromCoordinates(lat, lng);
      return address || "Unknown location";
    } catch (error) {
      return "Unknown location";
    }
  };

  return (
    <div className="relative h-full w-full">
      <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GMAPS_API_KEY}>
        <GoogleMap
          center={mapCenter}
          zoom={14}
          mapContainerStyle={{ width: "100%", height: "100vh" }}
          onLoad={setMap}
          onBoundsChanged={onBoundsChanged}
        >
          {visibleBumps.map((bump) => (
            <Marker
              key={bump.id}
              position={{
                lat: bump.location.latitude,
                lng: bump.location.longitude
              }}
              onClick={() => setSelectedBump(bump)}
              icon={{
                url: "/bump-icon.png",
                scaledSize: new window.google.maps.Size(30, 30)
              }}
            />
          ))}

          {selectedBump && (
            <InfoWindow
              position={{
                lat: selectedBump.location.latitude,
                lng: selectedBump.location.longitude
              }}
              onCloseClick={() => setSelectedBump(null)}
            >
              <div className="max-w-xs">
                <img
                  src={selectedBump.imageUrl}
                  alt="Bump"
                  className="w-full h-32 object-cover rounded-lg mb-2"
                />
                <p className="text-sm font-medium mb-1">
                  {selectedBump.address}
                </p>
                <p className="text-xs text-gray-600">
                  {new Date(selectedBump.timestamp).toLocaleDateString()}
                </p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>

      {/* List Toggle Button */}
      <button
        onClick={() => setShowList(true)}
        className="absolute top-4 left-4 z-10 bg-white p-3 rounded-full shadow-lg"
      >
        <ListBulletIcon className="w-6 h-6" />
      </button>

      {/* Overlay when list is shown */}
      {showList && (
        <div
          className="fixed inset-0 bg-black/20 z-20"
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
            className="fixed left-0 top-0 h-full w-80 bg-white shadow-xl z-30"
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
                      map?.panTo({
                        lat: bump.location.latitude,
                        lng: bump.location.longitude
                      });
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
                        {new Date(bump.timestamp).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}

                {loading ? (
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
    </div>
  );
};