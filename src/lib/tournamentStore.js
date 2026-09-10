const STORAGE_KEY = 'gulabi-devi-tournament-content-v1';
const SESSION_KEY = 'gulabi-devi-admin-session-v1';

const cloud = {
  url: import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, ''),
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY
};

export const isCloudEnabled = Boolean(cloud.url && cloud.anonKey);

export const defaultTournament = {
  settings: {
    name: 'Gulabi Devi Memorial Cup',
    edition: '14th Edition',
    year: '2026',
    organizer: 'Budge Budge Institute of Technology',
    date: '25-28 Sep 2026',
    status: 'Registration opening soon',
    registrationOpen: false,
    entryFee: 3000,
    format: 'League-cum-Knockout',
    matchType: '11-a-side Football',
    venue: 'BBIT Football Ground',
    address: 'Budge Budge Institute of Technology, Nischintapur, Budge Budge, Kolkata, West Bengal',
    mapLink: 'https://share.google/cbsoChs9leBAwYUwF',
    about: 'An annual inter-college championship celebrating competition, campus pride and the beautiful game.',
    registrationNote: 'Contact the tournament office to receive the official registration instructions.'
  },
  teams: [],
  fixtures: [],
  standings: [],
  champions: [],
  contacts: [
    { id: 'contact-sumit', name: 'Sumit', role: 'Tournament contact', phone: '9609662550' },
    { id: 'contact-deba', name: 'Deba', role: 'Tournament contact', phone: '9547069495' }
  ],
  updatedAt: null
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const makeId = (prefix) => `${prefix}-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`}`;

function normalise(data) {
  const source = data && typeof data === 'object' ? data : {};
  return {
    ...clone(defaultTournament),
    ...source,
    settings: { ...defaultTournament.settings, ...(source.settings || {}) },
    teams: Array.isArray(source.teams) ? source.teams : [],
    fixtures: Array.isArray(source.fixtures) ? source.fixtures : [],
    standings: Array.isArray(source.standings) ? source.standings : [],
    champions: Array.isArray(source.champions) ? source.champions : [],
    contacts: Array.isArray(source.contacts) ? source.contacts : clone(defaultTournament.contacts)
  };
}

function readLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? normalise(JSON.parse(saved)) : clone(defaultTournament);
  } catch {
    return clone(defaultTournament);
  }
}

function writeLocal(data) {
  const value = { ...normalise(data), updatedAt: new Date().toISOString() };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  return value;
}

async function request(path, options = {}, token) {
  const response = await fetch(`${cloud.url}${path}`, {
    ...options,
    headers: {
      apikey: cloud.anonKey,
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || 'The secure data service could not complete that request.');
  }
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : null;
}

export async function loadTournament() {
  if (!isCloudEnabled) return readLocal();
  const data = await request('/rest/v1/tournament_content?id=eq.main&select=content');
  return data?.[0]?.content ? normalise(data[0].content) : clone(defaultTournament);
}

export async function saveTournament(data, session) {
  if (!isCloudEnabled) return writeLocal(data);
  if (!session?.accessToken) throw new Error('Your secure admin session has expired. Please sign in again.');
  const value = { ...normalise(data), updatedAt: new Date().toISOString() };
  await request('/rest/v1/tournament_content?on_conflict=id', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal'
    },
    body: JSON.stringify({ id: 'main', content: value, updated_at: value.updatedAt })
  }, session.accessToken);
  return value;
}

export async function signIn(email, password) {
  if (!isCloudEnabled) {
    if (!email || !password) throw new Error('Enter an email and password to open local preview mode.');
    const session = { email, local: true };
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return session;
  }
  const data = await request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const session = { email: data.user?.email || email, accessToken: data.access_token, refreshToken: data.refresh_token };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

export function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

export function signOut() { sessionStorage.removeItem(SESSION_KEY); }
export { makeId };
