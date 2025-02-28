'use client';

import { useLoadScript } from '@react-google-maps/api';

const libraries = ['places'];

export default function GoogleMapsWrapper({ children }: { children: React.ReactNode }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
    libraries: libraries as ['places']
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

  return <>{children}</>;
}