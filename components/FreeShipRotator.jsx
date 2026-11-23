'use client';

import { Truck } from 'lucide-react';

function FreeShipLine({ label, iconSize, textClass, frame }) {
  return (
    <span
      className={`inline-flex items-center justify-center whitespace-nowrap ${textClass}`}
      style={{ height: frame }}
    >
      <Truck size={iconSize} strokeWidth={2.25} aria-hidden="true" className="shrink-0" />
      <span className="truncate">{label}</span>
    </span>
  );
}

export default function FreeShipRotator({ label, labels, compact = false }) {
  const lines = (labels?.length ? labels : [label]).filter(Boolean);
  const frame = compact ? 14 : 22;
  const iconSize = compact ? 10 : 14;
  const textClass = compact ? 'gap-0.5 px-1 text-[9px]' : 'gap-1.5 px-2.5 text-[12px]';
  const line = (text, key) => (
    <FreeShipLine key={key} label={text} iconSize={iconSize} textClass={textClass} frame={frame} />
  );

  if (lines.length < 2) {
    return (
      <span className={`inline-flex shrink-0 items-center rounded-full bg-[#C8F404] font-semibold leading-none text-[#05090D] ${compact ? 'max-w-[6.5rem]' : ''}`}>
        {line(lines[0], 'static')}
      </span>
    );
  }

  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-full bg-[#C8F404] font-semibold leading-none text-[#05090D] ${compact ? 'max-w-[6.5rem]' : 'max-w-full'}`}
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
