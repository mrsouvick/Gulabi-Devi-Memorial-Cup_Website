import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert,
  Cloud, ExternalLink, History, LayoutDashboard, LockKeyhole, LogOut, MapPin, Menu,
  Pencil, Phone, Plus, Radio, Save, Settings, ShieldCheck, Table2, Trophy, Trash2, Users, X,
  Zap, Play, Pause, Square, Minus, Timer, Clock, RotateCcw, FastForward
} from 'lucide-react';
import { defaultTournament, getSession, isCloudEnabled, loadTournament, makeId, saveTournament, signIn, signOut, submitPublicRegistration, submitPublicMessage, subscribeToRealtime } from './lib/tournamentStore';
import './styles.css';

const logo = '/assets/tournament-logo.jpg';
const collegeLogo = '/assets/bbit-college-logo.png';
const heroImage = '/assets/football-hero-background.png';
const poster = '/assets/tournament-poster-final.png';

const dignitaries = [
  { id: 'dig-1', title: 'CHAIRMAN', role: 'CHIEF PATRON', image: '/assets/dignitaries/chairman.jpg' },
  { id: 'dig-2', title: 'PRINCIPAL', role: 'PATRON & MENTOR', image: '/assets/dignitaries/principal.jpg' },
  { id: 'dig-3', title: 'DEAN OF STUDENTS', role: 'ADVISORY HEAD', image: '/assets/dignitaries/dean.jpg' },
  { id: 'dig-4', title: 'REGISTRAR', role: 'EXECUTIVE CONVENOR', image: '/assets/dignitaries/registrar.jpg' },
  { id: 'dig-5', title: 'DEPUTY REGISTRAR', role: 'CO-CONVENOR', image: '/assets/dignitaries/deputy-registrar.jpg' }
];

const publicRoutes = [
  ['Home', '/'], ['Teams', '/teams'], ['Fixtures', '/fixtures'], ['Standings', '/standings'],
  ['History', '/history'], ['Venue', '/venue'], ['Contact', '/contact']
];

const adminSections = [
  ['dashboard', 'Overview', LayoutDashboard], ['live', 'Live Match Console', Radio], ['settings', 'Tournament', Settings],
  ['teams', 'Teams', Users], ['fixtures', 'Fixtures', CalendarDays], ['standings', 'Standings', Table2],
  ['champions', 'History', History], ['contacts', 'Contacts', Phone], ['dignitaries', 'Patrons', Users],
  ['messages', 'Messages', Phone], ['registrations', 'Registrations', Users]
];

function routeFromLocation() {
  const hash = window.location.hash.replace(/^#/, '');
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const normalizedPath = hash ? (hash.startsWith('/') ? hash : '/' + hash) : path;
  const validRoutes = ['/', '/teams', '/fixtures', '/standings', '/history', '/venue', '/register', '/contact', '/admin'];
  return validRoutes.includes(normalizedPath) ? normalizedPath : '/';
}

function App() {
  const [tournament, setTournament] = useState(null);
  const [route, setRoute] = useState(routeFromLocation());
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let alive = true;
    const fetchLatest = (silent = false) => {
      loadTournament().then((data) => {
        if (alive) setTournament(data);
      }).catch((error) => {
        if (alive && !silent) {
          setTournament(defaultTournament);
          setNotice({ type: 'error', text: error.message || 'Could not load tournament information.' });
        }
      });
    };

    fetchLatest();

    // Real-time subscription (Supabase WebSocket + BroadcastChannel cross-tab sync)
    const unsubscribe = subscribeToRealtime((data) => {
      if (alive && data) {
        setTournament(data);
      }
    });

    // Adaptive polling: 3s when live match present, 6s standard
    const isAnyMatchLive = Boolean(tournament?.fixtures?.some(f => f.status === 'live'));
    const pollIntervalMs = isAnyMatchLive ? 3000 : 6000;
    const interval = setInterval(() => fetchLatest(true), pollIntervalMs);

    const onFocus = () => fetchLatest(true);
    const onLocationChange = () => { setRoute(routeFromLocation()); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    window.addEventListener('focus', onFocus);
    window.addEventListener('popstate', onLocationChange);
    window.addEventListener('hashchange', onLocationChange);
    return () => {
      alive = false;
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('popstate', onLocationChange);
      window.removeEventListener('hashchange', onLocationChange);
    };
  }, [tournament?.fixtures?.some(f => f.status === 'live')]);

  const go = (next) => {
    if (window.location.pathname !== next) {
      window.history.pushState({}, '', next);
      setRoute(next);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const persist = async (next) => {
    try {
      const saved = await saveTournament(next, getSession());
      setTournament(saved);
      setNotice({ type: 'success', text: 'Saved. The public website now has the latest information.' });
      return saved;
    } catch (error) {
      setNotice({ type: 'error', text: error.message || 'Could not save changes.' });
      throw error;
    }
  };

  if (!tournament) return <LoadingScreen />;
  if (route === '/admin') return <AdminPortal tournament={tournament} save={persist} go={go} notice={notice} setNotice={setNotice} />;
  return <PublicSite tournament={tournament} route={route} go={go} notice={notice} setNotice={setNotice} save={persist} />;
}

function LoadingScreen() {
  return <div className="loading-screen"><img src={logo} alt="" /><p>Loading tournament desk...</p></div>;
}

function PublicSite({ tournament, route, go, notice, setNotice, save }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = tournament.settings;
  const navigate = (next) => { setMenuOpen(false); go(next); };
  return <div className="public-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="public-header">
      <button className="public-brand" onClick={() => navigate('/')} aria-label="Tournament home"><img src={logo} alt="Gulabi Devi Cup" /><span>{settings.name}<small>{settings.edition} / {settings.year}</small></span></button>
      <nav className="public-nav" aria-label="Primary navigation">{publicRoutes.map(([label, target]) => <button className={route === target ? 'active' : ''} key={target} onClick={() => navigate(target)}>{label}</button>)}</nav>
      <button className="public-cta" onClick={() => navigate('/register')}>Register <ArrowUpRight size={15} /></button>
      <button className="public-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open navigation">{menuOpen ? <X /> : <Menu />}</button>
    </header>
    {menuOpen && <div className="public-mobile-nav">{publicRoutes.map(([label, target]) => <button key={target} onClick={() => navigate(target)}>{label}<ChevronRight size={17} /></button>)}<button onClick={() => navigate('/register')}>Register your team <ArrowUpRight size={17} /></button></div>}
    <LiveMatchdayBanner fixtures={tournament.fixtures} teams={tournament.teams} go={navigate} />
    <main id="main-content">
      <Toast notice={notice} dismiss={() => setNotice(null)} />
      {route === '/' && <Home tournament={tournament} go={navigate} />}
      {route === '/teams' && <TeamsPage teams={tournament.teams} go={navigate} />}
      {route === '/fixtures' && <FixturesPage fixtures={tournament.fixtures} teams={tournament.teams} go={navigate} />}
      {route === '/standings' && <StandingsPage standings={tournament.standings} teams={tournament.teams} />}
      {route === '/history' && <HistoryPage champions={tournament.champions} />}
      {route === '/venue' && <VenuePage settings={settings} />}
      {route === '/register' && <RegisterPage tournament={tournament} settings={settings} contacts={tournament.contacts} registrations={tournament.registrations} save={save} go={navigate} />}
      {route === '/contact' && <ContactPage tournament={tournament} contacts={tournament.contacts} settings={settings} save={save} />}
    </main>
    <PublicFooter settings={settings} go={navigate} />
  </div>;
}

// 60-Minute Professional Tournament Timer Helpers (Two 30-minute halves)
export function calculateElapsedSeconds(fixture, now = Date.now()) {
  if (!fixture) return 0;
  const base = Number(fixture.timerBaseSeconds) || 0;
  if (!fixture.timerRunning || !fixture.timerStartedAt) {
    return base;
  }
  const started = new Date(fixture.timerStartedAt).getTime();
  if (isNaN(started)) return base;
  const diff = Math.max(0, Math.floor((now - started) / 1000));
  return base + diff;
}

export function formatClockTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getMatchMinuteString(totalSeconds, period, status) {
  if (status === 'completed' || period === 'FT') return 'FT';
  if (period === 'HT') return 'HT';

  if (period === '1H') {
    if (totalSeconds > 1800) {
      const extraMin = Math.ceil((totalSeconds - 1800) / 60);
      return `30'+${extraMin}'`;
    }
    const min = Math.min(30, Math.max(1, Math.floor(totalSeconds / 60) + 1));
    return `${min}'`;
  }

  if (period === '2H') {
    if (totalSeconds > 3600) {
      const extraMin = Math.ceil((totalSeconds - 3600) / 60);
      return `60'+${extraMin}'`;
    }
    const min = Math.min(60, Math.max(31, Math.floor(totalSeconds / 60) + 1));
    return `${min}'`;
  }

  const min = Math.min(60, Math.max(1, Math.floor(totalSeconds / 60) + 1));
  return `${min}'`;
}

export function useMatchClock(fixture) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!fixture?.timerRunning) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [fixture?.timerRunning, fixture?.timerStartedAt]);

  return useMemo(() => {
    if (!fixture) {
      return {
        clock: "00:00",
        minute: "0'",
        period: null,
        periodLabel: "Scheduled",
        isRunning: false,
        totalSeconds: 0
      };
    }

    const { status, timerRunning, period, minute: manualMinute } = fixture;
    const totalSeconds = calculateElapsedSeconds(fixture, now);

    let activePeriod = period;
    if (!activePeriod) {
      if (status === 'completed' || manualMinute === 'FT') activePeriod = 'FT';
      else if (manualMinute === 'HT') activePeriod = 'HT';
      else if (status === 'live') activePeriod = totalSeconds >= 1800 ? '2H' : '1H';
    }

    if (status === 'completed' || activePeriod === 'FT') {
      return {
        clock: "60:00",
        minute: "FT",
        period: "FT",
        periodLabel: "Full Time (60m)",
        isRunning: false,
        totalSeconds: 3600
      };
    }

    if (activePeriod === 'HT') {
      return {
        clock: "30:00",
        minute: "HT",
        period: "HT",
        periodLabel: "Half-Time Break",
        isRunning: false,
        totalSeconds: 1800
      };
    }

    const clock = formatClockTime(totalSeconds);
    const minuteStr = getMatchMinuteString(totalSeconds, activePeriod, status);

    let periodLabel = "Scheduled";
    if (activePeriod === '1H') periodLabel = "1st Half (0–30m)";
    else if (activePeriod === '2H') periodLabel = "2nd Half (30–60m)";

    return {
      clock,
      minute: manualMinute && !['1H', '2H'].includes(activePeriod) ? manualMinute : minuteStr,
      period: activePeriod,
      periodLabel,
      isRunning: Boolean(timerRunning),
      totalSeconds
    };
  }, [fixture, now]);
}

function MatchTimerBadge({ fixture, size = 'normal', showPeriod = true }) {
  const { clock, minute, period, isRunning } = useMatchClock(fixture);
  const isCompleted = fixture?.status === 'completed' || period === 'FT';
  const isHT = period === 'HT' || fixture?.minute === 'HT';

  if (isCompleted) {
    return (
      <span className={`match-timer-badge ${size} completed`}>
        <span className="timer-badge-text">FT (60')</span>
      </span>
    );
  }

  if (isHT) {
    return (
      <span className={`match-timer-badge ${size} ht`}>
        <Pause size={size === 'compact' ? 10 : 12} />
        <span className="timer-badge-text">HALF-TIME (30:00)</span>
      </span>
    );
  }

  if (fixture?.status === 'live') {
    return (
      <span className={`match-timer-badge ${size} ${isRunning ? 'running' : 'paused'}`}>
        <span className={`timer-pulse-dot ${isRunning ? 'pulse' : 'frozen'}`} />
        <strong className="timer-clock-digits">{clock}</strong>
        <span className="timer-minute-tag">({minute})</span>
        {showPeriod && size !== 'compact' && (
          <span className="timer-period-tag">{period === '2H' ? '2ND HALF' : '1ST HALF'}</span>
        )}
        {!isRunning && <span className="timer-paused-tag">PAUSED</span>}
      </span>
    );
  }

  return null;
}

export function getTeamLogo(teamName, teams = []) {
  if (!teamName || !Array.isArray(teams)) return null;
  const normalized = teamName.trim().toLowerCase();
  const match = teams.find(t => 
    (t.name && t.name.trim().toLowerCase() === normalized) ||
    (t.shortName && t.shortName.trim().toLowerCase() === normalized) ||
    (t.city && t.city.trim().toLowerCase() === normalized)
  );
  return match?.logo || null;
}

function LiveMatchdayBanner({ fixtures = [], teams = [], go }) {
  const liveFixture = useMemo(() => fixtures.find(f => f.status === 'live'), [fixtures]);
  if (!liveFixture) return null;

  const homeLogo = getTeamLogo(liveFixture.home, teams);
  const awayLogo = getTeamLogo(liveFixture.away, teams);

  return (
    <div className="live-matchday-banner">
      <div className="live-badge-wrap">
        <span className="live-dot" />
        <span>LIVE MATCH</span>
      </div>
      <div className="live-banner-content">
        <div className="live-teams-display">
          <span className="live-team-span">
            {homeLogo && (
              <img
                src={homeLogo}
                alt=""
                className="live-mini-logo"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {liveFixture.home}
          </span>
          <span className="live-score-pill">{liveFixture.homeScore ?? 0} - {liveFixture.awayScore ?? 0}</span>
          <span className="live-team-span">
            {awayLogo && (
              <img
                src={awayLogo}
                alt=""
                className="live-mini-logo"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            )}
            {liveFixture.away}
          </span>
          <MatchTimerBadge fixture={liveFixture} size="compact" />
        </div>
        {liveFixture.liveNote && (
          <div className="live-ticker-text">
            <CircleAlert size={14} />
            <span>{liveFixture.liveNote}</span>
          </div>
        )}
      </div>
      <div className="live-banner-actions">
        <button className="live-action-btn" onClick={() => go('/fixtures')}>
          Match Center <ArrowUpRight size={14} />
        </button>
      </div>
    </div>
  );
}

function Home({ tournament, go }) {
  const { settings, fixtures, teams } = tournament;
  const digns = tournament.dignitaries && tournament.dignitaries.length ? tournament.dignitaries : dignitaries;
  return <>
    <section className="home-hero">
      <div className="home-hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="home-hero-shade" />
      <div className="home-hero-content"><div className="eyebrow"><span /> BBIT PRESENTS</div><p className="hero-pretitle">THE ANNUAL INTER-COLLEGE CHAMPIONSHIP</p><h1>GULABI DEVI<br /><em>MEMORIAL CUP</em></h1><div className="hero-edition"><strong>14<sup>TH</sup></strong><span>EDITION</span><i /><span>{settings.format}<br />{settings.matchType}</span></div><div className="hero-actions"><button className="primary-button" onClick={() => go('/register')}>Register your team <ArrowUpRight size={18} /></button><button className="hero-link" onClick={() => go('/fixtures')}>Match centre <ChevronRight size={18} /></button></div></div>
      <div className="hero-poster"><img src={poster} alt="Gulabi Devi Memorial Cup official poster" /><span>Official poster / {settings.year}</span></div>
      <div className="hero-side-copy">BBIT <i /> {settings.year}</div>
      <div className="hero-facts"><HeroFact label="Tournament dates" value={settings.date} /><HeroFact label="Venue" value={settings.venue} /><HeroFact label="Entry fee" value={`INR ${Number(settings.entryFee || 0).toLocaleString('en-IN')}`} note="per team" /></div>
    </section>
    <section className="home-status"><CalendarDays size={20} /><div><small>TOURNAMENT STATUS</small><strong>{settings.status}</strong></div><p>{settings.registrationOpen ? 'Team registration is currently open. Secure your place in the tournament.' : 'Registration details and the official draw will be announced here.'}</p><button onClick={() => go('/contact')}>Get updates <ArrowUpRight size={15} /></button></section>
    <section className="home-intro section-shell"><SectionLabel number="01" text="THE TOURNAMENT" /><div className="intro-layout"><h2>PLAY FOR<br /><em>MORE.</em></h2><div><p>{settings.about}</p><button className="text-button" onClick={() => go('/history')}>Explore the legacy <ArrowUpRight size={16} /></button></div></div><div className="home-metrics"><Metric value="14" label="Editions" /><Metric value={String(teams.length).padStart(2, '0')} label="Teams announced" /><Metric value={String(fixtures.length).padStart(2, '0')} label="Fixtures published" /><Metric value="11" label="Players a side" /></div></section>
    <section className="home-dignitaries section-shell">
      <SectionLabel number="02" text="PATRONS & COLLEGE LEADERSHIP" />
      <div className="dignitaries-header">
        <h2>HONORABLE<br /><em>PATRONS & LEADERS</em></h2>
        <p>Under the visionary guidance and leadership of Budge Budge Institute of Technology (BBIT) management and administration.</p>
      </div>
      <div className="dignitaries-grid">
        {digns.map((item, index) => (
          <article className="dignitary-card" key={item.id || index}>
            <div className="dignitary-image-wrap">
              <img src={item.image || '/assets/dignitaries/chairman.jpg'} alt={item.name || item.title} />
              <span className="dignitary-badge">{item.role}</span>
            </div>
            <div className="dignitary-body">
              {item.name && <p className="dignitary-name">{item.name}</p>}
              <h3>{item.title}</h3>
              <p>Budge Budge Institute of Technology</p>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="home-grid-section section-shell"><SectionLabel number="03" text="TOURNAMENT DESK" /><div className="home-grid"><InfoCard icon={<Users />} title="Teams" text={teams.length ? `${teams.length} confirmed team${teams.length === 1 ? '' : 's'} are on the board.` : 'The official team list will appear after confirmations.'} action="View teams" onClick={() => go('/teams')} /><InfoCard icon={<CalendarDays />} title="Fixtures" text={fixtures.length ? `${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'} have been published.` : 'The match schedule will be released by the tournament office.'} action="Open match centre" onClick={() => go('/fixtures')} /><InfoCard icon={<Trophy />} title="The cup" text="League football, knockout tension, one trophy to lift." action="Tournament history" onClick={() => go('/history')} /></div></section>
    <section className="home-venue section-shell"><div className="venue-art"><img src="/assets/bbit-venue-map.png" alt={settings.venue} style={{width:'100%',height:'100%',objectFit:'cover'}} /></div><div><SectionLabel number="04" text="THE VENUE" /><h2>WHERE THE<br /><em>GAME LIVES.</em></h2><p>{settings.address}</p><button className="text-button" onClick={() => go('/venue')}>Venue details <ArrowUpRight size={16} /></button></div></section>
  </>;
}

function HeroFact({ label, value, note }) { return <div><small>{label}</small><strong>{value}</strong>{note && <em>{note}</em>}</div>; }
function Metric({ value, label }) { return <div><strong>{value}</strong><span>{label}</span></div>; }
function SectionLabel({ number, text }) { return <div className="section-label">{number} / {text}</div>; }
function InfoCard({ icon, title, text, action, onClick }) { return <article className="info-card"><div>{icon}<span>TOURNAMENT {title.toUpperCase()}</span></div><h3>{title}</h3><p>{text}</p><button onClick={onClick}>{action} <ArrowUpRight size={15} /></button></article>; }

function PageHero({ kicker, title, text, action }) { return <section className="page-hero"><span>{kicker}</span><h1>{title}</h1><p>{text}</p>{action}</section>; }
function EmptyMessage({ title, text, icon, action }) { return <div className="empty-message"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>; }

function TeamsPage({ teams, go }) {
  const [filter, setFilter] = useState('All');
  const [search, setSearch] = useState('');

  const groupTabs = useMemo(() => {
    const base = ['All', 'Group A', 'Group B', 'Group C', 'Group D'];
    const extras = [];
    (teams || []).forEach(t => {
      const g = (t.group || '').trim();
      if (g) {
        const isStandard = base.some(b => {
          const cb = b.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cg = g.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cb === cg || cb === `group${cg}` || `group${cb}` === cg;
        });
        if (!isStandard && !extras.some(e => e.toLowerCase() === g.toLowerCase())) {
          extras.push(g);
        }
      }
    });
    return [...base, ...extras];
  }, [teams]);

  const isMatchGroup = (teamGroup, targetFilter) => {
    if (targetFilter === 'All') return true;
    if (!teamGroup) return false;
    const clean = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTarget = clean(targetFilter);
    const cleanTeam = clean(teamGroup);

    if (cleanTarget === cleanTeam) return true;

    const targetLetter = cleanTarget.replace(/^group/, '');
    const teamLetter = cleanTeam.replace(/^group/, '');

    if (targetLetter && teamLetter && targetLetter === teamLetter) return true;
    if (targetLetter && cleanTeam === targetLetter) return true;
    if (teamLetter && cleanTarget === teamLetter) return true;

    return false;
  };

  const filtered = useMemo(() => {
    return (teams || []).filter(team => {
      const matchFilter = isMatchGroup(team.group, filter);
      const searchLower = search.trim().toLowerCase();
      const matchSearch = !searchLower || 
        team.name?.toLowerCase().includes(searchLower) || 
        team.city?.toLowerCase().includes(searchLower) ||
        team.shortName?.toLowerCase().includes(searchLower) ||
        team.group?.toLowerCase().includes(searchLower);
      return matchFilter && matchSearch;
    });
  }, [teams, filter, search]);

  return (
    <>
      <PageHero kicker="THE CONTENDERS" title="THE TEAMS" text="The colleges chasing their place in Gulabi Devi Memorial Cup history." action={<button className="primary-button" onClick={() => go('/register')}>Register your team <ArrowUpRight size={17} /></button>} />
      <section className="content-shell">
        <div className="page-toolbar">
          <div className="filter-tabs">
            {groupTabs.map(group => (
              <button key={group} className={filter === group ? 'active' : ''} onClick={() => setFilter(group)}>{group}</button>
            ))}
          </div>
          <input type="text" className="search-input" placeholder="Search team or college..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {filtered.length ? (
          <div className="team-grid-rich">
            {filtered.map((team, index) => (
              <article className="team-card-rich" key={team.id || index}>
                <div className="team-card-header">
                  <span className="team-number">#{String(index + 1).padStart(2, '0')}</span>
                  <span className="team-group-tag">{team.group || 'Contender'}</span>
                </div>
                <div className="team-card-body">
                  <div className="team-crest">
                    {team.logo ? (
                      <img
                        src={team.logo}
                        alt={`${team.name} logo`}
                        className="team-crest-img"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.nextElementSibling;
                          if (fallback) fallback.style.display = 'grid';
                        }}
                      />
                    ) : null}
                    <span
                      className="team-crest-fallback"
                      style={{ display: team.logo ? 'none' : 'grid' }}
                    >
                      {team.shortName || team.name?.slice(0, 3) || 'FC'}
                    </span>
                  </div>
                  <h3>{team.name}</h3>
                  <p>{team.city || 'Official College Team'}</p>
                </div>
                <div className="team-card-footer">
                  <span>11-a-side Squad</span>
                  <button className="text-button-sm" onClick={() => go('/fixtures')}>Schedule <ChevronRight size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyMessage 
            title={filter === 'All' ? "No teams found." : `No teams in ${filter}`} 
            text={search ? "Try clearing your search query or choosing another group filter." : (filter === 'All' ? "Try clearing your search filter or register a new team." : `No teams have been assigned to ${filter} yet.`)} 
            icon={<Users />} 
            action={<button className="primary-button" onClick={() => go('/register')}>Register team <ArrowUpRight size={16} /></button>} 
          />
        )}
      </section>
    </>
  );
}

function FixturesPage({ fixtures, teams = [], go }) {
  const [stageFilter, setStageFilter] = useState('All');

  const filtered = useMemo(() => {
    if (stageFilter === 'All') return fixtures;
    return fixtures.filter(f => (f.stage || '').toLowerCase().includes(stageFilter.toLowerCase()));
  }, [fixtures, stageFilter]);

  return (
    <>
      <PageHero kicker="MATCH CENTRE" title="FIXTURES & RESULTS" text="All match timings, live scores, results, commentary, and match event timelines in one place." />
      <section className="content-shell">
        <div className="page-toolbar">
          <div className="filter-tabs">
            {['All', 'Group Stage', 'Quarter-Final', 'Semi-Final', 'Grand Final'].map(stage => (
              <button key={stage} className={stageFilter === stage ? 'active' : ''} onClick={() => setStageFilter(stage)}>{stage}</button>
            ))}
          </div>
        </div>
        {filtered.length ? (
          <div className="fixture-grid-rich">
            {filtered.map(fixture => {
              const isLive = fixture.status === 'live';
              const isCompleted = fixture.status === 'completed';
              const homeLogo = getTeamLogo(fixture.home, teams);
              const awayLogo = getTeamLogo(fixture.away, teams);
              return (
                <article className={`fixture-card-rich ${isLive ? 'is-live' : ''}`} key={fixture.id}>
                  <div className="fixture-card-head">
                    <span className="fixture-stage-badge">{fixture.stage || 'Match'}</span>
                    {isLive ? (
                      <MatchTimerBadge fixture={fixture} size="normal" />
                    ) : (
                      <span className={`fixture-status-pill ${fixture.status || 'scheduled'}`}>
                        {isCompleted ? 'FINAL SCORE' : 'SCHEDULED'}
                      </span>
                    )}
                  </div>
                  <div className="fixture-card-teams">
                    <div className="team-side home-side">
                      <div className="fixture-team-row">
                        {homeLogo && (
                          <img
                            src={homeLogo}
                            alt=""
                            className="fixture-team-mini-logo"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <strong>{fixture.home}</strong>
                      </div>
                    </div>
                    <div className="score-box">
                      {isCompleted || isLive ? (
                        <div className="score-box-inner">
                          <span className="final-score">{fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}</span>
                          {isLive && <MatchTimerBadge fixture={fixture} size="compact" showPeriod={false} />}
                        </div>
                      ) : (
                        <span className="vs-tag">VS</span>
                      )}
                    </div>
                    <div className="team-side away-side">
                      <div className="fixture-team-row">
                        {awayLogo && (
                          <img
                            src={awayLogo}
                            alt=""
                            className="fixture-team-mini-logo"
                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                          />
                        )}
                        <strong>{fixture.away}</strong>
                      </div>
                    </div>
                  </div>
                  {fixture.liveNote && (
                    <div className="live-fixture-ticker-box">
                      <span>COMMENTARY TICKER:</span>
                      <p style={{ margin: 0 }}>{fixture.liveNote}</p>
                    </div>
                  )}
                  {Array.isArray(fixture.events) && fixture.events.length > 0 && (
                    <div className="live-timeline-wrap">
                      <div className="live-timeline-title"><Trophy size={13} /> MATCH TIMELINE & EVENTS</div>
                      <div className="live-events-list">
                        {fixture.events.map((ev, i) => (
                          <div className={`live-event-item ${ev.team === 'away' ? 'away-event' : ''}`} key={ev.id || i}>
                            <span className="event-min">{ev.minute || "•"}</span>
                            <span className="event-icon">{ev.type === 'goal' ? '⚽ Goal' : ev.type === 'yellow_card' ? '🨨 Yellow Card' : '🨩 Red Card'}</span>
                            <span className="event-player">{ev.player}</span>
                            <span className="event-team">{ev.team === 'home' ? fixture.home : fixture.away}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="fixture-card-foot">
                    <span><CalendarDays size={13} /> {fixture.date || 'Date TBA'} {fixture.time ? ` @ ${fixture.time}` : ''}</span>
                    <span><MapPin size={13} /> {fixture.venue || 'BBIT Football Ground'}</span>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyMessage title="No fixtures published yet." text="Check back soon for the official tournament match draw." icon={<CalendarDays />} />
        )}
      </section>
    </>
  );
}

function StandingsPage({ standings, teams = [] }) {
  const sorted = useMemo(() => {
    return [...standings].sort((a, b) => Number(b.points || 0) - Number(a.points || 0) || Number(b.gf || 0) - Number(a.gf || 0));
  }, [standings]);

  return (
    <>
      <PageHero kicker="THE LEAGUE TABLE" title="STANDINGS & POINTS" text="Every point matters on the road to the knockout stage." />
      <section className="content-shell">
        {sorted.length ? (
          <div className="standings-wrap">
            <div className="standings-table-rich">
              <div className="standing-row-rich standing-head-rich">
                <span>#</span>
                <strong>COLLEGE TEAM</strong>
                <span>P</span>
                <span>W</span>
                <span>D</span>
                <span>L</span>
                <span>GF</span>
                <span>GA</span>
                <span>GD</span>
                <b>PTS</b>
              </div>
              {sorted.map((team, index) => {
                const gd = Number(team.gf || 0) - Number(team.ga || 0);
                const isTop2 = index < 2;
                const teamLogo = getTeamLogo(team.team, teams);
                return (
                  <div className={`standing-row-rich ${isTop2 ? 'top-qualifier' : ''}`} key={team.id || index}>
                    <span className="rank-col">{isTop2 ? `0${index + 1} ⭐` : String(index + 1).padStart(2, '0')}</span>
                    <strong className="team-col">
                      {teamLogo && (
                        <img
                          src={teamLogo}
                          alt=""
                          className="standings-mini-logo"
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      )}
                      {team.team}
                    </strong>
                    <span>{team.played || 0}</span>
                    <span>{team.wins || 0}</span>
                    <span>{team.draws || 0}</span>
                    <span>{team.losses || 0}</span>
                    <span>{team.gf || 0}</span>
                    <span>{team.ga || 0}</span>
                    <span>{gd > 0 ? `+${gd}` : gd}</span>
                    <b className="pts-col">{team.points || 0}</b>
                  </div>
                );
              })}
            </div>
            <div className="table-legend">
              <span>⭐ Top 2 teams from each group qualify directly for the Knockout Stage.</span>
              <span>Points Rule: Win = 3 PTS | Draw = 1 PT | Loss = 0 PTS</span>
            </div>
          </div>
        ) : (
          <EmptyMessage title="The league table is waiting for kick-off." text="Live positions will appear here as soon as league matches begin." icon={<Table2 />} />
        )}
      </section>
    </>
  );
}



function HistoryPage({ champions }) {
  return (
    <>
      <PageHero kicker="THE LEGACY" title="HALL OF CHAMPIONS" text="Celebrating 14 editions of collegiate football excellence at BBIT." />
      <section className="content-shell">
        <div className="history-stats-bar">
          <div><strong>14</strong><span>Editions</span></div>
          <div><strong>120+</strong><span>College Teams</span></div>
          <div><strong>500+</strong><span>Matches Played</span></div>
          <div><strong>1</strong><span>Prestige Trophy</span></div>
        </div>
        {champions.length ? (
          <div className="champions-timeline">
            {champions.map((item) => (
              <article className="champion-timeline-card" key={item.id}>
                <div className="champion-year-badge">{item.year}</div>
                <div className="champion-details">
                  <span className="trophy-tag"><Trophy size={15} /> CHAMPIONS</span>
                  <h2>{item.winner}</h2>
                  <p>{item.runnerUp ? `Runner-Up: ${item.runnerUp}` : 'Tournament Champions'}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyMessage title="History records are being loaded." text="Past tournament records will be listed here." icon={<History />} />
        )}
      </section>
    </>
  );
}

function VenuePage({ settings }) {
  return (
    <>
      <PageHero kicker="TOURNAMENT VENUE" title={settings.venue.toUpperCase()} text={settings.address} action={<a className="primary-button" href={settings.mapLink} target="_blank" rel="noreferrer">Open Google Maps <ExternalLink size={16} /></a>} />
      <section className="content-shell venue-page-content">
        <div className="venue-features-grid">
          <div className="venue-feature-card">
            <div className="feature-icon"><MapPin /></div>
            <h3>Standard Grass Pitches</h3>
            <p>Two full-sized 11-a-side natural grass pitches with professional line markings and net systems.</p>
          </div>
          <div className="venue-feature-card">
            <div className="feature-icon"><Users /></div>
            <h3>Spectator Pavilion</h3>
            <p>Covered seating area for 2,000+ spectators, student supporters, and visiting college faculty.</p>
          </div>
          <div className="venue-feature-card">
            <div className="feature-icon"><ShieldCheck /></div>
            <h3>Medical First-Aid Desk</h3>
            <p>On-site medical team and ambulance standby throughout all tournament match days.</p>
          </div>
          <div className="venue-feature-card">
            <div className="feature-icon"><CheckCircle2 /></div>
            <h3>Changing Rooms & Refreshment</h3>
            <p>Dedicated team locker rooms, clean drinking water stations, and official food court stalls.</p>
          </div>
        </div>

        <div className="venue-directions-box">
          <SectionLabel number="HOW TO REACH" text="DIRECTIONS TO BBIT CAMPUS" />
          <h2>CAMPUS LOCATION & ARRIVAL GUIDE</h2>
          <div className="directions-grid">
            <div className="direction-item">
              <strong>By Train (Suburban Railway)</strong>
              <p>Take any Budge Budge local train from Sealdah Station to <strong>Budge Budge Station</strong>. From the station, take an auto-rickshaw (10 mins) directly to the BBIT Campus gate.</p>
            </div>
            <div className="direction-item">
              <strong>By Road / Bus</strong>
              <p>Board Bus Route 77, 77A or auto from Taratala / Jinjira Bazar heading towards Budge Budge Nischintapur.</p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function RegisterPage({ tournament, settings, contacts, registrations, save, go }) {
  const [formData, setFormData] = useState({ college: '', team: '', captain: '', phone: '', email: '', count: '18' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newReg = { id: makeId('registration'), college: formData.college, team: formData.team, captain: formData.captain, phone: formData.phone, email: formData.email, count: formData.count };
    await submitPublicRegistration(newReg);
    if (tournament && save) {
      try {
        await save({ ...tournament, registrations: [...(tournament.registrations || []), newReg] });
      } catch (err) {
        // Fallback for non-admin session
      }
    }
    setSubmitted(true);
  };

  return (
    <section className="register-page-shell">
      <PageHero kicker="TEAM REGISTRATION" title="REGISTER YOUR TEAM" text="Represent your college in the 14th Gulabi Devi Memorial Cup." />
      <div className="register-body-grid">
        <div className="register-form-wrap">
          {submitted ? (
            <div className="registration-success-card">
              <CheckCircle2 size={48} className="success-icon" />
              <h2>REGISTRATION SUBMITTED!</h2>
              <p>Thank you for registering <strong>{formData.team || 'your team'}</strong> from <strong>{formData.college || 'your college'}</strong>.</p>
              <p>Our tournament convener team will call <strong>{formData.phone}</strong> shortly to confirm your entry fee and match slot.</p>
              <button className="primary-button" onClick={() => setSubmitted(false)}>Register Another Team <ArrowUpRight size={16} /></button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="register-interactive-form">
              <h3>OFFICIAL TEAM ENTRY FORM</h3>
              <div className="form-row-2">
                <label>College / Institution Name*
                  <input type="text" required placeholder="e.g. Heritage Institute of Tech" value={formData.college} onChange={e => setFormData({ ...formData, college: e.target.value })} />
                </label>
                <label>Team Name*
                  <input type="text" required placeholder="e.g. Heritage Tigers FC" value={formData.team} onChange={e => setFormData({ ...formData, team: e.target.value })} />
                </label>
              </div>
              <div className="form-row-2">
                <label>Captain / Coach Name*
                  <input type="text" required placeholder="e.g. Rahul Sharma" value={formData.captain} onChange={e => setFormData({ ...formData, captain: e.target.value })} />
                </label>
                <label>Contact Phone Number*
                  <input type="tel" required placeholder="10-digit mobile number" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                </label>
              </div>
              <div className="form-row-2">
                <label>Official Email Address*
                  <input type="email" required placeholder="captain@example.com" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                </label>
                <label>Squad Player Count
                  <select value={formData.count} onChange={e => setFormData({ ...formData, count: e.target.value })}>
                    <option value="11">11 Players</option>
                    <option value="15">15 Players</option>
                    <option value="18">18 Players (Standard)</option>
                  </select>
                </label>
              </div>
              <button type="submit" className="primary-button submit-reg-btn">Submit Registration Form <ArrowUpRight size={17} /></button>
            </form>
          )}
        </div>

        <aside className="register-sidebar-card">
          <small>ENTRY DETAILS</small>
          <h2>ENTRY FEE</h2>
          <div className="entry-fee-display">INR {Number(settings.entryFee || 3000).toLocaleString('en-IN')}</div>
          <p>Includes tournament kit badges, referee charges, ground access, and hydration supplies.</p>
          <div className="convener-calls">
            <h4>DIRECT CONVENER CONTACTS:</h4>
            {contacts.map(c => (
              <a href={`tel:${c.phone}`} key={c.id || c.phone} className="convener-phone-link">
                <Phone size={14} /> {c.name} - <strong>{c.phone}</strong>
              </a>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}

function ContactPage({ contacts, settings, tournament, save }) {
  const [msgData, setMsgData] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    const newMsg = { id: makeId('message'), name: msgData.name, phone: msgData.phone, message: msgData.message };
    await submitPublicMessage(newMsg);
    if (tournament && save) {
      try {
        await save({ ...tournament, messages: [...(tournament.messages || []), newMsg] });
      } catch (err) {
        // Fallback for non-admin session
      }
    }
    setSent(true);
  };

  return (
    <>
      <PageHero kicker="TOURNAMENT OFFICE" title="GET IN TOUCH" text="Contact the organizing committee for entries, media inquiries, or tournament details." />
      <section className="content-shell contact-page-shell">
        <div className="contact-main-grid">
          <div className="contact-info-cards">
            <h3>CONVENER & DESK CONTACTS</h3>
            <div className="contact-cards-list">
              {contacts.map(contact => (
                <a href={`tel:${contact.phone}`} key={contact.id} className="contact-card-item">
                  <small>{contact.role || 'Tournament Convener'}</small>
                  <h2>{contact.name}</h2>
                  <span><Phone size={16} /> {contact.phone}</span>
                </a>
              ))}
            </div>
            <div className="venue-address-card">
              <MapPin size={22} />
              <div>
                <strong>TOURNAMENT VENUE & DESK ADDRESS</strong>
                <p>{settings.address}</p>
              </div>
            </div>
          </div>

          <div className="contact-form-card">
            {sent ? (
              <div className="message-sent-notice">
                <CheckCircle2 size={40} />
                <h3>MESSAGE SENT TO DESK!</h3>
                <p>Thank you <strong>{msgData.name}</strong>. Our team will contact you at <strong>{msgData.phone}</strong> shortly.</p>
                <button className="text-button" onClick={() => setSent(false)}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={handleSend} className="contact-desk-form">
                <h3>SEND A DIRECT MESSAGE</h3>
                <label>Your Full Name*
                  <input type="text" required placeholder="Enter your name" value={msgData.name} onChange={e => setMsgData({ ...msgData, name: e.target.value })} />
                </label>
                <label>Phone / WhatsApp Number*
                  <input type="tel" required placeholder="Enter mobile number" value={msgData.phone} onChange={e => setMsgData({ ...msgData, phone: e.target.value })} />
                </label>
                <label>Message / Question*
                  <textarea rows="4" required placeholder="How can we help you?" value={msgData.message} onChange={e => setMsgData({ ...msgData, message: e.target.value })}></textarea>
                </label>
                <button type="submit" className="primary-button">Send Message <ArrowUpRight size={16} /></button>
              </form>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function PublicFooter({ settings, go }) {
  const quickLinks = [['Teams', '/teams'], ['Fixtures', '/fixtures'], ['Standings', '/standings'], ['History', '/history']];
  return (
    <footer className="site-footer">
      <div className="footer-pitch-texture" aria-hidden="true" />
      <div className="footer-main">
        <div className="footer-col footer-col-brand">
          <div className="footer-brand-row">
            <img src={logo} alt="Gulabi Devi Cup Logo" className="footer-logo-main" />
          </div>
          <strong className="footer-title">{settings.name}</strong>
          <span className="footer-edition">{settings.edition} · {settings.organizer}</span>
          <p className="footer-desc">Celebrating football, competition, and legacy.</p>
        </div>
        <div className="footer-col footer-col-links">
          <h4 className="footer-heading">Quick Links</h4>
          <nav className="footer-nav" aria-label="Footer navigation">
            {quickLinks.map(([label, target]) => (
              <button key={target} className="footer-nav-link" onClick={() => go(target)}>{label}</button>
            ))}
          </nav>
        </div>
        <div className="footer-col footer-col-info">
          <h4 className="footer-heading">Tournament</h4>
          <ul className="footer-info-list">
            <li><span className="footer-info-label">Edition</span><span>{settings.edition}</span></li>
            <li><span className="footer-info-label">Cup</span><span>{settings.name}</span></li>
            <li><span className="footer-info-label">Venue</span><span>Budge Budge Institute of Technology (BBIT)</span></li>
          </ul>
        </div>
      </div>
      <div className="footer-tagline-area">
        <span className="footer-tagline">The Game. The Legacy. The Memorial.</span>
      </div>
      <div className="footer-divider" />
      <div className="footer-copyright-bar">
        <div className="footer-copyright-text">
          <span>© {settings.year} {settings.name}</span>
          <span className="footer-copyright-sep">·</span>
          <span>Organized by Budge Budge Institute of Technology (BBIT)</span>
          <span className="footer-copyright-sep">·</span>
          <span>Developed by Souvick Kumar Halder</span>
        </div>
      </div>
      <div className="footer-accent-line" aria-hidden="true" />
    </footer>
  );
}


function Toast({ notice, dismiss }) { if (!notice) return null; return <div className={`toast ${notice.type}`} role="status"><span>{notice.type === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span>{notice.text}<button onClick={dismiss} aria-label="Dismiss">×</button></div>; }

function AdminPortal({ tournament, save, go, notice, setNotice }) {
  const [session, setSession] = useState(getSession());
  const [active, setActive] = useState('dashboard');
  if (!session) return <AdminLogin onSuccess={setSession} go={go} />;
  const exit = () => { signOut(); setSession(null); };

  const counts = {
    messages: tournament.messages?.length || 0,
    registrations: tournament.registrations?.length || 0
  };

  return <div className="admin-app"><aside className="admin-sidebar"><button className="admin-brand" onClick={() => go('/')}><img src={logo} alt="" /><span>TOURNAMENT<br /><em>DESK</em></span></button><div className="admin-profile"><span>{session.email?.slice(0, 1).toUpperCase()}</span><div><strong>{session.email}</strong><small>{isCloudEnabled ? 'Secure cloud session' : 'Local preview mode'}</small></div></div><nav>{adminSections.map(([key, label, Icon]) => <button className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)}><Icon size={17} /><span>{label}</span>{counts[key] > 0 && <span className="admin-sidebar-badge">{counts[key]}</span>}</button>)}</nav><div className="admin-sidebar-footer"><button onClick={() => go('/')}><ChevronLeft size={16} /> Public website</button><button onClick={exit}><LogOut size={16} /> Sign out</button></div></aside><main className="admin-main"><Toast notice={notice} dismiss={() => setNotice(null)} /><AdminTopbar active={active} tournament={tournament} go={go} />{active === 'dashboard' && <AdminDashboard tournament={tournament} setActive={setActive} />}{active === 'live' && <LiveMatchController tournament={tournament} save={save} />}{active === 'settings' && <SettingsEditor data={tournament} save={save} />}{['teams', 'fixtures', 'standings', 'champions', 'contacts', 'dignitaries', 'messages', 'registrations'].includes(active) && <CollectionEditor collection={active} data={tournament} save={save} />}</main></div>;
}

function LiveMatchController({ tournament, save }) {
  const fixtures = tournament.fixtures || [];
  const liveMatch = useMemo(() => fixtures.find(f => f.status === 'live'), [fixtures]);
  const [selectedId, setSelectedId] = useState(liveMatch?.id || (fixtures[0]?.id || ''));
  const [saving, setSaving] = useState(false);

  const selectedMatch = useMemo(() => fixtures.find(f => f.id === selectedId) || null, [fixtures, selectedId]);
  const [draft, setDraft] = useState(selectedMatch || {});

  useEffect(() => {
    if (selectedMatch) setDraft(selectedMatch);
    else setDraft({});
  }, [selectedMatch]);

  const clockData = useMatchClock(draft);

  const updateMatchState = async (updatedFields) => {
    if (!selectedId) return;
    setSaving(true);
    try {
      const nextMatch = { ...draft, ...updatedFields };
      setDraft(nextMatch);
      const nextFixtures = fixtures.map(f => {
        if (f.id === selectedId) return nextMatch;
        if (updatedFields.status === 'live' && f.status === 'live') return { ...f, status: 'scheduled' };
        return f;
      });
      await save({ ...tournament, fixtures: nextFixtures });
    } finally {
      setSaving(false);
    }
  };

  const adjustScore = (teamKey, delta) => {
    const currentScore = Number(draft[teamKey] || 0);
    const newScore = Math.max(0, currentScore + delta);
    updateMatchState({ [teamKey]: newScore });
  };

  // 1st Half Kick-off: 00:00 to 30:00
  const startFirstHalf = () => {
    updateMatchState({
      status: 'live',
      period: '1H',
      timerRunning: true,
      timerBaseSeconds: 0,
      timerStartedAt: new Date().toISOString(),
      minute: "1'"
    });
  };

  // Half-Time (HT): Pauses and freezes at 30:00
  const setHalfTime = () => {
    updateMatchState({
      status: 'live',
      period: 'HT',
      timerRunning: false,
      timerBaseSeconds: 1800,
      timerStartedAt: null,
      minute: 'HT'
    });
  };

  // 2nd Half Kick-off: Starts from 30:00 up to 60:00
  const startSecondHalf = () => {
    updateMatchState({
      status: 'live',
      period: '2H',
      timerRunning: true,
      timerBaseSeconds: 1800,
      timerStartedAt: new Date().toISOString(),
      minute: "31'"
    });
  };

  // Pause / Resume Toggle for injury/stoppage breaks
  const togglePauseResume = () => {
    if (draft.timerRunning) {
      const currentSeconds = calculateElapsedSeconds(draft);
      updateMatchState({
        timerRunning: false,
        timerBaseSeconds: currentSeconds,
        timerStartedAt: null,
        minute: getMatchMinuteString(currentSeconds, draft.period || '1H', draft.status)
      });
    } else {
      const currentBase = Number(draft.timerBaseSeconds) || 0;
      updateMatchState({
        status: 'live',
        timerRunning: true,
        timerStartedAt: new Date().toISOString(),
        minute: getMatchMinuteString(currentBase, draft.period || (currentBase >= 1800 ? '2H' : '1H'), 'live')
      });
    }
  };

  // Full-Time (FT): Concludes match at 60:00
  const setFullTime = () => {
    updateMatchState({
      status: 'completed',
      period: 'FT',
      timerRunning: false,
      timerBaseSeconds: 3600,
      timerStartedAt: null,
      minute: 'FT'
    });
  };

  // Nudge timer by seconds (+1m, -1m, +30s, -30s)
  const nudgeSeconds = (deltaSeconds) => {
    const currentSeconds = calculateElapsedSeconds(draft);
    const newBase = Math.max(0, currentSeconds + deltaSeconds);
    const newPeriod = draft.period || (newBase >= 1800 ? '2H' : '1H');
    const updates = {
      timerBaseSeconds: newBase,
      minute: getMatchMinuteString(newBase, newPeriod, draft.status)
    };
    if (draft.timerRunning) {
      updates.timerStartedAt = new Date().toISOString();
    }
    updateMatchState(updates);
  };

  // Reset current half
  const resetHalf = () => {
    const resetBase = draft.period === '2H' ? 1800 : 0;
    const updates = {
      timerBaseSeconds: resetBase,
      minute: resetBase === 1800 ? "31'" : "1'"
    };
    if (draft.timerRunning) {
      updates.timerStartedAt = new Date().toISOString();
    }
    updateMatchState(updates);
  };

  const setPresetMinute = (minStr) => {
    if (minStr === 'HT') {
      setHalfTime();
    } else if (minStr === 'FT') {
      setFullTime();
    } else {
      const match = minStr.match(/^(\d+)/);
      const minNum = match ? parseInt(match[1], 10) : null;
      const updates = { minute: minStr };
      if (minNum !== null) {
        updates.timerBaseSeconds = Math.max(0, (minNum - 1) * 60);
        if (draft.timerRunning) updates.timerStartedAt = new Date().toISOString();
        if (minNum > 30 && draft.period !== '2H') updates.period = '2H';
        else if (minNum <= 30 && draft.period !== '1H') updates.period = '1H';
      }
      updateMatchState(updates);
    }
  };

  const addEvent = (eventObj) => {
    const currentEvents = Array.isArray(draft.events) ? draft.events : [];
    const nextEvents = [...currentEvents, { ...eventObj, id: makeId('event') }];
    updateMatchState({ events: nextEvents });
  };

  const removeEvent = (eventId) => {
    const currentEvents = Array.isArray(draft.events) ? draft.events : [];
    const nextEvents = currentEvents.filter(e => e.id !== eventId);
    updateMatchState({ events: nextEvents });
  };

  // 60-Minute Match Progress Percentage
  const progressPercent = Math.min(100, Math.max(0, (clockData.totalSeconds / 3600) * 100));

  return (
    <div className="admin-content live-controller-shell">
      <section className="live-controller-header">
        <div>
          <span className="live-kicker"><Radio size={14} /> DEDICATED LIVE MATCHDAY CONSOLE</span>
          <h2>PRO MATCH CONTROL CENTRE</h2>
          <p>Official 60-minute match timer control (two 30-min halves), pitch-side scores, goal timeline, and public sync.</p>
        </div>
        {draft.status === 'live' ? (
          <div className="live-status-pill-big live-active">
            <span className="live-dot" /> LIVE ON AIR ({clockData.clock} • {clockData.periodLabel})
          </div>
        ) : draft.status === 'completed' ? (
          <div className="live-status-pill-big live-completed">
            🏁 MATCH COMPLETED (FT)
          </div>
        ) : (
          <div className="live-status-pill-big">STANDBY / NO LIVE MATCH</div>
        )}
      </section>

      <div className="live-match-selector-bar">
        <label>Select Match to Control Pitch-Side:
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            <option value="">-- Choose a Fixture --</option>
            {fixtures.map(f => (
              <option key={f.id} value={f.id}>
                {f.home || 'Home'} vs {f.away || 'Away'} ({f.stage || 'Match'} - {f.date || 'TBA'}) {f.status === 'live' ? '🔴 LIVE' : f.status === 'completed' ? '🏁 FT' : ''}
              </option>
            ))}
          </select>
        </label>
        {fixtures.length === 0 && <p style={{ color: '#c46a5a', fontSize: '12px', margin: '8px 0 0' }}>No fixtures available yet. Add fixtures in the "Fixtures" tab first.</p>}
      </div>

      {selectedMatch ? (
        <div className="live-control-dashboard">

          {/* 60-Minute Stadium Master Timer Board */}
          <div className="stadium-match-timer-panel">
            <div className="stadium-timer-top">
              <div className="stadium-timer-phase-badge">
                <Timer size={15} />
                <span>{clockData.periodLabel.toUpperCase()}</span>
                {clockData.isRunning ? (
                  <span className="live-indicator-pill"><span className="pulse-dot" /> CLOCK TICKING</span>
                ) : (
                  <span className="paused-indicator-pill">CLOCK PAUSED</span>
                )}
              </div>
              <div className="stadium-timer-meta">
                <span>TOTAL: 60 MIN (2 × 30M HALVES)</span>
              </div>
            </div>

            {/* Stadium Giant Digital Clock Display */}
            <div className="stadium-giant-clock">
              <div className="clock-digits-wrap">
                <span className="clock-digits">{clockData.clock}</span>
                <span className="clock-minute-badge">{clockData.minute}</span>
              </div>

              {/* 60-Minute Timeline Progress Bar with Half-Time Mark */}
              <div className="match-progress-container">
                <div className="match-progress-bar" style={{ width: `${progressPercent}%` }} />
                <div className="progress-markers">
                  <span className="marker-label">0' (KO)</span>
                  <span className="marker-label marker-ht">30' (HALF-TIME)</span>
                  <span className="marker-label marker-ft">60' (FULL-TIME)</span>
                </div>
              </div>
            </div>

            {/* Professional Football Match Actions */}
            <div className="stadium-timer-actions-grid">
              <button
                className={`timer-action-btn start-1h-btn ${draft.period === '1H' && draft.timerRunning ? 'active-glow' : ''}`}
                onClick={startFirstHalf}
                disabled={saving}
              >
                <Play size={16} />
                <div>
                  <strong>START 1ST HALF</strong>
                  <small>0:00 – 30:00</small>
                </div>
              </button>

              <button
                className={`timer-action-btn ht-btn ${draft.period === 'HT' ? 'active-glow' : ''}`}
                onClick={setHalfTime}
                disabled={saving}
              >
                <Pause size={16} />
                <div>
                  <strong>HALF-TIME (HT)</strong>
                  <small>STOP CLOCK AT 30:00</small>
                </div>
              </button>

              <button
                className={`timer-action-btn start-2h-btn ${draft.period === '2H' && draft.timerRunning ? 'active-glow' : ''}`}
                onClick={startSecondHalf}
                disabled={saving}
              >
                <FastForward size={16} />
                <div>
                  <strong>START 2ND HALF</strong>
                  <small>RESUME 30:00 – 60:00</small>
                </div>
              </button>

              <button
                className={`timer-action-btn pause-resume-btn ${draft.timerRunning ? 'is-running' : 'is-paused'}`}
                onClick={togglePauseResume}
                disabled={saving}
              >
                {draft.timerRunning ? <Pause size={16} /> : <Play size={16} />}
                <div>
                  <strong>{draft.timerRunning ? 'PAUSE CLOCK' : 'RESUME CLOCK'}</strong>
                  <small>{draft.timerRunning ? 'Stop for injury/break' : 'Continue ticking'}</small>
                </div>
              </button>

              <button
                className={`timer-action-btn ft-btn ${draft.status === 'completed' || draft.period === 'FT' ? 'active-glow' : ''}`}
                onClick={setFullTime}
                disabled={saving}
              >
                <Square size={16} />
                <div>
                  <strong>FULL-TIME (FT)</strong>
                  <small>END MATCH AT 60:00</small>
                </div>
              </button>
            </div>

            {/* Precision Referee Stoppage Nudge Controls */}
            <div className="stadium-timer-nudges">
              <span className="nudge-title"><Clock size={13} /> REFEREE TIME ADJUSTMENT:</span>
              <div className="nudge-buttons-row">
                <button type="button" onClick={() => nudgeSeconds(60)} disabled={saving} title="Add 1 minute stoppage">+1 MIN</button>
                <button type="button" onClick={() => nudgeSeconds(-60)} disabled={saving} title="Subtract 1 minute">-1 MIN</button>
                <button type="button" onClick={() => nudgeSeconds(30)} disabled={saving} title="Add 30 seconds">+30 SEC</button>
                <button type="button" onClick={() => nudgeSeconds(-30)} disabled={saving} title="Subtract 30 seconds">-30 SEC</button>
                <button type="button" onClick={resetHalf} disabled={saving} title="Reset current half clock" className="reset-nudge">
                  <RotateCcw size={12} /> RESET HALF
                </button>
              </div>
            </div>
          </div>

          {/* Live Scoreboard Console */}
          <div className="live-scoreboard-console">
            <div className="scoreboard-team-box home-box">
              <span className="team-role-tag">HOME TEAM</span>
              <h3>{draft.home || 'Home Team'}</h3>
              <div className="score-big">{draft.homeScore ?? 0}</div>
              <div className="score-ctrl-btns">
                <button onClick={() => adjustScore('homeScore', 1)}>+1 GOAL ⚽</button>
                <button onClick={() => adjustScore('homeScore', -1)}>-1 GOAL</button>
              </div>
            </div>

            <div className="scoreboard-center-box">
              <span className="vs-badge">VS</span>
              <div className="center-timer-pill">
                <MatchTimerBadge fixture={draft} size="large" />
              </div>
              <div className="clock-input-box">
                <small>MANUAL MINUTE OVERRIDE</small>
                <input
                  type="text"
                  value={draft.minute || clockData.minute}
                  onChange={e => updateMatchState({ minute: e.target.value })}
                  placeholder="e.g. 28', HT, 55', FT"
                />
              </div>
              <div className="minute-presets">
                {["1'", "15'", "30'", "HT", "31'", "45'", "60'", "FT"].map(m => (
                  <button key={m} className={draft.minute === m ? 'active' : ''} onClick={() => setPresetMinute(m)}>{m}</button>
                ))}
              </div>
            </div>

            <div className="scoreboard-team-box away-box">
              <span className="team-role-tag">AWAY TEAM</span>
              <h3>{draft.away || 'Away Team'}</h3>
              <div className="score-big">{draft.awayScore ?? 0}</div>
              <div className="score-ctrl-btns">
                <button onClick={() => adjustScore('awayScore', 1)}>+1 GOAL ⚽</button>
                <button onClick={() => adjustScore('awayScore', -1)}>-1 GOAL</button>
              </div>
            </div>
          </div>

          <div className="live-commentary-studio">
            <h3><Zap size={18} /> LIVE COMMENTARY TICKER STUDIO</h3>
            <p>Publish instant pitch-side commentary updates shown across the public website ticker.</p>
            <div className="commentary-input-wrap">
              <textarea rows="3" value={draft.liveNote || ''} onChange={e => setDraft({ ...draft, liveNote: e.target.value })} placeholder="e.g. BBIT Strikers score from a magnificent free kick outside the box!" />
              <button className="save-button commentary-pub-btn" onClick={() => updateMatchState({ liveNote: draft.liveNote })} disabled={saving}>
                <Radio size={16} /> Broadcast Ticker Update
              </button>
            </div>
            <div className="commentary-presets">
              <small>QUICK PRESETS:</small>
              {[
                "KICK-OFF! 1st Half is underway at BBIT Ground (0-30m).",
                `GOAL FOR ${draft.home || 'HOME'}! Outstanding strike!`,
                `GOAL FOR ${draft.away || 'AWAY'}! What a finish!`,
                "GREAT SAVE by the goalkeeper to keep it level!",
                "YELLOW CARD issued after a tactical foul.",
                "HALF-TIME at BBIT Ground (30m). Teams heading to lockers.",
                "SECOND HALF IS UNDERWAY (30-60m)!",
                "FULL TIME! Match concludes after intense 60-minute battle!"
              ].map((preset, idx) => (
                <button key={idx} onClick={() => updateMatchState({ liveNote: preset })}>{preset}</button>
              ))}
            </div>
          </div>

          <LiveMatchEventsLogger draft={draft} currentMinute={clockData.minute} addEvent={addEvent} removeEvent={removeEvent} />

          <div className="live-public-preview-monitor">
            <small>PUBLIC WEBSITE LIVE PREVIEW MONITOR (WHAT VISITORS SEE NOW)</small>
            <div className="live-matchday-banner preview-banner">
              <div className="live-badge-wrap">
                <span className="live-dot" />
                <span>LIVE MATCH</span>
              </div>
              <div className="live-banner-content">
                <div className="live-teams-display">
                  <span>{draft.home || 'Home'}</span>
                  <span className="live-score-pill">{draft.homeScore ?? 0} - {draft.awayScore ?? 0}</span>
                  <span>{draft.away || 'Away'}</span>
                  <MatchTimerBadge fixture={draft} size="compact" />
                </div>
                {draft.liveNote && (
                  <div className="live-ticker-text">
                    <CircleAlert size={14} />
                    <span>{draft.liveNote}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-match-selected-placeholder">
          <Radio size={48} />
          <h3>Select a Match to Open Pitch-Side Controller</h3>
          <p>Choose any scheduled fixture from the dropdown above to manage scores, goals, and live ticker commentary.</p>
        </div>
      )}
    </div>
  );
}

function LiveMatchEventsLogger({ draft, currentMinute, addEvent, removeEvent }) {
  const [min, setMin] = useState('');
  const [type, setType] = useState('goal');
  const [team, setTeam] = useState('home');
  const [player, setPlayer] = useState('');

  const submitEvent = (e) => {
    e.preventDefault();
    if (!player) return;
    const finalMin = min.trim() || currentMinute || "•";
    addEvent({ minute: finalMin, type, team, player });
    setMin('');
    setPlayer('');
  };

  const events = Array.isArray(draft.events) ? draft.events : [];

  return (
    <div className="live-events-logger-card">
      <h3>⚽ LOG MATCH EVENT (GOALS & CARDS)</h3>
      <form onSubmit={submitEvent} className="events-logger-form">
        <label>Minute
          <input
            type="text"
            placeholder={currentMinute ? `Auto: ${currentMinute}` : "e.g. 24'"}
            value={min}
            onChange={e => setMin(e.target.value)}
          />
        </label>
        <label>Event Type
          <select value={type} onChange={e => setType(e.target.value)}>
            <option value="goal">⚽ Goal</option>
            <option value="yellow_card">🨨 Yellow Card</option>
            <option value="red_card">🨩 Red Card</option>
          </select>
        </label>
        <label>Team
          <select value={team} onChange={e => setTeam(e.target.value)}>
            <option value="home">Home ({draft.home || 'Home'})</option>
            <option value="away">Away ({draft.away || 'Away'})</option>
          </select>
        </label>
        <label>Player Name
          <input type="text" required placeholder="e.g. Rahul Sharma" value={player} onChange={e => setPlayer(e.target.value)} />
        </label>
        <button type="submit" className="primary-button">+ Log Event</button>
      </form>

      {events.length > 0 && (
        <div className="logged-events-list">
          <small>LOGGED MATCH TIMELINE EVENTS ({events.length}):</small>
          <div className="events-chips-grid">
            {events.map((ev) => (
              <div className={`event-chip-item ${ev.team === 'away' ? 'away-chip' : ''}`} key={ev.id}>
                <strong>{ev.minute}</strong>
                <span>{ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🨨' : '🨩'} {ev.player} ({ev.team === 'home' ? draft.home || 'Home' : draft.away || 'Away'})</span>
                <button type="button" onClick={() => removeEvent(ev.id)}>×</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdminLogin({ onSuccess, go }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { onSuccess(await signIn(email, password)); } catch (err) { setError(err.message); } finally { setBusy(false); } }; return <div className="admin-login"><div className="admin-login-panel"><button className="back-home" onClick={() => go('/')}><ChevronLeft size={16} /> Public website</button><img src={logo} alt="" /><span className="admin-kicker">GULABI DEVI MEMORIAL CUP</span><h1>Tournament<br /><em>Desk</em></h1><p>{isCloudEnabled ? 'Sign in with your authorised Supabase admin account.' : 'Local preview mode is active. This is for development only; add the Supabase environment variables before production deployment.'}</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></label>{error && <div className="form-error">{error}</div>}<button className="admin-submit" disabled={busy}>{busy ? 'Signing in...' : isCloudEnabled ? 'Sign in securely' : 'Open local admin'} <ArrowUpRight size={16} /></button></form><div className="admin-login-mode">{isCloudEnabled ? <><Cloud size={15} /> Cloud data connected</> : <><CircleAlert size={15} /> Local browser storage only</>}</div></div></div>; }

function AdminTopbar({ active, tournament, go }) { const label = adminSections.find(([key]) => key === active)?.[1] || 'Admin'; return <header className="admin-topbar"><div><span>TOURNAMENT ADMIN</span><h1>{label}</h1></div><div><small>LAST UPDATED</small><strong>{tournament.updatedAt ? new Date(tournament.updatedAt).toLocaleString() : 'Not published yet'}</strong><button onClick={() => go('/')}>View website <ArrowUpRight size={15} /></button></div></header>; }

function AdminDashboard({ tournament, setActive }) {
  const cards = [
    ['Teams', tournament.teams?.length || 0, 'teams', Users],
    ['Fixtures', tournament.fixtures?.length || 0, 'fixtures', CalendarDays],
    ['Standings', tournament.standings?.length || 0, 'standings', Table2],
    ['History', tournament.champions?.length || 0, 'champions', Trophy],
    ['Patrons', tournament.dignitaries?.length || 0, 'dignitaries', Users],
    ['Messages', tournament.messages?.length || 0, 'messages', Phone],
    ['Registrations', tournament.registrations?.length || 0, 'registrations', Users]
  ];
  return <div className="admin-content"><section className="admin-welcome"><div><span>CONTROL CENTRE</span><h2>Everything your<br /><em>tournament needs.</em></h2><p>Publish official information once, and the public website updates instantly.</p></div><ShieldCheck size={55} /></section><div className="admin-stat-grid">{cards.map(([label, value, key, Icon]) => <button key={key} onClick={() => setActive(key)}><Icon size={21} /><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span><ChevronRight size={16} /></button>)}</div><section className="admin-checklist"><div><h3>Publish checklist</h3><p>Keep these details current before sharing the tournament website.</p></div><div>{[['Tournament details', 'settings'], ['Team list', 'teams'], ['Fixtures and results', 'fixtures'], ['League table', 'standings'], ['Tournament contacts', 'contacts'], ['Patrons & Leaders', 'dignitaries'], ['Received Messages', 'messages'], ['Team Registrations', 'registrations']].map(([label, key]) => <button key={key} onClick={() => setActive(key)}><span>{key === 'settings' || tournament[key]?.length ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span>{label}<ChevronRight size={16} /></button>)}</div></section></div>;
}

function SettingsEditor({ data, save }) { const [draft, setDraft] = useState(data.settings); const [saving, setSaving] = useState(false); useEffect(() => setDraft(data.settings), [data.settings]); const fields = [['name', 'Tournament name'], ['edition', 'Edition'], ['year', 'Year'], ['organizer', 'Organiser'], ['date', 'Tournament dates'], ['status', 'Public status'], ['entryFee', 'Entry fee (INR)', 'number'], ['format', 'Competition format'], ['matchType', 'Match format'], ['venue', 'Venue'], ['address', 'Address'], ['mapLink', 'Google Maps link'], ['about', 'About the tournament', 'textarea'], ['registrationNote', 'Registration note', 'textarea']]; const submit = async (event) => { event.preventDefault(); setSaving(true); try { await save({ ...data, settings: { ...draft, entryFee: Number(draft.entryFee || 0) } }); } finally { setSaving(false); } }; return <div className="admin-content"><form className="admin-form settings-form" onSubmit={submit}><div className="form-heading"><div><span>PUBLIC WEBSITE CONTENT</span><h2>Tournament settings</h2></div><button className="save-button" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save changes'}</button></div><div className="form-grid">{fields.map(([key, label, type]) => <FormField key={key} label={label} type={type} value={draft[key] ?? ''} onChange={(value) => setDraft({ ...draft, [key]: value })} />)}<label className="toggle-field"><input type="checkbox" checked={Boolean(draft.registrationOpen)} onChange={(event) => setDraft({ ...draft, registrationOpen: event.target.checked })} /><span /><div><strong>Registration is open</strong><small>Shows an active registration status on the public page.</small></div></label></div></form></div>; }

const collectionConfig = {
  teams: { title: 'Teams', singular: 'team', icon: Users, fields: [['name', 'Team / College Name'], ['logo', 'College Logo URL (Public image link, e.g. https://...)'], ['shortName', 'Short Name / Initials (Optional fallback, e.g. BBIT)'], ['city', 'City / College Location'], ['group', 'Group (e.g. Group A / Group B / Group C / Group D)']] },
  fixtures: { title: 'Fixtures & Live Match', singular: 'fixture', icon: CalendarDays, fields: [['date', 'Match date'], ['time', 'Kick-off time'], ['stage', 'Stage'], ['home', 'Home team'], ['away', 'Away team'], ['venue', 'Venue'], ['status', 'Status (scheduled / live / completed)'], ['minute', 'Match minute (e.g. 64\', HT, FT)'], ['liveNote', 'Live Ticker Commentary Note', 'textarea'], ['homeScore', 'Home score', 'number'], ['awayScore', 'Away score', 'number']] },
  standings: { title: 'Standings', singular: 'standing', icon: Table2, fields: [['team', 'Team'], ['played', 'Played', 'number'], ['wins', 'Wins', 'number'], ['draws', 'Draws', 'number'], ['losses', 'Losses', 'number'], ['gf', 'Goals for', 'number'], ['ga', 'Goals against', 'number'], ['points', 'Points', 'number']] },
  champions: { title: 'History', singular: 'champion record', icon: Trophy, fields: [['year', 'Year'], ['winner', 'Champion'], ['runnerUp', 'Runner-up']] },
  contacts: { title: 'Contacts', singular: 'contact', icon: Phone, fields: [['name', 'Name'], ['role', 'Role'], ['phone', 'Phone number']] },
  dignitaries: { title: 'Patrons & Leaders', singular: 'patron record', icon: Users, fields: [['name', 'Full Name (e.g. Dr. Ramesh Das)'], ['title', 'Designation (e.g. CHAIRMAN)'], ['role', 'Tournament Role (e.g. CHIEF PATRON)'], ['image', 'Photo URL or /assets/dignitaries/filename.jpg']] },
  messages: { title: 'Messages', singular: 'message', icon: Phone, fields: [['name', 'Name'], ['phone', 'Phone number'], ['message', 'Message content', 'textarea']] },
  registrations: { title: 'Registrations', singular: 'registration', icon: Users, fields: [['college', 'College / Institution'], ['team', 'Team name'], ['captain', 'Captain / Coach'], ['phone', 'Contact phone'], ['email', 'Email address'], ['count', 'Squad player count']] }
};

function CollectionEditor({ collection, data, save }) {
  const config = collectionConfig[collection];
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});
  const [saving, setSaving] = useState(false);
  const items = data[collection] || [];
  const startNew = () => { setEditing('new'); setDraft({}); };
  const startEdit = (item) => { setEditing(item.id); setDraft(item); };
  const cancel = () => { setEditing(null); setDraft({}); };
  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const record = { ...draft, id: editing === 'new' ? makeId(collection) : editing };
      config.fields.forEach(([key,, type]) => { if (type === 'number') record[key] = Number(record[key] || 0); });
      const nextItems = editing === 'new' ? [...items, record] : items.map((item) => item.id === editing ? record : item);
      await save({ ...data, [collection]: nextItems });
      cancel();
    } finally { setSaving(false); }
  };
  const remove = async (id) => {
    if (!window.confirm('Remove this item from the public website?')) return;
    await save({ ...data, [collection]: items.filter((item) => item.id !== id) });
    if (editing === id) cancel();
  };
  const Icon = config.icon;
  return (
    <div className="admin-content">
      <section className="collection-heading">
        <div>
          <span>CONTENT MANAGEMENT</span>
          <h2>{config.title}</h2>
          <p>{items.length} published {items.length === 1 ? config.singular : config.title.toLowerCase()}.</p>
        </div>
        <button className="save-button" onClick={startNew}><Plus size={17} /> Add {config.singular}</button>
      </section>
      <div className="collection-layout">
        <section className="records-list">
          {items.length ? items.map((item, index) => (
            <article className={editing === item.id ? 'selected' : ''} key={item.id}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <div className="record-main-col">
                {collection === 'teams' && item.logo && (
                  <img
                    src={item.logo}
                    alt=""
                    className="record-thumb-crest"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                )}
                <div className="record-text-meta">
                  <strong>{recordTitle(collection, item)}</strong>
                  <small>{recordSubtitle(collection, item)}</small>
                  {(collection === 'messages' || collection === 'registrations') && (
                    <div className="submission-actions-row">
                      {item.phone && (
                        <a href={`tel:${item.phone}`} className="submission-action-btn" target="_blank" rel="noreferrer">
                          <Phone size={12} /> Call {item.phone}
                        </a>
                      )}
                      {item.phone && (
                        <a href={`https://wa.me/91${item.phone.replace(/\D/g, '')}`} className="submission-action-btn wa-btn" target="_blank" rel="noreferrer">
                          💬 WhatsApp
                        </a>
                      )}
                      {item.email && (
                        <a href={`mailto:${item.email}`} className="submission-action-btn" target="_blank" rel="noreferrer">
                          ✉️ Email
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>
              <button onClick={() => startEdit(item)} aria-label="Edit"><Pencil size={16} /></button>
              <button className="delete-record" onClick={() => remove(item.id)} aria-label="Delete"><Trash2 size={16} /></button>
            </article>
          )) : (
            <div className="records-empty">
              <Icon size={25} />
              <p>No {config.title.toLowerCase()} published yet.</p>
              <button onClick={startNew}>Create the first one <ArrowUpRight size={15} /></button>
            </div>
          )}
        </section>
        <section className="record-editor">
          {editing ? (
            <form className="admin-form" onSubmit={submit}>
              <div className="editor-heading">
                <div>
                  <span>{editing === 'new' ? 'NEW RECORD' : 'EDIT RECORD'}</span>
                  <h3>{editing === 'new' ? `Add ${config.singular}` : recordTitle(collection, draft)}</h3>
                </div>
                <button type="button" onClick={cancel}>Cancel</button>
              </div>
              {config.fields.map(([key, label, type]) => <FormField key={key} label={label} type={type} value={draft[key] ?? ''} onChange={(value) => setDraft({ ...draft, [key]: value })} />)}
              {collection === 'teams' && draft.logo && (
                <div className="team-logo-preview">
                  <small>COLLEGE LOGO PREVIEW</small>
                  <div className="team-preview-crest">
                    <img
                      src={draft.logo}
                      alt="College logo preview"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const errEl = e.currentTarget.parentElement?.querySelector('.team-preview-error');
                        if (errEl) errEl.style.display = 'block';
                      }}
                      onLoad={(e) => {
                        e.currentTarget.style.display = 'block';
                        const errEl = e.currentTarget.parentElement?.querySelector('.team-preview-error');
                        if (errEl) errEl.style.display = 'none';
                      }}
                    />
                    <span className="team-preview-error" style={{ display: 'none', color: '#ff6b6b', fontSize: '11px', textAlign: 'center', padding: '4px' }}>
                      ⚠️ Image failed to load. Please check that the URL is a direct, public image link.
                    </span>
                  </div>
                </div>
              )}
              {collection === 'fixtures' && <FixtureEventsEditor draft={draft} setDraft={setDraft} />}
              {collection === 'dignitaries' && draft.image && (
                <div className="patron-image-preview">
                  <small>PHOTO PREVIEW</small>
                  <img src={draft.image} alt={draft.name || draft.title || 'Patron'} />
                </div>
              )}
              <button className="save-button form-save" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save to website'}</button>
            </form>
          ) : (
            <div className="editor-placeholder">
              <Icon size={33} />
              <h3>Select an item to edit</h3>
              <p>Create a new record or choose one from the list.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function FixtureEventsEditor({ draft, setDraft }) {
  const [minute, setMinute] = useState('');
  const [type, setType] = useState('goal');
  const [team, setTeam] = useState('home');
  const [player, setPlayer] = useState('');

  const addEvent = () => {
    if (!player) return;
    const newEvent = { id: makeId('event'), minute: minute || '•', type, team, player };
    const currentEvents = Array.isArray(draft.events) ? draft.events : [];
    setDraft({ ...draft, events: [...currentEvents, newEvent] });
    setMinute('');
    setPlayer('');
  };

  const removeEvent = (id) => {
    const currentEvents = Array.isArray(draft.events) ? draft.events : [];
    setDraft({ ...draft, events: currentEvents.filter(e => e.id !== id) });
  };

  const events = Array.isArray(draft.events) ? draft.events : [];

  return (
    <div className="admin-events-editor">
      <h4>⚡ Live Match Events (Goals & Cards)</h4>
      <div className="admin-event-input-row">
        <input type="text" placeholder="Min (e.g. 14')" value={minute} onChange={e => setMinute(e.target.value)} />
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="goal">⚽ Goal</option>
          <option value="yellow_card">🨨 Yellow Card</option>
          <option value="red_card">🨩 Red Card</option>
        </select>
        <select value={team} onChange={e => setTeam(e.target.value)}>
          <option value="home">Home ({draft.home || 'Home'})</option>
          <option value="away">Away ({draft.away || 'Away'})</option>
        </select>
        <input type="text" placeholder="Player Name" value={player} onChange={e => setPlayer(e.target.value)} />
        <button type="button" className="admin-add-event-btn" onClick={addEvent}>+ Add Event</button>
      </div>
      {events.length > 0 && (
        <div className="admin-event-chip-list">
          {events.map((ev, index) => (
            <div className="admin-event-chip" key={ev.id || index}>
              <span>{ev.minute} {ev.type === 'goal' ? '⚽' : ev.type === 'yellow_card' ? '🨨' : '🨩'} {ev.player} ({ev.team === 'home' ? draft.home || 'Home' : draft.away || 'Away'})</span>
              <button type="button" onClick={() => removeEvent(ev.id)}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FormField({ label, type = 'text', value, onChange }) {
  const isGroupField = label.toLowerCase().includes('group');
  return (
    <label className={type === 'textarea' ? 'wide-field' : ''}>
      {label}
      {type === 'textarea' ? (
        <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="4" />
      ) : isGroupField ? (
        <>
          <input
            type={type}
            list="group-presets"
            placeholder="e.g. Group A / Group B / Group C / Group D"
            value={value}
            onChange={(event) => onChange(event.target.value)}
          />
          <datalist id="group-presets">
            <option value="Group A" />
            <option value="Group B" />
            <option value="Group C" />
            <option value="Group D" />
          </datalist>
        </>
      ) : (
        <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
      )}
    </label>
  );
}

function recordTitle(collection, item) {
  if (collection === 'fixtures') return `${item.home || 'TBA'} vs ${item.away || 'TBA'}`;
  if (collection === 'standings') return item.team || 'Unnamed team';
  if (collection === 'champions') return item.winner || 'Champion record';
  if (collection === 'dignitaries') return [item.name, item.title].filter(Boolean).join(' — ') || 'Patron';
  if (collection === 'messages') return item.name ? `From: ${item.name}` : 'Contact Message';
  if (collection === 'registrations') return item.team ? `${item.team} (${item.college || 'College'})` : 'Team Registration';
  return item.name || 'Untitled record';
}

function recordSubtitle(collection, item) {
  if (collection === 'fixtures') return [item.stage, item.date, item.time].filter(Boolean).join(' / ') || 'Match details';
  if (collection === 'standings') return `${item.points || 0} points / ${item.played || 0} played`;
  if (collection === 'champions') return item.year || 'Year TBA';
  if (collection === 'teams') return [item.city, item.group, item.shortName ? `[${item.shortName}]` : ''].filter(Boolean).join(' • ') || 'Team profile';
  if (collection === 'dignitaries') return item.role || 'Patron & Leader';
  if (collection === 'messages') return [item.submittedAt ? `[${item.submittedAt}]` : '', item.phone ? `Tel: ${item.phone}` : '', item.message].filter(Boolean).join(' • ') || 'Message details';
  if (collection === 'registrations') return [item.submittedAt ? `[${item.submittedAt}]` : '', `Captain: ${item.captain || 'N/A'}`, `Tel: ${item.phone || 'N/A'}`, `Email: ${item.email || 'N/A'}`, `Squad: ${item.count || '18'} players`].filter(Boolean).join(' • ');
  return item.role || item.phone || 'Contact details';
}

createRoot(document.getElementById('root')).render(<App />);
