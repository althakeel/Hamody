'use client'

export default function EnableSwitch({ enabled, onChange }) {
  return (
    <div className="inline-flex shrink-0 rounded-full bg-slate-100 p-0.5" role="group" aria-label="Enable or disable">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          enabled ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        Enable
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          !enabled ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        Disable
      </button>
    </div>
  )
}
