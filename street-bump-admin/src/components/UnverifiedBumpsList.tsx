'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { adminService } from '@/services/adminService';

interface UnverifiedBump {
  id: string;
  location: {
    lat: number;
    lng: number;
  };
  imageUrl: string;
  timestamp: string;
}

export default function UnverifiedBumpsList({ token }: { token: string }) {
  const [bumps, setBumps] = useState<UnverifiedBump[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBumps = async () => {
      try {
        const data = await adminService.getUnverifiedBumps(token);
        setBumps(data);
      } catch (err) {
        setError('Failed to fetch unverified bumps');
      } finally {
        setLoading(false);
      }
    };
    fetchBumps();
  }, [token]);

  const handleVerify = async (id: string) => {
    try {
      await adminService.verifyBump(id, token);
      setBumps(bumps.filter(bump => bump.id !== id));
    } catch (err) {
      setError('Failed to verify bump');
    }
  };

  const handleDeny = async (id: string) => {
    try {
      await adminService.deleteBump(id, token);
      setBumps(bumps.filter(bump => bump.id !== id));
    } catch (err) {
      setError('Failed to delete bump');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="grid gap-4">
      {bumps.map((bump) => (
        <div key={bump.id} className="flex gap-4">
          <Image
            src={bump.imageUrl}
            alt="Bump"
            width={96}
            height={96}
            className="object-cover rounded"
          />
          <div className="flex-1 px-4">
            <p>Location: {bump.location.lat}, {bump.location.lng}</p>
            <p>Reported: {new Date(bump.timestamp).toLocaleDateString()}</p>
          </div>
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
      ))}
    </div>
  );
}