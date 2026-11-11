'use client';

import { useEffect, useState } from 'react';

const NAVBAR_APPEARANCE_CACHE_KEY = 'navbarAppearanceCache';
export const DEFAULT_NAVBAR_COLOR = '';

function readCachedNavbarColor() {
  if (typeof window === 'undefined') return DEFAULT_NAVBAR_COLOR;
  try {
    const raw = window.localStorage.getItem(NAVBAR_APPEARANCE_CACHE_KEY);
    if (!raw) return DEFAULT_NAVBAR_COLOR;
    const parsed = JSON.parse(raw);
    const color = String(parsed?.backgroundColor || '').trim();
    return color || DEFAULT_NAVBAR_COLOR;
  } catch {
    return DEFAULT_NAVBAR_COLOR;
  }
}

export function useNavbarColor() {
  const [navbarColor, setNavbarColor] = useState(DEFAULT_NAVBAR_COLOR);

  useEffect(() => {
    setNavbarColor(readCachedNavbarColor());

    let cancelled = false;
    fetch(`/api/store/navbar-menu?t=${Date.now()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        const next = String(data?.backgroundColor || '').trim();
        if (next) setNavbarColor(next);
      })
      .catch(() => {});

    const handleUpdate = (event) => {
      const next = event?.detail?.backgroundColor;
      if (typeof next === 'string' && next.trim()) {
        setNavbarColor(next.trim());
        return;
      }
      setNavbarColor(readCachedNavbarColor());
    };

    window.addEventListener('navbarAppearanceUpdated', handleUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener('navbarAppearanceUpdated', handleUpdate);
    };
  }, []);

  return navbarColor;
}
