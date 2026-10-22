'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Clapperboard,
  Loader2,
  Plus,
  Trash2,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import EnableSwitch from '@/components/store/EnableSwitch';
import { normalizeMobileFeatures } from '@/lib/mobileFeatures';
import {
  MAX_SPLASH_SCREENS,
  SPLASH_DISPLAY_MODES,
  SPLASH_DURATION_DEFAULT,
  splashMediaTypeFromFile,
} from '@/lib/mobileSplashScreens';
import { uploadStoreImage } from '@/lib/uploadStoreImage';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.gif,.mp4,.webm,.mov';

function newScreen() {
  return {
    id: typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `splash-${Date.now()}`,
    enabled: true,
    mediaType: 'image',
    url: '',
    durationSeconds: SPLASH_DURATION_DEFAULT,
  };
}

function mediaLabel(type) {
  if (type === 'video') return 'Video';
  if (type === 'gif') return 'GIF';
  return 'Photo';
}

function SplashSequencePreview({ screens, gapSeconds = 0, showCountdown = true, playing = false, onDone }) {
  const playlist = (screens || []).filter((screen) => screen && screen.enabled !== false && screen.url);
  const signature = playlist.map((screen) => `${screen.id}:${screen.url}:${screen.durationSeconds}`).join('|');
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('show');
  const [left, setLeft] = useState(0);
  const screen = playlist[Math.min(index, Math.max(playlist.length - 1, 0))] || null;
  const duration = Math.max(0, Number(screen?.durationSeconds) || 0);
  const gap = Math.max(0, Math.round(Number(gapSeconds) || 0));
  const waitForVideo = playing && screen?.mediaType === 'video' && duration === 0 && phase === 'show';

  useEffect(() => {
    setIndex(0);
    setPhase('show');
  }, [signature, playing]);

  useEffect(() => {
    if (!playing || !screen || waitForVideo) return undefined;
    const seconds = phase === 'gap' ? gap : (duration > 0 ? duration : 3);
    if (seconds <= 0) {
      setPhase('show');
      setIndex((current) => (playlist.length ? (current + 1) % playlist.length : 0));
      return undefined;
    }
    setLeft(seconds);
    const timer = window.setInterval(() => {
      setLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timer);
          if (phase === 'show' && gap > 0) setPhase('gap');
          else if (index + 1 >= playlist.length) onDone?.();
          else {
            setPhase('show');
            setIndex((value) => value + 1);
          }
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, signature, index, phase, duration, gap, waitForVideo, screen, playlist.length]);

  const advance = () => {
    if (!playing) return;
    if (gap > 0 && phase === 'show') {
      setPhase('gap');
      return;
    }
    if (index + 1 >= playlist.length) {
      onDone?.();
      return;
    }
    setPhase('show');
    setIndex((current) => current + 1);
  };

  if (!screen) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-slate-400">
        Upload a photo, GIF, or video
      </div>
    );
  }

  const countdown = playing && showCountdown && left > 0 ? (
    <span className="absolute right-2 top-2 z-10 rounded-full bg-black/70 px-2.5 py-1 text-[11px] font-semibold leading-none text-white">
      {left} sec
    </span>
  ) : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {phase === 'show' && screen.mediaType === 'video' ? (
        <video
          key={screen.url}
          src={screen.url}
          className="absolute inset-0 h-full w-full object-cover"
          muted
          playsInline
          autoPlay
          onEnded={advance}
        />
      ) : null}
      {phase === 'show' && screen.mediaType !== 'video' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={screen.url} src={screen.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {phase === 'gap' ? <div className="absolute inset-0 bg-black" /> : null}
      {countdown}
    </div>
  );
}

function PhoneSplashPreview({ screens, gapSeconds, showCountdown }) {
  const [playing, setPlaying] = useState(false);
  const ready = (screens || []).some((screen) => screen && screen.enabled !== false && screen.url);

  return (
    <>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Phone preview</p>
      <div className="mx-auto mt-3 w-[180px] overflow-hidden rounded-[28px] border border-slate-200 bg-black shadow-sm">
        <div className="relative aspect-[9/19.5]">
          <SplashSequencePreview
            screens={screens}
            gapSeconds={gapSeconds}
            showCountdown={showCountdown}
            playing={playing}
            onDone={() => setPlaying(false)}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!ready || playing}
        onClick={() => setPlaying(true)}
        className="mx-auto mt-3 flex items-center justify-center rounded-full bg-sky-700 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-800 disabled:opacity-50"
      >
        {playing ? 'Playing…' : 'Preview'}
      </button>
    </>
  );
}

function SplashPreview({ screen }) {
  if (!screen?.url) {
    return (
      <div className="absolute inset-0 flex items-center justify-center px-3 text-center text-[11px] text-slate-400">
        Upload a photo, GIF, or video
      </div>
    );
  }
  if (screen.mediaType === 'video') {
    return (
      <video
        key={screen.url}
        src={screen.url}
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        autoPlay
        loop
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={screen.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
  );
}

export default function MobileSplashScreensEditor() {
  const { getToken } = useAuth();
  const [form, setForm] = useState(() => normalizeMobileFeatures().splashScreens);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingIndex, setUploadingIndex] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/mobile-features', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = normalizeMobileFeatures(data?.mobileFeatures).splashScreens;
      setForm(next);
    } catch (error) {
      console.error(error);
      toast.error('Could not load splash screens');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    load();
  }, [load]);

  const screens = form.screens || [];

  const updateScreen = (index, patch) => {
    setForm((prev) => {
      const next = [...(prev.screens || [])];
      next[index] = { ...next[index], ...patch };
      return { ...prev, screens: next };
    });
  };

  const addScreen = () => {
    if (screens.length >= MAX_SPLASH_SCREENS) {
      toast.error(`You can add up to ${MAX_SPLASH_SCREENS} splash screens`);
      return;
    }
    setForm((prev) => ({ ...prev, screens: [...(prev.screens || []), newScreen()] }));
  };

  const removeScreen = (index) => {
    setForm((prev) => ({
      ...prev,
      screens: (prev.screens || []).filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const moveScreen = (index, direction) => {
    setForm((prev) => {
      const list = [...(prev.screens || [])];
      const target = index + direction;
      if (target < 0 || target >= list.length) return prev;
      [list[index], list[target]] = [list[target], list[index]];
      return { ...prev, screens: list };
    });
  };

  const uploadFile = async (index, file) => {
    if (!file) return;
    const mediaType = splashMediaTypeFromFile(file);
    try {
      setUploadingIndex(index);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again to upload');
        return;
      }
      const data = await uploadStoreImage(file, {
        token,
        type: 'splash',
        compress: mediaType === 'image',
      });
      const url = data?.url || data?.imageUrl || '';
      if (!url) throw new Error('No file URL returned');
      updateScreen(index, {
        url,
        mediaType,
        durationSeconds: mediaType === 'video' ? 0 : (screens[index]?.durationSeconds || SPLASH_DURATION_DEFAULT),
      });
      toast.success(`${mediaLabel(mediaType)} uploaded`);
    } catch (error) {
      console.error(error);
      toast.error(error?.message || 'Upload failed');
    } finally {
      setUploadingIndex(null);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const splashScreens = {
        ...form,
        screens: (form.screens || []).map((screen) => ({
          ...screen,
          id: screen.id || newScreen().id,
        })),
      };
      const { data } = await axios.put(
        '/api/store/mobile-features',
        { mobileFeatures: { splashScreens } },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const next = normalizeMobileFeatures(data?.mobileFeatures).splashScreens;
      setForm(next);
      toast.success('Splash screens saved');
    } catch (error) {
      console.error(error);
      toast.error(error?.response?.data?.error || 'Could not save splash screens');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="-mx-3 -mt-3 min-h-full w-full max-w-full overflow-x-hidden bg-white pb-12 sm:-mx-4 sm:-mt-4 lg:-mx-5 lg:-mt-5">
      <div className="border-b border-sky-100 bg-gradient-to-r from-sky-700 via-sky-600 to-cyan-600 px-4 py-6 text-white sm:px-6 lg:px-8 lg:py-8">
        <Link href="/store/mobile-features" className="inline-flex items-center gap-1.5 text-sm text-sky-100 hover:text-white">
          <ArrowLeft size={16} />
          Mobile Features
        </Link>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
          <Clapperboard size={14} />
          Splash screens
        </div>
        <h1 className="mt-3 text-2xl font-bold sm:text-3xl">App splash screens</h1>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-sky-50 sm:text-base">
          These play in order before the home screen. They show when the app is installed, then again by the rule you pick.
          Add a photo, a GIF, or a video. The website does not show them.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-sky-700" />
        </div>
      ) : (
        <div className="grid gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start lg:px-8 lg:py-8">
          <div className="space-y-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span>
                  <span className="block text-sm font-semibold text-slate-900">Show splash screens</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    Turn this off to skip every splash, even if files are saved.
                  </span>
                </span>
                <EnableSwitch enabled={form.enabled !== false} onChange={(enabled) => setForm((prev) => ({ ...prev, enabled }))} />
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-slate-800">When to show</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SPLASH_DISPLAY_MODES.map((mode) => {
                    const active = (form.displayMode || 'afterClosed') === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() => setForm((prev) => ({ ...prev, displayMode: mode.id }))}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                          active
                            ? 'bg-slate-900 text-white'
                            : 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {mode.label}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] leading-5 text-slate-500">
                  {(form.displayMode || 'afterClosed') === 'everyOpen'
                    ? 'Plays on install and on every later open.'
                    : (form.displayMode || 'afterClosed') === 'installOnly'
                      ? 'Plays once, when the app is installed. Later opens go straight to home.'
                      : 'Plays when the app is installed. After that, it plays only if the app stayed closed for 3 hours.'}
                </p>
              </div>
              <label className="mt-4 block text-sm">
                <span className="font-medium text-slate-800">Seconds between screens</span>
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={form.gapSeconds ?? 0}
                  onChange={(event) => setForm((prev) => ({ ...prev, gapSeconds: Number(event.target.value) }))}
                  className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
                <span className="mt-1 block text-[11px] text-slate-500">Pause after one screen before the next starts. 0 means no pause.</span>
              </label>
              <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                <span>
                  <span className="block font-medium text-slate-800">Countdown</span>
                  <span className="mt-0.5 block text-[11px] text-slate-500">Shows the remaining seconds in the top right.</span>
                </span>
                <EnableSwitch enabled={form.showCountdown !== false} onChange={(enabled) => setForm((prev) => ({ ...prev, showCountdown: enabled }))} />
              </div>
            </section>

            {screens.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center">
                <p className="text-sm text-slate-600">No splash screens yet.</p>
                <button
                  type="button"
                  onClick={addScreen}
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-sky-700 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-800"
                >
                  <Plus size={16} />
                  Add splash screen
                </button>
              </div>
            ) : screens.map((screen, index) => (
              <section key={screen.id || index} className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">
                      {index === 0 ? '1st' : index === 1 ? '2nd' : index === 2 ? '3rd' : `${index + 1}th`} screen
                    </h2>
                    <p className="text-xs text-slate-500">{mediaLabel(screen.mediaType)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveScreen(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      title="Move earlier"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveScreen(index, 1)}
                      disabled={index === screens.length - 1}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      title="Move later"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <EnableSwitch enabled={screen.enabled !== false} onChange={(enabled) => updateScreen(index, { enabled })} />
                    <button
                      type="button"
                      onClick={() => removeScreen(index)}
                      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-black">
                    <div className="relative aspect-[9/16] w-full">
                      <SplashPreview screen={screen} />
                    </div>
                    <label className="flex cursor-pointer items-center justify-center gap-2 border-t border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-50">
                      {uploadingIndex === index ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload size={14} />
                      )}
                      Upload photo, GIF, or video
                      <input
                        type="file"
                        accept={ACCEPT}
                        className="hidden"
                        disabled={uploadingIndex === index}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          event.target.value = '';
                          if (file) uploadFile(index, file);
                        }}
                      />
                    </label>
                  </div>

                  <div className="space-y-3">
                    <label className="block text-xs font-medium text-slate-600">
                      File URL
                      <input
                        type="url"
                        value={screen.url || ''}
                        onChange={(event) => {
                          const url = event.target.value;
                          const lower = url.toLowerCase().split('?')[0];
                          const mediaType = /\.(mp4|webm|mov|m4v)$/.test(lower)
                            ? 'video'
                            : lower.endsWith('.gif')
                              ? 'gif'
                              : 'image';
                          updateScreen(index, {
                            url,
                            mediaType,
                            durationSeconds: mediaType === 'video' ? 0 : (screen.durationSeconds || SPLASH_DURATION_DEFAULT),
                          });
                        }}
                        placeholder="https://..."
                        className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                    <label className="block text-xs font-medium text-slate-600">
                      {screen.mediaType === 'video' ? 'Seconds on screen (0 plays the whole video)' : 'Seconds on screen'}
                      <input
                        type="number"
                        min={screen.mediaType === 'video' ? 0 : 1}
                        max={30}
                        value={screen.durationSeconds ?? (screen.mediaType === 'video' ? 0 : SPLASH_DURATION_DEFAULT)}
                        onChange={(event) => updateScreen(index, {
                          durationSeconds: Number(event.target.value),
                        })}
                        className="mt-1 w-28 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900"
                      />
                    </label>
                  </div>
                </div>
              </section>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={addScreen}
                disabled={screens.length >= MAX_SPLASH_SCREENS}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-40"
              >
                <Plus size={16} />
                Add splash screen
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save
              </button>
              <span className="text-xs text-slate-500">{screens.length} of {MAX_SPLASH_SCREENS}</span>
            </div>
          </div>

          <aside className="rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-4">
            <PhoneSplashPreview
              screens={screens}
              gapSeconds={form.gapSeconds}
              showCountdown={form.showCountdown !== false}
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              The app reads <span className="font-mono">displayMode</span> and <span className="font-mono">closedHours</span> from{' '}
              <span className="font-mono">GET /api/public/mobile-features</span>.
              Install always plays the splash. Later opens follow the rule above.
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
