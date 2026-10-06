'use client';

import { useEffect, useLayoutEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/lib/useAuth';
import {
  applyStoreDashboardDisplay,
  publishStoreDashboardDisplay,
  readStoredDashboardDisplay,
} from '@/lib/storeDashboardDisplay';

export default function StoreDashboardDisplay() {
  const { user, getToken } = useAuth();

  useLayoutEffect(() => {
    const stored = readStoredDashboardDisplay(user?.uid);
    if (stored) applyStoreDashboardDisplay(stored);
  }, [user?.uid]);

  useEffect(() => {
    const onDisplay = (event) => {
      applyStoreDashboardDisplay(event.detail || {});
    };
    window.addEventListener('store-dashboard-display', onDisplay);
    return () => window.removeEventListener('store-dashboard-display', onDisplay);
  }, []);

  useEffect(() => {
    if (!user?.uid) return undefined;
    let cancelled = false;

    const load = async () => {
      try {
        const token = await getToken();
        if (!token || cancelled) return;
        const { data } = await axios.get('/api/store/profile/update', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        const profile = data?.profile || {};
        if (profile.dashboardTheme == null && profile.dashboardScale == null) return;
        publishStoreDashboardDisplay(user.uid, {
          theme: profile.dashboardTheme,
          scale: profile.dashboardScale,
        });
      } catch {
        // Keep the saved browser setting if the account request fails.
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid, getToken]);

  return null;
}
