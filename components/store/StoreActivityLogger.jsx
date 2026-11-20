'use client';

import { useEffect } from 'react';
import axios from 'axios';
import {
  shouldSkipStoreActivityPath,
  summarizeStoreActivityPayload,
} from '@/lib/storeActivityDescribe';

const MUTATING = new Set(['post', 'put', 'patch', 'delete']);

function requestPath(url = '') {
  try {
    const parsed = String(url || '').startsWith('http')
      ? new URL(url)
      : new URL(url, 'https://store.local');
    return parsed.pathname || '';
  } catch {
    return String(url || '').split('?')[0];
  }
}

function readHeader(headers, name) {
  if (!headers) return '';
  if (typeof headers.get === 'function') {
    return headers.get(name) || headers.get(name.toLowerCase()) || '';
  }
  const key = Object.keys(headers).find((entry) => entry.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : '';
}

function readAuthHeader(headers) {
  return readHeader(headers, 'authorization');
}

function isNextRouterFetch(input, init) {
  const headers = init?.headers || input?.headers;
  if (readHeader(headers, 'rsc') || readHeader(headers, 'next-url') || readHeader(headers, 'next-router-state-tree')) {
    return true;
  }
  const raw = typeof input === 'string' ? input : input?.url || input?.href || '';
  const url = String(raw || '');
  return url.includes('_rsc=') || url.includes('/_next/');
}

function readRequestPayload(data) {
  if (!data) return null;
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    return { upload: 'file' };
  }
  if (typeof data === 'string') {
    try {
      return JSON.parse(data);
    } catch {
      return null;
    }
  }
  return data;
}

function logStoreChange({ method, path, status, authorization, payload }) {
  if (!MUTATING.has(method)) return;
  if (!path.startsWith('/api/store/') || shouldSkipStoreActivityPath(path)) return;
  if (Number(status) >= 400) return;

  const { summary, details, itemName } = summarizeStoreActivityPayload(payload);

  axios.post(
    '/api/store/activity-log',
    {
      method,
      path,
      pagePath: typeof window !== 'undefined' ? window.location.pathname : '',
      status,
      summary,
      details,
      itemName,
    },
    authorization ? { headers: { Authorization: authorization } } : {},
  ).catch(() => {});
}

export default function StoreActivityLogger() {
  useEffect(() => {
    const interceptor = axios.interceptors.response.use((response) => {
      try {
        const config = response.config || {};
        logStoreChange({
          method: String(config.method || 'get').toLowerCase(),
          path: requestPath(config.url),
          status: response.status,
          authorization: readAuthHeader(config.headers),
          payload: readRequestPayload(config.data),
        });
      } catch {
        // Never block dashboard work if logging fails.
      }
      return response;
    });

    const alreadyWrapped = Boolean(window.fetch?.__storeActivityWrapped);
    const originalFetch = alreadyWrapped ? null : window.fetch.bind(window);
    if (!alreadyWrapped) {
      const wrappedFetch = (input, init) => {
        const request = init === undefined ? originalFetch(input) : originalFetch(input, init);
        if (isNextRouterFetch(input, init)) return request;
        return request.then((response) => {
          try {
            const url = typeof input === 'string' ? input : input?.url || input?.href;
            logStoreChange({
              method: String(init?.method || input?.method || 'GET').toLowerCase(),
              path: requestPath(url),
              status: response.status,
              authorization: readAuthHeader(init?.headers || input?.headers),
              payload: readRequestPayload(init?.body),
            });
          } catch {
            // Ignore logging failures.
          }
          return response;
        });
      };
      wrappedFetch.__storeActivityWrapped = true;
      window.fetch = wrappedFetch;
    }

    return () => {
      axios.interceptors.response.eject(interceptor);
      if (originalFetch) window.fetch = originalFetch;
    };
  }, []);

  return null;
}
