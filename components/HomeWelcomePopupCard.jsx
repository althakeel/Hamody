'use client';

import { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';
import { homePopupRadiusClass, homeWelcomePopupCopy } from '@/lib/homeWelcomePopup';

function GiftMark() {
  return (
    <div className="relative mx-auto h-16 w-16" aria-hidden="true">
      <div className="absolute left-1/2 top-3 h-11 w-12 -translate-x-1/2 rounded-md bg-amber-400 shadow-sm" />
      <div className="absolute left-1/2 top-3 h-11 w-2.5 -translate-x-1/2 bg-red-600" />
      <div className="absolute left-1/2 top-7 h-2.5 w-12 -translate-x-1/2 bg-red-600" />
      <div className="absolute left-1/2 top-1 h-4 w-5 -translate-x-1/2 rounded-t-full border-t-4 border-red-600" />
      <span className="absolute -left-1 top-1 text-emerald-400">+</span>
      <span className="absolute -right-1 top-6 text-emerald-400">+</span>
      <span className="absolute right-0 top-0 text-xs text-amber-300">✦</span>
    </div>
  );
}

function IconBlock({ copy }) {
  if (!copy.showGift) return null;
  if (copy.iconUrl) {
    return <img src={copy.iconUrl} alt="" className="mx-auto h-16 w-16 object-contain" />;
  }
  return <GiftMark />;
}

function ImageSlot({ src, className }) {
  if (src) {
    return <img src={src} alt="" className={className} />;
  }
  return (
    <div className={`flex items-center justify-center bg-slate-100 text-xs font-semibold text-slate-400 ${className}`}>
      Upload a main image
    </div>
  );
}

function CouponRow({ copy, preview, isArabic, onCopy }) {
  const [copied, setCopied] = useState(false);
  const code = String(copy.couponCode || '').trim() || (preview ? 'SAVE10' : '');
  if (!code) return null;
  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{copy.couponLabel}</p>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(String(copy.couponCode || code).trim());
            setCopied(true);
            if (!preview) onCopy?.();
            window.setTimeout(() => setCopied(false), 1500);
          } catch {
            // Clipboard can be blocked; the code stays visible.
          }
        }}
        className="mx-auto mt-2 flex h-12 w-full items-center justify-between rounded-xl border border-dashed bg-white px-4"
        style={{ borderColor: copy.accentColor }}
      >
        <span className="font-black tracking-[0.2em]" style={{ color: copy.textColor }}>{code}</span>
        <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: copy.accentColor }}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? (isArabic ? 'تم النسخ' : 'Copied') : (isArabic ? 'نسخ' : 'Copy')}
        </span>
      </button>
    </div>
  );
}

function OfferCopy({ copy, email, onEmailChange, onSubmit, onClose, onCopy, onButtonClick, submitting, success, preview, isArabic }) {
  const followLink = !copy.showEmail && Boolean(copy.buttonLink);
  const blocks = Array.isArray(copy.blocks) ? copy.blocks : [];

  if (success) {
    return (
      <div className="px-6 pb-6 pt-5 text-center">
        <p className="rounded-xl bg-white px-4 py-3 text-sm font-semibold" style={{ color: copy.textColor }}>
          {copy.successText}
        </p>
      </div>
    );
  }

  return (
    <form
      className="px-6 pb-6 pt-5 text-center"
      onSubmit={(event) => {
        event.preventDefault();
        if (preview) return;
        onButtonClick?.();
        if (copy.showEmail) onSubmit?.();
        else if (followLink) window.location.assign(copy.buttonLink);
        else onClose?.();
      }}
    >
      {blocks.map((block) => {
        if (!block.enabled) return null;
        if (block.type === 'gift') return <IconBlock key={block.type} copy={copy} />;
        if (block.type === 'heading') {
          return (
            <h2 key={block.type} className="mt-2 text-[26px] font-extrabold leading-tight tracking-tight" style={{ color: copy.textColor }}>
              {copy.heading}
            </h2>
          );
        }
        if (block.type === 'offer') {
          return (
            <div key={block.type}>
              <div className="mx-auto mt-2 h-0.5 w-16" style={{ backgroundColor: copy.accentColor }} />
              <p className="mt-4 text-[28px] font-extrabold leading-tight" style={{ color: copy.textColor }}>
                {copy.offerLead}{' '}
                <span style={{ color: copy.accentColor }}>{copy.offerHighlight}</span>
                <br />
                {copy.offerTail}
              </p>
            </div>
          );
        }
        if (block.type === 'body') {
          return <p key={block.type} className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">{copy.body}</p>;
        }
        if (block.type === 'coupon') {
          return <CouponRow key={block.type} copy={copy} preview={preview} isArabic={isArabic} onCopy={onCopy} />;
        }
        if (block.type === 'email') {
          return (
            <input
              key={block.type}
              type="email"
              required={!preview}
              value={email}
              onChange={(event) => onEmailChange?.(event.target.value)}
              placeholder={copy.emailPlaceholder}
              className="mt-4 h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none focus:border-slate-400"
              style={{ color: copy.textColor }}
            />
          );
        }
        if (block.type === 'button') {
          if (followLink && !preview) {
            return (
              <a
                key={block.type}
                href={copy.buttonLink}
                onClick={() => onButtonClick?.()}
                className="mt-3 flex h-12 w-full items-center justify-center rounded-xl text-sm font-bold"
                style={{ backgroundColor: copy.accentColor, color: copy.buttonTextColor }}
              >
                {copy.buttonText}
              </a>
            );
          }
          return (
            <button
              key={block.type}
              type="submit"
              disabled={submitting}
              className="mt-3 h-12 w-full rounded-xl text-sm font-bold disabled:opacity-70"
              style={{ backgroundColor: copy.accentColor, color: copy.buttonTextColor }}
            >
              {submitting ? '...' : copy.buttonText}
            </button>
          );
        }
        return null;
      })}
    </form>
  );
}

export default function HomeWelcomePopupCard({
  settings,
  isArabic = false,
  email = '',
  onEmailChange,
  onSubmit,
  onClose,
  onCopy,
  onButtonClick,
  submitting = false,
  success = false,
  preview = false,
}) {
  const copy = homeWelcomePopupCopy(settings, isArabic);
  const radius = homePopupRadiusClass(copy.corner);
  const formProps = { copy, email, onEmailChange, onSubmit, onClose, onCopy, onButtonClick, submitting, success, preview, isArabic };

  const closeButton = (
    <button
      type="button"
      onClick={onClose}
      className="absolute end-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow hover:text-slate-800"
      aria-label="Close"
    >
      <X size={16} />
    </button>
  );

  const widthStyle = { maxWidth: `${copy.maxWidth}px`, width: '100%' };

  if (copy.layout === 'image-only') {
    const picture = (
      <ImageSlot src={copy.imageUrl} className="max-h-[70vh] min-h-40 w-full object-contain" />
    );
    return (
      <div className={`relative overflow-hidden bg-white shadow-2xl ${radius}`} style={widthStyle} dir={isArabic ? 'rtl' : 'ltr'}>
        {closeButton}
        {copy.buttonLink && !preview ? (
          <a href={copy.buttonLink} onClick={onClose}>{picture}</a>
        ) : picture}
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden shadow-2xl ${radius}`} dir={isArabic ? 'rtl' : 'ltr'} style={{ ...widthStyle, backgroundColor: copy.cardColor }}>
      {closeButton}

      {copy.layout === 'classic' && copy.showHeader ? (
        <div className="flex min-h-[92px] items-center justify-center px-8 py-4" style={{ backgroundColor: copy.headerColor }}>
          {copy.logoUrl ? (
            <img src={copy.logoUrl} alt="" className="max-h-16 max-w-[240px] object-contain" />
          ) : (
            <p className="text-center text-2xl font-black tracking-wide text-white">STORE1920</p>
          )}
        </div>
      ) : null}

      {copy.layout === 'image-top' ? (
        <ImageSlot src={copy.imageUrl} className="h-44 w-full object-cover" />
      ) : null}

      {copy.layout === 'split' ? (
        <div className={`flex min-h-[280px] flex-col sm:flex-row ${copy.imageSide === 'right' ? 'sm:flex-row-reverse' : ''}`}>
          <ImageSlot src={copy.imageUrl} className="min-h-40 w-full object-cover sm:w-[44%]" />
          <div className="min-w-0 flex-1">
            <OfferCopy {...formProps} />
          </div>
        </div>
      ) : (
        <OfferCopy {...formProps} />
      )}
    </div>
  );
}
