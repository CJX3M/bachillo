'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import dynamic from 'next/dynamic';
import GoogleMapsWrapper from './components/GoogleMapsWrapper';
import ReportForm from './components/ReportForm';

const BumpMap = dynamic(() => import('@/app/components/BumpMap'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-primary-50">
      <p className="text-primary-900">Cargando mapa...</p>
    </div>
  )
});

export default function HomePage() {
  const [showReportForm, setShowReportForm] = useState(false);

  return (
    <div className="relative h-[100dvh] w-screen overflow-hidden bg-primary-50">
      <GoogleMapsWrapper>
        <BumpMap />
      </GoogleMapsWrapper>

      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="fixed top-4 left-4 right-4 z-30 flex items-center gap-2 rounded-2xl bg-white/90 px-5 py-3 shadow-lg backdrop-blur-md"
      >
        <span className="text-2xl">🚧</span>
        <div>
          <h1 className="text-lg font-bold leading-tight text-primary-900">Bachillo</h1>
          <p className="hidden text-xs text-primary-900/70 sm:block">
            Cuida tu carro, reporta los baches
          </p>
        </div>
      </motion.header>

      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 20 }}
        whileTap={{ scale: 0.94 }}
        onClick={() => setShowReportForm(true)}
        className="fixed bottom-6 right-6 z-30 flex items-center gap-2 rounded-full bg-primary-600 px-5 py-3.5 text-white shadow-2xl ring-4 ring-white/40 hover:brightness-95 transition-[filter]"
      >
        <ExclamationTriangleIcon className="h-6 w-6" />
        <span className="font-semibold text-sm sm:text-base">Reportar Bache</span>
      </motion.button>

      <ReportForm isOpen={showReportForm} onClose={() => setShowReportForm(false)} />
    </div>
  );
}
