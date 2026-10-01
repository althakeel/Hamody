'use client';

import { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import { validatePasswordStrength } from '@/lib/passwordPolicy';
import AccountBlockDialog from '@/components/store/AccountBlockDialog';

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200';

const KIND_LABEL = {
  team: 'Team member',
  customer: 'Customer',
  account: 'Account',
};

export default function SuperAdminPasswordReset({ initialQuery = '' }) {
  const { getToken } = useAuth();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blockingUid, setBlockingUid] = useState('');
  const [pendingBlock, setPendingBlock] = useState(null);

  useEffect(() => {
    setQuery(initialQuery || '');
    setSelected(null);
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
  }, [initialQuery]);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 3) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSearching(true);
        const token = await getToken();
        const { data } = await axios.get('/api/store/users/reset-password', {
          params: { q: term },
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        setResults(Array.isArray(data?.users) ? data.users : []);
      } catch (error) {
        if (cancelled) return;
        setResults([]);
        toast.error(error?.response?.data?.error || 'Could not search accounts');
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, getToken]);

  const setBlocked = async (user, blocked) => {
    try {
      setBlockingUid(user.uid);
      const token = await getToken();
      const { data } = await axios.post(
        '/api/store/users/block',
        { uid: user.uid, email: user.email, blocked },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setResults((current) => current.map((item) => (
        item.uid === user.uid ? { ...item, blocked } : item
      )));
      if (selected?.uid === user.uid) setSelected((current) => ({ ...current, blocked }));
      toast.success(data?.message || (blocked ? 'Account blocked' : 'Account unblocked'));
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not update this account');
    } finally {
      setBlockingUid('');
      setPendingBlock(null);
    }
  };

  const resetPassword = async () => {
    if (!selected?.uid) {
      toast.error('Choose an account first');
      return;
    }
    const policy = validatePasswordStrength(password);
    if (!policy.ok) {
      toast.error(policy.message);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setSaving(true);
      const token = await getToken();
      const { data } = await axios.post(
        '/api/store/users/reset-password',
        { uid: selected.uid, accountEmail: selected.email, password },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      setPassword('');
      setConfirmPassword('');
      toast.success(data?.message || 'Password updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Could not reset password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6" dir="ltr" lang="en">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h3 className="text-base font-semibold text-slate-900">Reset a password</h3>
        <p className="mt-1 text-sm text-slate-500">
          Search a team member or customer, then set a new password. They will be signed out and must use the new password. Team members cannot open this page.
        </p>
      </div>

      <label className="mb-1.5 block text-sm font-medium text-slate-700" htmlFor="admin-password-search">
        Name or email
      </label>
      <input
        id="admin-password-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search team members and customers"
        className={inputClass}
        autoComplete="off"
      />

      <div className="mt-3 space-y-2">
        {searching ? <p className="text-sm text-slate-500">Searching...</p> : null}
        {!searching && query.trim().length >= 3 && results.length === 0 ? (
          <p className="text-sm text-slate-500">No matching accounts.</p>
        ) : null}
        {results.map((user) => {
          const active = selected?.uid === user.uid;
          return (
            <div
              key={user.uid}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 ${
                active ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
              }`}
            >
              <button type="button" onClick={() => setSelected(user)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-semibold text-slate-900">{user.name}</span>
                <span className="block truncate text-xs text-slate-500">{user.email}</span>
              </button>
              <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                {user.blocked ? 'Blocked' : (KIND_LABEL[user.kind] || 'Account')}
              </span>
              <button
                type="button"
                onClick={() => setPendingBlock({ user, blocked: !user.blocked })}
                disabled={blockingUid === user.uid}
                className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:opacity-60 ${
                  user.blocked
                    ? 'border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50'
                    : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
                }`}
              >
                {blockingUid === user.uid ? 'Saving...' : (user.blocked ? 'Unblock' : 'Block')}
              </button>
            </div>
          );
        })}
      </div>

      {selected ? (
        <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
          <p className="text-sm text-slate-700">
            New password for <span className="font-semibold">{selected.email}</span>
          </p>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="New password"
              className={`${inputClass} pe-11`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'View password'}
              className="absolute inset-y-0 end-0 inline-flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              className={`${inputClass} pe-11`}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? 'Hide password' : 'View password'}
              className="absolute inset-y-0 end-0 inline-flex w-11 items-center justify-center text-slate-500 hover:text-slate-800"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <p className="text-xs text-slate-500">At least 8 characters, with an uppercase letter, a lowercase letter, a number, and a special character.</p>
          <button
            type="button"
            onClick={resetPassword}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
          >
            <KeyRound size={16} />
            {saving ? 'Updating...' : 'Reset password'}
          </button>
        </div>
      ) : null}
    </section>
    <AccountBlockDialog
      email={pendingBlock?.user?.email || pendingBlock?.user?.name || ''}
      blocked={Boolean(pendingBlock?.blocked)}
      busy={Boolean(blockingUid)}
      onCancel={() => { if (!blockingUid) setPendingBlock(null); }}
      onConfirm={() => { if (pendingBlock?.user) void setBlocked(pendingBlock.user, pendingBlock.blocked); }}
    />
    </>
  );
}
