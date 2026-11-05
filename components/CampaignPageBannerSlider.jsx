'use client';

import { useEffect, useState } from 'react';

export default function CampaignPageBannerSlider({ slides = [], title = '', className = '' }) {
  const usableSlides = Array.isArray(slides)
    ? slides.filter((slide) => String(slide?.imageUrl || '').trim())
    : [];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [usableSlides.length]);

  useEffect(() => {
    if (usableSlides.length < 2) return undefined;
    const timer = window.setInterval(() => {
      setActiveIndex((index) => (index + 1) % usableSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [usableSlides.length]);

  if (!usableSlides.length) return null;
  const slide = usableSlides[activeIndex] || usableSlides[0];
  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={slide.imageUrl}
      alt={slide.alt || title}
      className="block h-auto max-h-[560px] w-full rounded-xl object-cover"
    />
  );

  return (
    <section className={`relative mx-auto w-full ${className}`.trim()}>
      {slide.linkUrl ? (
        <a href={slide.linkUrl} aria-label={slide.alt || title || 'Open banner link'}>
          {image}
        </a>
      ) : image}
      {usableSlides.length > 1 ? (
        <div className="absolute inset-x-0 bottom-3 flex justify-center gap-2" aria-label="Banner slides">
          {usableSlides.map((item, index) => (
            <button
              key={item.id || `${item.imageUrl}-${index}`}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`h-2.5 w-2.5 rounded-full border border-white shadow ${
                index === activeIndex ? 'bg-white' : 'bg-black/40'
              }`}
              aria-label={`Show banner ${index + 1}`}
              aria-current={index === activeIndex ? 'true' : undefined}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
