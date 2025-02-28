import { Dialog } from '@headlessui/react';
import { XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

export default function InstructionsModal({ isOpen, onClose }) {
  const isAndroid = /Android/i.test(navigator.userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);

  return (
    <Dialog 
      open={isOpen} 
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded-xl bg-white p-6 shadow-2xl">
          <div className="relative">
            <div className="flex justify-between items-start mb-4">
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                ¿Cómo reportar un bache?
              </Dialog.Title>
              <button
                onClick={onClose}
                className="ml-4 rounded-full bg-gray-100 p-1.5 hover:bg-gray-200 transition-colors"
              >
                <XMarkIcon className="h-4 w-4 text-gray-500" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">1. Usar fotos con ubicación</h3>
                {isAndroid && (
                  <ol className="list-decimal pl-5 text-gray-600 space-y-2">
                    <li>Abre la aplicación de cámara</li>
                    <li>Toca el ícono de ajustes (⚙️)</li>
                    <li>Busca "Ubicación" o "Etiquetas de ubicación"</li>
                    <li>Activa la opción para guardar la ubicación</li>
                  </ol>
                )}
                {isIOS && (
                  <ol className="list-decimal pl-5 text-gray-600 space-y-2">
                    <li>Abre la aplicación de Ajustes</li>
                    <li>Ve a "Privacidad y seguridad" → "Servicios de ubicación"</li>
                    <li>Encuentra "Cámara" en la lista</li>
                    <li>Selecciona "Mientras se usa la app"</li>
                  </ol>
                )}
                {!isAndroid && !isIOS && (
                  <p className="text-gray-600">
                    Activa los servicios de ubicación para la cámara en la configuración de tu dispositivo.
                  </p>
                )}
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">2. Usar tu ubicación actual</h3>
                <p className="text-gray-600">
                  Si tu foto no tiene datos de ubicación, puedes usar tu ubicación actual al momento de hacer el reporte.
                  Asegúrate de estar cerca del bache al usar esta opción.
                </p>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">3. Seleccionar en el mapa</h3>
                <p className="text-gray-600">
                  También puedes seleccionar manualmente la ubicación del bache en el mapa.
                  Mueve el mapa y ajusta el marcador en la ubicación exacta del bache.
                </p>
              </div>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
}