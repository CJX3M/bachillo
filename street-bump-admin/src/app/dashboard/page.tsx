'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import UnverifiedBumpsList from '@/components/UnverifiedBumpsList';
import FixedBumpsList from '@/components/FixedBumpsList';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) return null;

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reportes Pendientes</h1>
      </header>

      <UnverifiedBumpsList />

      <h2 className="text-xl font-bold mt-10 mb-4">Atendidos</h2>
      <FixedBumpsList />
    </div>
  );
}
