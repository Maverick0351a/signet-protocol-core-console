'use client';
import { useEffect } from 'react';

export default function HydratedMarker() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-hydrated', 'true');
    }
  }, []);
  return null;
}
