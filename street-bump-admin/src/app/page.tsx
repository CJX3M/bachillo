'use client';

import dynamic from 'next/dynamic';
import { initializeApp } from 'firebase/app';
import { firebaseConfig } from '@/firebase/config';

// Initialize Firebase
initializeApp(firebaseConfig);

// Dynamically import components that use Firebase
const AuthComponent = dynamic(
  () => import('../components/AuthComponent'),
  { ssr: false }
);

export default function Home() {
  return (
    <main>
      <AuthComponent />
    </main>
  );
}
