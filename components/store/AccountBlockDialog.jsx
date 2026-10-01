'use client';

import { ShieldBan, ShieldCheck } from 'lucide-react';

export default function AccountBlockDialog({
  email = '',
  blocked = true,
  busy = false,
  onCancel,
  onConfirm,
}) {
  if (!email) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-block-title"
      dir="ltr"
      lang="en"
    >
      <button type="button" aria-label="Close" className="absolute inset-0" onClick={busy ? undefined : onCancel} />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-left shadow-xl">
        <div className="flex items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${blocked ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {blocked ? <ShieldBan size={18} /> : <ShieldCheck size={18} />}
          </span>
          <div className="min-w-0">
            <h3 id="account-block-title" className="text-lg font-semibold text-slate-900">
              {blocked ? 'Block this account?' : 'Unblock this account?'}
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {blocked ? 'Block' : 'Unblock'}{' '}
              <span className="font-semibold text-slate-900">{email}</span>
              {blocked
                ? '. They will not be able to sign in until you unblock them.'
                : '. They will be able to sign in again.'}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 ${
              blocked ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {busy ? 'Saving...' : (blocked ? 'Yes, block' : 'Yes, unblock')}
          </button>
        </div>
      </div>
    </div>
  );
}
