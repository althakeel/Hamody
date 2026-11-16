'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  HAMODY_CUSTOMER_SUPPORT_TEL,
  HAMODY_SUPPORT_EMAIL,
  formatCustomerSupportPhoneDisplay,
} from '@/lib/storeContact';
import {
  HAMODY_LEGAL_NAME,
  HAMODY_TRADE_LICENSE_NO,
  HAMODY_BUSINESS_HOURS_EN,
  getRegisteredOfficeSingleLine,
  getFulfilmentAddressSingleLine,
} from '@/lib/businessIdentity';
import Link from 'next/link';

const fieldClass =
  'w-full rounded-xl border border-[#E9D6B5] bg-[#FAF8F3] px-4 py-2.5 text-sm text-[#123D33] placeholder:text-[#9C6E20]/45 focus:border-[#1F5C4A] focus:outline-none focus:ring-2 focus:ring-[#1F5C4A]/25 transition';

export default function ContactUs() {
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ name: '', email: '', topic: 'Question', orderNumber: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  useEffect(() => {
    try {
      const draftRaw = sessionStorage.getItem('productReportDraft');
      if (draftRaw) {
        const draft = JSON.parse(draftRaw);
        const composedMessage = [
          draft?.subject ? `Subject: ${draft.subject}` : '',
          draft?.message || '',
        ].filter(Boolean).join('\n\n');

        setForm((prev) => ({
          ...prev,
          message: composedMessage || prev.message,
        }));
        sessionStorage.removeItem('productReportDraft');
        return;
      }
    } catch {
      // ignore malformed draft
    }

    const subject = searchParams.get('subject');
    const message = searchParams.get('message');
    if (!subject && !message) return;

    setForm((prev) => ({
      ...prev,
      message: [
        subject ? `Subject: ${subject}` : '',
        message || prev.message,
      ].filter(Boolean).join('\n\n'),
    }));
  }, [searchParams]);

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitError('');
    setSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          topic: form.topic,
          orderNumber: form.orderNumber,
          message: form.message,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || 'Could not send your message. Please try again.');
      }
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error?.message || 'Could not send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      {/* Hero banner */}
      <div className="w-full bg-[#1F5C4A] py-16 px-4 flex flex-col items-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E9D6B5] text-[#1F5C4A] shadow-lg">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight drop-shadow">Get in Touch</h1>
        <p className="mt-2 text-white/80 text-sm sm:text-base max-w-md">
          Questions, complaints, and return requests — no account required. We reply during {HAMODY_BUSINESS_HOURS_EN}.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">

          {/* Left — info cards */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.7A2 2 0 012.18 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.15a16 16 0 006.94 6.94l1.52-1.52a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
                  </svg>
                ),
                label: 'Customer Support',
                value: formatCustomerSupportPhoneDisplay(HAMODY_CUSTOMER_SUPPORT_TEL),
                href: HAMODY_CUSTOMER_SUPPORT_TEL,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                ),
                label: 'Email Us',
                value: HAMODY_SUPPORT_EMAIL,
                href: null,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                ),
                label: 'Business Hours',
                value: HAMODY_BUSINESS_HOURS_EN,
                href: null,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                ),
                label: 'Registered office',
                value: getRegisteredOfficeSingleLine(),
                href: null,
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                ),
                label: 'Fulfilment and returns',
                value: getFulfilmentAddressSingleLine(),
                href: null,
              },
            ].map(({ icon, label, value, href }) => (
              <div key={label} className="flex items-start gap-4 rounded-2xl border border-[#E9D6B5]/80 bg-white px-5 py-4 shadow-sm transition-shadow hover:shadow-md">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#E9D6B5] text-[#1F5C4A]">
                  {icon}
                </div>
                <div className="min-w-0">
                  <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-[#9C6E20]">{label}</p>
                  {href ? (
                    <a href={href} className="break-all text-sm font-medium text-[#123D33] hover:text-[#1F5C4A] hover:underline">
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-medium text-[#123D33]">{value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Business info card */}
            <div className="space-y-2 rounded-2xl border border-[#E9D6B5]/80 bg-[#FAF8F3] px-5 py-4 text-sm text-[#123D33]/80">
              <p className="font-semibold text-[#123D33]">hamody.com</p>
              <p>
                Operated by <strong>{HAMODY_LEGAL_NAME}</strong> (UAE Trade License {HAMODY_TRADE_LICENSE_NO}).
              </p>
              <p>
                Full company details:{' '}
                <Link href="/business-information" className="font-semibold text-[#9C6E20] hover:text-[#123D33] hover:underline">
                  Business Information
                </Link>
              </p>
              <p>We typically reply the next business day. We are not a 24/7 desk.</p>
              <p>
                Guest return or complaint:{' '}
                <Link href="/support" className="font-semibold text-[#9C6E20] hover:text-[#123D33] hover:underline">
                  Support form
                </Link>
                {' '}or this page. Signed-in customers can also use{' '}
                <Link href="/return-request" className="font-semibold text-[#9C6E20] hover:text-[#123D33] hover:underline">
                  Return Request
                </Link>.
              </p>
            </div>
          </div>

          {/* Right — form */}
          <div className="lg:col-span-3">
            <div className="overflow-hidden rounded-2xl border border-[#E9D6B5]/80 bg-white shadow-sm">
              <div className="h-1 w-full bg-[#C9963B]" />

              <div className="p-7">
                {submitted ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#E9D6B5]">
                      <svg viewBox="0 0 24 24" fill="none" stroke="#1F5C4A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Message Sent!</h3>
                      <p className="text-sm text-gray-500 mt-1">Thanks. We&apos;ll reply during business hours, usually the next business day.</p>
                    </div>
                    <button
                      onClick={() => { setSubmitted(false); setForm({ name: '', email: '', topic: 'Question', orderNumber: '', message: '' }); }}
                      className="mt-2 rounded-xl bg-[#1F5C4A] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#123D33]"
                    >
                      Send Another Message
                    </button>
                  </div>
                ) : (
                  <>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">Send us a message</h2>
                    <p className="text-sm text-gray-400 mb-6">Guests can submit a complaint or return request here. Include your order number if you have one.</p>

                    <form onSubmit={handleSubmit} className="space-y-5">
                      {submitError ? (
                        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
                          {submitError}
                        </p>
                      ) : null}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Topic</label>
                          <select
                            name="topic"
                            value={form.topic}
                            onChange={handleChange}
                            className={fieldClass}
                          >
                            <option value="Question">Question</option>
                            <option value="Complaint">Complaint</option>
                            <option value="Return Request">Return request</option>
                            <option value="Order Issue">Order issue</option>
                            <option value="Other">Other</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Order number (optional)</label>
                          <input
                            type="text"
                            name="orderNumber"
                            value={form.orderNumber}
                            onChange={handleChange}
                            placeholder="If this is a return or complaint"
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Full Name</label>
                          <input
                            type="text"
                            name="name"
                            value={form.name}
                            onChange={handleChange}
                            required
                            placeholder="John Doe"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Email Address</label>
                          <input
                            type="email"
                            name="email"
                            value={form.email}
                            onChange={handleChange}
                            required
                            placeholder="john@example.com"
                            className={fieldClass}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Message</label>
                        <textarea
                          name="message"
                          value={form.message}
                          onChange={handleChange}
                          required
                          rows={6}
                          placeholder="Describe your issue or question in detail..."
                          className={`${fieldClass} resize-none`}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F5C4A] py-3 text-sm font-bold text-white shadow-[0_4px_14px_rgba(31,92,74,0.35)] transition hover:bg-[#123D33] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                        </svg>
                        {submitting ? 'Sending…' : 'Send Message'}
                      </button>
                    </form>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

