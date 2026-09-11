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
    status: 'Registration open',
    registrationOpen: true,
    entryFee: 3000,
    format: 'League-cum-Knockout',
    matchType: '11-a-side Football',
    venue: 'BBIT Football Ground',
    address: 'Budge Budge Institute of Technology, Nischintapur, Budge Budge, Kolkata, West Bengal 700137',
    mapLink: 'https://maps.google.com/?q=Budge+Budge+Institute+of+Technology',
    about: 'The 14th edition of Gulabi Devi Memorial Cup brings together top collegiate football teams across West Bengal for an intense 4-day festival of skill, passion, and sportsmanship.',
    registrationNote: 'Fill out the online registration form below or call the tournament convener team directly.'
  },
  teams: [
    { id: 'team-bbit', name: 'BBIT Strikers', shortName: 'BBIT', city: 'Budge Budge Institute of Technology', group: 'Group A' },
    { id: 'team-heritage', name: 'Heritage Tigers', shortName: 'HIT', city: 'Heritage Institute of Technology', group: 'Group A' },
    { id: 'team-techno', name: 'Techno Main Strikers', shortName: 'TMS', city: 'Techno Main Salt Lake', group: 'Group B' },
    { id: 'team-iem', name: 'IEM Warriors', shortName: 'IEM', city: 'Institute of Engineering & Management', group: 'Group B' },
    { id: 'team-ju', name: 'Jadavpur Panthers', shortName: 'JU', city: 'Jadavpur University', group: 'Group A' },
    { id: 'team-cu', name: 'Calcutta University FC', shortName: 'CU', city: 'Calcutta University', group: 'Group B' }
  ],
  fixtures: [
    { id: 'fix-1', stage: 'Group Stage', date: '25 Sep 2026', time: '10:00 AM', home: 'BBIT Strikers', away: 'Heritage Tigers', venue: 'BBIT Ground (Pitch A)', status: 'scheduled', homeScore: 0, awayScore: 0 },
    { id: 'fix-2', stage: 'Group Stage', date: '25 Sep 2026', time: '02:00 PM', home: 'Techno Main Strikers', away: 'IEM Warriors', venue: 'BBIT Ground (Pitch B)', status: 'scheduled', homeScore: 0, awayScore: 0 },
    { id: 'fix-3', stage: 'Quarter-Final', date: '27 Sep 2026', time: '11:00 AM', home: 'BBIT Strikers', away: 'IEM Warriors', venue: 'BBIT Main Pitch', status: 'scheduled', homeScore: 0, awayScore: 0 },
    { id: 'fix-4', stage: 'Semi-Final', date: '27 Sep 2026', time: '03:30 PM', home: 'BBIT Strikers', away: 'Jadavpur Panthers', venue: 'BBIT Main Pitch', status: 'scheduled', homeScore: 0, awayScore: 0 },
    { id: 'fix-5', stage: 'Grand Final', date: '28 Sep 2026', time: '04:00 PM', home: 'BBIT Strikers', away: 'Heritage Tigers', venue: 'BBIT Main Pitch', status: 'scheduled', homeScore: 0, awayScore: 0 }
  ],
  standings: [
    { id: 'std-1', team: 'BBIT Strikers', played: 3, wins: 3, draws: 0, losses: 0, gf: 8, ga: 1, points: 9 },
    { id: 'std-2', team: 'Jadavpur Panthers', played: 3, wins: 2, draws: 0, losses: 1, gf: 5, ga: 3, points: 6 },
    { id: 'std-3', team: 'Heritage Tigers', played: 3, wins: 1, draws: 0, losses: 2, gf: 3, ga: 5, points: 3 },
    { id: 'std-4', team: 'Techno Main Strikers', played: 3, wins: 0, draws: 0, losses: 3, gf: 1, ga: 8, points: 0 }
  ],
  champions: [
    { id: 'champ-13', year: '2025', winner: 'BBIT Strikers', runnerUp: 'Jadavpur Panthers' },
    { id: 'champ-12', year: '2024', winner: 'Heritage Tigers', runnerUp: 'BBIT Strikers' },
    { id: 'champ-11', year: '2023', winner: 'Calcutta University FC', runnerUp: 'Techno Main Strikers' }
  ],
  contacts: [
    { id: 'contact-sumit', name: 'Sumit', role: 'Tournament Convener', phone: '9609662550' },
    { id: 'contact-deba', name: 'Student Coordinator', phone: '9547069495' }
  ],
  registrations: [],
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
    teams: Array.isArray(source.teams) && source.teams.length ? source.teams : clone(defaultTournament.teams),
    fixtures: Array.isArray(source.fixtures) && source.fixtures.length ? source.fixtures : clone(defaultTournament.fixtures),
    standings: Array.isArray(source.standings) && source.standings.length ? source.standings : clone(defaultTournament.standings),
    champions: Array.isArray(source.champions) && source.champions.length ? source.champions : clone(defaultTournament.champions),
    contacts: Array.isArray(source.contacts) && source.contacts.length ? source.contacts : clone(defaultTournament.contacts),
    registrations: Array.isArray(source.registrations) && source.registrations.length ? source.registrations : clone(defaultTournament.registrations)
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
  if (!session?.accessToken) {
    // Fallback to local storage when no valid cloud session token
    console.warn('Admin session token missing; saving locally instead of cloud.');
    return writeLocal(data);
  }
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
