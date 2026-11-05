"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { BellRing, Save } from "lucide-react";
import { useAuth } from "@/lib/useAuth";

const INTERVAL_OPTIONS = [1, 2, 3, 4, 6, 8, 12, 24];
const DEFAULT_SETTINGS = {
  enabled: true,
  threshold: 20,
  intervalHours: 3,
  recipients: ["merchandise@althakeel.com"],
};

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-500/15";

export default function LowStockAlertSettings() {
  const { getToken } = useAuth();
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const token = await getToken();
        if (!token) throw new Error("Please sign in again to load these settings.");
        const { data } = await axios.get("/api/store/settings/low-stock-alerts", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) {
          setLoadError("");
          setSettings({
            ...DEFAULT_SETTINGS,
            ...data.settings,
            recipients: Array.isArray(data.settings?.recipients)
              ? data.settings.recipients
              : DEFAULT_SETTINGS.recipients,
          });
        }
      } catch (error) {
        if (active) {
          const message = error?.response?.data?.error || error.message || "Could not load low-stock alert settings.";
          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [getToken]);

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const token = await getToken();
      if (!token) throw new Error("Please sign in again to save these settings.");
      const recipients = String(settings.recipientsText ?? settings.recipients.join(","))
        .split(/[,\n;]/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        enabled: settings.enabled,
        threshold: Number(settings.threshold),
        intervalHours: Number(settings.intervalHours),
        recipients,
      };
      const { data } = await axios.patch("/api/store/settings/low-stock-alerts", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSettings({
        ...data.settings,
        recipientsText: data.settings.recipients.join(", "),
      });
      toast.success(data.message || "Low-stock alert settings saved.");
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Could not save low-stock alert settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-sm">
        Loading low-stock alert settings...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold text-red-700">Could not load the saved alert settings.</p>
        <p className="mt-1 text-sm text-slate-600">{loadError}</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-4 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Reload settings
        </button>
      </div>
    );
  }

  const recipientText = settings.recipientsText ?? settings.recipients.join(", ");

  return (
    <form onSubmit={save} className="space-y-4">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-5 flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <BellRing size={18} />
          </span>
          <div>
            <h3 className="text-base font-semibold text-slate-900">Low-stock email alerts</h3>
            <p className="mt-1 text-sm text-slate-500">
              Send a current low-stock report on the configured interval while products or variants remain below the threshold.
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-3.5">
          <span>
            <span className="block text-sm font-medium text-slate-800">Enable email alerts</span>
            <span className="mt-0.5 block text-xs text-slate-500">The alert schedule checks inventory every hour.</span>
          </span>
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(event) => updateSetting("enabled", event.target.checked)}
            className="h-4 w-4 accent-indigo-600"
          />
        </label>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Low-stock threshold (units)</span>
            <input
              className={inputClass}
              type="number"
              min="1"
              max="100000"
              step="1"
              value={settings.threshold}
              onChange={(event) => updateSetting("threshold", event.target.value)}
              required
            />
            <span className="text-xs text-slate-500">Alert when available stock is below this number.</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">Repeat interval</span>
            <select
              className={inputClass}
              value={settings.intervalHours}
              onChange={(event) => updateSetting("intervalHours", Number(event.target.value))}
            >
              {INTERVAL_OPTIONS.map((hours) => (
                <option key={hours} value={hours}>
                  Every {hours} hour{hours === 1 ? "" : "s"}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">Alerts are sent at the next scheduled check after each interval.</span>
          </label>
        </div>

        <label className="mt-5 flex flex-col gap-1.5">
          <span className="text-sm font-medium text-slate-700">Alert recipient emails</span>
          <textarea
            className={`${inputClass} min-h-28 resize-y`}
            value={recipientText}
            onChange={(event) => updateSetting("recipientsText", event.target.value)}
            placeholder="merchandise@althakeel.com, admin@example.com"
            required
          />
          <span className="text-xs text-slate-500">
            Separate addresses with commas, semicolons, or new lines. Enter all recipients for these alerts.
          </span>
        </label>
      </section>

      <div className="flex justify-end rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          <Save size={16} />
          {saving ? "Saving..." : "Save alert settings"}
        </button>
      </div>
    </form>
  );
}
