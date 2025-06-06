'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { bumpService } from '@/services/bumpService';
import ReportForm from './components/ReportForm';
import dynamic from 'next/dynamic';
import GoogleMapsWrapper from './components/GoogleMapsWrapper';

const BumpMap = dynamic(() => import('@/app/components/BumpMap'), {
  ssr: false,
  loading: () => <div>Cargando mapa...</div>
});

export default function HomePage() {
  const [showMap, setShowMap] = useState(false);
  const [backgroundImages, setBackgroundImages] = useState<string[]>([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Fetch background images
  useEffect(() => {
    const fetchBumps = async () => {
      try {
        const data = await bumpService.getAllBumps();
        console.log('API Response:', data);
        
        if (!Array.isArray(data)) {
          setBackgroundImages([]); 
          return;
        }
        
        setBackgroundImages(data.map(bump => bump.imageUrl));
      } catch (error) {
        console.error('Failed to fetch bumps:', error);
        setBackgroundImages([]);
      }
    };
    fetchBumps();
  }, []);

  // Rotate background images
  useEffect(() => {
    if (backgroundImages.length === 0) return;
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => 
        prev === backgroundImages.length - 1 ? 0 : prev + 1
      );
    }, 5000);
    return () => clearInterval(interval);
  }, [backgroundImages]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-orange-50 to-yellow-50">
      <header className="relative h-64 flex items-center justify-center overflow-hidden">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.63 }}
          transition={{ duration: 1 }}
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: "url('/cerro-campana.webp')",
            backgroundSize: 'cover',
            backgroundPosition: 'center right',
            filter: 'brightness(0.9)'
          }}
        />
        <div className="relative z-10 text-center">
          <h1 className="text-4xl font-bold text-white drop-shadow-lg">
            Bachillo
          </h1>
          <p className="text-xl text-white drop-shadow-md mt-2">
            Cuida tu carro, reporta los baches
          </p>
        </div>
      </header>

      <nav className="bg-white/90 shadow-lg p-6 flex justify-center gap-6 sticky top-0 z-20 backdrop-blur-sm">
        <button 
          onClick={() => setShowMap(false)}
          className={`px-8 py-3 rounded-full transition-all duration-300 flex items-center gap-2 ${
            !showMap 
              ? 'bg-yellow-600 text-white ring-2 ring-yellow-400 shadow-lg scale-105' 
              : 'bg-orange-100 text-yellow-900 hover:bg-orange-200'
          }`}
        >
          <ExclamationTriangleIcon className="w-5 h-5" />
          Reportar Bache
        </button>
        <button 
          onClick={() => setShowMap(true)}
          className={`px-8 py-3 rounded-full transition-all duration-300 flex items-center gap-2 ${
            showMap 
              ? 'bg-yellow-600 text-white ring-2 ring-yellow-400 shadow-lg scale-105' 
              : 'bg-orange-100 text-yellow-900 hover:bg-orange-200'
          }`}
        >
          <MapIcon className="w-5 h-5" />
          Ver Mapa
        </button>
      </nav>

      <main className="flex-1 container mx-auto p-6 relative">
        <AnimatePresence mode="wait">
          {!showMap && backgroundImages.length > 0 && (
            <motion.div 
              className="absolute inset-0 -z-10 overflow-hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {backgroundImages.map((img, index) => (
                <motion.div
                  key={img}
                  className={`absolute inset-0 transition-opacity duration-1000`}
                  initial={{ opacity: 0 }}
                  animate={{ 
                    opacity: index === currentImageIndex ? 0.2 : 0 
                  }}
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
        
        <motion.div 
          layout
          className="bg-white/90 rounded-2xl shadow-2xl p-8 backdrop-blur-md"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {showMap ? (
            <GoogleMapsWrapper>
              <BumpMap />
            </GoogleMapsWrapper>
          ) : (
            <ReportForm />
          )}
        </motion.div>
      </main>
    </div>
  );
}