'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Search } from 'lucide-react';

const fieldClassName =
  'w-full rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-left text-slate-900 outline-none transition focus:border-[#f59e0b] focus:bg-white focus:ring-4 focus:ring-[#fde7c2]';

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function matchesSearchOption(option, needle) {
  const normalizedOption = normalizeSearchText(option);
  const normalizedNeedle = normalizeSearchText(needle);
  if (!normalizedNeedle) return true;
  if (normalizedOption.includes(normalizedNeedle)) return true;

  const tokens = normalizedNeedle.split(' ').filter(Boolean);
  return tokens.every((token) => normalizedOption.includes(token));
}

export default function SearchableSelect({
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  required = false,
  disabled = false,
  hasError = false,
  className = '',
  triggerClassName = '',
  emptyMessage = 'No matches found',
  allowCustomValue = false,
  formatCustomOption,
  listHint,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuBox, setMenuBox] = useState(null);

  const filteredOptions = useMemo(() => {
    const needle = query.trim();
    if (!needle) return options;
    return options.filter((option) => matchesSearchOption(option, needle));
  }, [options, query]);

  const displayOptions = useMemo(() => {
    const selected = String(value || '').trim();
    const inBaseList = options.some(
      (option) => String(option).trim().toLowerCase() === selected.toLowerCase(),
    );
    const needle = query.trim().toLowerCase();

    if (!selected || inBaseList) return filteredOptions;

    const matchesQuery = !needle || selected.toLowerCase().includes(needle);
    if (!matchesQuery) return filteredOptions;

    const withoutDuplicate = filteredOptions.filter(
      (option) => String(option).trim().toLowerCase() !== selected.toLowerCase(),
    );
    return [selected, ...withoutDuplicate];
  }, [filteredOptions, options, query, value]);

  const trimmedQuery = query.trim();
  const showCustomOption = Boolean(
    allowCustomValue
    && trimmedQuery
    && !displayOptions.some((option) => String(option).trim().toLowerCase() === trimmedQuery.toLowerCase()),
  );

  const renderCustomOptionLabel = (label) => {
    if (typeof formatCustomOption === 'function') {
      return formatCustomOption(label);
    }
    return `Use "${label}"`;
  };

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      const target = event.target;
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setMenuBox(null);
      setQuery('');
      return undefined;
    }

    const placeMenu = (event) => {
      if (event?.target && menuRef.current?.contains(event.target)) return;
      const trigger = rootRef.current?.querySelector('button');
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const gap = 8;
      const spaceBelow = window.innerHeight - rect.bottom - gap;
      const spaceAbove = rect.top - gap;
      const openUp = spaceBelow < 240 && spaceAbove > spaceBelow;
      const available = Math.max(160, openUp ? spaceAbove : spaceBelow);
      const maxHeight = Math.min(360, available);
      const width = Math.min(rect.width, window.innerWidth - 16);
      const left = Math.min(Math.max(8, rect.left), window.innerWidth - width - 8);
      setMenuBox({
        left,
        width,
        maxHeight,
        top: openUp ? 'auto' : rect.bottom + gap,
        bottom: openUp ? window.innerHeight - rect.top + gap : 'auto',
      });
    };

    placeMenu();
    window.addEventListener('resize', placeMenu);
    window.addEventListener('scroll', placeMenu, true);
    const focusTimer = window.requestAnimationFrame(() => searchRef.current?.focus({ preventScroll: true }));
    return () => {
      window.removeEventListener('resize', placeMenu);
      window.removeEventListener('scroll', placeMenu, true);
      window.cancelAnimationFrame(focusTimer);
    };
  }, [open]);

  const handleSelect = (option) => {
    onChange?.(option);
    setOpen(false);
    setQuery('');
  };

  const errorClass = hasError ? 'border-red-400 ring-4 ring-red-100' : '';
  const openStateClass = triggerClassName
    ? (open ? 'border-gray-400 bg-white' : '')
    : (open ? 'border-[#f59e0b] bg-white ring-4 ring-[#fde7c2]' : '');

  return (
    <div ref={rootRef} id={id} className={`relative ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-invalid={hasError || undefined}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`${triggerClassName || fieldClassName} flex items-center justify-between gap-3 disabled:cursor-not-allowed disabled:opacity-60 ${errorClass} ${openStateClass}`}
      >
        <span className={value ? 'truncate' : 'truncate text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {required && !value ? (
        <input
          tabIndex={-1}
          aria-hidden="true"
          value=""
          onChange={() => {}}
          required
          className="pointer-events-none absolute h-0 w-0 opacity-0"
        />
      ) : null}

      {open && menuBox && typeof document !== 'undefined' ? createPortal(
        <div
          ref={menuRef}
          id={listId}
          role="listbox"
          style={{
            position: 'fixed',
            left: menuBox.left,
            top: menuBox.top,
            bottom: menuBox.bottom,
            width: menuBox.width,
            maxHeight: menuBox.maxHeight,
            zIndex: 200,
          }}
          className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.14)]"
        >
          <div className="shrink-0 border-b border-slate-100 p-3">
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <Search size={16} className="shrink-0 text-slate-400" />
              <input
                ref={searchRef}
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-1"
            style={{ maxHeight: Math.max(120, menuBox.maxHeight - 64) }}
          >
            {!query.trim() && listHint ? (
              <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500">
                {listHint}
              </p>
            ) : null}
            {displayOptions.length > 0 ? (
              displayOptions.map((option) => {
                const isSelected = option === value;
                const isCustomSaved = allowCustomValue
                  && !options.some(
                    (entry) => String(entry).trim().toLowerCase() === String(option).trim().toLowerCase(),
                  );
                return (
                  <button
                    key={option}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(option)}
                    className={`flex w-full items-center px-4 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? 'bg-[#fff7e8] font-semibold text-[#b45309]'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{option}</span>
                    {isCustomSaved ? (
                      <span className="ms-2 shrink-0 text-[11px] font-medium text-slate-400">Custom</span>
                    ) : null}
                  </button>
                );
              })
            ) : null}
            {showCustomOption ? (
              <button
                type="button"
                role="option"
                aria-selected={value === trimmedQuery}
                onClick={() => handleSelect(trimmedQuery)}
                className="flex w-full items-center border-t border-slate-100 px-4 py-3 text-left text-sm font-semibold text-[#b45309] transition hover:bg-[#fff7e8]"
              >
                {renderCustomOptionLabel(trimmedQuery)}
              </button>
            ) : null}
            {displayOptions.length === 0 && !showCustomOption ? (
              <p className="px-4 py-6 text-center text-sm text-slate-500">{emptyMessage}</p>
            ) : null}
          </div>
        </div>,
        document.body,
      ) : null}
    </div>
  );
}
