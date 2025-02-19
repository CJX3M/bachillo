// components/ReportForm.js
import { useState } from 'react';
import EXIF from "exif-js";
import { bumpService } from '@/services/bumpService';

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

export default function ReportForm() {
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);

  const getDeviceInstructions = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    return (
      <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
        <h3 className="font-semibold text-lg mb-2 text-yellow-900">
          {isIOS ? "Enable Location on iPhone" : "Enable Location on Android"}
        </h3>
        
        {isIOS ? (
          <ol className="space-y-2 text-sm text-yellow-800">
            <li>1. Open <strong>Settings</strong></li>
            <li>2. Scroll to <strong>Privacy & Security</strong></li>
            <li>3. Tap <strong>Location Services</strong></li>
            <li>4. Turn on <strong>Location Services</strong></li>
            <li>5. Find your <strong>Camera app</strong></li>
            <li>6. Select <strong>"While Using"</strong></li>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-yellow-800">
            <li>1. Open your <strong>Camera app</strong></li>
            <li>2. Tap the <strong>Settings icon</strong> (⚙️)</li>
            <li>3. Find <strong>Location tags</strong></li>
            <li>4. Toggle <strong>Save location</strong> ON</li>
          </ol>
        )}
      </div>
    );
  };

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
          <div className="w-full py-3 px-4 text-center bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600 transition-colors">
            Take Photo
          </div>
        </label>

        <label className="block">
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
          <div className="w-full py-3 px-4 text-center bg-green-500 text-white rounded-lg cursor-pointer hover:bg-green-600 transition-colors">
            Choose from Gallery
          </div>
        </label>
      </div>

      {showLocationPrompt && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 mb-3">This image doesn't contain location data. Would you like to use your current location?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const currentLocation = await getCurrentLocation();
                  setLocation(currentLocation);
                  setShowLocationPrompt(false);
                  setError(null);
                } catch (err) {
                  setError("Unable to get current location. Please enable location services:");
                }
              }}
              className="flex-1 py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
            >
              Use Current Location
            </button>
            <button
              onClick={() => {
                setShowLocationPrompt(false);
                setError("A location is required to submit a bump report");
              }}
              className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 mb-2">{error}</p>
          {getDeviceInstructions()}
        </div>
      )}

      {location && (
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-green-700">Location captured successfully</p>
          <p className="text-sm text-green-600">
            Lat: {location.lat.toFixed(6)}, Lng: {location.lng.toFixed(6)}
          </p>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!location || !imageFile || loading}
        className={`mt-4 w-full py-2 px-4 rounded-lg ${
          !location || !imageFile || loading
            ? 'bg-gray-300 cursor-not-allowed'
            : 'bg-violet-600 text-white hover:bg-violet-700'
        }`}
      >
        {loading ? 'Submitting...' : 'Submit Report'}
      </button>
    </div>
  );
};