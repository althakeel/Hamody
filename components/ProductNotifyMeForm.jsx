'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { Bell, Check, Mail, X } from 'lucide-react';
import { useStorefrontI18n } from '@/lib/useStorefrontI18n';
import PhoneNumberField from '@/components/PhoneNumberField';
import { UAE_PHONE_CODE } from '@/assets/countryCodes';

const CLOSE_AFTER_SEC = 5;

export default function ProductNotifyMeForm({
  productId,
  sku = '',
  defaultEmail = '',
  buttonClassName = '',
}) {
  const { t, isArabic } = useStorefrontI18n();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(defaultEmail || '');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(CLOSE_AFTER_SEC);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const closePopup = () => {
    if (saving) return;
    setOpen(false);
    setError('');
    setDone(false);
    setSecondsLeft(CLOSE_AFTER_SEC);
  };

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !done) return undefined;
    setSecondsLeft(CLOSE_AFTER_SEC);
    const timer = window.setInterval(() => {
      setSecondsLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          setOpen(false);
          setDone(false);
          setError('');
          return CLOSE_AFTER_SEC;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [open, done]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    setError('');
    try {
      setSaving(true);
      await axios.post('/api/stock-notify', {
        productId,
        sku,
        email,
        phone,
        phoneCode: UAE_PHONE_CODE,
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || t('product.notifyNeedContact'));
    } finally {
      setSaving(false);
    }
  };

  const popup = !mounted || !open ? null : createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      onClick={closePopup}
      dir={isArabic ? 'rtl' : 'ltr'}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-[0_20px_50px_rgba(15,23,42,0.22)]"
        onClick={(event) => event.stopPropagation()}
      >
        {done ? (
          <div className="px-6 py-8 text-center">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <Check size={28} strokeWidth={2.5} />
            </span>
            <h2 className="mt-4 text-xl font-semibold text-slate-900">{t('product.notifySuccessTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{t('product.notifySuccess')}</p>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-800">
                {secondsLeft}
              </span>
              <span>{t('product.notifyClosing', { count: secondsLeft })}</span>
            </div>
            <button
              type="button"
              onClick={closePopup}
              className="mt-5 text-sm font-semibold text-slate-500 hover:text-slate-800"
            >
              {t('product.notifyClose')}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-[#E52D27]">
                  <Bell className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">{t('product.notifySubmit')}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-500">{t('product.notifyMeHint')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closePopup}
                disabled={saving}
                className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-40"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-5">
              <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
                <label className="block">
                  <span className="mb-1.5 block text-sm font-semibold text-slate-700">{t('product.notifyEmail')}</span>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      name="notify-email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="name@email.com"
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50/70 ps-10 pe-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-4 focus:ring-[#fde7c2]"
                      autoComplete="email"
                    />
                  </div>
                </label>

                <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  <span className="h-px flex-1 bg-slate-200" />
                  {t('common.or')}
                  <span className="h-px flex-1 bg-slate-200" />
                </div>

                <PhoneNumberField
                  id="notify-phone"
                  label={t('product.notifyPhone')}
                  phone={phone}
                  phoneCode={UAE_PHONE_CODE}
                  onPhoneChange={setPhone}
                  required={false}
                  autoComplete="tel-national"
                  selectClassName="flex h-12 min-w-[88px] items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-800"
                  inputClassName="h-12 min-w-0 flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#f59e0b] focus:bg-white focus:ring-4 focus:ring-[#fde7c2]"
                />

                {error ? <p className="text-xs font-medium text-red-600">{error}</p> : null}
                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 w-full rounded-2xl bg-[#E52D27] text-sm font-semibold text-white shadow-sm hover:bg-[#CC261F] disabled:opacity-60"
                >
                  {saving ? t('common.processing') : t('product.notifySubmit')}
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={buttonClassName || 'h-11 w-full rounded-lg bg-[#E52D27] px-4 text-sm font-semibold text-white hover:bg-[#CC261F]'}
      >
        {t('product.notifySubmit')}
      </button>
      {popup}
    </>
  );
}
