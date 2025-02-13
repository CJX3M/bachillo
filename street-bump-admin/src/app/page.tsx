'use client';

import { useState, useEffect } from 'react';
import UnverifiedBumpsList from '@/components/UnverifiedBumpsList';

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // TODO: Implement proper authentication
    const savedToken = localStorage.getItem('adminToken');
    setToken(savedToken);
  }, []);

  if (!token) return <div>Please log in to access admin panel</div>;

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Bump Verification Dashboard</h1>
      <UnverifiedBumpsList token={token} />
    </div>
  );
}
