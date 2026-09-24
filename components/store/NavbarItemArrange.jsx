'use client';

import { GripVertical } from 'lucide-react';
import {
  ITEM_ALIGN_OPTIONS,
  defaultNavbarItemOrder,
  getNavbarArrangeItems,
} from '@/lib/navbarLayoutSettings';
import useNavbarItemReorder from '@/components/store/useNavbarItemReorder';

export default function NavbarItemArrange({
  layout,
  visibility = { orders: true, wishlist: true, cart: true, phone: true, language: true },
  onChange,
  onAlignChange,
  onReset,
}) {
  const items = getNavbarArrangeItems(layout, visibility);
  const { dragId, point, offset, start } = useNavbarItemReorder({
    enabled: true,
    itemOrder: layout.itemOrder,
    extraButtons: layout.extraButtons,
    onChange,
  });
  const dragging = items.find((item) => item.id === dragId);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Arrange navbar items</h2>
          <p className="mt-1 text-xs text-slate-500">
            Drag to reorder. Click Left, Default, or Right to move that item. The preview updates immediately.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (onReset) {
              onReset();
              return;
            }
            onChange(defaultNavbarItemOrder(layout.extraButtons));
          }}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          Reset
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-start gap-2">
        {items.map((item) => {
          const isDragging = dragId === item.id;
          return (
            <div
              key={item.id}
              data-navbar-arrange-id={item.id}
              className={`rounded-xl border p-2 shadow-sm ${
                isDragging
                  ? 'border-indigo-300 bg-indigo-50 opacity-40'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <button
                type="button"
                onPointerDown={(event) => start(event, item.id)}
                className="inline-flex select-none items-center gap-1.5 px-1 text-xs font-semibold text-slate-700"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              >
                <GripVertical size={13} className="text-slate-400" />
                {item.label}
              </button>
              <div className="mt-1.5 inline-flex rounded-lg bg-slate-100 p-0.5">
                {ITEM_ALIGN_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onAlignChange?.(item.id, option.id)}
                    className={`rounded-md px-2 py-1 text-[11px] font-semibold transition ${
                      item.align === option.id
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {dragging ? (
        <div
          className="pointer-events-none fixed z-[80] inline-flex items-center gap-1.5 rounded-xl border border-indigo-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-lg"
          style={{
            left: point.x - offset.x,
            top: point.y - offset.y,
            width: 'max-content',
          }}
        >
          <GripVertical size={13} className="text-indigo-400" />
          {dragging.label}
        </div>
      ) : null}
    </div>
  );
}
