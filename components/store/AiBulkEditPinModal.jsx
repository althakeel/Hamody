'use client';

import { useEffect, useRef, useState } from 'react';

export default function AiBulkEditPinModal({
  open,
  title = 'AI Bulk Edit PIN',
  description = 'Enter the admin PIN to continue. This action can change many products.',
  confirming = false,
  onCancel,
  onConfirm,
}) {
  const inputRef = useRef(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin('');
      setError('');
      setShowHelp(false);
      return undefined;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 40);
    return () => window.clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  const submitPin = async (event) => {
    event.preventDefault();
    const value = String(pin || '').trim();
    if (value.length < 4) {
      setError('Enter the admin PIN');
      return;
    }
    setError('');
    try {
      await onConfirm(value);
    } catch (submitError) {
      setError(submitError?.message || 'That PIN is not correct.');
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-900/50 p-4" onClick={onCancel}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-bulk-pin-title"
        className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="ai-bulk-pin-title" className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>

        <form className="mt-4" onSubmit={submitPin}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, '').slice(0, 8));
              setError('');
            }}
            placeholder="Enter PIN"
            className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-[0.35em] outline-none focus:border-violet-400"
          />
          {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Forgot PIN?
            </button>
            <button
              type="button"
              onClick={() => setShowHelp(true)}
              className="text-xs font-medium text-slate-500 underline-offset-2 hover:text-slate-800 hover:underline"
            >
              Help
            </button>
          </div>

          {showHelp ? (
            <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800">
              Contact IT TEAM
            </p>
          ) : null}

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              disabled={confirming}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={confirming || pin.length < 4}
              className="rounded-lg bg-violet-600 px-3 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {confirming ? 'Checking...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
