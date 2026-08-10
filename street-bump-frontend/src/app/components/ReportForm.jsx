'use client';

import { useState } from 'react';
import EXIF from "exif-js";
import { bumpService } from '@/services/bumpService';
import { googleMapsService } from '@/services/googleMapsService';
import { imageService } from '@/services/imageService';
import { CameraIcon, PhotoIcon, PaperAirplaneIcon, XMarkIcon, QuestionMarkCircleIcon, MapPinIcon } from '@heroicons/react/24/outline';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';
import LocationDisplay from './LocationDisplay';
import MapPicker from './MapPicker';
import InstructionsModal from './InstructionsModal';

export default function ReportForm({ isOpen, onClose }) {
  const [error, setError] = useState(null);
  const [location, setLocation] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(false);
  const [showInstructions, setShowInstructions] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const resetState = () => {
    setError(null);
    setLocation(null);
    setImageFile(null);
    setShowLocationPrompt(false);
    setShowMapPicker(false);
  };

  const handleClose = () => {
    if (loading) return;
    resetState();
    onClose();
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setError(null);
    setShowLocationPrompt(false);
    setShowMapPicker(false);
    setImageFile(file);

    EXIF.getData(file, function() {
      const lat = EXIF.getTag(this, "GPSLatitude");
      const lng = EXIF.getTag(this, "GPSLongitude");

      if (!lat || !lng) {
        setShowLocationPrompt(true);
        setLocation(null);
        return;
      }

      setLocation({
        lat: googleMapsService.parseEXIFCoordinate(lat),
        lng: googleMapsService.parseEXIFCoordinate(lng),
      });
    });
  };

  const handleSubmit = async () => {
    if (!imageFile || !location) return;

    setLoading(true);
    setError(null);

    const loadingToast = toast.loading('Enviando reporte...');

    try {
      const base64Image = await imageService.fileToBase64(imageFile);
      await bumpService.createBump({
        image: base64Image,
        lat: location.lat,
        lng: location.lng,
      });

      toast.dismiss(loadingToast);
      toast.success('¡Reporte enviado exitosamente! Será revisado por un administrador.');

      resetState();
      onClose();
    } catch (err) {
      console.error('Error submitting bump:', err);
      toast.dismiss(loadingToast);
      toast.error('No se pudo enviar el reporte. Por favor intenta de nuevo.');
      setError('No se pudo enviar el reporte. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onClose={handleClose} className="relative z-50">
        <div className="fixed inset-0 bg-black/50" aria-hidden="true" />

        <div className="fixed inset-0 flex items-end justify-center p-0 sm:items-center sm:p-4">
          <Dialog.Panel className="max-h-[92vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 shadow-2xl sm:min-w-[320px] sm:max-w-md sm:rounded-2xl">
            <div className="mb-4 flex items-start justify-between">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                {imageFile ? 'Confirmar Reporte de Bache' : 'Reportar un Bache'}
              </Dialog.Title>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowInstructions(true)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Ver instrucciones"
                >
                  <QuestionMarkCircleIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={handleClose}
                  className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Step 1: pick a photo */}
            {!imageFile && (
              <div className="flex flex-col gap-3">
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <div className="w-full py-3.5 px-4 text-center bg-primary-600 text-white rounded-xl cursor-pointer hover:brightness-95 transition-[filter] flex items-center justify-center gap-2 font-medium">
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
                  <div className="w-full py-3.5 px-4 text-center bg-primary-100 text-primary-900 rounded-xl cursor-pointer hover:bg-orange-200 transition-colors flex items-center justify-center gap-2 font-medium">
                    <PhotoIcon className="w-5 h-5" />
                    Elegir de Galería
                  </div>
                </label>
              </div>
            )}

            {/* Missing location prompt */}
            {showLocationPrompt && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                <p className="text-yellow-800 mb-3 text-sm">Esta imagen no contiene datos de ubicación. ¿Deseas usar tu ubicación actual?</p>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      try {
                        const currentLocation = await googleMapsService.getCurrentLocation();
                        setLocation(currentLocation);
                        setShowLocationPrompt(false);
                        setError(null);
                      } catch (err) {
                        setError("No se pudo obtener la ubicación actual. Por favor usa otra opción.");
                      }
                    }}
                    className="w-full py-2.5 px-4 bg-primary-600 text-white rounded-lg hover:brightness-95 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    <MapPinIcon className="h-5 w-5" />
                    Usar Ubicación Actual
                  </button>

                  <button
                    onClick={() => {
                      setShowLocationPrompt(false);
                      setShowMapPicker(true);
                    }}
                    className="w-full py-2.5 px-4 bg-primary-100 text-primary-900 rounded-lg hover:bg-orange-200 flex items-center justify-center gap-2 text-sm font-medium"
                  >
                    Seleccionar en el Mapa
                  </button>

                  <button
                    onClick={() => {
                      setShowLocationPrompt(false);
                      setImageFile(null);
                      setError("No se puede enviar el reporte sin datos de ubicación.");
                    }}
                    className="w-full py-2 px-4 text-gray-500 hover:text-gray-700 text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Error display */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 rounded-lg">
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Step 2: confirm and submit */}
            {imageFile && !showLocationPrompt && (
              <div className="relative">
                <div className="mb-4 rounded-xl overflow-hidden bg-gray-100">
                  <img
                    src={URL.createObjectURL(imageFile)}
                    alt="Vista previa"
                    className="w-full h-52 object-cover"
                  />
                </div>

                {showMapPicker && (
                  <div className="mb-4">
                    <p className="text-gray-700 font-medium mb-2 text-sm">Selecciona la ubicación del bache:</p>
                    <MapPicker
                      onLocationSelect={(newLocation) => setLocation(newLocation)}
                      initialLocation={location}
                    />
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-xl mb-4">
                  <p className="text-gray-700 font-medium mb-1 text-sm">Ubicación:</p>
                  <LocationDisplay location={location} />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={loading || !location}
                  className="w-full py-3.5 px-4 bg-primary-600 text-white rounded-xl hover:brightness-95 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-[filter] font-medium"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                  {loading ? 'Enviando...' : !location ? 'Selecciona una ubicación' : 'Confirmar y Enviar'}
                </button>

                {!loading && (
                  <button
                    onClick={() => {
                      setImageFile(null);
                      setLocation(null);
                      setShowMapPicker(false);
                    }}
                    className="w-full py-2 mt-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    Elegir otra foto
                  </button>
                )}
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>

      <InstructionsModal
        isOpen={showInstructions}
        onClose={() => setShowInstructions(false)}
      />
    </>
  );
}
