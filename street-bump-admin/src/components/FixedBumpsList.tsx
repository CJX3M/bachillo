'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { adminService, NOT_ADMIN_MESSAGE } from '@/services/adminService';

interface FixedBump {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  imageUrl: string;
  fixedAt?: string;
}

const errorMessage = (err: unknown, fallback: string) =>
  err instanceof Error && err.message === NOT_ADMIN_MESSAGE ? NOT_ADMIN_MESSAGE : fallback;

const formatDate = (dateString?: string) =>
  dateString
    ? new Date(dateString).toLocaleString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : 'sin fecha';

export default function FixedBumpsList() {
  const [bumps, setBumps] = useState<FixedBump[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminService
      .getFixedBumps()
      .then(setBumps)
      .catch((err) => setError(errorMessage(err, 'No se pudieron cargar los atendidos.')))
      .finally(() => setLoading(false));
  }, []);

  const handleReopen = async (id: string) => {
    try {
      setError(null);
      await adminService.reopenBump(id);
      setBumps((list) => list.filter((bump) => bump.id !== id));
    } catch (err) {
      setError(errorMessage(err, 'No se pudo reabrir el bache.'));
    }
  };

  if (loading) return <p>Cargando...</p>;

  return (
    <div>
      {error && <p className="mb-4 text-red-500">{error}</p>}
      {!error && bumps.length === 0 && <p className="text-gray-500">No hay baches atendidos.</p>}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {bumps.map((bump) => (
          <div key={bump.id} className="bg-white rounded-lg shadow p-4">
            <Image
              src={bump.imageUrl}
              alt="Bache"
              width={400}
              height={300}
              className="w-full h-48 object-cover rounded-lg mb-4"
            />
            <div className="space-y-2">
              <p className="text-sm text-gray-600 line-clamp-2">
                {bump.address || `${bump.location.lat}, ${bump.location.lng}`}
              </p>
              <p className="text-sm text-gray-500">Marcado el: {formatDate(bump.fixedAt)}</p>
              <button
                onClick={() => handleReopen(bump.id)}
                className="w-full py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              >
                Reabrir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
