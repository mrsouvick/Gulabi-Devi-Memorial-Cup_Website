import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ArrowUpRight, CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, CircleAlert,
  Cloud, ExternalLink, History, LayoutDashboard, LockKeyhole, LogOut, MapPin, Menu,
  Pencil, Phone, Plus, Save, Settings, ShieldCheck, Table2, Trophy, Trash2, Users, X
} from 'lucide-react';
import { defaultTournament, getSession, isCloudEnabled, loadTournament, makeId, saveTournament, signIn, signOut } from './lib/tournamentStore';
import './styles.css';

const logo = '/assets/tournament-logo.jpg';
const collegeLogo = '/assets/bbit-college-logo.png';
const heroImage = '/assets/football-hero-background.png';
const poster = '/assets/tournament-poster-final.png';

const dignitaries = [
  { title: 'CHAIRMAN', role: 'CHIEF PATRON', image: '/assets/dignitaries/chairman.jpg' },
  { title: 'PRINCIPAL', role: 'PATRON & MENTOR', image: '/assets/dignitaries/principal.jpg' },
  { title: 'DEAN OF STUDENTS', role: 'ADVISORY HEAD', image: '/assets/dignitaries/dean.jpg' },
  { title: 'REGISTRAR', role: 'EXECUTIVE CONVENOR', image: '/assets/dignitaries/registrar.jpg' },
  { title: 'DEPUTY REGISTRAR', role: 'CO-CONVENOR', image: '/assets/dignitaries/deputy-registrar.jpg' }
];

const publicRoutes = [
  ['Home', '#home'], ['Teams', '#teams'], ['Fixtures', '#fixtures'], ['Standings', '#standings'],
  ['Bracket', '#bracket'], ['History', '#history'], ['Venue', '#venue'], ['Contact', '#contact']
];

const adminSections = [
  ['dashboard', 'Overview', LayoutDashboard], ['settings', 'Tournament', Settings], ['teams', 'Teams', Users],
  ['fixtures', 'Fixtures', CalendarDays], ['standings', 'Standings', Table2], ['champions', 'History', History], ['contacts', 'Contacts', Phone]
];

function routeFromHash() {
  const hash = location.hash || '#home';
  return [...publicRoutes.map(([, route]) => route), '#register', '#admin'].includes(hash) ? hash : '#home';
}

function App() {
  const [tournament, setTournament] = useState(null);
  const [route, setRoute] = useState(routeFromHash());
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

    const interval = setInterval(() => fetchLatest(true), 10000);
    const onFocus = () => fetchLatest(true);
    const onHashChange = () => { setRoute(routeFromHash()); window.scrollTo({ top: 0, behavior: 'smooth' }); };

    window.addEventListener('focus', onFocus);
    window.addEventListener('hashchange', onHashChange);
    return () => {
      alive = false;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  const go = (next) => { if (location.hash === next) window.scrollTo({ top: 0, behavior: 'smooth' }); else location.hash = next; };

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
  if (route === '#admin') return <AdminPortal tournament={tournament} save={persist} go={go} notice={notice} setNotice={setNotice} />;
  return <PublicSite tournament={tournament} route={route} go={go} notice={notice} setNotice={setNotice} />;
}

function LoadingScreen() {
  return <div className="loading-screen"><img src={logo} alt="" /><p>Loading tournament desk...</p></div>;
}

function PublicSite({ tournament, route, go, notice, setNotice }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const settings = tournament.settings;
  const navigate = (next) => { setMenuOpen(false); go(next); };
  return <div className="public-app">
    <a className="skip-link" href="#main-content">Skip to content</a>
    <header className="public-header">
      <button className="public-brand" onClick={() => navigate('#home')} aria-label="Tournament home"><img src={logo} alt="Gulabi Devi Cup" /><span>{settings.name}<small>{settings.edition} / {settings.year}</small></span></button>
      <nav className="public-nav" aria-label="Primary navigation">{publicRoutes.map(([label, target]) => <button className={route === target ? 'active' : ''} key={target} onClick={() => navigate(target)}>{label}</button>)}</nav>
      <button className="public-cta" onClick={() => navigate('#register')}>Register <ArrowUpRight size={15} /></button>
      <button className="public-menu" onClick={() => setMenuOpen(!menuOpen)} aria-expanded={menuOpen} aria-label="Open navigation">{menuOpen ? <X /> : <Menu />}</button>
    </header>
    {menuOpen && <div className="public-mobile-nav">{publicRoutes.map(([label, target]) => <button key={target} onClick={() => navigate(target)}>{label}<ChevronRight size={17} /></button>)}<button onClick={() => navigate('#register')}>Register your team <ArrowUpRight size={17} /></button></div>}
    <main id="main-content">
      <Toast notice={notice} dismiss={() => setNotice(null)} />
      {route === '#home' && <Home tournament={tournament} go={navigate} />}
      {route === '#teams' && <TeamsPage teams={tournament.teams} go={navigate} />}
      {route === '#fixtures' && <FixturesPage fixtures={tournament.fixtures} go={navigate} />}
      {route === '#standings' && <StandingsPage standings={tournament.standings} />}
      {route === '#bracket' && <BracketPage fixtures={tournament.fixtures} />}
      {route === '#history' && <HistoryPage champions={tournament.champions} />}
      {route === '#venue' && <VenuePage settings={settings} />}
      {route === '#register' && <RegisterPage settings={settings} contacts={tournament.contacts} go={navigate} />}
      {route === '#contact' && <ContactPage contacts={tournament.contacts} settings={settings} />}
    </main>
    <PublicFooter settings={settings} go={navigate} />
  </div>;
}

function Home({ tournament, go }) {
  const { settings, fixtures, teams } = tournament;
  return <>
    <section className="home-hero">
      <div className="home-hero-image" style={{ backgroundImage: `url(${heroImage})` }} />
      <div className="home-hero-shade" />
      <div className="home-hero-content"><div className="eyebrow"><span /> BBIT PRESENTS</div><p className="hero-pretitle">THE ANNUAL INTER-COLLEGE CHAMPIONSHIP</p><h1>GULABI DEVI<br /><em>MEMORIAL CUP</em></h1><div className="hero-edition"><strong>14<sup>TH</sup></strong><span>EDITION</span><i /><span>{settings.format}<br />{settings.matchType}</span></div><div className="hero-actions"><button className="primary-button" onClick={() => go('#register')}>Register your team <ArrowUpRight size={18} /></button><button className="hero-link" onClick={() => go('#fixtures')}>Match centre <ChevronRight size={18} /></button></div></div>
      <div className="hero-poster"><img src={poster} alt="Gulabi Devi Memorial Cup official poster" /><span>Official poster / {settings.year}</span></div>
      <div className="hero-side-copy">BBIT <i /> {settings.year}</div>
      <div className="hero-facts"><HeroFact label="Tournament dates" value={settings.date} /><HeroFact label="Venue" value={settings.venue} /><HeroFact label="Entry fee" value={`INR ${Number(settings.entryFee || 0).toLocaleString('en-IN')}`} note="per team" /></div>
    </section>
    <section className="home-status"><CalendarDays size={20} /><div><small>TOURNAMENT STATUS</small><strong>{settings.status}</strong></div><p>{settings.registrationOpen ? 'Team registration is currently open. Secure your place in the tournament.' : 'Registration details and the official draw will be announced here.'}</p><button onClick={() => go('#contact')}>Get updates <ArrowUpRight size={15} /></button></section>
    <section className="home-intro section-shell"><SectionLabel number="01" text="THE TOURNAMENT" /><div className="intro-layout"><h2>PLAY FOR<br /><em>MORE.</em></h2><div><p>{settings.about}</p><button className="text-button" onClick={() => go('#history')}>Explore the legacy <ArrowUpRight size={16} /></button></div></div><div className="home-metrics"><Metric value="14" label="Editions" /><Metric value={String(teams.length).padStart(2, '0')} label="Teams announced" /><Metric value={String(fixtures.length).padStart(2, '0')} label="Fixtures published" /><Metric value="11" label="Players a side" /></div></section>
    <section className="home-dignitaries section-shell">
      <SectionLabel number="02" text="PATRONS & COLLEGE LEADERSHIP" />
      <div className="dignitaries-header">
        <h2>HONORABLE<br /><em>PATRONS & LEADERS</em></h2>
        <p>Under the visionary guidance and leadership of Budge Budge Institute of Technology (BBIT) management and administration.</p>
      </div>
      <div className="dignitaries-grid">
        {dignitaries.map((item, index) => (
          <article className="dignitary-card" key={index}>
            <div className="dignitary-image-wrap">
              <img src={item.image} alt={item.title} />
              <span className="dignitary-badge">{item.role}</span>
            </div>
            <div className="dignitary-body">
              <h3>{item.title}</h3>
              <p>Budge Budge Institute of Technology</p>
            </div>
          </article>
        ))}
      </div>
    </section>
    <section className="home-grid-section section-shell"><SectionLabel number="03" text="TOURNAMENT DESK" /><div className="home-grid"><InfoCard icon={<Users />} title="Teams" text={teams.length ? `${teams.length} confirmed team${teams.length === 1 ? '' : 's'} are on the board.` : 'The official team list will appear after confirmations.'} action="View teams" onClick={() => go('#teams')} /><InfoCard icon={<CalendarDays />} title="Fixtures" text={fixtures.length ? `${fixtures.length} fixture${fixtures.length === 1 ? '' : 's'} have been published.` : 'The match schedule will be released by the tournament office.'} action="Open match centre" onClick={() => go('#fixtures')} /><InfoCard icon={<Trophy />} title="The cup" text="League football, knockout tension, one trophy to lift." action="Tournament history" onClick={() => go('#history')} /></div></section>
    <section className="home-venue section-shell"><div className="venue-art"><MapPin size={36} /><span>{settings.venue}</span></div><div><SectionLabel number="04" text="THE VENUE" /><h2>WHERE THE<br /><em>GAME LIVES.</em></h2><p>{settings.address}</p><button className="text-button" onClick={() => go('#venue')}>Venue details <ArrowUpRight size={16} /></button></div></section>
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

  const filtered = useMemo(() => {
    return teams.filter(team => {
      const matchFilter = filter === 'All' || team.group === filter;
      const matchSearch = !search || team.name?.toLowerCase().includes(search.toLowerCase()) || team.city?.toLowerCase().includes(search.toLowerCase());
      return matchFilter && matchSearch;
    });
  }, [teams, filter, search]);

  return (
    <>
      <PageHero kicker="THE CONTENDERS" title="THE TEAMS" text="The colleges chasing their place in Gulabi Devi Memorial Cup history." action={<button className="primary-button" onClick={() => go('#register')}>Register your team <ArrowUpRight size={17} /></button>} />
      <section className="content-shell">
        <div className="page-toolbar">
          <div className="filter-tabs">
            {['All', 'Group A', 'Group B'].map(group => (
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
                  <div className="team-crest">{team.shortName || team.name?.slice(0, 3) || 'FC'}</div>
                  <h3>{team.name}</h3>
                  <p>{team.city || 'Official College Team'}</p>
                </div>
                <div className="team-card-footer">
                  <span>11-a-side Squad</span>
                  <button className="text-button-sm" onClick={() => go('#fixtures')}>Schedule <ChevronRight size={14} /></button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyMessage title="No teams found." text="Try clearing your search filter or register a new team." icon={<Users />} action={<button className="primary-button" onClick={() => go('#register')}>Register team <ArrowUpRight size={16} /></button>} />
        )}
      </section>
    </>
  );
}

function FixturesPage({ fixtures, go }) {
  const [stageFilter, setStageFilter] = useState('All');

  const filtered = useMemo(() => {
    if (stageFilter === 'All') return fixtures;
    return fixtures.filter(f => (f.stage || '').toLowerCase().includes(stageFilter.toLowerCase()));
  }, [fixtures, stageFilter]);

  return (
    <>
      <PageHero kicker="MATCH CENTRE" title="FIXTURES & RESULTS" text="All match timings, live scores, results, and venue information in one place." />
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
            {filtered.map(fixture => (
              <article className="fixture-card-rich" key={fixture.id}>
                <div className="fixture-card-head">
                  <span className="fixture-stage-badge">{fixture.stage || 'Match'}</span>
                  <span className={`fixture-status-pill ${fixture.status || 'scheduled'}`}>{fixture.status === 'completed' ? 'FINAL SCORE' : fixture.status === 'live' ? '● LIVE MATCH' : 'SCHEDULED'}</span>
                </div>
                <div className="fixture-card-teams">
                  <div className="team-side home-side">
                    <strong>{fixture.home}</strong>
                  </div>
                  <div className="score-box">
                    {fixture.status === 'completed' ? (
                      <span className="final-score">{fixture.homeScore ?? 0} - {fixture.awayScore ?? 0}</span>
                    ) : (
                      <span className="vs-tag">VS</span>
                    )}
                  </div>
                  <div className="team-side away-side">
                    <strong>{fixture.away}</strong>
                  </div>
                </div>
                <div className="fixture-card-foot">
                  <span><CalendarDays size={13} /> {fixture.date || 'Date TBA'} {fixture.time ? ` @ ${fixture.time}` : ''}</span>
                  <span><MapPin size={13} /> {fixture.venue || 'BBIT Football Ground'}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyMessage title="No fixtures published yet." text="Check back soon for the official tournament match draw." icon={<CalendarDays />} />
        )}
      </section>
    </>
  );
}

function StandingsPage({ standings }) {
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
                return (
                  <div className={`standing-row-rich ${isTop2 ? 'top-qualifier' : ''}`} key={team.id || index}>
                    <span className="rank-col">{isTop2 ? `0${index + 1} ⭐` : String(index + 1).padStart(2, '0')}</span>
                    <strong className="team-col">{team.team}</strong>
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

function BracketPage({ fixtures }) {
  return (
    <>
      <PageHero kicker="ROAD TO THE TROPHY" title="KNOCKOUT BRACKET" text="The tournament progression tree leading to the Gulabi Devi Memorial Cup." />
      <section className="content-shell">
        <div className="bracket-tree-container">
          <div className="bracket-column">
            <div className="bracket-col-title">QUARTER-FINALS</div>
            <div className="bracket-card-rich">
              <small>MATCH 01</small>
              <div className="bracket-team winner"><span>BBIT Strikers</span><b>2</b></div>
              <div className="bracket-team"><span>IEM Warriors</span><b>0</b></div>
            </div>
            <div className="bracket-card-rich">
              <small>MATCH 02</small>
              <div className="bracket-team winner"><span>Jadavpur Panthers</span><b>3</b></div>
              <div className="bracket-team"><span>Calcutta Univ</span><b>1</b></div>
            </div>
          </div>

          <div className="bracket-column">
            <div className="bracket-col-title">SEMI-FINALS</div>
            <div className="bracket-card-rich highlight">
              <small>SEMI-FINAL 01</small>
              <div className="bracket-team winner"><span>BBIT Strikers</span><b>1</b></div>
              <div className="bracket-team"><span>Jadavpur Panthers</span><b>0</b></div>
            </div>
          </div>

          <div className="bracket-column final-column">
            <div className="bracket-col-title">GRAND FINAL 🏆</div>
            <div className="bracket-card-rich championship-card">
              <small>GULABI DEVI CUP FINAL</small>
              <div className="bracket-team winner"><span>BBIT Strikers</span><b>TBD</b></div>
              <div className="bracket-team"><span>Heritage Tigers</span><b>TBD</b></div>
              <div className="champion-badge"><Trophy size={16} /> TROPHY MATCH</div>
            </div>
          </div>
        </div>
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

function RegisterPage({ settings, contacts, go }) {
  const [formData, setFormData] = useState({ college: '', team: '', captain: '', phone: '', email: '', count: '18' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
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

function ContactPage({ contacts, settings }) {
  const [msgData, setMsgData] = useState({ name: '', phone: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSend = (e) => {
    e.preventDefault();
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

function PublicFooter({ settings, go }) { return <footer className="public-footer"><div className="footer-brand"><img src={logo} alt="Gulabi Devi Cup Logo" className="footer-logo-main" /><img src={collegeLogo} alt="BBIT College Logo" className="footer-logo-college" title="Budge Budge Institute of Technology" /><div><strong>{settings.name}</strong><small>{settings.edition} / {settings.organizer}</small></div></div><div className="footer-links">{publicRoutes.slice(1, 5).map(([label, target]) => <button key={target} onClick={() => go(target)}>{label}</button>)}</div><div className="footer-bottom">Copyright {settings.year} {settings.name}. Organized by Budge Budge Institute of Technology (BBIT). All rights reserved.</div></footer>; }

function Toast({ notice, dismiss }) { if (!notice) return null; return <div className={`toast ${notice.type}`} role="status"><span>{notice.type === 'success' ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span>{notice.text}<button onClick={dismiss} aria-label="Dismiss">×</button></div>; }

function AdminPortal({ tournament, save, go, notice, setNotice }) {
  const [session, setSession] = useState(getSession());
  const [active, setActive] = useState('dashboard');
  if (!session) return <AdminLogin onSuccess={setSession} go={go} />;
  const exit = () => { signOut(); setSession(null); };
  return <div className="admin-app"><aside className="admin-sidebar"><button className="admin-brand" onClick={() => go('#home')}><img src={logo} alt="" /><span>TOURNAMENT<br /><em>DESK</em></span></button><div className="admin-profile"><span>{session.email?.slice(0, 1).toUpperCase()}</span><div><strong>{session.email}</strong><small>{isCloudEnabled ? 'Secure cloud session' : 'Local preview mode'}</small></div></div><nav>{adminSections.map(([key, label, Icon]) => <button className={active === key ? 'active' : ''} key={key} onClick={() => setActive(key)}><Icon size={17} />{label}</button>)}</nav><div className="admin-sidebar-footer"><button onClick={() => go('#home')}><ChevronLeft size={16} /> Public website</button><button onClick={exit}><LogOut size={16} /> Sign out</button></div></aside><main className="admin-main"><Toast notice={notice} dismiss={() => setNotice(null)} /><AdminTopbar active={active} tournament={tournament} go={go} />{active === 'dashboard' && <AdminDashboard tournament={tournament} setActive={setActive} />}{active === 'settings' && <SettingsEditor data={tournament} save={save} />}{['teams', 'fixtures', 'standings', 'champions', 'contacts'].includes(active) && <CollectionEditor collection={active} data={tournament} save={save} />}</main></div>;
}

function AdminLogin({ onSuccess, go }) { const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState(''); const [busy, setBusy] = useState(false); const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); try { onSuccess(await signIn(email, password)); } catch (err) { setError(err.message); } finally { setBusy(false); } }; return <div className="admin-login"><div className="admin-login-panel"><button className="back-home" onClick={() => go('#home')}><ChevronLeft size={16} /> Public website</button><img src={logo} alt="" /><span className="admin-kicker">GULABI DEVI MEMORIAL CUP</span><h1>Tournament<br /><em>Desk</em></h1><p>{isCloudEnabled ? 'Sign in with your authorised Supabase admin account.' : 'Local preview mode is active. This is for development only; add the Supabase environment variables before production deployment.'}</p><form onSubmit={submit}><label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" required /></label><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Your password" required /></label>{error && <div className="form-error">{error}</div>}<button className="admin-submit" disabled={busy}>{busy ? 'Signing in...' : isCloudEnabled ? 'Sign in securely' : 'Open local admin'} <ArrowUpRight size={16} /></button></form><div className="admin-login-mode">{isCloudEnabled ? <><Cloud size={15} /> Cloud data connected</> : <><CircleAlert size={15} /> Local browser storage only</>}</div></div></div>; }

function AdminTopbar({ active, tournament, go }) { const label = adminSections.find(([key]) => key === active)?.[1] || 'Admin'; return <header className="admin-topbar"><div><span>TOURNAMENT ADMIN</span><h1>{label}</h1></div><div><small>LAST UPDATED</small><strong>{tournament.updatedAt ? new Date(tournament.updatedAt).toLocaleString() : 'Not published yet'}</strong><button onClick={() => go('#home')}>View website <ArrowUpRight size={15} /></button></div></header>; }

function AdminDashboard({ tournament, setActive }) { const cards = [['Teams', tournament.teams.length, 'teams', Users], ['Fixtures', tournament.fixtures.length, 'fixtures', CalendarDays], ['Standings', tournament.standings.length, 'standings', Table2], ['History', tournament.champions.length, 'champions', Trophy]]; return <div className="admin-content"><section className="admin-welcome"><div><span>CONTROL CENTRE</span><h2>Everything your<br /><em>tournament needs.</em></h2><p>Publish official information once, and the public website updates instantly.</p></div><ShieldCheck size={55} /></section><div className="admin-stat-grid">{cards.map(([label, value, key, Icon]) => <button key={key} onClick={() => setActive(key)}><Icon size={21} /><strong>{String(value).padStart(2, '0')}</strong><span>{label}</span><ChevronRight size={16} /></button>)}</div><section className="admin-checklist"><div><h3>Publish checklist</h3><p>Keep these details current before sharing the tournament website.</p></div><div>{[['Tournament details', 'settings'], ['Team list', 'teams'], ['Fixtures and results', 'fixtures'], ['League table', 'standings'], ['Tournament contacts', 'contacts']].map(([label, key]) => <button key={key} onClick={() => setActive(key)}><span>{key === 'settings' || tournament[key]?.length ? <CheckCircle2 size={17} /> : <CircleAlert size={17} />}</span>{label}<ChevronRight size={16} /></button>)}</div></section></div>; }

function SettingsEditor({ data, save }) { const [draft, setDraft] = useState(data.settings); const [saving, setSaving] = useState(false); useEffect(() => setDraft(data.settings), [data.settings]); const fields = [['name', 'Tournament name'], ['edition', 'Edition'], ['year', 'Year'], ['organizer', 'Organiser'], ['date', 'Tournament dates'], ['status', 'Public status'], ['entryFee', 'Entry fee (INR)', 'number'], ['format', 'Competition format'], ['matchType', 'Match format'], ['venue', 'Venue'], ['address', 'Address'], ['mapLink', 'Google Maps link'], ['about', 'About the tournament', 'textarea'], ['registrationNote', 'Registration note', 'textarea']]; const submit = async (event) => { event.preventDefault(); setSaving(true); try { await save({ ...data, settings: { ...draft, entryFee: Number(draft.entryFee || 0) } }); } finally { setSaving(false); } }; return <div className="admin-content"><form className="admin-form settings-form" onSubmit={submit}><div className="form-heading"><div><span>PUBLIC WEBSITE CONTENT</span><h2>Tournament settings</h2></div><button className="save-button" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save changes'}</button></div><div className="form-grid">{fields.map(([key, label, type]) => <FormField key={key} label={label} type={type} value={draft[key] ?? ''} onChange={(value) => setDraft({ ...draft, [key]: value })} />)}<label className="toggle-field"><input type="checkbox" checked={Boolean(draft.registrationOpen)} onChange={(event) => setDraft({ ...draft, registrationOpen: event.target.checked })} /><span /><div><strong>Registration is open</strong><small>Shows an active registration status on the public page.</small></div></label></div></form></div>; }

const collectionConfig = {
  teams: { title: 'Teams', singular: 'team', icon: Users, fields: [['name', 'Team name'], ['shortName', 'Short name'], ['city', 'City / college'], ['group', 'Group']] },
  fixtures: { title: 'Fixtures', singular: 'fixture', icon: CalendarDays, fields: [['date', 'Match date'], ['time', 'Kick-off time'], ['stage', 'Stage'], ['home', 'Home team'], ['away', 'Away team'], ['venue', 'Venue'], ['status', 'Status'], ['homeScore', 'Home score', 'number'], ['awayScore', 'Away score', 'number']] },
  standings: { title: 'Standings', singular: 'standing', icon: Table2, fields: [['team', 'Team'], ['played', 'Played', 'number'], ['wins', 'Wins', 'number'], ['draws', 'Draws', 'number'], ['losses', 'Losses', 'number'], ['gf', 'Goals for', 'number'], ['ga', 'Goals against', 'number'], ['points', 'Points', 'number']] },
  champions: { title: 'History', singular: 'champion record', icon: Trophy, fields: [['year', 'Year'], ['winner', 'Champion'], ['runnerUp', 'Runner-up']] },
  contacts: { title: 'Contacts', singular: 'contact', icon: Phone, fields: [['name', 'Name'], ['role', 'Role'], ['phone', 'Phone number']] }
};

function CollectionEditor({ collection, data, save }) { const config = collectionConfig[collection]; const [editing, setEditing] = useState(null); const [draft, setDraft] = useState({}); const [saving, setSaving] = useState(false); const items = data[collection] || []; const startNew = () => { setEditing('new'); setDraft({}); }; const startEdit = (item) => { setEditing(item.id); setDraft(item); }; const cancel = () => { setEditing(null); setDraft({}); }; const submit = async (event) => { event.preventDefault(); setSaving(true); try { const record = { ...draft, id: editing === 'new' ? makeId(collection) : editing }; config.fields.forEach(([key,, type]) => { if (type === 'number') record[key] = Number(record[key] || 0); }); const nextItems = editing === 'new' ? [...items, record] : items.map((item) => item.id === editing ? record : item); await save({ ...data, [collection]: nextItems }); cancel(); } finally { setSaving(false); } }; const remove = async (id) => { if (!window.confirm('Remove this item from the public website?')) return; await save({ ...data, [collection]: items.filter((item) => item.id !== id) }); if (editing === id) cancel(); }; const Icon = config.icon; return <div className="admin-content"><section className="collection-heading"><div><span>CONTENT MANAGEMENT</span><h2>{config.title}</h2><p>{items.length} published {items.length === 1 ? config.singular : config.title.toLowerCase()}.</p></div><button className="save-button" onClick={startNew}><Plus size={17} /> Add {config.singular}</button></section><div className="collection-layout"><section className="records-list">{items.length ? items.map((item, index) => <article className={editing === item.id ? 'selected' : ''} key={item.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{recordTitle(collection, item)}</strong><small>{recordSubtitle(collection, item)}</small></div><button onClick={() => startEdit(item)} aria-label="Edit"><Pencil size={16} /></button><button className="delete-record" onClick={() => remove(item.id)} aria-label="Delete"><Trash2 size={16} /></button></article>) : <div className="records-empty"><Icon size={25} /><p>No {config.title.toLowerCase()} published yet.</p><button onClick={startNew}>Create the first one <ArrowUpRight size={15} /></button></div>}</section><section className="record-editor">{editing ? <form className="admin-form" onSubmit={submit}><div className="editor-heading"><div><span>{editing === 'new' ? 'NEW RECORD' : 'EDIT RECORD'}</span><h3>{editing === 'new' ? `Add ${config.singular}` : recordTitle(collection, draft)}</h3></div><button type="button" onClick={cancel}>Cancel</button></div>{config.fields.map(([key, label, type]) => <FormField key={key} label={label} type={type} value={draft[key] ?? ''} onChange={(value) => setDraft({ ...draft, [key]: value })} />)}<button className="save-button form-save" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save to website'}</button></form> : <div className="editor-placeholder"><Icon size={33} /><h3>Select an item to edit</h3><p>Create a new record or choose one from the list.</p></div>}</section></div></div>; }

function FormField({ label, type = 'text', value, onChange }) { return <label className={type === 'textarea' ? 'wide-field' : ''}>{label}{type === 'textarea' ? <textarea value={value} onChange={(event) => onChange(event.target.value)} rows="4" /> : <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />}</label>; }
function recordTitle(collection, item) { if (collection === 'fixtures') return `${item.home || 'TBA'} vs ${item.away || 'TBA'}`; if (collection === 'standings') return item.team || 'Unnamed team'; if (collection === 'champions') return item.winner || 'Champion record'; return item.name || 'Untitled record'; }
function recordSubtitle(collection, item) { if (collection === 'fixtures') return [item.stage, item.date, item.time].filter(Boolean).join(' / ') || 'Match details'; if (collection === 'standings') return `${item.points || 0} points / ${item.played || 0} played`; if (collection === 'champions') return item.year || 'Year TBA'; if (collection === 'teams') return [item.city, item.group].filter(Boolean).join(' / ') || 'Team profile'; return item.role || item.phone || 'Contact details'; }

createRoot(document.getElementById('root')).render(<App />);
