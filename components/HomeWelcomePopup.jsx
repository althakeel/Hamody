'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { getLiveHomePopup, popupMatchesPath } from '@/lib/homeWelcomePopup';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import HomeWelcomePopupCard from '@/components/HomeWelcomePopupCard';

const DISMISS_KEY = 'hamody-home-welcome-popup';
const HOUR_MS = 60 * 60 * 1000;
const DISMISS_MS = {
  hour: HOUR_MS,
  twoHours: 2 * HOUR_MS,
  day: 24 * HOUR_MS,
  week: 7 * 24 * HOUR_MS,
};

function dismissedRecently(dismissFor) {
  try {
    if (dismissFor === 'visit') return false;
    if (dismissFor === 'session') return window.sessionStorage.getItem(DISMISS_KEY) === '1';
    const limit = DISMISS_MS[dismissFor] || DISMISS_MS.day;
    const at = Number(window.localStorage.getItem(DISMISS_KEY) || 0);
    return Number.isFinite(at) && Date.now() - at < limit;
  } catch {
    return false;
  }
}

function trackPopupEvent(templateId, type) {
  if (!templateId) return;
  fetch('/api/public/home-popup-event', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId, type }),
  }).catch(() => {});
}

function rememberDismiss(dismissFor) {
  try {
    if (dismissFor === 'visit') return;
    if (dismissFor === 'session') {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
      return;
    }
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch {
    // Ignore storage failures.
  }
}

export default function HomeWelcomePopup() {
  const pathname = usePathname();
  const { language } = useStorefrontI18n();
  const isArabic = language === 'ar';
  const [settings, setSettings] = useState(() => getLiveHomePopup({}));
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    import('@/lib/storefrontPublicFetch')
      .then(({ fetchAppearanceSectionsPublic }) => fetchAppearanceSectionsPublic())
      .then((data) => {
        if (cancelled) return;
        const next = getLiveHomePopup(data?.homeWelcomePopup);
        setSettings(next);
        if (!next.enabled || !popupMatchesPath(next, pathname) || dismissedRecently(next.dismissFor)) return;
        timer = window.setTimeout(() => {
          if (cancelled) return;
          setOpen(true);
          trackPopupEvent(next.id, 'view');
        }, next.delaySeconds * 1000);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [pathname]);

  const close = () => {
    rememberDismiss(settings.dismissFor);
    setOpen(false);
  };

  const submit = async () => {
    const value = email.trim();
    if (!value) return;
    try {
      setSubmitting(true);
      const response = await fetch('/api/public/email-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: value,
          source: 'home_welcome_popup',
          formStyle: 'welcome',
          heading: settings.heading,
        }),
      });
      if (!response.ok) return;
      setSuccess(true);
      rememberDismiss(settings.dismissFor);
      trackPopupEvent(settings.id, 'email');
    } catch {
      // Keep the form open so the customer can retry.
    } finally {
      setSubmitting(false);
    }
  };

  if (!open || !settings.enabled || !popupMatchesPath(settings, pathname)) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/55 p-4">
      <button type="button" className="absolute inset-0" aria-label="Close offer" onClick={close} />
      <div className="relative z-[81] w-full" style={{ maxWidth: `${settings.maxWidth}px` }}>
        <HomeWelcomePopupCard
          settings={settings}
          isArabic={isArabic}
          email={email}
          onEmailChange={setEmail}
          onSubmit={submit}
          onClose={close}
          onCopy={() => trackPopupEvent(settings.id, 'copy')}
          onButtonClick={() => trackPopupEvent(settings.id, 'click')}
          submitting={submitting}
          success={success}
        />
      </div>
    </div>
  );
}
