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
  teams: [],
  fixtures: [],
  standings: [],
  champions: [],
  contacts: [
    { id: 'contact-sumit', name: 'Sumit', role: 'Tournament Convener', phone: '9609662550' },
    { id: 'contact-deba', name: 'Student Coordinator', phone: '9547069495' }
  ],
  dignitaries: [
    { id: 'dig-1', title: 'CHAIRMAN', role: 'CHIEF PATRON', image: '/assets/dignitaries/chairman.jpg' },
    { id: 'dig-2', title: 'PRINCIPAL', role: 'PATRON & MENTOR', image: '/assets/dignitaries/principal.jpg' },
    { id: 'dig-3', title: 'DEAN OF STUDENTS', role: 'ADVISORY HEAD', image: '/assets/dignitaries/dean.jpg' },
    { id: 'dig-4', title: 'REGISTRAR', role: 'EXECUTIVE CONVENOR', image: '/assets/dignitaries/registrar.jpg' },
    { id: 'dig-5', title: 'DEPUTY REGISTRAR', role: 'CO-CONVENOR', image: '/assets/dignitaries/deputy-registrar.jpg' }
  ],
  registrations: [],
  messages: [],
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
    contacts: Array.isArray(source.contacts) && source.contacts.length ? source.contacts : clone(defaultTournament.contacts),
    dignitaries: Array.isArray(source.dignitaries) && source.dignitaries.length ? source.dignitaries : clone(defaultTournament.dignitaries),
    registrations: Array.isArray(source.registrations) ? source.registrations : [],
    messages: Array.isArray(source.messages) ? source.messages : []
  };
}

function readLocal() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return clone(defaultTournament);
    const parsed = JSON.parse(saved);
    if (parsed && Array.isArray(parsed.teams) && parsed.teams.some(t => t.id === 'team-bbit')) {
      localStorage.removeItem(STORAGE_KEY);
      return clone(defaultTournament);
    }
    return normalise(parsed);
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
  const value = { ...normalise(data), updatedAt: new Date().toISOString() };
  notifyLocalBroadcast(value);

  if (!isCloudEnabled) return writeLocal(value);
  if (!session?.accessToken) {
    // Fallback to local storage when no valid cloud session token
    console.warn('Admin session token missing; saving locally instead of cloud.');
    return writeLocal(value);
  }
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

const realtimeChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('gulabi_devi_realtime') : null;

export function notifyLocalBroadcast(content) {
  if (realtimeChannel) {
    try {
      realtimeChannel.postMessage({ type: 'TOURNAMENT_UPDATED', content });
    } catch (e) {
      console.warn('BroadcastChannel postMessage failed:', e);
    }
  }
}

export function subscribeToRealtime(onUpdate) {
  const handleBroadcast = (event) => {
    if (event.data?.type === 'TOURNAMENT_UPDATED' && event.data?.content) {
      onUpdate(normalise(event.data.content));
    }
  };

  if (realtimeChannel) {
    realtimeChannel.addEventListener('message', handleBroadcast);
  }

  let socket = null;
  let hbInterval = null;
  let reconnectTimeout = null;

  if (isCloudEnabled) {
    const wsUrl = cloud.url.replace(/^http/, 'ws') + `/realtime/v1/websocket?apikey=${cloud.anonKey}&vsn=1.0.0`;

    const connect = () => {
      try {
        socket = new WebSocket(wsUrl);

        socket.onopen = () => {
          const joinMsg = {
            topic: 'realtime:public:tournament_content',
            event: 'phx_join',
            payload: {
              config: {
                postgres_changes: [
                  { event: '*', schema: 'public', table: 'tournament_content' }
                ]
              }
            },
            ref: '1'
          };
          socket.send(JSON.stringify(joinMsg));

          hbInterval = setInterval(() => {
            if (socket?.readyState === WebSocket.OPEN) {
              socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: 'hb' }));
            }
          }, 25000);
        };

        socket.onmessage = (e) => {
          try {
            const msg = JSON.parse(e.data);
            if (msg.event === 'postgres_changes' || msg.event === 'UPDATE' || msg.event === 'INSERT') {
              const record = msg.payload?.data || msg.payload?.record || msg.payload?.new;
              if (record?.content) {
                onUpdate(normalise(record.content));
              } else {
                loadTournament().then(data => onUpdate(data)).catch(() => {});
              }
            }
          } catch {}
        };

        socket.onclose = () => {
          if (hbInterval) clearInterval(hbInterval);
          reconnectTimeout = setTimeout(connect, 5000);
        };

        socket.onerror = () => {
          try { socket?.close(); } catch {}
        };
      } catch {}
    };

    connect();
  }

  return () => {
    if (realtimeChannel) realtimeChannel.removeEventListener('message', handleBroadcast);
    if (hbInterval) clearInterval(hbInterval);
    if (reconnectTimeout) clearTimeout(reconnectTimeout);
    if (socket) {
      socket.onclose = null;
      try { socket.close(); } catch {}
    }
  };
}

export async function submitPublicRegistration(registration) {
  const regWithTime = {
    ...registration,
    submittedAt: registration.submittedAt || new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
  };
  if (isCloudEnabled) {
    try {
      await request('/rest/v1/rpc/submit_tournament_registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_reg: regWithTime })
      });
      const current = readLocal();
      const updatedRegs = [regWithTime, ...(current.registrations || []).filter(r => r.id !== regWithTime.id)];
      const updated = writeLocal({ ...current, registrations: updatedRegs });
      notifyLocalBroadcast(updated);
      return;
    } catch (e) {
      console.warn('RPC submit registration failed, using local storage fallback:', e);
    }
  }
  const current = readLocal();
  const updatedRegs = [regWithTime, ...(current.registrations || []).filter(r => r.id !== regWithTime.id)];
  const updated = writeLocal({ ...current, registrations: updatedRegs });
  notifyLocalBroadcast(updated);
}

export async function submitPublicMessage(message) {
  const msgWithTime = {
    ...message,
    submittedAt: message.submittedAt || new Date().toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
  };
  if (isCloudEnabled) {
    try {
      await request('/rest/v1/rpc/submit_tournament_message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_msg: msgWithTime })
      });
      const current = readLocal();
      const updatedMsgs = [msgWithTime, ...(current.messages || []).filter(m => m.id !== msgWithTime.id)];
      const updated = writeLocal({ ...current, messages: updatedMsgs });
      notifyLocalBroadcast(updated);
      return;
    } catch (e) {
      console.warn('RPC submit message failed, using local storage fallback:', e);
    }
  }
  const current = readLocal();
  const updatedMsgs = [msgWithTime, ...(current.messages || []).filter(m => m.id !== msgWithTime.id)];
  const updated = writeLocal({ ...current, messages: updatedMsgs });
  notifyLocalBroadcast(updated);
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
