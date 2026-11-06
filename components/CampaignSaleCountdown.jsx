'use client';

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';

/** 11.11.2026 11:59 PM Asia/Dubai (UTC+4) */
const TARGET_MS = Date.parse('2026-11-11T23:59:00+04:00');

function getParts(nowMs) {
  const diff = Math.max(0, TARGET_MS - nowMs);
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    ended: diff <= 0,
  };
}

function Unit({ value, label, compact = false }) {
  return (
    <div
      className={`text-center ${
        compact
          ? 'min-w-[3.1rem] rounded-xl border border-white/15 bg-white/10 px-2 py-1.5'
          : 'min-w-[4.25rem] rounded-2xl border border-white/15 bg-white/10 px-3 py-2 sm:min-w-[5rem] sm:px-4 sm:py-3'
      }`}
    >
      <p className={`font-bold tabular-nums tracking-tight text-white ${compact ? 'text-base' : 'text-xl sm:text-3xl'}`}>
        {String(value).padStart(2, '0')}
      </p>
      <p className={`font-semibold uppercase text-[#d4af37] ${compact ? 'mt-0.5 text-[9px] tracking-[0.12em]' : 'mt-0.5 text-[10px] tracking-[0.16em] sm:text-[11px]'}`}>
        {label}
      </p>
    </div>
  );
}

export default function CampaignSaleCountdown({
  isArabic = false,
  className = '',
  compact = false,
  sticky = false,
  side = 'right',
}) {
  const [now, setNow] = useState(() => Date.now());
  const [dismissed, setDismissed] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const parts = useMemo(() => getParts(now), [now]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!sticky || typeof window === 'undefined') return undefined;
    try {
      if (window.sessionStorage.getItem('campaign-1111-countdown-dismissed') === '1') {
        setDismissed(true);
      }
    } catch {
      // ignore storage errors
    }
    return undefined;
  }, [sticky]);

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem('campaign-1111-countdown-dismissed', '1');
    } catch {
      // ignore
    }
  };

  if (dismissed) return null;

  if (parts.ended) {
    if (sticky) {
      return (
        <aside
          className={`fixed bottom-24 z-40 max-w-[11.5rem] rounded-2xl border border-[#d4af37]/40 bg-[#0b1220] p-3 shadow-2xl ${
            side === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4'
          } ${className}`.trim()}
        >
          <p className="text-xs font-semibold text-[#d4af37]">
            {isArabic ? 'انتهى عدّاد 11.11' : '11.11 ended'}
          </p>
          <p className="mt-1 text-[11px] text-slate-300">
            {isArabic ? 'تسوّق العروض المتبقية' : 'Shop remaining deals'}
          </p>
        </aside>
      );
    }
    return (
      <div className={`rounded-2xl border border-[#d4af37]/35 bg-[#0b1220] px-4 py-3 text-center ${className}`.trim()}>
        <p className="text-sm font-semibold text-[#d4af37]">
          {isArabic ? 'انتهى عدّاد 11.11 — تسوّق العروض المتبقية' : '11.11 countdown ended — shop remaining deals'}
        </p>
      </div>
    );
  }

  if (sticky) {
    const sideClass = side === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4';
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className={`fixed bottom-24 z-40 rounded-full border border-[#d4af37]/50 bg-[#0b1220] px-3 py-2 text-xs font-bold text-[#d4af37] shadow-2xl ${sideClass}`}
          aria-label={isArabic ? 'إظهار العدّ التنازلي' : 'Show countdown'}
        >
          11.11
        </button>
      );
    }

    return (
      <aside
        className={`fixed bottom-24 z-40 w-[9.75rem] overflow-hidden rounded-2xl border border-white/15 bg-[#0b1220] p-3 shadow-[0_18px_50px_-18px_rgba(0,0,0,0.65)] sm:w-[10.5rem] ${sideClass} ${className}`.trim()}
        style={{ background: 'linear-gradient(160deg, #0b1220 0%, #1e293b 70%, #0f172a 100%)' }}
        aria-live="polite"
      >
        <div className="mb-2 flex items-start justify-between gap-1">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#d4af37]">
              {isArabic ? 'عدّاد 11.11' : '11.11'}
            </p>
            <p className="mt-0.5 text-[10px] leading-snug text-slate-300">
              {isArabic ? 'ينتهي 11 نوفمبر · 11:59 م' : 'Ends 11 Nov · 11:59 PM'}
            </p>
          </div>
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={isArabic ? 'تصغير' : 'Minimize'}
              title={isArabic ? 'تصغير' : 'Minimize'}
            >
              <span className="block h-0.5 w-3 rounded bg-current" />
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-md p-1 text-slate-400 hover:bg-white/10 hover:text-white"
              aria-label={isArabic ? 'إغلاق' : 'Close'}
            >
              <X size={12} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <Unit value={parts.days} label={isArabic ? 'يوم' : 'Days'} compact />
          <Unit value={parts.hours} label={isArabic ? 'ساعة' : 'Hrs'} compact />
          <Unit value={parts.minutes} label={isArabic ? 'دقيقة' : 'Min'} compact />
          <Unit value={parts.seconds} label={isArabic ? 'ثانية' : 'Sec'} compact />
        </div>
      </aside>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-white/10 bg-[#0b1220] px-4 py-4 sm:px-6 sm:py-5 ${className}`.trim()}
      style={{ background: 'linear-gradient(135deg, #0b1220 0%, #1e293b 60%, #0f172a 100%)' }}
    >
      <div className={`flex flex-col gap-3 ${compact ? 'sm:flex-row sm:items-center sm:justify-between' : 'items-center text-center'}`}>
        <div className={compact ? '' : 'max-w-xl'}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#d4af37]">
            {isArabic ? 'العدّ التنازلي لـ 11.11' : '11.11 countdown'}
          </p>
          <p className={`mt-1 text-sm font-medium text-slate-200 sm:text-base ${compact ? '' : 'mx-auto'}`}>
            {isArabic
              ? 'ينتهي العرض في 11 نوفمبر 2026 · 11:59 مساءً'
              : 'Sale ends 11 Nov 2026 · 11:59 PM'}
          </p>
        </div>
        <div className={`flex flex-wrap gap-2 ${compact ? 'justify-start' : 'justify-center'}`}>
          <Unit value={parts.days} label={isArabic ? 'يوم' : 'Days'} />
          <Unit value={parts.hours} label={isArabic ? 'ساعة' : 'Hours'} />
          <Unit value={parts.minutes} label={isArabic ? 'دقيقة' : 'Mins'} />
          <Unit value={parts.seconds} label={isArabic ? 'ثانية' : 'Secs'} />
        </div>
      </div>
    </div>
  );
}
