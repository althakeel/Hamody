'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import toast from 'react-hot-toast';
import { ArrowLeft, Copy, Gift, GripVertical, Languages, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/useAuth';
import {
  HOME_POPUP_BLOCK_LABELS,
  HOME_POPUP_PAGE_OPTIONS,
  createHomePopupTemplate,
  normalizeHomeWelcomePopup,
  sumHomePopupStats,
} from '@/lib/homeWelcomePopup';
import HomeWelcomePopupCard from '@/components/HomeWelcomePopupCard';

const LAYOUTS = [
  { id: 'classic', title: 'Classic header', detail: 'Color bar, logo, icon, then the offer.' },
  { id: 'image-top', title: 'Image on top', detail: 'A large photo above the offer.' },
  { id: 'split', title: 'Image beside text', detail: 'Photo on one side, offer on the other.' },
  { id: 'image-only', title: 'Image only', detail: 'Just the picture. A link opens when it is clicked.' },
];

const TEXT_FIELDS = [
  ['heading', 'Heading', 'WELCOME TO STORE1920'],
  ['offerLead', 'Offer line start', 'Get'],
  ['offerHighlight', 'Offer highlight', '10% OFF'],
  ['offerTail', 'Offer line end', 'your first purchase'],
  ['body', 'Description', 'Short supporting text'],
  ['emailPlaceholder', 'Email placeholder', 'Your email'],
  ['buttonText', 'Button text', 'Get my offer'],
  ['successText', 'Success message', 'Shown after the email is saved'],
];

function Field({ label, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-900 outline-none focus:border-slate-400';

function ImageUpload({ label, hint, preview, uploading, onFile, onRemove }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
      <p className="mt-0.5 text-xs text-slate-400">{hint}</p>
      <div className="mt-2 flex items-center gap-3">
        {preview ? (
          <img src={preview} alt="" className="h-14 w-20 rounded-lg border border-slate-200 bg-slate-50 object-contain" />
        ) : (
          <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-dashed border-slate-200 text-[10px] text-slate-400">
            No image
          </div>
        )}
        <div>
          <label className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50">
            {uploading ? 'Uploading...' : 'Upload'}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                onFile(file);
              }}
            />
          </label>
          {preview ? (
            <button type="button" onClick={onRemove} className="ms-2 text-xs font-semibold text-red-600">
              Remove
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function HomePopupCustomizePage() {
  const { getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState('');
  const [translating, setTranslating] = useState(false);
  const [previewArabic, setPreviewArabic] = useState(false);
  const [bundle, setBundle] = useState(() => normalizeHomeWelcomePopup({}));
  const [editingId, setEditingId] = useState('');
  const [dragType, setDragType] = useState('');
  const [step, setStep] = useState('look');
  const form = bundle.templates.find((item) => item.id === editingId) || bundle.templates[0];

  const loadSettings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await getToken();
      const { data } = await axios.get('/api/store/appearance/sections', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const next = normalizeHomeWelcomePopup(data?.homeWelcomePopup);
      setBundle(next);
      setEditingId(next.activeTemplateId);
    } catch (error) {
      console.error(error);
      toast.error('Failed to load homepage popup');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const setForm = (updater) => {
    setBundle((current) => ({
      ...current,
      templates: current.templates.map((item) => {
        if (item.id !== editingId && item.id !== form?.id) return item;
        const next = typeof updater === 'function' ? updater(item) : updater;
        return { ...item, ...next, id: item.id, stats: item.stats };
      }),
    }));
  };

  const setField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const uploadImage = async (file, field, label) => {
    if (!file) return;
    if (!String(file.type || '').startsWith('image/')) {
      toast.error('Choose an image file');
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error(`${label} must be 8MB or smaller`);
      return;
    }
    try {
      setUploadingKey(field);
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('type', 'logo');
      const { data } = await axios.post('/api/store/upload-image', formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const url = String(data?.url || '').trim();
      if (!url) throw new Error('Upload returned no URL');
      setField(field, url);
      toast.success(`${label} uploaded. Save to publish.`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error?.message || `${label} upload failed`);
    } finally {
      setUploadingKey('');
    }
  };

  const translateToArabic = async () => {
    const fields = TEXT_FIELDS
      .map(([key]) => [key, String(form[key] || '').trim()])
      .filter(([, value]) => value);
    if (!fields.length) {
      toast.error('Enter the English text first');
      return;
    }
    try {
      setTranslating(true);
      const token = await getToken();
      if (!token) {
        toast.error('Please sign in again');
        return;
      }
      const translated = await Promise.all(fields.map(async ([key, text]) => {
        const { data } = await axios.post('/api/store/categories/translate-arabic', { text }, {
          headers: { Authorization: `Bearer ${token}` },
        });
        return [key, String(data?.descriptionAr || '').trim()];
      }));
      const updates = {};
      translated.forEach(([key, arabic]) => {
        if (arabic) updates[`${key}Ar`] = arabic;
      });
      if (!Object.keys(updates).length) {
        toast.error('Could not translate to Arabic');
        return;
      }
      setForm((current) => ({ ...current, ...updates }));
      setPreviewArabic(true);
      toast.success('Arabic fields updated');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to translate to Arabic');
    } finally {
      setTranslating(false);
    }
  };

  const save = async () => {
    try {
      setSaving(true);
      const token = await getToken();
      const popup = normalizeHomeWelcomePopup(bundle);
      await axios.post('/api/store/appearance/sections', {
        homeWelcomePopup: popup,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setBundle(popup);
      setEditingId((current) => (popup.templates.some((item) => item.id === current) ? current : popup.activeTemplateId));
      toast.success('Homepage popup saved');
    } catch (error) {
      toast.error(error?.response?.data?.error || 'Failed to save homepage popup');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div lang="en" dir="ltr" className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            href="/store/customize"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Customize
          </Link>
          <h1 className="mt-3 flex items-center gap-2 text-2xl font-bold text-slate-900">
            <Gift size={22} />
            Homepage popup
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Pick a design, edit one section at a time, then save. Customers only see the design marked Live.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={loading || saving}
          className="inline-flex h-11 items-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-60"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Save popup
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-8 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" />
          Loading popup…
        </div>
      ) : (
        <div className="space-y-6">
          <PopupResults
            bundle={bundle}
            editingId={form.id}
            onEnabled={(enabled) => setBundle((current) => ({ ...current, enabled }))}
            onLive={(templateId) => setBundle((current) => ({ ...current, activeTemplateId: templateId }))}
            onEdit={setEditingId}
            onRename={(name) => setField('name', name)}
            onCreate={() => {
              if (bundle.templates.length >= 12) return;
              const created = createHomePopupTemplate({ name: `Template ${bundle.templates.length + 1}` }, bundle.templates.length);
              setBundle((current) => ({ ...current, templates: [...current.templates, created] }));
              setEditingId(created.id);
            }}
            onDuplicate={() => {
              if (bundle.templates.length >= 12) return;
              const created = createHomePopupTemplate({
                ...form,
                name: `${form.name} copy`,
                id: '',
                stats: { views: 0, emails: 0, copies: 0, clicks: 0 },
              }, bundle.templates.length);
              setBundle((current) => ({ ...current, templates: [...current.templates, created] }));
              setEditingId(created.id);
            }}
            onDelete={() => {
              if (bundle.templates.length < 2) return;
              const templates = bundle.templates.filter((item) => item.id !== form.id);
              const nextId = templates[0].id;
              setEditingId(nextId);
              setBundle((current) => ({
                ...current,
                templates,
                activeTemplateId: current.activeTemplateId === form.id ? nextId : current.activeTemplateId,
              }));
            }}
          />
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,460px)]">
          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex flex-wrap gap-2">
              {[
                ['look', 'Look'],
                ['blocks', 'Blocks'],
                ['text', 'Text'],
                ['when', 'When it shows'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setStep(id)}
                  className={`h-10 rounded-full px-4 text-sm font-semibold ${step === id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {step === 'look' ? (
            <div className="space-y-5">
              <div>
              <p className="text-sm font-semibold text-slate-700">Layout</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {LAYOUTS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => setField('layout', layout.id)}
                    className={`rounded-xl border px-3 py-3 text-start ${form.layout === layout.id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}
                  >
                    <span className="block text-sm font-semibold">{layout.title}</span>
                    <span className={`mt-1 block text-xs ${form.layout === layout.id ? 'text-slate-200' : 'text-slate-500'}`}>{layout.detail}</span>
                  </button>
                ))}
              </div>
              </div>

            {form.layout === 'split' ? (
              <div>
                <p className="text-sm font-semibold text-slate-700">Image side</p>
                <div className="mt-2 flex gap-2">
                  {['left', 'right'].map((side) => (
                    <button
                      key={side}
                      type="button"
                      onClick={() => setField('imageSide', side)}
                      className={`h-10 rounded-xl border px-4 text-sm font-semibold capitalize ${form.imageSide === side ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700'}`}
                    >
                      {side}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-semibold text-slate-700">Corners</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[
                  ['sharp', 'Square'],
                  ['soft', 'Soft'],
                  ['round', 'Round'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setField('corner', id)}
                    className={`h-10 rounded-xl border px-4 text-sm font-semibold ${form.corner === id ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 text-slate-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <ImageUpload
                label="Header logo"
                hint="Shown in the classic color bar."
                preview={form.logoUrl}
                uploading={uploadingKey === 'logoUrl'}
                onFile={(file) => uploadImage(file, 'logoUrl', 'Logo')}
                onRemove={() => setField('logoUrl', '')}
              />
              <ImageUpload
                label="Icon image"
                hint="Replaces the gift drawing. Leave empty to keep the gift."
                preview={form.iconUrl}
                uploading={uploadingKey === 'iconUrl'}
                onFile={(file) => uploadImage(file, 'iconUrl', 'Icon')}
                onRemove={() => setField('iconUrl', '')}
              />
              <ImageUpload
                label="Main image"
                hint="Used for image on top, beside the text, or image only."
                preview={form.imageUrl}
                uploading={uploadingKey === 'imageUrl'}
                onFile={(file) => uploadImage(file, 'imageUrl', 'Image')}
                onRemove={() => setField('imageUrl', '')}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {[
                ['showHeader', 'Show the color header'],
              ].map(([key, label]) => (
                <label key={key} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={(event) => setField(key, event.target.checked)}
                  />
                  <span className="text-sm font-semibold text-slate-900">{label}</span>
                </label>
              ))}
            </div>

            <div className="flex flex-wrap gap-4">
              {[
                ['headerColor', 'Header'],
                ['accentColor', 'Offer'],
                ['cardColor', 'Card'],
                ['textColor', 'Text'],
                ['buttonTextColor', 'Button text'],
              ].map(([key, label]) => (
                <label key={key} className="text-center text-xs font-semibold text-slate-600">
                  <input
                    type="color"
                    value={form[key]}
                    onChange={(event) => setField(key, event.target.value)}
                    className="mb-1 block h-11 w-11 cursor-pointer rounded-full border border-slate-200 bg-white p-1"
                  />
                  {label}
                </label>
              ))}
            </div>
            </div>
            ) : null}

            {step === 'blocks' ? (
            <div className="space-y-5">
            <BlockList
              blocks={form.blocks || []}
              couponCode={form.couponCode || ''}
              couponLabel={form.couponLabel || ''}
              dragType={dragType}
              onDragType={setDragType}
              onBlocks={(blocks) => setField('blocks', blocks)}
              onCouponCode={(couponCode) => setField('couponCode', couponCode)}
              onCouponLabel={(couponLabel) => setField('couponLabel', couponLabel)}
            />

            <Field label="Button link">
              <input
                value={form.buttonLink}
                onChange={(event) => setField('buttonLink', event.target.value)}
                placeholder="/shop or https://..."
                className={inputClass}
              />
              <span className="text-xs text-slate-400">Used when the email box is off, and when the layout is image only.</span>
            </Field>
            </div>
            ) : null}

            {step === 'when' ? (
            <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Open after (seconds)">
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={form.delaySeconds}
                  onChange={(event) => setField('delaySeconds', event.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-slate-400">0 opens right away. Up to 120 seconds.</span>
              </Field>
              <Field label="Max width (px)">
                <input
                  type="number"
                  min="280"
                  max="960"
                  value={form.maxWidth}
                  onChange={(event) => setField('maxWidth', event.target.value)}
                  className={inputClass}
                />
                <span className="text-xs text-slate-400">280 to 960. Wider cards suit the side-image layout.</span>
              </Field>
              <Field label="Hide again for">
                <select
                  value={form.dismissFor}
                  onChange={(event) => setField('dismissFor', event.target.value)}
                  className={inputClass}
                >
                  <option value="visit">Every visit</option>
                  <option value="session">This visit</option>
                  <option value="hour">Every 1 hour</option>
                  <option value="twoHours">Every 2 hours</option>
                  <option value="day">1 day</option>
                  <option value="week">7 days</option>
                </select>
              </Field>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-700">Show on these pages</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {HOME_POPUP_PAGE_OPTIONS.map((page) => {
                  const checked = form.pages.includes(page.id);
                  return (
                    <label key={page.id} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setForm((current) => {
                            const selected = new Set(current.pages);
                            if (page.id === 'all') {
                              return { ...current, pages: checked ? ['home'] : ['all'] };
                            }
                            selected.delete('all');
                            if (checked) selected.delete(page.id);
                            else selected.add(page.id);
                            const pages = Array.from(selected);
                            return { ...current, pages: pages.length ? pages : ['home'] };
                          });
                        }}
                      />
                      <span className="text-sm font-semibold text-slate-900">{page.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            </div>
            ) : null}

            {step === 'text' ? (
            <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-slate-700">Popup text</p>
              <button
                type="button"
                onClick={translateToArabic}
                disabled={translating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:border-violet-300 hover:text-violet-700 disabled:opacity-60"
              >
                {translating ? <Loader2 size={13} className="animate-spin" /> : <Languages size={13} />}
                Translate to Arabic
              </button>
            </div>

            {TEXT_FIELDS.map(([key, label, hint]) => (
              <div key={key} className="grid gap-3 sm:grid-cols-2">
                <Field label={`${label} (English)`}>
                  {key === 'body' || key === 'successText' ? (
                    <textarea
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  ) : (
                    <input
                      value={form[key]}
                      onChange={(event) => setField(key, event.target.value)}
                      className={inputClass}
                    />
                  )}
                  <span className="text-xs text-slate-400">{hint}</span>
                </Field>
                <Field label={`${label} (Arabic)`}>
                  {key === 'body' || key === 'successText' ? (
                    <textarea
                      dir="rtl"
                      value={form[`${key}Ar`]}
                      onChange={(event) => setField(`${key}Ar`, event.target.value)}
                      rows={3}
                      placeholder="Optional"
                      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-slate-400"
                    />
                  ) : (
                    <input
                      dir="rtl"
                      value={form[`${key}Ar`]}
                      onChange={(event) => setField(`${key}Ar`, event.target.value)}
                      placeholder="Optional"
                      className={inputClass}
                    />
                  )}
                </Field>
              </div>
            ))}
            </div>
            ) : null}
          </div>

          <div className="lg:sticky lg:top-6 lg:self-start">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">Preview</p>
              <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setPreviewArabic(false)}
                  className={`rounded-md px-2 py-1 ${previewArabic ? 'text-slate-500' : 'bg-slate-900 text-white'}`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewArabic(true)}
                  className={`rounded-md px-2 py-1 ${previewArabic ? 'bg-slate-900 text-white' : 'text-slate-500'}`}
                >
                  Arabic
                </button>
              </div>
            </div>
            <div className="rounded-3xl bg-slate-200 p-4">
              <HomeWelcomePopupCard settings={form} isArabic={previewArabic} preview />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              This preview updates as you edit. Save to show the Live design to customers.
            </p>
          </div>
        </div>
        </div>
      )}
    </div>
  );
}

function PopupResults({
  bundle,
  editingId,
  onEnabled,
  onLive,
  onEdit,
  onRename,
  onCreate,
  onDuplicate,
  onDelete,
}) {
  const totals = sumHomePopupStats(bundle.templates);
  const cards = [
    ['Opens', totals.views],
    ['Emails', totals.emails],
    ['Copies', totals.copies],
    ['Clicks', totals.clicks],
  ];
  const editing = bundle.templates.find((item) => item.id === editingId) || bundle.templates[0];
  const liveName = bundle.templates.find((item) => item.id === bundle.activeTemplateId)?.name || editing?.name;
  const editingIsLive = bundle.activeTemplateId === editing?.id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white px-4 py-4">
            <p className="text-sm text-slate-500">{label}</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onEnabled(!bundle.enabled)}
            className={`inline-flex h-11 items-center gap-3 rounded-full px-4 text-sm font-semibold ${bundle.enabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-700'}`}
          >
            <span className={`h-2.5 w-2.5 rounded-full ${bundle.enabled ? 'bg-white' : 'bg-slate-500'}`} />
            {bundle.enabled ? 'Popup is showing' : 'Popup is hidden'}
          </button>
          <p className="text-sm text-slate-600">
            Customers see <span className="font-semibold text-slate-900">{liveName}</span>
          </p>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {bundle.templates.map((template) => {
            const selected = template.id === editingId;
            const live = template.id === bundle.activeTemplateId;
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => onEdit(template.id)}
                className={`min-w-[140px] rounded-2xl border px-4 py-3 text-start ${selected ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-800'}`}
              >
                <span className="block text-sm font-semibold">{template.name}</span>
                <span className={`mt-1 block text-xs ${selected ? 'text-slate-300' : 'text-slate-500'}`}>
                  {live ? 'Live' : 'Draft'}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex min-w-[120px] items-center justify-center gap-1 rounded-2xl border border-dashed border-slate-300 px-4 py-3 text-sm font-semibold text-slate-600"
          >
            <Plus size={16} /> New
          </button>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            value={editing?.name || ''}
            onChange={(event) => onRename(event.target.value)}
            className="h-10 w-52 rounded-xl border border-slate-200 px-3 text-sm"
            aria-label="Design name"
          />
          {editingIsLive ? (
            <span className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">This design is live</span>
          ) : (
            <button
              type="button"
              onClick={() => onLive(editing.id)}
              className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white"
            >
              Make this the live design
            </button>
          )}
          <button type="button" onClick={onDuplicate} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-slate-700">
            <Copy size={14} /> Copy
          </button>
          <button type="button" onClick={onDelete} disabled={bundle.templates.length < 2} className="inline-flex h-10 items-center gap-1 rounded-xl border border-slate-200 px-3 text-sm font-semibold text-red-600 disabled:opacity-40">
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function BlockList({ blocks, couponCode, couponLabel, dragType, onDragType, onBlocks, onCouponCode, onCouponLabel }) {
  const moveBlock = (fromType, toType) => {
    if (!fromType || fromType === toType) return;
    const next = [...blocks];
    const from = next.findIndex((block) => block.type === fromType);
    const to = next.findIndex((block) => block.type === toType);
    if (from < 0 || to < 0) return;
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onBlocks(next);
  };

  return (
    <div>
      <p className="text-sm font-semibold text-slate-700">Blocks</p>
      <p className="mt-1 text-xs text-slate-400">Turn a block on or off, then drag it to change the order. Coupon and email signup are included.</p>
      <div className="mt-2 space-y-2">
        {blocks.map((block) => (
          <div
            key={block.type}
            draggable
            onDragStart={() => onDragType(block.type)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => {
              moveBlock(dragType, block.type);
              onDragType('');
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2"
          >
            <div className="flex items-center gap-2">
              <GripVertical size={16} className="cursor-grab text-slate-400" />
              <input
                type="checkbox"
                checked={block.enabled}
                onChange={(event) => {
                  onBlocks(blocks.map((item) => (
                    item.type === block.type ? { ...item, enabled: event.target.checked } : item
                  )));
                }}
              />
              <span className="text-sm font-semibold text-slate-900">{HOME_POPUP_BLOCK_LABELS[block.type] || block.type}</span>
            </div>
            {block.type === 'coupon' && block.enabled ? (
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <input
                  value={couponCode}
                  onChange={(event) => onCouponCode(event.target.value.toUpperCase())}
                  placeholder="SAVE10"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm font-semibold tracking-wider"
                />
                <input
                  value={couponLabel}
                  onChange={(event) => onCouponLabel(event.target.value)}
                  placeholder="Use code"
                  className="h-10 rounded-xl border border-slate-200 px-3 text-sm"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
