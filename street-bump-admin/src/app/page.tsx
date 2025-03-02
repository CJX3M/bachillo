'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { signIn, loading } = useAuth();

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
        {loading ? (
          <p>Cargando...</p>
        ) : (
          <button
            onClick={signIn}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Iniciar Sesión con Google
          </button>
        )}
      </div>
    </main>
  );
}
