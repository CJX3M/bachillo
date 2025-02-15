'use client';

import { useState, useEffect } from 'react';
import { getAuth, signInWithPopup, GoogleAuthProvider, User } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import UnverifiedBumpsList from '@/components/UnverifiedBumpsList';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export default function AdminPage() {
  const [user, setUser] = useState<User>();
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string>();
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setUser(user || undefined);
      if (user) {
        const token = await user.getIdToken();
        setToken(token);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signIn = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Auth error:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-6">Admin Login Required</h1>
        <button
          onClick={signIn}
          className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bump Verification Dashboard</h1>
        <button
          onClick={() => auth.signOut()}
          className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
        >
          Sign Out
        </button>
      </div>
      {token && <UnverifiedBumpsList token={token} />}
    </div>
  );
}
