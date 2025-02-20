// components/ReportForm.js
import { useState, useEffect } from 'react';
import EXIF from "exif-js";
import { bumpService } from '@/services/bumpService';
import { googleMapsService } from '@/services/googleMapsService';
import { CameraIcon, PhotoIcon, PaperAirplaneIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_WIDTH = 1920; // Maximum width for compressed image

const compressImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions maintaining aspect ratio
        if (width > MAX_WIDTH) {
          height = (height * MAX_WIDTH) / width;
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to Blob with quality adjustment
        canvas.toBlob(
          (blob) => {
            resolve(new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })); 
          },
          'image/jpeg',
          0.7 // Quality setting
        );
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
};

const LocationDisplay = ({ location }) => {
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
};

export default function ReportForm() {
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const parseEXIFCoordinate = (coordinate) => {
    if (!coordinate) return null;
    const degrees = coordinate[0];
    const minutes = coordinate[1];
    const seconds = coordinate[2];
    return degrees + minutes/60 + seconds/3600;
  };

  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => reject(error),
        { enableHighAccuracy: true }
      );
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    setError(null);
    setShowLocationPrompt(false);

    let processedFile = file;
    if (file.size > MAX_FILE_SIZE) {
      processedFile = await compressImage(file);
    }

    setImageFile(processedFile);

    EXIF.getData(processedFile, function() {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lng = EXIF.getTag(this, "GPSLongitude");

      if (!lat || !lng) {
        setShowLocationPrompt(true);
        setLocation(null);
        return;
      }

      const coords = {
        lat: parseEXIFCoordinate(lat),
        lng: parseEXIFCoordinate(lng),
      };
      setLocation(coords);
      setShowPreviewModal(true);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!imageFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', imageFile);

    try {
      await bumpService.createBump(formData);
      setImageFile(null);
    } catch (error) {
      setError('Failed to submit bump report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <label className="block">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="w-full py-3 px-4 text-center bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors flex items-center justify-center gap-2">
            <CameraIcon className="w-5 h-5" />
            Tomar Foto
          </div>
        </label>

        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="w-full py-3 px-4 text-center bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600 transition-colors flex items-center justify-center gap-2">
            <PhotoIcon className="w-5 h-5" />
            Elegir de Galería
          </div>
        </label>
      </div>

      {showLocationPrompt && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 mb-3">Esta imagen no contiene datos de ubicación. ¿Deseas usar tu ubicación actual?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const currentLocation = await getCurrentLocation();
                  setLocation(currentLocation);
                  setShowLocationPrompt(false);
                  setError(null);
                  setShowPreviewModal(true); // Show preview modal after getting location
                } catch (err) {
                  setError("No se pudo obtener la ubicación actual. Intenta de nuevo o usa una foto con datos de ubicación.");
                }
              }}
              className="flex-1 py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Usar Ubicación Actual
            </button>
            <button
              onClick={() => {
                setShowLocationPrompt(false);
                setError("No se puede enviar el reporte sin datos de ubicación. Por favor usa una foto con datos de ubicación o permite el uso de tu ubicación actual.");
              }}
              className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <Dialog 
        open={Boolean(showPreviewModal && imageFile && location)}
        onClose={() => setShowPreviewModal(false)}
        className="relative z-50"
      >
        {/* Modal backdrop */}
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

        {/* Full-screen container */}
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto min-w-[320px] w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <div className="relative">
              <div className="flex justify-between items-start mb-4">
                <Dialog.Title className="text-xl font-semibold text-gray-900">
                  Confirmar Reporte de Bache
                </Dialog.Title>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="ml-4 rounded-full bg-gray-100 p-1.5 hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              {/* Image preview */}
              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : ''}
                  alt="Vista previa"
                  className="w-full h-52 object-cover"
                />
              </div>

              {/* Location info */}
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700 font-medium mb-1">Ubicación:</p>
                <LocationDisplay location={location} />
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {loading ? 'Enviando...' : 'Confirmar y Enviar'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}