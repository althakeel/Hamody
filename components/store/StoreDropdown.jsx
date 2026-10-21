'use client';

import { Fragment, useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

function normalizeSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export default function StoreDropdown({
  value = '',
  onChange,
  options = [],
  placeholder = 'Select option',
  searchPlaceholder = 'Search...',
  searchable = false,
  disabled = false,
  className = '',
  triggerClassName = '',
  portal = false,
}) {
  const listId = useId();
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [menuStyle, setMenuStyle] = useState(null);

  const normalizedOptions = useMemo(() => {
    const seen = new Set();
    return options
      .map((option) => {
        if (typeof option === 'string') {
          return { value: option, label: option };
        }
        return {
          value: String(option?.value ?? ''),
          label: String(option?.label || option?.value || ''),
          group: String(option?.group || ''),
        };
      })
      .filter((option) => {
        const key = option.value || option.label;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [options]);

  const selected = normalizedOptions.find((option) => option.value === String(value || '')) || null;
  const showSearch = searchable || normalizedOptions.length > 8;

  const filteredOptions = useMemo(() => {
    const needle = normalizeSearchText(query);
    if (!needle) return normalizedOptions;
    return normalizedOptions.filter((option) => (
      normalizeSearchText(option.label).includes(needle)
      || normalizeSearchText(option.value).includes(needle)
    ));
  }, [normalizedOptions, query]);

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
    if (!open || !portal) return undefined;
    const place = (event) => {
      if (event?.target && menuRef.current?.contains(event.target)) return;
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const menuHeight = 320;
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < menuHeight && rect.top > spaceBelow;
      setMenuStyle({
        position: 'fixed',
        left: Math.max(8, rect.left),
        width: Math.min(rect.width, window.innerWidth - 16),
        top: openUp ? Math.max(8, rect.top - 6 - Math.min(menuHeight, rect.top - 8)) : rect.bottom + 6,
        zIndex: 200,
      });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, portal]);

  useEffect(() => {
    if (open && showSearch) {
      window.requestAnimationFrame(() => searchRef.current?.focus());
    } else {
      setQuery('');
    }
  }, [open, showSearch]);

  const handleSelect = (nextValue) => {
    onChange?.(nextValue);
    setOpen(false);
    setQuery('');
  };

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex w-full items-center justify-between gap-2 border text-left text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${
          triggerClassName || 'rounded-lg bg-white px-3 py-2'
        } ${
          open
            ? 'border-indigo-400 bg-white ring-2 ring-indigo-500/15'
            : 'border-slate-200 hover:border-slate-300'
        }`}
      >
        <span className={selected ? 'truncate text-slate-900' : 'truncate text-slate-400'}>
          {selected?.label || placeholder}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open ? (
        <MenuFrame
          portal={portal}
          menuRef={menuRef}
          menuStyle={menuStyle}
          listId={listId}
        >
          {showSearch ? (
            <div className="border-b border-slate-100 p-2">
              <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                <Search size={14} className="shrink-0 text-slate-400" />
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
          ) : null}

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => {
                const isSelected = option.value === String(value || '');
                const showGroup = option.group && option.group !== filteredOptions[index - 1]?.group;
                return (
                  <Fragment key={option.value}>
                    {showGroup ? (
                      <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                        {option.group}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(option.value)}
                      className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? 'bg-indigo-50 font-semibold text-indigo-700'
                          : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span className="truncate">{option.label}</span>
                      {isSelected ? <Check size={14} className="shrink-0" /> : null}
                    </button>
                  </Fragment>
                );
              })
            ) : (
              <p className="px-3 py-5 text-center text-sm text-slate-500">No matches found</p>
            )}
          </div>
        </MenuFrame>
      ) : null}
    </div>
  );
}

function MenuFrame({ portal, menuRef, menuStyle, listId, children }) {
  const frame = (
    <div
      ref={menuRef}
      id={listId}
      role="listbox"
      style={portal ? menuStyle || { position: 'fixed', visibility: 'hidden' } : undefined}
      className={`${portal ? '' : 'absolute left-0 right-0 top-[calc(100%+6px)] z-[80]'} overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_14px_32px_rgba(15,23,42,0.14)]`}
    >
      {children}
    </div>
  );
  if (portal && typeof document !== 'undefined') return createPortal(frame, document.body);
  return frame;
}
