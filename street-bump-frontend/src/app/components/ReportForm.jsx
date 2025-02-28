'use client';

import { useState } from 'react';
import EXIF from "exif-js";
import { bumpService } from '@/services/bumpService';
import { googleMapsService } from '@/services/googleMapsService';
import { imageService } from '@/services/imageService';
import { CameraIcon, PhotoIcon, PaperAirplaneIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import LocationDisplay from './LocationDisplay';
import MapPicker from './MapPicker';
import InstructionsModal from './InstructionsModal';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export default function ReportForm() {
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    setError(null);
    setShowLocationPrompt(false);

    let processedFile = file;
    if (file.size > MAX_FILE_SIZE) {
      processedFile = await imageService.compressImage(file);
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
        lat: googleMapsService.parseEXIFCoordinate(lat),
        lng: googleMapsService.parseEXIFCoordinate(lng),
      };
      setLocation(coords);
      setShowPreviewModal(true);
    });
  };

  const handleSubmit = async () => {
    if (!imageFile || !location) return;
    
    setLoading(true);
    setError(null);
    setShowPreviewModal(false);

    const loadingToast = toast.loading('Enviando reporte...');

    try {
      const base64Image = await imageService.fileToBase64(imageFile);
      const bumpData = {
        image: base64Image,
        lat: location.lat,
        lng: location.lng,
      };

      await bumpService.createBump(bumpData);
      
      toast.dismiss(loadingToast);
      toast.success('¡Reporte enviado exitosamente! Será revisado por un administrador.');
      
      setImageFile(null);
      setLocation(null);
      setShowPreviewModal(false);
    } catch (error) {
      console.error('Error submitting bump:', error);
      toast.dismiss(loadingToast);
      toast.error('No se pudo enviar el reporte. Por favor intenta de nuevo.');
      setError('No se pudo enviar el reporte. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Help button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowInstructions(true)}
          className="p-2 text-gray-500 hover:text-gray-700 transition-colors"
          title="Ver instrucciones"
        >
          <QuestionMarkCircleIcon className="w-6 h-6" />
        </button>
      </div>

      <InstructionsModal 
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />

      {/* Image upload buttons */}
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

      {/* Location prompt */}
      {showLocationPrompt && (
        <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-yellow-800 mb-3">Esta imagen no contiene datos de ubicación. ¿Deseas usar tu ubicación actual?</p>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                try {
                  const currentLocation = await googleMapsService.getCurrentLocation();
                  setLocation(currentLocation);
                  setShowLocationPrompt(false);
                  setError(null);
                  setShowPreviewModal(true);
                } catch (err) {
                  setError("No se pudo obtener la ubicación actual. Por favor usa otra opción.");
                }
              }}
              className="w-full py-2 px-4 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              Usar Ubicación Actual
            </button>
            
            <button
              onClick={() => {
                setShowLocationPrompt(false);
                setShowPreviewModal(true);
              }}
              className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              Seleccionar en el Mapa
            </button>

            <button
              onClick={() => {
                setShowLocationPrompt(false);
                setError("No se puede enviar el reporte sin datos de ubicación.");
              }}
              className="w-full py-2 px-4 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Preview Modal */}
      <Dialog 
        open={Boolean(showPreviewModal && imageFile)}
        onClose={() => setShowPreviewModal(false)}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

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

              <div className="mb-4 rounded-lg overflow-hidden bg-gray-100">
                <img
                  src={imageFile ? URL.createObjectURL(imageFile) : ''}
                  alt="Vista previa"
                  className="w-full h-52 object-cover"
                />
              </div>

              <div className="mb-4">
                {!location && (
                  <div className="mb-4">
                    <p className="text-gray-700 font-medium mb-2">Selecciona la ubicación del bache:</p>
                    <MapPicker
                      onLocationSelect={(newLocation) => setLocation(newLocation)}
                      initialLocation={location}
                    />
                  </div>
                )}
                
                <div className="p-4 bg-gray-50 rounded-lg mt-4">
                  <p className="text-gray-700 font-medium mb-1">Ubicación:</p>
                  <LocationDisplay location={location} />
                </div>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !location}
                className="w-full py-3 px-4 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
              >
                <PaperAirplaneIcon className="w-5 h-5" />
                {loading ? 'Enviando...' : !location ? 'Selecciona una ubicación' : 'Confirmar y Enviar'}
              </button>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}