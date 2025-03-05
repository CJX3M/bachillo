'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { adminService } from '@/services/adminService';
import { getAddressFromCoords } from '@/services/geocodingService';

interface UnverifiedBump {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  imageUrl: string;
  createdAt: string;
}

export default function UnverifiedBumpsList() {
  const [bumps, setBumps] = useState<UnverifiedBump[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBumpsWithAddresses = async () => {
      try {
        const data = await adminService.getUnverifiedBumps();
        
        // Fetch addresses for all bumps
        const bumpsWithAddresses = await Promise.all(
          data.map(async (bump) => {
            const address = await getAddressFromCoords(
              bump.location.lat,
              bump.location.lng
            );
            return { ...bump, address };
          })
        );
        
        setBumps(bumpsWithAddresses);
      } catch (err) {
        console.error('Error:', err);
        setError('Failed to fetch unverified bumps');
      } finally {
        setLoading(false);
      }
    };

    fetchBumpsWithAddresses();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await adminService.verifyBump(id);
      setBumps(bumps.filter(bump => bump.id !== id));
    } catch {
      setError('Failed to verify bump');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await adminService.deleteBump(id);
      setBumps(bumps.filter(bump => bump.id !== id));
    } catch {
      setError('Failed to delete bump');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div>
      {loading ? (
        <p>Cargando...</p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
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
                <p className="text-sm text-gray-600">
                  {bump.address || `${bump.location.lat}, ${bump.location.lng}`}
                </p>
                <p className="text-sm text-gray-500">
                  Reportado el: {formatDate(bump.createdAt)}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleVerify(bump.id)}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => handleDeny(bump.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    Deny
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}