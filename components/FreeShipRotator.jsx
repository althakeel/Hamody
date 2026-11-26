'use client';

import { Truck } from 'lucide-react';

function FreeShipLine({ label, iconSize, textClass, frame }) {
  return (
    <span
      className={`inline-flex max-w-full min-w-0 items-center justify-center ${textClass}`}
      style={{ height: frame }}
    >
      <Truck size={iconSize} strokeWidth={2.4} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function FreeShipRotator({ label, labels, compact = false }) {
  const lines = (labels?.length ? labels : [label]).filter(Boolean);
  const frame = compact ? 18 : 22;
  const iconSize = compact ? 11 : 14;
  const textClass = compact ? 'gap-1 px-1.5 text-[11px]' : 'gap-1.5 px-2 text-[12px]';
  const line = (text, key) => (
    <FreeShipLine key={key} label={text} iconSize={iconSize} textClass={textClass} frame={frame} />
  );

  if (lines.length < 2) {
    return (
      <span className="inline-flex max-w-full min-w-0 items-center overflow-hidden rounded-none bg-[#C8F404] text-[11px] font-bold leading-none tracking-tight text-[#111111] antialiased">
        {line(lines[0], 'static')}
      </span>
    );
  }

  return (
    <span
      className="relative inline-flex max-w-full min-w-0 overflow-hidden rounded-none bg-[#C8F404] text-[11px] font-bold leading-none tracking-tight text-[#111111] antialiased"
      style={{ height: frame, minHeight: frame, maxHeight: frame }}
    >
      <span className="invisible grid" aria-hidden="true">
        {lines.map((text, index) => (
          <span key={`size-${index}`} className="col-start-1 row-start-1">
            {line(text, `size-${index}`)}
          </span>
        ))}
      </span>
      <span
        className="absolute inset-x-0 top-0 flex flex-col motion-reduce:animate-none"
        style={{ '--free-ship-frame': `${frame}px`, animation: 'free-ship-rotate 5s infinite' }}
        aria-hidden="true"
      >
        {lines.map((text, index) => line(text, `a-${index}`))}
      </span>
      <span
        className="absolute inset-x-0 top-0 flex flex-col motion-reduce:hidden"
        style={{ '--free-ship-frame': `${frame}px`, animation: 'free-ship-rotate-dupe 5s infinite' }}
        aria-hidden="true"
      >
        {lines.map((text, index) => line(text, `b-${index}`))}
      </span>
      <span className="sr-only">{lines.join(', ')}</span>
    </span>
  );
}
