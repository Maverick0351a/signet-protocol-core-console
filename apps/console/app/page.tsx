import { Suspense } from 'react';
// Ensure no leading/trailing whitespace in import path
import HomeClient from './pageClient';

export default function Home() {
  return (
    <Suspense fallback={<main className="p-6 text-sm text-neutral-400">Loading...</main>}>
      <HomeClient />
    </Suspense>
  );
}

// Server component wrapper providing required Suspense boundary for useSearchParams.
