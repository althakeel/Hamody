import StoreActivityLog from '@/models/StoreActivityLog';
import Store from '@/models/Store';
import StoreUser from '@/models/StoreUser';
import User from '@/models/User';
import { getAuth } from '@/lib/firebase-admin';
import { isAdminEmail } from '@/lib/adminEmails';
import {
  describeStoreActivity,
  explainStoreActivity,
  normalizeActivityPath,
  shouldSkipStoreActivityPath,
} from '@/lib/storeActivityDescribe';

export {
  describeStoreActivity,
  normalizeActivityPath,
  shouldSkipStoreActivityPath,
  summarizeStoreActivityPayload,
} from '@/lib/storeActivityDescribe';

const DUBAI_OFFSET_HOURS = 4;

export function canViewStoreActivityHistory(email = '', permissions = {}) {
  if (isAdminEmail(email)) return true;
  return permissions?.viewActivityHistory === true;
}

function dubaiParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const read = (type) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: read('year'), month: read('month'), day: read('day') };
}

export function startOfDubaiDay(date = new Date()) {
  const { year, month, day } = dubaiParts(date);
  return new Date(Date.UTC(year, month - 1, day, -DUBAI_OFFSET_HOURS, 0, 0, 0));
}

export function endOfDubaiDay(date = new Date()) {
  const start = startOfDubaiDay(date);
  return new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
}

function parseDateInput(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00+04:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function buildActivityLogQuery({
  storeId = '',
  actorUserId = '',
  range = 'all',
  fromDate = '',
  toDate = '',
  q = '',
} = {}) {
  const query = { storeId: String(storeId) };

  if (actorUserId) query.actorUserId = String(actorUserId);

  const search = String(q || '').trim();
  if (search) {
    query.$or = [
      { actorName: { $regex: search, $options: 'i' } },
      { actorEmail: { $regex: search, $options: 'i' } },
      { action: { $regex: search, $options: 'i' } },
      { summary: { $regex: search, $options: 'i' } },
      { path: { $regex: search, $options: 'i' } },
      { pagePath: { $regex: search, $options: 'i' } },
    ];
  }

  const now = new Date();
  if (range === 'today') {
    query.createdAt = { $gte: startOfDubaiDay(now), $lte: endOfDubaiDay(now) };
  } else if (range === 'week') {
    const weekStart = new Date(startOfDubaiDay(now).getTime() - 6 * 24 * 60 * 60 * 1000);
    query.createdAt = { $gte: weekStart, $lte: endOfDubaiDay(now) };
  } else {
    const from = parseDateInput(fromDate);
    const to = parseDateInput(toDate);
    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = startOfDubaiDay(from);
      if (to) query.createdAt.$lte = endOfDubaiDay(to);
    }
  }

  return query;
}

export function formatActivityLogRow(row = {}, names = {}) {
  const path = row.path || '';
  const isInsights = /\/dashboard\/insights/.test(path);
  const explained = explainStoreActivity(row, names);
  const details = (explained.details || [])
    .map((item) => String(item || '').trim())
    .filter(Boolean);

  return {
    _id: String(row._id),
    storeId: String(row.storeId || ''),
    actorUserId: String(row.actorUserId || ''),
    actorEmail: String(row.actorEmail || ''),
    actorName: String(row.actorName || ''),
    actorRole: row.actorRole || 'unknown',
    method: String(row.method || '').toUpperCase(),
    path,
    pagePath: row.pagePath || '',
    action: isInsights ? 'Generated AI insights' : (explained.action || row.action || describeStoreActivity(row)),
    summary: isInsights
      ? 'Refreshed dashboard recommendations. No store settings were changed.'
      : (details.join(' · ') || row.summary || ''),
    details,
    ip: String(row.ip || '').trim(),
    status: Number(row.status || 200),
    createdAt: row.createdAt || null,
  };
}

function headerClientIp(request) {
  const forwarded = request?.headers?.get?.('x-forwarded-for') || '';
  const candidates = [
    request?.headers?.get?.('cf-connecting-ip'),
    forwarded.split(',')[0],
    request?.headers?.get?.('x-real-ip'),
    request?.headers?.get?.('x-vercel-forwarded-for'),
    request?.ip,
  ];

  for (const candidate of candidates) {
    const ip = String(candidate || '').trim().replace(/^::ffff:/, '');
    if (ip) return ip.slice(0, 80);
  }
  return '';
}

function isLoopbackIp(ip = '') {
  const value = String(ip || '').trim().toLowerCase();
  return !value || value === '::1' || value === '127.0.0.1' || value === 'localhost' || value === 'unknown';
}

let cachedPublicIp = { value: '', at: 0 };

async function lookupPublicIp() {
  if (cachedPublicIp.value && Date.now() - cachedPublicIp.at < 5 * 60 * 1000) {
    return cachedPublicIp.value;
  }

  const response = await fetch('https://api.ipify.org?format=json', {
    cache: 'no-store',
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return '';
  const data = await response.json().catch(() => ({}));
  const ip = String(data?.ip || '').trim().slice(0, 80);
  if (!ip) return '';
  cachedPublicIp = { value: ip, at: Date.now() };
  return ip;
}

/** Proxy headers are empty on local dev, so fall back to a public IP lookup. */
export async function resolveActivityClientIp(request) {
  const fromHeaders = headerClientIp(request);
  if (!isLoopbackIp(fromHeaders)) return fromHeaders;

  try {
    return (await lookupPublicIp()) || fromHeaders;
  } catch {
    return fromHeaders;
  }
}

export async function recordStoreActivity(entry = {}) {
  try {
    const storeId = String(entry.storeId || '').trim();
    const path = normalizeActivityPath(entry.path);
    if (!storeId || !path || shouldSkipStoreActivityPath(path)) return null;

    const method = String(entry.method || 'POST').toLowerCase();
    if (!['post', 'put', 'patch', 'delete'].includes(method)) return null;

    await StoreActivityLog.create({
      storeId,
      actorUserId: String(entry.actorUserId || ''),
      actorEmail: String(entry.actorEmail || '').trim().toLowerCase(),
      actorName: String(entry.actorName || entry.actorEmail || 'Store user').trim(),
      actorRole: ['owner', 'admin', 'member'].includes(entry.actorRole) ? entry.actorRole : 'unknown',
      method: method.toUpperCase(),
      path,
      pagePath: normalizeActivityPath(entry.pagePath),
      action: String(entry.action || describeStoreActivity({ method, path, pagePath: entry.pagePath })).slice(0, 240),
      summary: String(entry.summary || '').trim().slice(0, 800),
      status: Number(entry.status || 200),
      ip: String(entry.ip || '').trim().slice(0, 80),
      metadata: entry.metadata && typeof entry.metadata === 'object' ? entry.metadata : {},
    });
  } catch (error) {
    console.warn('[recordStoreActivity] failed:', error?.message || error);
  }
  return null;
}

function usableProfileName(value = '') {
  const name = String(value || '').trim();
  if (!name || name.toLowerCase() === 'unknown' || name.includes('@')) return '';
  return name;
}

async function profileNamesByUserId(userIds = []) {
  const ids = [...new Set(userIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const names = new Map();
  if (!ids.length) return names;

  const profiles = await User.find({ _id: { $in: ids } }).select('name').lean();
  profiles.forEach((profile) => {
    const name = usableProfileName(profile.name);
    if (name) names.set(String(profile._id), name);
  });

  const missingIds = ids.filter((id) => !names.get(id));
  if (!missingIds.length) return names;

  try {
    const auth = getAuth();
    for (let index = 0; index < missingIds.length; index += 100) {
      const chunk = missingIds.slice(index, index + 100);
      const result = await auth.getUsers(chunk.map((uid) => ({ uid })));
      (result.users || []).forEach((user) => {
        const name = usableProfileName(user.displayName);
        if (name) names.set(user.uid, name);
      });
    }
  } catch {
    // The member list still loads if Firebase profile names are unavailable.
  }

  return names;
}

async function profileNameByEmail(email = '') {
  const normalized = String(email || '').trim().toLowerCase();
  if (!normalized) return '';
  try {
    const user = await getAuth().getUserByEmail(normalized);
    return usableProfileName(user.displayName);
  } catch {
    return '';
  }
}

export async function listActivityActors(storeId) {
  const store = await Store.findById(String(storeId)).select('userId name').lean();
  const owner = store?.userId
    ? await User.findById(String(store.userId)).select('name email').lean()
    : null;
  const members = await StoreUser.find({
    storeId: String(storeId),
    status: { $in: ['approved', 'pending'] },
  }).select('userId email username role').lean();

  const namesById = await profileNamesByUserId([
    store?.userId,
    ...members.map((member) => member.userId),
  ]);

  const actors = [];
  const seen = new Set();

  const pushActor = (userId, name, email, role) => {
    const id = String(userId || email || '').trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    actors.push({
      id,
      userId: String(userId || ''),
      name: String(name || '').trim(),
      email: String(email || '').trim().toLowerCase(),
      role: role || 'member',
    });
  };

  if (store?.userId) {
    pushActor(
      store.userId,
      namesById.get(String(store.userId)) || usableProfileName(owner?.name) || 'Store owner',
      owner?.email || '',
      'owner',
    );
  }

  for (const member of members) {
    const userId = String(member.userId || '').trim();
    let name = namesById.get(userId) || usableProfileName(member.username);
    if (!name && member.email) name = await profileNameByEmail(member.email);
    pushActor(
      userId || member._id,
      name,
      member.email,
      member.role === 'admin' ? 'admin' : 'member',
    );
  }

  return actors;
}
