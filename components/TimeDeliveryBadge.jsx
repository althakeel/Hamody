'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  formatCountdown,
  minutesUntilCutoff,
  normalizeTimeBadges,
  resolveTimeBadges,
  timeBadgePageFromPath,
} from '@/lib/timeBadgeSettings';

let cachedSettings = null;
let pending = null;

function loadTimeBadges() {
  if (cachedSettings) return Promise.resolve(cachedSettings);
  if (!pending) {
    pending = import('@/lib/storefrontPublicFetch')
      .then(({ fetchAppearanceSectionsPublic }) => fetchAppearanceSectionsPublic())
      .then((data) => {
        cachedSettings = normalizeTimeBadges(data?.timeBadges);
        return cachedSettings;
      })
      .catch(() => {
        cachedSettings = normalizeTimeBadges();
        return cachedSettings;
      });
  }
  return pending;
}

function LightningIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M9.4 1 3.2 9.1h4.1L6.4 15 12.8 6.6H8.6L9.4 1Z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M7 2h2v5h5v2H9v5H7V9H2V7h5V2Z" />
    </svg>
  );
}

function BadgeIcon({ badge }) {
  if (badge?.logo) return <img src={badge.logo} alt="" className="h-3.5 w-3.5 shrink-0 object-contain" />;
  if (badge?.icon === 'none') return null;
  if (badge?.icon === 'plus') return <PlusIcon />;
  return <LightningIcon />;
}

function ChevronIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-2.5 w-2.5 shrink-0" aria-hidden="true">
      <path fill="currentColor" d="M6 3.2 10.6 8 6 12.8l-1.2-1.1L8.2 8 4.8 4.3 6 3.2Z" />
    </svg>
  );
}

function shapeClass(shape) {
  if (shape === 'square') return 'rounded-none';
  if (shape === 'rounded') return 'rounded-md';
  return 'rounded-full';
}

function fontSizePx(size) {
  const named = { sm: 10, md: 12, lg: 14 };
  const raw = named[size] ?? Number(size);
  const px = Number.isFinite(raw) ? Math.max(8, Math.min(28, Math.round(raw))) : 10;
  return `${px}px`;
}

function textClass(badge) {
  return [
    badge?.fontFamily === 'serif' ? 'font-serif' : 'font-sans',
    badge?.italic ? 'italic' : 'not-italic',
    badge?.uppercase ? 'uppercase' : 'normal-case',
  ].join(' ');
}

function motionClass(motion) {
  if (motion === 'lift') return 'transition duration-200 hover:-translate-y-0.5 hover:shadow-md';
  if (motion === 'brighten') return 'transition duration-200 hover:brightness-110';
  if (motion === 'grow') return 'transition duration-200 origin-left hover:scale-105';
  if (motion === 'glow') return 'transition duration-200 hover:shadow-[0_0_12px_rgba(15,23,42,0.35)]';
  if (motion === 'pulse') return 'time-badge-pulse';
  if (motion === 'float') return 'time-badge-float';
  return '';
}

function BlueTimePill({ text, badge, className = '' }) {
  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center gap-1 px-2 py-1 leading-none tracking-wide shadow-sm ${shapeClass(badge?.shape)} ${textClass(badge)} ${motionClass(badge?.hover)} ${className}`.trim()}
      style={{ backgroundColor: badge?.backgroundColor || '#2f5bff', color: badge?.textColor || '#ffffff', fontWeight: badge?.fontWeight || 800, fontSize: fontSizePx(badge?.fontSize) }}
    >
      <span className="truncate" style={{ color: badge?.textColor || '#ffffff' }}>{text}</span>
      <BadgeIcon badge={badge} />
      {badge?.arrow ? <ChevronIcon /> : null}
    </span>
  );
}

function RepeatStrip({ text, badge, className = '' }) {
  const phrase = String(text || '').trim();
  if (!phrase && !badge?.logo && badge?.icon === 'none') return null;
  const chunk = (key) => (
    <span key={key} className="inline-flex shrink-0 items-center gap-1.5">
      <BadgeIcon badge={badge} />
      {phrase ? <span>{phrase}</span> : null}
    </span>
  );
  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center gap-3 px-3 py-1.5 leading-none shadow-sm ${shapeClass(badge?.shape)} ${textClass(badge)} ${motionClass(badge?.hover)} ${className}`.trim()}
      style={{ backgroundColor: badge?.backgroundColor || '#ddd6fe', color: badge?.textColor || '#5b35d5', fontWeight: badge?.fontWeight || 600, fontSize: fontSizePx(badge?.fontSize) }}
    >
      {chunk('a')}
      {chunk('b')}
    </span>
  );
}

function ExpressTimePill({ prefix, label, badge, className = '' }) {
  const left = String(prefix || '').trim();
  const right = String(label || '').trim();
  if (!left && !right && !badge?.logo) return null;
  return (
    <span className={`inline-flex max-w-full min-w-0 items-stretch overflow-hidden leading-none shadow-sm ${shapeClass(badge?.shape)} ${motionClass(badge?.hover)} ${className}`.trim()} style={{ fontSize: fontSizePx(badge?.fontSize) }}>
      {left || badge?.logo ? (
        <span
          className={`px-2 py-1 ${textClass(badge)}`}
          style={{ backgroundColor: badge?.accentColor || '#ffe14a', color: badge?.accentTextColor || '#111111', fontWeight: badge?.fontWeight || 600, fontSize: fontSizePx(badge?.fontSize) }}
        >
          {badge?.icon && badge.icon !== 'none' ? <span className="me-1 inline-flex align-[-2px]"><BadgeIcon badge={{ ...badge, logo: '' }} /></span> : null}
          {badge?.logo ? <img src={badge.logo} alt="" className="me-1 inline-block h-3.5 w-3.5 object-contain align-[-2px]" /> : null}
          {left ? <span style={{ color: badge?.accentTextColor || '#111111' }}>{left}</span> : null}
        </span>
      ) : null}
      {right ? (
        <span
          className={`px-2 py-1 ${textClass(badge)}`}
          style={{ backgroundColor: badge?.backgroundColor || '#111111', color: badge?.textColor || '#ffffff', fontWeight: badge?.fontWeight || 600, fontSize: fontSizePx(badge?.fontSize) }}
        >
          <span style={{ color: badge?.textColor || '#ffffff' }}>{right}</span>
        </span>
      ) : null}
    </span>
  );
}

export function DeliveryTimeMark({ badge, arabic = false, className = '', hover = 'none' }) {
  const ticking = badge?.style === 'countdown';
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (!ticking) return undefined;
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, [ticking]);

  if (!badge) return null;
  const painted = { ...badge, hover: badge.animation || hover };

  if (badge.style === 'countdown') {
    const left = minutesUntilCutoff(badge.cutoff, now);
    if (left <= 0 && badge.rollover) {
      return <DeliveryTimeMark badge={badge.rollover} arabic={arabic} className={className} hover={hover} />;
    }
    const text = [badge.prefix, formatCountdown(Math.max(left, 0), arabic)].filter(Boolean).join(' ');
    return <BlueTimePill text={text} badge={painted} className={className} />;
  }

  if (badge.style === 'repeat') {
    const text = [badge.prefix, badge.label].filter(Boolean).join(' ');
    if (!text && !badge.logo && badge.icon === 'none') return null;
    return <RepeatStrip text={text} badge={painted} className={className} />;
  }

  if (badge.style === 'express') {
    if (!String(badge.prefix || '').trim() && !String(badge.label || '').trim()) return null;
    return <ExpressTimePill prefix={badge.prefix || ''} label={badge.label || ''} badge={painted} className={className} />;
  }

  const text = [badge.prefix, badge.label].filter(Boolean).join(' ');
  if (!text) return null;
  return <BlueTimePill text={text} badge={painted} className={className} />;
}

export default function TimeDeliveryBadge({ productId, arabic = false, className = '', page = '' }) {
  const pathname = usePathname();
  const [settings, setSettings] = useState(cachedSettings);

  useEffect(() => {
    let mounted = true;
    loadTimeBadges().then((next) => {
      if (mounted) setSettings(next);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const places = normalizeTimeBadges(settings).placements;
  const surface = page === 'productPage' ? 'productPage' : timeBadgePageFromPath(pathname);
  if (surface === 'productPage') {
    if (!places.productPage) return null;
  } else if (!places.allCards && !places.pages.includes(surface)) {
    return null;
  }

  const config = normalizeTimeBadges(settings);
  const badges = resolveTimeBadges(productId, settings, { arabic });
  if (!badges.length) return null;
  const shown = config.common.rotate ? badges : badges.slice(0, 1);

  return (
    <RotatingBadges
      badges={shown}
      seconds={config.common.rotateSeconds}
      hover={config.common.hover}
      arabic={arabic}
      className={className}
    />
  );
}

function RotatingBadges({ badges, seconds = 3, arabic, className = '', hover = 'none' }) {
  const [index, setIndex] = useState(0);
  const [shown, setShown] = useState(true);
  const many = badges.length > 1;
  const wait = Math.max(1, Number(seconds) || 3) * 1000;

  useEffect(() => {
    setIndex(0);
    setShown(true);
  }, [badges.length]);

  useEffect(() => {
    if (!many) return undefined;
    let reveal;
    const timer = setInterval(() => {
      setShown(false);
      clearTimeout(reveal);
      reveal = setTimeout(() => {
        setIndex((current) => (current + 1) % badges.length);
        setShown(true);
      }, 280);
    }, wait);
    return () => {
      clearInterval(timer);
      clearTimeout(reveal);
    };
  }, [many, badges.length, wait]);

  const badge = badges[Math.min(index, badges.length - 1)];
  return (
    <span
      className={`inline-flex min-w-0 max-w-full ${className}`.trim()}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 280ms ease, transform 280ms ease',
      }}
    >
      <DeliveryTimeMark key={`${badge.style}-${badge.prefix}-${badge.label}-${index}`} badge={badge} arabic={arabic} hover={hover} />
    </span>
  );
}
