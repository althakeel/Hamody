'use client';

import { useEffect, useRef, useState } from 'react';
import { CircleHelp, Eraser, FileSpreadsheet, FileText, Send, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/useAuth';
import { parseHelpLinkTokens } from '@/lib/storeHelpPages';

const HELP_CHAT_STORAGE_KEY = 'store-help-agent-v5';
const HELP_IDLE_CLOSE_MS = 2 * 60 * 1000;
const DEFAULT_MESSAGES = [
  {
    role: 'assistant',
    text: "Hey — ask me about this website, a dashboard page, an order, a product, or pickups. Any store account can see sales and customer details after the PIN. I can't change anything.",
  },
];

function readStoredHelp() {
  if (typeof window === 'undefined') {
    return { open: false, messages: DEFAULT_MESSAGES };
  }
  try {
    const stored = JSON.parse(sessionStorage.getItem(HELP_CHAT_STORAGE_KEY) || 'null');
    const messages = Array.isArray(stored?.messages) && stored.messages.length
      ? stored.messages
      : DEFAULT_MESSAGES;
    return { open: Boolean(stored?.open), messages };
  } catch {
    return { open: false, messages: DEFAULT_MESSAGES };
  }
}

function openStoreHelpLink(event, href) {
  event.preventDefault();
  event.stopPropagation();
  window.open(href, '_blank', 'noopener,noreferrer');
}

function HelpPageLink({ href, label, className }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={(event) => openStoreHelpLink(event, href)}
    >
      {label}
    </a>
  );
}

function HelpMessageBody({ text, links = [], canExport = false, exporting = '', onExport }) {
  const parts = parseHelpLinkTokens(text);
  const extraLinks = (links || []).filter((link) => (
    !parts.some((part) => part.type === 'link' && part.href === link.href)
  ));

  return (
    <div>
      <p className="whitespace-pre-wrap">
        {parts.map((part, index) => (
          part.type === 'link' ? (
            <HelpPageLink
              key={`${part.href}-${index}`}
              href={part.href}
              label={part.label}
              className="font-medium text-emerald-700 underline underline-offset-2 hover:text-emerald-800"
            />
          ) : (
            <span key={`text-${index}`}>{part.value}</span>
          )
        ))}
      </p>
      {extraLinks.length ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {extraLinks.map((link) => (
            <HelpPageLink
              key={link.href}
              href={link.href}
              label={link.label}
              className="inline-flex items-center rounded-md border border-emerald-200 bg-white px-2.5 py-1 text-xs font-medium text-emerald-800 hover:bg-emerald-50"
            />
          ))}
        </div>
      ) : null}
      {canExport ? (
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => onExport?.('xlsx')}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet size={13} />
            {exporting === 'xlsx' ? 'Downloading...' : 'Excel'}
          </button>
          <button
            type="button"
            disabled={Boolean(exporting)}
            onClick={() => onExport?.('pdf')}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileText size={13} />
            {exporting === 'pdf' ? 'Downloading...' : 'PDF'}
          </button>
        </div>
      ) : null}
    </div>
  );
}

const STARTERS = [
  'How many sales did I get this month?',
  'How do I set up the homepage popup?',
  'How do I add a navbar dropdown?',
  'Where do I add category banners?',
  'How do I set COD limits?',
];

export default function StoreHelpAgent() {
  const { getToken } = useAuth();
  const [open, setOpen] = useState(() => readStoredHelp().open);
  const [question, setQuestion] = useState('');
  const [sending, setSending] = useState(false);
  const [exporting, setExporting] = useState('');
  const [messages, setMessages] = useState(() => readStoredHelp().messages);
  const [pendingPinQuestion, setPendingPinQuestion] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [pinValue, setPinValue] = useState('');
  const [pinError, setPinError] = useState('');
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const listRef = useRef(null);
  const pinInputRef = useRef(null);
  const canClearChat = messages.some((message) => message.role === 'user');

  const markHelpActivity = () => setLastActivityAt(Date.now());

  const closeHelp = () => {
    setOpen(false);
    setShowPinModal(false);
    setPinValue('');
    setPinError('');
  };

  useEffect(() => {
    try {
      sessionStorage.setItem(HELP_CHAT_STORAGE_KEY, JSON.stringify({
        open,
        messages: messages.slice(-40),
      }));
    } catch {
      // Ignore quota / private-mode write failures.
    }
  }, [open, messages]);

  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!open) return undefined;
    const timer = window.setTimeout(() => {
      closeHelp();
    }, HELP_IDLE_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, lastActivityAt]);

  useEffect(() => {
    if (!showPinModal) return undefined;
    const frame = window.requestAnimationFrame(() => pinInputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [showPinModal]);

  const lastExportQuestion = [...messages].reverse().find((message) => (
    message.role === 'assistant' && message.exportQuestion
  ))?.exportQuestion || pendingPinQuestion || '';

  const sendQuestion = async (value) => {
    const nextQuestion = String(value || question).trim();
    if (!nextQuestion || sending) return;

    setQuestion('');
    markHelpActivity();
    setMessages((prev) => [...prev, { role: 'user', text: nextQuestion }]);
    setSending(true);

    try {
      const token = await getToken();
      const response = await fetch('/api/store/help-agent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          /^\d{6}$/.test(nextQuestion) && pendingPinQuestion
            ? { question: pendingPinQuestion, pin: nextQuestion, pendingQuestion: pendingPinQuestion }
            : {
              question: nextQuestion,
              pendingQuestion: pendingPinQuestion || undefined,
              priorQuestion: lastExportQuestion || undefined,
            },
        ),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check this question');
      }
      if (data.needsPin) {
        setPendingPinQuestion(String(data.pendingQuestion || nextQuestion).trim());
        setShowPinModal(true);
        setPinValue('');
        setPinError('');
        return;
      }
      setPendingPinQuestion('');
      setShowPinModal(false);
      setPinValue('');
      setPinError('');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.answer,
        links: Array.isArray(data.links) ? data.links : [],
        canExport: Boolean(data.canExport),
        exportQuestion: data.question || pendingPinQuestion || nextQuestion,
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: error?.message || 'I could not check that right now.',
      }]);
    } finally {
      setSending(false);
    }
  };

  const clearChat = () => {
    setMessages(DEFAULT_MESSAGES);
    setQuestion('');
    setExporting('');
    setPendingPinQuestion('');
    setShowPinModal(false);
    setPinValue('');
    setPinError('');
    markHelpActivity();
    try {
      sessionStorage.setItem(HELP_CHAT_STORAGE_KEY, JSON.stringify({
        open,
        messages: DEFAULT_MESSAGES,
      }));
    } catch {
      // Ignore quota / private-mode write failures.
    }
  };

  const submitPin = async (value) => {
    const pin = String(value || pinValue).replace(/\D/g, '').slice(0, 6);
    if (pin.length !== 6 || !pendingPinQuestion || sending) return;

    markHelpActivity();
    setSending(true);
    setPinError('');

    try {
      const token = await getToken();
      const response = await fetch('/api/store/help-agent', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: pendingPinQuestion,
          pin,
          pendingQuestion: pendingPinQuestion,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to check this PIN');
      }
      if (data.needsPin) {
        setPinError(data.answer || 'That PIN is not correct.');
        setPinValue('');
        return;
      }
      setShowPinModal(false);
      setPinValue('');
      setPendingPinQuestion('');
      setMessages((prev) => [...prev, {
        role: 'assistant',
        text: data.answer,
        links: Array.isArray(data.links) ? data.links : [],
        canExport: Boolean(data.canExport),
        exportQuestion: data.question || pendingPinQuestion,
      }]);
    } catch (error) {
      setPinError(error?.message || 'I could not check that PIN right now.');
    } finally {
      setSending(false);
    }
  };

  const exportDetails = async (exportQuestion, format) => {
    if (!exportQuestion || exporting) return;
    setExporting(`${format}:${exportQuestion}`);
    try {
      const token = await getToken();
      const response = await fetch('/api/store/help-agent/export', {
        method: 'POST',
        credentials: 'include',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: exportQuestion,
          format,
          priorQuestion: exportQuestion,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || 'Failed to download details');
      }
      const disposition = response.headers.get('content-disposition') || '';
      const fileMatch = disposition.match(/filename="([^"]+)"/);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileMatch?.[1] || `help-orders.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success(format === 'pdf' ? 'PDF downloaded' : 'Excel downloaded');
    } catch (error) {
      toast.error(error?.message || 'Failed to download details');
    } finally {
      setExporting('');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          markHelpActivity();
        }}
        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        aria-label="Open help"
      >
        <CircleHelp size={16} />
        <span className="hidden sm:inline">Help</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[200]" lang="en" dir="ltr">
          <button
            type="button"
            aria-label="Close help"
            className="absolute inset-0 bg-slate-900/30"
            onClick={closeHelp}
          />
          <aside className="absolute inset-y-0 end-0 flex w-full max-w-md flex-col bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Store Help</p>
                <p className="mt-0.5 text-xs text-slate-500">Read-only. Any store account gets live numbers after the PIN.</p>
              </div>
              <div className="flex items-center gap-1">
                {canClearChat ? (
                  <button
                    type="button"
                    onClick={clearChat}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100"
                    aria-label="Clear chat"
                  >
                    <Eraser size={14} />
                    Clear chat
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={closeHelp}
                  className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
                  aria-label="Close help sidebar"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div ref={listRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] rounded-2xl px-3 py-2 text-sm leading-6 ${
                    message.role === 'user'
                      ? 'ms-auto bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-800'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    <HelpMessageBody
                      text={message.text}
                      links={message.links}
                      canExport={Boolean(message.canExport)}
                      exporting={exporting.startsWith('xlsx:') && exporting.endsWith(message.exportQuestion || '') ? 'xlsx'
                        : exporting.startsWith('pdf:') && exporting.endsWith(message.exportQuestion || '') ? 'pdf'
                          : ''}
                      onExport={(format) => exportDetails(message.exportQuestion, format)}
                    />
                  ) : (
                    message.text
                  )}
                </div>
              ))}
              {sending ? (
                <p className="text-xs text-slate-400">Checking…</p>
              ) : null}
            </div>

            <div className="border-t border-slate-200 px-4 py-3">
              <div className="mb-2 flex flex-wrap gap-1.5">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    disabled={sending}
                    onClick={() => sendQuestion(starter)}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-[11px] text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                  >
                    {starter}
                  </button>
                ))}
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendQuestion(question);
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  rows={2}
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
                    event.preventDefault();
                    sendQuestion(question);
                  }}
                  placeholder="Ask about this website, a page, an order, SKU, or pickup"
                  className="min-h-[44px] flex-1 resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-400"
                />
                <button
                  type="submit"
                  disabled={sending || !question.trim()}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40"
                  aria-label="Send question"
                >
                  <Send size={16} />
                </button>
              </form>
            </div>
          </aside>

          {showPinModal ? (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4">
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="help-pin-title"
                className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl"
              >
                <p id="help-pin-title" className="text-sm font-semibold text-slate-900">
                  Super-admin PIN
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Sales and customer details need the PIN. Enter it here to continue.
                </p>
                <form
                  className="mt-4"
                  onSubmit={(event) => {
                    event.preventDefault();
                    submitPin(pinValue);
                  }}
                >
                  <input
                    ref={pinInputRef}
                    type="password"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={pinValue}
                    onChange={(event) => {
                      setPinValue(event.target.value.replace(/\D/g, '').slice(0, 6));
                      setPinError('');
                    }}
                    placeholder="Enter 6-digit PIN"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-center text-lg tracking-[0.35em] outline-none focus:border-emerald-400"
                  />
                  {pinError ? (
                    <p className="mt-2 text-xs text-red-600">{pinError}</p>
                  ) : (
                    <p className="mt-2 text-xs text-slate-400">Chat closes after 2 minutes without a reply.</p>
                  )}
                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPinModal(false);
                        setPinValue('');
                        setPinError('');
                        markHelpActivity();
                      }}
                      className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={sending || pinValue.length !== 6}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-40"
                    >
                      {sending ? 'Checking…' : 'Unlock'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
