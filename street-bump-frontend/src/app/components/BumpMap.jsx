import { useEffect, useState, useCallback, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { bumpService } from '@/services/bumpService';
import { googleMapsService } from '@/services/googleMapsService';
import { motion, AnimatePresence } from 'framer-motion';
import { ListBulletIcon, XMarkIcon } from '@heroicons/react/24/outline';

const ITEMS_PER_PAGE = 10;
const MIN_DISTANCE_TO_UPDATE = 0.5; // 500 meters in kilometers
const MIN_TIME_BETWEEN_UPDATES = 10000; // 10 seconds

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showList, setShowList] = useState(false);
  const [center, setCenter] = useState({
    lat: 29.0729,
    lng: -110.9559
  });

  const lastFetchRef = useRef({
    position: null,
    timestamp: 0
  });

  // Handle map idle state
  const onMapIdle = useCallback(() => {
    if (!map) return;
    
    const mapCenter = map.getCenter();
    const currentPosition = {
      lat: mapCenter.lat(),
      lng: mapCenter.lng()
    };
    
    setCenter(currentPosition);
    
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
        setLoading(true);
        const nearbyBumps = await googleMapsService.fetchBumpsInRadius(currentPosition);
        setVisibleBumps(nearbyBumps);
        
        // Update last fetch reference
        lastFetchRef.current = {
          position: currentPosition,
          timestamp: now
        };
      } catch (error) {
        console.error('Failed to fetch nearby bumps:', error);
        setError('Failed to fetch nearby bumps');
      } finally {
        setLoading(false);
      }
    };
    
    fetchNearbyBumps();
  }, [map]);

  // Get address from coordinates
  const getAddressFromCoords = async (lat, lng) => {
    try {
      const address = await googleMapsService.getAddressFromCoordinates(lat, lng);
      return address || "Unknown location";
    } catch (error) {
      return "Unknown location";
    }
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

  const onMapChange = () => {
    if (!map) return;
    const mapCenter = map.getCenter();
    setCenter({
      lat: mapCenter.lat(),
      lng: mapCenter.lng()
    });
  };

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
      <GoogleMap
        center={center}
        zoom={14}
        mapContainerStyle={{ width: "100%", height: "100vh" }}
        onLoad={setMap}
        onIdle={onMapIdle}
        onDragEnd={onMapChange}
        onZoomChanged={onMapChange}
      >
        {visibleBumps.map((bump) => (
          <Marker
            key={bump.id}
            position={{
              lat: bump.location.lat,
              lng: bump.location.lng
            }}
            onClick={() => setSelectedBump(bump)}
            // icon={{
            //   url: "/bump-icon.png",
            //   scaledSize: new window.google.maps.Size(30, 30)
            // }}
          />
        ))}

        {selectedBump && (
          <InfoWindow
            position={{
              lat: selectedBump.location.lat,
              lng: selectedBump.location.lng
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
                {selectedBump.address || "Loading address..."}
              </p>
              <p className="text-xs text-gray-600">
                {formatDate(selectedBump.createdAt)}
              </p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    );
  };

  if (loading) return <div>Loading data...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="relative h-full w-full">
      {renderMap()}

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
                        lat: bump.location.lat,
                        lng: bump.location.lng
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
                        {formatDate(bump.createdAt)}
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
}