import React, {
  useState, useEffect, useCallback, useRef,
  createContext, useContext
} from 'react';
import {
  Trophy, Users, Shield, LogOut, Search, Upload,
  UserPlus, Trash2, Edit3, CheckCircle2, Copy, X,
  RefreshCw, Eye, EyeOff, Plus, Settings, BarChart2,
  Lock, Unlock, Globe, Share2, Download, ChevronDown,
  ChevronUp, AlertTriangle, Activity, Award, Layers,
  FileText, List, Star, Zap, Database, KeyRound, Check,
  Loader2, Link2, ExternalLink, Key
} from 'lucide-react';
import Papa from 'papaparse';
import { supabase, callEdgeFunction } from './lib/supabaseClient';
import { authService, SUPER_ADMIN_EMAIL } from './services/authService';
import { eventService } from './services/eventService';
import { roundsService } from './services/roundsService';
import { teamsService } from './services/teamsService';
import { juryService } from './services/juryService';
import { evaluationService } from './services/evaluationService';
import { leaderboardService } from './services/leaderboardService';
import type {
  UserRole, Event, Round, Criterion, Team, Participant,
  Evaluation, LeaderboardRank, PublicLeaderboardEntry,
  EventMember, AuditLog, Toast, CreatedCredentials
} from './types';

// ─────────────────────────────────────────────────────────────────────────────
// CONTEXT
// ─────────────────────────────────────────────────────────────────────────────
interface AppCtx {
  role: UserRole;
  userId: string | null;
  userEmail: string | null;
  eventId: string | null;
  slug: string | null;
  showToast: (msg: string, type?: Toast['type']) => void;
}
const AppContext = createContext<AppCtx>({
  role: 'public', userId: null, userEmail: null,
  eventId: null, slug: null, showToast: () => {}
});
const useApp = () => useContext(AppContext);

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function ToastContainer({ toasts }: { toasts: Array<Toast & { id: number }> }) {
  return (
    <div className="toast-container">
      {toasts.map(t => (
        <div key={t.id} className={`toast toast-${t.type}`}>
          {t.type === 'success' && <CheckCircle2 size={14} />}
          {t.type === 'error'   && <AlertTriangle size={14} />}
          {t.type === 'info'    && <Activity size={14} />}
          {t.type === 'warning' && <AlertTriangle size={14} />}
          {t.message}
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, size = '' }: {
  title: string; onClose: () => void; children: React.ReactNode; size?: string;
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${size}`}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button onClick={onClose} style={{ background: 'var(--red)', border: '2px solid var(--black)', padding: '0.2rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 2px 0px var(--black)' }}>
            <X size={16} color="var(--white)" strokeWidth={2.5} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmModal({ message, onConfirm, onCancel }: {
  message: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <Modal title="Confirm Action" onClose={onCancel}>
      <div className="modal-body confirm-dialog">
        <AlertTriangle size={32} style={{ color: 'var(--orange)', margin: '0 auto 1rem' }} />
        <h3>Are you sure?</h3>
        <p>{message}</p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-danger" onClick={onConfirm}>Confirm</button>
      </div>
    </Modal>
  );
}

function CopyButton({ text, label = '' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button className="btn btn-ghost btn-sm" onClick={() => {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true); setTimeout(() => setCopied(false), 2000);
      });
    }}>
      {copied ? <><Check size={12} />Copied</> : <><Copy size={12} />{label || 'Copy'}</>}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft: 'badge-gray', active: 'badge-green', closed: 'badge-red',
    locked: 'badge-red', pending: 'badge-gray', evaluated: 'badge-green',
    organizer: 'badge-cyan', jury: 'badge-orange',
  };
  return <span className={`badge ${map[status] || 'badge-gray'}`}>{status}</span>;
}

function Spinner({ size = 24 }: { size?: number }) {
  return <div className="spinner" style={{ width: size, height: size }} />;
}

function CredentialDisplay({ creds, onClose }: { creds: CreatedCredentials; onClose: () => void }) {
  const all = `Email: ${creds.email}\nPassword: ${creds.password}${creds.loginUrl ? `\nLogin URL: ${creds.loginUrl}` : ''}`;
  return (
    <Modal title="🔑 Credentials (Shown Once)" onClose={onClose}>
      <div className="modal-body">
        <div className="warn-banner" style={{ marginBottom: '1rem' }}>
          <AlertTriangle size={14} />
          Save these credentials now. The password cannot be retrieved again.
        </div>
        <div className="cred-box">
          <div className="cred-row"><span className="cred-key">Email</span><span className="cred-val">{creds.email}</span></div>
          <div className="cred-row"><span className="cred-key">Password</span><span className="cred-val">{creds.password}</span></div>
          {creds.loginUrl && <div className="cred-row"><span className="cred-key">Login URL</span><span className="cred-val">{creds.loginUrl}</span></div>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
          <CopyButton text={creds.password} label="Copy Password" />
          <CopyButton text={all} label="Copy All" />
        </div>
      </div>
      <div className="modal-footer">
        <button className="btn btn-primary" onClick={onClose}>I've saved the credentials</button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN PAGE
// ─────────────────────────────────────────────────────────────────────────────
function LoginPage({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useApp();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Enter email and password.'); return; }
    setLoading(true); setError('');
    try {
      await authService.signIn(email.trim(), password);
      showToast('Login successful', 'success');
      onLogin();
    } catch (err: unknown) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)', padding: '1rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
            EVAL<span style={{ color: 'var(--yellow)' }}>PRO</span>
          </div>
          <p style={{ color: 'var(--gray-600)', marginTop: '0.5rem' }}>Multi-Event Scoring Platform</p>
        </div>
        <div className="card" style={{ boxShadow: 'var(--shadow)' }}>
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Sign In</h2>
          <form onSubmit={handleLogin} className="form-grid">
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} autoFocus />
            </div>
            <div className="input-group">
              <label className="input-label">Password</label>
              <div style={{ position: 'relative' }}>
                <input className="input" type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••••"
                  value={password} onChange={e => setPassword(e.target.value)}
                  style={{ paddingRight: '2.5rem' }} />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gray-600)' }}>
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            {error && <div className="warn-banner"><AlertTriangle size={14} />{error}</div>}
            <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <><Spinner size={16} />Signing in...</> : 'Sign In →'}
            </button>
          </form>
        </div>
        <p style={{ textAlign: 'center', color: 'var(--gray-600)', marginTop: '1rem', fontSize: '0.8rem' }}>
          Public leaderboard? Access via share link.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUPER ADMIN DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function AdminDashboard() {
  const { showToast, userId } = useApp();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'active' | 'closed'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<CreatedCredentials | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Event | null>(null);

  // Platform stats
  const [stats, setStats] = useState({ events: 0, active: 0, teams: 0, participants: 0, juries: 0, evaluations: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await eventService.listAllEvents();
      setEvents(data);

      const t = await supabase.from('teams').select('id', { count: 'exact', head: true });
      const p = await supabase.from('participants').select('id', { count: 'exact', head: true });
      const j = await supabase.from('event_members').select('id').eq('role', 'jury');
      const e = await supabase.from('evaluations').select('id', { count: 'exact', head: true });

      setStats({
        events: data.length,
        active: data.filter(d => d.status === 'active').length,
        teams: t.count || 0,
        participants: p.count || 0,
        juries: j.data?.length || 0,
        evaluations: e.count || 0
      });
    } catch (e: any) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    load();
    const handleOpenCreate = () => setShowCreateModal(true);
    window.addEventListener('open-create', handleOpenCreate);
    return () => window.removeEventListener('open-create', handleOpenCreate);
  }, [load]);


  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return (statusFilter === 'all' || e.status === statusFilter) &&
      (e.name.toLowerCase().includes(q) || e.organizer_email.toLowerCase().includes(q));
  });

  const handleDelete = async (event: Event) => {
    try {
      await eventService.deleteEvent(event.id);
      showToast('Event deleted', 'success');
      load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    setConfirmDelete(null);
  };

  const handleStatusChange = async (event: Event, status: 'draft' | 'active' | 'closed') => {
    try {
      await eventService.updateEventStatus(event.id, status);
      showToast('Status updated', 'success');
      load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  return (
    <div className="page">


      {/* Stats */}
      <div className="stats-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card yellow"><div className="stat-value">{stats.events}</div><div className="stat-label">Total Events</div></div>
        <div className="stat-card green"><div className="stat-value">{stats.active}</div><div className="stat-label">Active Events</div></div>
        <div className="stat-card cyan"><div className="stat-value">{stats.teams}</div><div className="stat-label">Total Teams</div></div>
        <div className="stat-card orange"><div className="stat-value">{stats.participants}</div><div className="stat-label">Participants</div></div>
        <div className="stat-card purple"><div className="stat-value">{stats.juries}</div><div className="stat-label">Jury Panels</div></div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <div className="search-box" style={{ flex: 1, minWidth: '200px' }}>
          <Search size={14} className="search-icon" />
          <input className="input" placeholder="Search events or organizer email..."
            value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
        </div>
        <select className="input" style={{ width: 'auto' }} value={statusFilter}
          onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Events table */}
      {loading ? (
        <div className="loading-center"><Spinner /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state"><Trophy size={48} /><h3>No Events</h3><p>Create your first event to get started.</p></div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Event Name</th>
                <th>Organizer</th>
                <th>Status</th>
                <th>Teams</th>
                <th>Juries</th>
                <th>Rounds</th>
                <th>Leaderboard</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ev => (
                <tr key={ev.id}>
                  <td>
                    <div style={{ fontWeight: 700 }}>{ev.name}</div>
                    <div style={{ color: 'var(--gray-600)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{ev.slug}</div>
                  </td>
                  <td style={{ color: 'var(--gray-700)' }}>{ev.organizer_email}</td>
                  <td><StatusBadge status={ev.status} /></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{ev.teams_count ?? 0}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{ev.juries_count ?? 0}</span></td>
                  <td><span style={{ fontFamily: 'var(--mono)', fontWeight: 700 }}>{ev.rounds_count ?? 0}</span></td>
                  <td>
                    <span className={`badge ${ev.leaderboard_enabled ? 'badge-green' : 'badge-gray'}`}>
                      {ev.leaderboard_enabled ? 'Live' : 'Off'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setSelectedEvent(ev)}>
                        <Eye size={12} />View
                      </button>
                      {ev.status !== 'active' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }}
                          onClick={() => handleStatusChange(ev, 'active')}>
                          <Zap size={12} />Activate
                        </button>
                      )}
                      {ev.status === 'active' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--orange)' }}
                          onClick={() => handleStatusChange(ev, 'closed')}>
                          <Lock size={12} />Close
                        </button>
                      )}
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(ev)}>
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal
          onClose={() => setShowCreateModal(false)}
          onCreated={creds => { setNewCredentials(creds); setShowCreateModal(false); load(); }}
        />
      )}
      {newCredentials && <CredentialDisplay creds={newCredentials} onClose={() => setNewCredentials(null)} />}
      {selectedEvent && <EventDeepView event={selectedEvent} onClose={() => setSelectedEvent(null)} onRefresh={load} />}
      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}"? This will permanently remove all teams, evaluations, and data for this event.`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function CreateEventModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (creds: CreatedCredentials) => void;
}) {
  const { showToast } = useApp();
  const [eventName, setEventName] = useState('');
  const [organizerEmail, setOrganizerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventName || !organizerEmail) { setError('Both fields are required.'); return; }
    setLoading(true); setError('');
    try {
      const result = await eventService.createEvent(eventName, organizerEmail);
      showToast('Event created!', 'success');
      onCreated(result);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally { setLoading(false); }
  };

  return (
    <Modal title="Create New Event" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <div className="input-group">
            <label className="input-label">Event Name</label>
            <input className="input" placeholder="e.g. Hack4Future 2026"
              value={eventName} onChange={e => setEventName(e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Organizer Email</label>
            <input className="input" type="email" placeholder="organizer@example.com"
              value={organizerEmail} onChange={e => setOrganizerEmail(e.target.value)} />
          </div>
          {error && <div className="warn-banner"><AlertTriangle size={14} />{error}</div>}
          <div className="info-banner">
            <Activity size={14} />
            A secure account will be created for the organizer. Credentials are shown once after creation.
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <><Spinner size={14} />Creating...</> : <>Create Event →</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT DEEP VIEW (Admin)
// ─────────────────────────────────────────────────────────────────────────────
function EventDeepView({ event, onClose, onRefresh }: {
  event: Event; onClose: () => void; onRefresh: () => void;
}) {
  const { showToast, userId } = useApp();
  const [tab, setTab] = useState<'overview' | 'teams' | 'juries' | 'rounds' | 'marks' | 'leaderboard' | 'audit'>('overview');
  const [teams, setTeams] = useState<Team[]>([]);
  const [juries, setJuries] = useState<EventMember[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardRank[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLog[]>([]);
  const [stats, setStats] = useState({ teams: 0, participants: 0, juries: 0, rounds: 0, evaluations: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      teamsService.getTeams(event.id),
      juryService.getJuries(event.id),
      roundsService.getRounds(event.id),
      evaluationService.getEvaluations(event.id),
      leaderboardService.getLeaderboard(event.id),
      evaluationService.getAuditLog(event.id),
      eventService.getEventStats(event.id),
    ]).then(([t, j, r, e, lb, al, s]) => {
      setTeams(t); setJuries(j); setRounds(r);
      setEvaluations(e); setLeaderboard(lb); setAuditLog(al);
      setStats(s);
    }).catch(err => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [event.id, showToast]);

  const handleExportEvent = () => {
    exportEventCSV(event, teams, juries, rounds, evaluations, leaderboard);
    showToast('Export started', 'info');
  };

  return (
    <Modal title={`📊 ${event.name}`} onClose={onClose} size="modal-xl">
      <div className="modal-body" style={{ padding: 0 }}>
        {/* Tabs */}
        <div className="tabs" style={{ padding: '0 1.5rem', borderBottom: 'var(--border)' }}>
          {(['overview','teams','juries','rounds','marks','leaderboard','audit'] as const).map(t => (
            <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 'auto', marginTop: '0.5rem' }}
            onClick={handleExportEvent}>
            <Download size={12} />Export CSV
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>
          {loading ? <div className="loading-center"><Spinner /></div> : (
            <>
              {/* OVERVIEW */}
              {tab === 'overview' && (
                <div>
                  <div className="stats-grid" style={{ marginBottom: '1.5rem' }}>
                    <div className="stat-card cyan"><div className="stat-value">{stats.teams}</div><div className="stat-label">Teams</div></div>
                    <div className="stat-card yellow"><div className="stat-value">{stats.participants}</div><div className="stat-label">Participants</div></div>
                    <div className="stat-card orange"><div className="stat-value">{stats.juries}</div><div className="stat-label">Juries</div></div>
                    <div className="stat-card purple"><div className="stat-value">{stats.rounds}</div><div className="stat-label">Rounds</div></div>
                    <div className="stat-card green"><div className="stat-value">{stats.evaluations}</div><div className="stat-label">Evaluations</div></div>
                  </div>
                  <div className="card">
                    <div className="cred-row"><span className="cred-key">Organizer</span><span className="cred-val">{event.organizer_email}</span></div>
                    <div className="cred-row"><span className="cred-key">Status</span><StatusBadge status={event.status} /></div>
                    <div className="cred-row"><span className="cred-key">Leaderboard</span><StatusBadge status={event.leaderboard_enabled ? 'active' : 'draft'} /></div>
                    <div className="cred-row"><span className="cred-key">Slug</span><span className="cred-val" style={{ fontFamily: 'var(--mono)' }}>{event.slug}</span></div>
                    <div className="cred-row"><span className="cred-key">Public Token</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span className="cred-val" style={{ fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{event.public_token}</span>
                        <CopyButton text={`${window.location.origin}/l/${event.public_token}`} label="Copy Link" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TEAMS */}
              {tab === 'teams' && (
                <div>
                  <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>{teams.length} teams registered</p>
                  <div className="table-wrap">
                    <table>
                      <thead><tr><th>Team Name</th><th>Track</th><th>Members</th></tr></thead>
                      <tbody>
                        {teams.map(t => (
                          <tr key={t.id}>
                            <td style={{ fontWeight: 700 }}>{t.name}</td>
                            <td><span className="badge badge-cyan">{t.tag || '—'}</span></td>
                            <td style={{ color: 'var(--gray-700)' }}>{t.members || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* JURIES */}
              {tab === 'juries' && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Name</th><th>Email</th><th>Progress</th></tr></thead>
                    <tbody>
                      {juries.map(j => (
                        <tr key={j.user_id}>
                          <td style={{ fontWeight: 700 }}>{j.display_name}</td>
                          <td style={{ color: 'var(--gray-700)' }}>{j.email}</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="progress-bar" style={{ width: '100px' }}>
                                <div className="progress-fill" style={{ width: `${j.total_teams ? Math.min(100, ((j.submission_count || 0) / j.total_teams) * 100) : 0}%` }} />
                              </div>
                              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{j.submission_count}/{j.total_teams}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* ROUNDS */}
              {tab === 'rounds' && (
                <div>
                  {rounds.map(r => (
                    <div key={r.id} className="round-card" style={{ marginBottom: '1rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                        <h4>Round {r.seq}: {r.name}</h4>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                          <StatusBadge status={r.status} />
                          <span className="badge badge-gray">Weight: {r.weight}</span>
                          <span className="badge badge-yellow">Max: {r.max_marks_total}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {(r.criteria || []).map(c => (
                          <span key={c.id} className="badge badge-purple">{c.label} ({c.max_marks})</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* MARKS */}
              {tab === 'marks' && (
                <AdminMarksView event={event} evaluations={evaluations} rounds={rounds} userId={userId!} onRefresh={() => {
                  evaluationService.getEvaluations(event.id).then(setEvaluations);
                }} />
              )}

              {/* LEADERBOARD */}
              {tab === 'leaderboard' && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Rank</th><th>Team</th></tr></thead>
                    <tbody>
                      {leaderboard.map(r => (
                        <tr key={r.team_id}>
                          <td>
                            <div className={`rank-pill ${r.rank === 1 ? 'rank-1' : r.rank === 2 ? 'rank-2' : r.rank === 3 ? 'rank-3' : ''}`}>
                              {r.rank ?? '—'}
                            </div>
                          </td>
                          <td style={{ fontWeight: 700 }}>{r.team_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* AUDIT */}
              {tab === 'audit' && (
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Time</th><th>Action</th><th>Entity</th></tr></thead>
                    <tbody>
                      {auditLog.map(al => (
                        <tr key={al.id}>
                          <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--gray-600)' }}>
                            {new Date(al.at).toLocaleString()}
                          </td>
                          <td><span className="badge badge-orange">{al.action}</span></td>
                          <td style={{ color: 'var(--gray-700)' }}>{al.entity}</td>
                        </tr>
                      ))}
                      {auditLog.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--gray-600)', padding: '2rem' }}>No audit entries yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function AdminMarksView({ event, evaluations, rounds, userId, onRefresh }: {
  event: Event; evaluations: Evaluation[]; rounds: Round[];
  userId: string; onRefresh: () => void;
}) {
  const { showToast } = useApp();
  const [roundFilter, setRoundFilter] = useState('');
  const [confirm, setConfirm] = useState<Evaluation | null>(null);

  const filtered = evaluations.filter(e => !roundFilter || e.round_id === roundFilter);

  const handleDelete = async (ev: Evaluation) => {
    try {
      await evaluationService.deleteEvaluation(ev.id, userId, event.id);
      showToast('Evaluation deleted', 'success');
      onRefresh();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    setConfirm(null);
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
        <select className="input" style={{ width: 'auto' }} value={roundFilter} onChange={e => setRoundFilter(e.target.value)}>
          <option value="">All Rounds</option>
          {rounds.map(r => <option key={r.id} value={r.id}>Round {r.seq}: {r.name}</option>)}
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Team</th><th>Jury</th><th>Round</th><th>Total</th><th>Remarks</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(ev => (
              <tr key={ev.id}>
                <td style={{ fontWeight: 700 }}>{ev.team_name}</td>
                <td style={{ color: 'var(--gray-700)' }}>{ev.jury_name}</td>
                <td><span className="badge badge-purple">R{ev.round_seq}</span></td>
                <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--yellow)' }}>{ev.total}</td>
                <td style={{ color: 'var(--gray-600)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.remarks || '—'}</td>
                <td>
                  <button className="btn btn-danger btn-sm" onClick={() => setConfirm(ev)}>
                    <Trash2 size={12} />Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirm && <ConfirmModal
        message={`Delete this evaluation by ${confirm.jury_name} for ${confirm.team_name}?`}
        onConfirm={() => handleDelete(confirm)}
        onCancel={() => setConfirm(null)}
      />}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ORGANIZER WORKSPACE
// ─────────────────────────────────────────────────────────────────────────────
function OrganizerWorkspace({ eventId, slug }: { eventId: string; slug: string }) {
  const [tab, setTab] = useState<'teams' | 'rounds' | 'juries' | 'marks' | 'share' | 'export'>('teams');
  const [event, setEvent] = useState<Event | null>(null);

  useEffect(() => {
    eventService.getEvent(eventId).then(setEvent);
  }, [eventId]);

  if (!event) return <div className="loading-center"><Spinner /></div>;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0 2rem', borderBottom: 'var(--border)', background: 'var(--gray-100)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 0' }}>
          <div>
            <h2 style={{ marginBottom: '0.2rem' }}>{event.name}</h2>
            <StatusBadge status={event.status} />
          </div>
        </div>
        <div className="tabs">
          {([
            ['teams',  'Teams & Participants'],
            ['rounds', 'Rounds & Criteria'],
            ['juries', 'Juries'],
            ['marks',  'Marks'],
            ['share',  'Share'],
            ['export', 'Export'],
          ] as const).map(([key, label]) => (
            <button key={key} className={`tab-btn ${tab === key ? 'active' : ''}`} onClick={() => setTab(key)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="page">
        {tab === 'teams'  && <TeamsTab eventId={eventId} />}
        {tab === 'rounds' && <RoundsTab eventId={eventId} />}
        {tab === 'juries' && <JuriesTab eventId={eventId} />}
        {tab === 'marks'  && <MarksTab eventId={eventId} />}
        {tab === 'share'  && <ShareTab event={event} onEventChange={setEvent} />}
        {tab === 'export' && <ExportTab event={event} eventId={eventId} />}
      </div>
    </div>
  );
}

// ── TEAMS TAB ──
function TeamsTab({ eventId }: { eventId: string }) {
  const { showToast } = useApp();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showCSV, setShowCSV] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Team | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setTeams(await teamsService.getTeams(eventId)); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [eventId, showToast]);

  useEffect(() => { load(); }, [load]);

  const searchTimer = useRef<ReturnType<typeof setTimeout>>();
  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { load(); return; }
    searchTimer.current = setTimeout(async () => {
      const results = await teamsService.searchTeams(eventId, q);
      setTeams(results);
    }, 200);
  };

  const handleDelete = async (team: Team) => {
    try { await teamsService.deleteTeam(team.id); showToast('Team deleted', 'success'); load(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Teams & Participants</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowCSV(true)}><Upload size={14} />CSV Import</button>
          <button className="btn btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add Team</button>
        </div>
      </div>

      <div className="search-box" style={{ marginBottom: '1rem' }}>
        <Search size={14} className="search-icon" />
        <input className="input" placeholder="Search teams or members (typo-tolerant)..."
          value={search} onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
      </div>

      {loading ? <div className="loading-center"><Spinner /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Team Name</th><th>Track</th><th>Members</th><th>Actions</th></tr></thead>
            <tbody>
              {teams.map(t => (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700 }}>{t.name}</td>
                  <td>{t.tag ? <span className="badge badge-cyan">{t.tag}</span> : '—'}</td>
                  <td style={{ color: 'var(--gray-700)', maxWidth: '300px' }}>{t.members || '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(t)}><Trash2 size={12} /></button>
                  </td>
                </tr>
              ))}
              {teams.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-600)', padding: '2rem' }}>No teams yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && <AddTeamModal eventId={eventId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load(); }} />}
      {showCSV && <CSVImportModal eventId={eventId} onClose={() => setShowCSV(false)} onImported={() => { setShowCSV(false); load(); }} />}
      {confirmDelete && (
        <ConfirmModal
          message={`Delete "${confirmDelete.name}" and all their evaluations?`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function AddTeamModal({ eventId, onClose, onSaved }: { eventId: string; onClose: () => void; onSaved: () => void }) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [members, setMembers] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const memberList = members.split(/[,;\n]/).map(m => m.trim()).filter(Boolean);
      await teamsService.createTeam(eventId, name.trim(), tag.trim(), memberList);
      showToast('Team added', 'success');
      onSaved();
    } catch (err: unknown) { showToast((err as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Add Team" onClose={onClose}>
      <form onSubmit={handleSave}>
        <div className="modal-body form-grid">
          <div className="input-group">
            <label className="input-label">Team Name *</label>
            <input className="input" value={name} onChange={e => setName(e.target.value)} autoFocus required />
          </div>
          <div className="input-group">
            <label className="input-label">Track / Tag</label>
            <input className="input" placeholder="e.g. FinTech, AI/ML" value={tag} onChange={e => setTag(e.target.value)} />
          </div>
          <div className="input-group">
            <label className="input-label">Members (comma / newline separated)</label>
            <textarea className="input" rows={4} placeholder="Alice, Bob&#10;Charlie" value={members} onChange={e => setMembers(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Spinner size={14} /> : 'Add Team'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CSVImportModal({ eventId, onClose, onImported }: { eventId: string; onClose: () => void; onImported: () => void }) {
  const { showToast } = useApp();
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [raw, setRaw] = useState('');
  const [preview, setPreview] = useState<{ name: string; tag: string; members: string[] }[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  const parseCSV = (text: string) => {
    const parsed = Papa.parse<Record<string, string>>(text.trim(), {
      header: true, skipEmptyLines: true, transformHeader: h => h.trim().toLowerCase()
    });
    const rows = parsed.data;
    const errs: string[] = [];
    const out: { name: string; tag: string; members: string[] }[] = [];

    rows.forEach((row, idx) => {
      const name = row['team name'] || row['team_name'] || row['name'] || '';
      if (!name.trim()) { errs.push(`Row ${idx + 2}: Missing team name`); return; }
      const membersRaw = row['members'] || row['member'] || row['participants'] || '';
      const members = membersRaw.split(/[,;\n]/).map((m: string) => m.trim()).filter(Boolean);
      const tag = row['track'] || row['tag'] || row['track/tag'] || '';
      out.push({ name: name.trim(), tag: tag.trim(), members });
    });

    setErrors(errs);
    setPreview(out);
    if (out.length > 0) setStep('preview');
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { const text = ev.target?.result as string; setRaw(text); parseCSV(text); };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    setStep('importing');
    try {
      const r = await teamsService.bulkCreateTeams(eventId, preview);
      setResult(r);
      showToast(`Imported ${r.created} teams, skipped ${r.skipped}`, 'success');
      setTimeout(onImported, 1500);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); setStep('preview'); }
  };

  return (
    <Modal title="CSV Team Import" onClose={onClose} size="modal-lg">
      <div className="modal-body">
        {step === 'upload' && (
          <div className="form-grid">
            <div className="info-banner">
              <Activity size={14} />
              Supported columns: <code>Team Name, Members, Track/Tag, Email, Phone</code>. Members can be comma/semicolon/newline separated.
            </div>
            <div className="input-group">
              <label className="input-label">Upload CSV File</label>
              <input type="file" accept=".csv,.txt" className="input" onChange={handleFile} />
            </div>
            <div className="input-group">
              <label className="input-label">Or Paste CSV Text</label>
              <textarea className="input" rows={8} placeholder="Team Name,Members,Track&#10;Alpha Team,Alice;Bob,AI/ML"
                value={raw} onChange={e => { setRaw(e.target.value); }}
              />
            </div>
            <button className="btn btn-primary" onClick={() => parseCSV(raw)} disabled={!raw.trim()}>
              Preview Import
            </button>
          </div>
        )}

        {step === 'preview' && (
          <div>
            {errors.length > 0 && (
              <div className="warn-banner" style={{ marginBottom: '1rem', flexDirection: 'column', gap: '0.25rem' }}>
                {errors.map((e, i) => <div key={i}><AlertTriangle size={12} /> {e}</div>)}
              </div>
            )}
            <p style={{ marginBottom: '1rem' }}><strong>{preview.length}</strong> teams ready to import:</p>
            <div className="csv-preview table-wrap">
              <table>
                <thead><tr><th>Team Name</th><th>Tag</th><th>Members</th></tr></thead>
                <tbody>
                  {preview.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 700 }}>{r.name}</td>
                      <td>{r.tag || '—'}</td>
                      <td style={{ color: 'var(--gray-700)' }}>{r.members.join(', ') || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 'importing' && (
          <div className="loading-center">
            <Spinner size={40} />
            <p>Importing teams...</p>
          </div>
        )}

        {result && (
          <div className="info-banner" style={{ marginTop: '1rem' }}>
            <Check size={14} /> Imported {result.created}, skipped {result.skipped} (duplicates)
          </div>
        )}
      </div>
      {step === 'preview' && (
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={() => setStep('upload')}>Back</button>
          <button className="btn btn-primary" onClick={handleImport} disabled={preview.length === 0}>
            Import {preview.length} Teams
          </button>
        </div>
      )}
      {step === 'upload' && (
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        </div>
      )}
    </Modal>
  );
}

// ── ROUNDS TAB ──
function RoundsTab({ eventId }: { eventId: string }) {
  const { showToast } = useApp();
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingRound, setAddingRound] = useState(false);
  const [newRoundName, setNewRoundName] = useState('');
  const [newWeight, setNewWeight] = useState(1);
  const [editingCriteria, setEditingCriteria] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRounds(await roundsService.getRounds(eventId)); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [eventId, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleAddRound = async () => {
    if (!newRoundName.trim()) return;
    const seq = Math.max(0, ...rounds.map(r => r.seq)) + 1;
    try {
      await roundsService.createRound(eventId, newRoundName.trim(), seq, newWeight);
      showToast('Round added', 'success');
      setNewRoundName(''); setAddingRound(false); load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleStatusChange = async (round: Round, status: 'draft' | 'active' | 'locked') => {
    try { await roundsService.updateRound(round.id, { status }); showToast('Status updated', 'success'); load(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  const handleDelete = async (round: Round) => {
    try { await roundsService.deleteRound(round.id); showToast('Round deleted', 'success'); load(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Rounds & Criteria</h2>
        <button className="btn btn-primary" onClick={() => setAddingRound(true)}><Plus size={14} />Add Round</button>
      </div>

      {loading ? <div className="loading-center"><Spinner /></div> : (
        <div>
          {rounds.map(r => (
            <div key={r.id} className="round-card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <h3>Round {r.seq}: {r.name}</h3>
                  <StatusBadge status={r.status} />
                  <span className="badge badge-gray">Weight: {r.weight}</span>
                  {r.max_marks_total !== undefined && <span className="badge badge-yellow">Max: {r.max_marks_total}</span>}
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  {r.status === 'draft' && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--green)' }} onClick={() => handleStatusChange(r, 'active')}><Zap size={12} />Activate</button>}
                  {r.status === 'active' && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--red)' }} onClick={() => handleStatusChange(r, 'locked')}><Lock size={12} />Lock</button>}
                  {r.status === 'locked' && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--orange)' }} onClick={() => handleStatusChange(r, 'active')}><Unlock size={12} />Unlock</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => setEditingCriteria(editingCriteria === r.id ? null : r.id)}>
                    <Settings size={12} />Criteria
                  </button>
                  {r.status === 'draft' && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(r)}><Trash2 size={12} /></button>}
                </div>
              </div>

              {/* Criteria builder */}
              {editingCriteria === r.id && (
                <CriteriaBuilder round={r} onSaved={() => { setEditingCriteria(null); load(); }} />
              )}

              {/* Criteria display when not editing */}
              {editingCriteria !== r.id && (r.criteria || []).length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(r.criteria || []).map(c => (
                    <span key={c.id} className="badge badge-purple">{c.label} <strong>/{c.max_marks}</strong></span>
                  ))}
                </div>
              )}
              {editingCriteria !== r.id && (r.criteria || []).length === 0 && (
                <p style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>No criteria defined yet. Click "Criteria" to add scoring sections.</p>
              )}
            </div>
          ))}

          {rounds.length === 0 && (
            <div className="empty-state"><Layers size={40} /><h3>No Rounds</h3><p>Add rounds and define scoring criteria for each.</p></div>
          )}

          {addingRound && (
            <div className="round-card" style={{ marginTop: '1rem', borderColor: 'var(--yellow)', borderStyle: 'dashed' }}>
              <h4 style={{ marginBottom: '0.75rem' }}>New Round</h4>
              <div className="form-row">
                <div className="input-group">
                  <label className="input-label">Round Name</label>
                  <input className="input" placeholder="e.g. Preliminary Round" value={newRoundName}
                    onChange={e => setNewRoundName(e.target.value)} autoFocus />
                </div>
                <div className="input-group">
                  <label className="input-label">Weight (for ranking)</label>
                  <input className="input" type="number" min="0.1" step="0.1" value={newWeight}
                    onChange={e => setNewWeight(Number(e.target.value))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <button className="btn btn-primary" onClick={handleAddRound}>Add Round</button>
                <button className="btn btn-ghost" onClick={() => setAddingRound(false)}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CriteriaBuilder({ round, onSaved }: { round: Round; onSaved: () => void }) {
  const { showToast } = useApp();
  const [criteria, setCriteria] = useState<{ label: string; max_marks: number; seq: number }[]>(
    (round.criteria || []).map(c => ({ label: c.label, max_marks: c.max_marks, seq: c.seq }))
  );
  const [saving, setSaving] = useState(false);

  const addCriterion = () => {
    setCriteria(prev => [...prev, { label: '', max_marks: 25, seq: prev.length + 1 }]);
  };

  const remove = (i: number) => setCriteria(prev => prev.filter((_, j) => j !== i));

  const update = (i: number, field: 'label' | 'max_marks', val: string | number) => {
    setCriteria(prev => prev.map((c, j) => j === i ? { ...c, [field]: val } : c));
  };

  const handleSave = async () => {
    const valid = criteria.filter(c => c.label.trim() && c.max_marks > 0);
    if (valid.length === 0) { showToast('Add at least one criterion', 'warning'); return; }
    setSaving(true);
    try {
      await roundsService.setCriteria(round.id, valid.map((c, i) => ({ ...c, seq: i + 1 })));
      showToast('Criteria saved', 'success');
      onSaved();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setSaving(false); }
  };

  const total = criteria.reduce((s, c) => s + Number(c.max_marks || 0), 0);

  return (
    <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--gray-400)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h4>Criteria Builder</h4>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span className="badge badge-yellow">Total: {total}</span>
          <button className="btn btn-ghost btn-sm" onClick={addCriterion}><Plus size={12} />Add</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size={12} /> : <Check size={12} />}Save
          </button>
        </div>
      </div>
      {criteria.map((c, i) => (
        <div key={i} className="criterion-row">
          <input className="input" placeholder={`Criterion ${i + 1} label`}
            value={c.label} onChange={e => update(i, 'label', e.target.value)} />
          <input className="input" type="number" min="0.5" step="0.5" style={{ width: '80px' }}
            value={c.max_marks} onChange={e => update(i, 'max_marks', Number(e.target.value))} />
          <button className="btn btn-danger btn-icon btn-sm" onClick={() => remove(i)}><X size={12} /></button>
        </div>
      ))}
      {criteria.length === 0 && (
        <button className="btn btn-ghost btn-sm" onClick={addCriterion}><Plus size={12} />Add first criterion</button>
      )}
    </div>
  );
}

// ── JURIES TAB ──
function JuriesTab({ eventId }: { eventId: string }) {
  const { showToast } = useApp();
  const [juries, setJuries] = useState<EventMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newCreds, setNewCreds] = useState<CreatedCredentials | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<EventMember | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [resetCreds, setResetCreds] = useState<CreatedCredentials | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { setJuries(await juryService.getJuries(eventId)); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [eventId, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleResetPassword = async (jury: EventMember) => {
    setResettingId(jury.user_id);
    try {
      const pw = await juryService.resetJuryPassword(jury.user_id, eventId);
      setResetCreds({ email: jury.email, password: pw });
      showToast('Password reset', 'success');
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setResettingId(null); }
  };

  const handleRemove = async (jury: EventMember) => {
    try { await juryService.removeJury(eventId, jury.user_id); showToast('Jury removed', 'success'); load(); }
    catch (e: unknown) { showToast((e as Error).message, 'error'); }
    setConfirmRemove(null);
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Jury Panels</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}><UserPlus size={14} />Add Jury</button>
      </div>

      {loading ? <div className="loading-center"><Spinner /></div> : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Email</th><th>Progress</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {juries.map(j => (
                <tr key={j.user_id}>
                  <td style={{ fontWeight: 700 }}>{j.display_name}</td>
                  <td style={{ color: 'var(--gray-700)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{j.email}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="progress-bar" style={{ width: '80px' }}>
                        <div className="progress-fill" style={{ width: `${j.total_teams ? Math.min(100, ((j.submission_count || 0) / j.total_teams) * 100) : 0}%` }} />
                      </div>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{j.submission_count}/{j.total_teams}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button className="btn btn-ghost btn-sm" disabled={resettingId === j.user_id}
                        onClick={() => handleResetPassword(j)}>
                        {resettingId === j.user_id ? <Spinner size={12} /> : <KeyRound size={12} />}Reset PW
                      </button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmRemove(j)}><Trash2 size={12} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {juries.length === 0 && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--gray-600)', padding: '2rem' }}>No jury panels yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddJuryModal eventId={eventId} onClose={() => setShowAdd(false)}
          onCreated={(creds) => { setNewCreds(creds); setShowAdd(false); load(); }} />
      )}
      {newCreds && <CredentialDisplay creds={newCreds} onClose={() => setNewCreds(null)} />}
      {resetCreds && <CredentialDisplay creds={resetCreds} onClose={() => setResetCreds(null)} />}
      {confirmRemove && (
        <ConfirmModal
          message={`Remove "${confirmRemove.display_name}" from this event's jury?`}
          onConfirm={() => handleRemove(confirmRemove)}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}

function AddJuryModal({ eventId, onClose, onCreated }: {
  eventId: string; onClose: () => void; onCreated: (creds: CreatedCredentials) => void;
}) {
  const { showToast } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) { setError('Name and email are required'); return; }
    setLoading(true);
    try {
      const creds = await juryService.createJury(eventId, name, email);
      showToast('Jury panel created!', 'success');
      onCreated({ email: (creds as unknown as Record<string,string>).juryEmail ?? email, password: creds.password ?? '' });
    } catch (err: unknown) { setError((err as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Add Jury Panel" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body form-grid">
          <div className="input-group">
            <label className="input-label">Jury Name</label>
            <input className="input" placeholder="e.g. Jury Panel A" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>
          <div className="input-group">
            <label className="input-label">Jury Email</label>
            <input className="input" type="email" placeholder="jury@example.com" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          {error && <div className="warn-banner"><AlertTriangle size={14} />{error}</div>}
          <div className="info-banner"><Activity size={14} />A secure password will be auto-generated.</div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? <Spinner size={14} /> : 'Create Jury →'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── MARKS TAB ──
function MarksTab({ eventId }: { eventId: string }) {
  const { showToast, userId } = useApp();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<Evaluation | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ev, r] = await Promise.all([
        evaluationService.getEvaluations(eventId),
        roundsService.getRounds(eventId),
      ]);
      setEvaluations(ev); setRounds(r);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [eventId, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = evaluations.filter(e => !roundFilter || e.round_id === roundFilter);

  const handleDelete = async (ev: Evaluation) => {
    try {
      await evaluationService.deleteEvaluation(ev.id, userId!, eventId);
      showToast('Evaluation deleted', 'success'); load();
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    setConfirmDelete(null);
  };

  return (
    <div>
      <div className="section-header">
        <h2 className="section-title">Evaluations</h2>
        <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={14} />Refresh</button>
      </div>
      <select className="input" style={{ width: 'auto', marginBottom: '1rem' }} value={roundFilter} onChange={e => setRoundFilter(e.target.value)}>
        <option value="">All Rounds</option>
        {rounds.map(r => <option key={r.id} value={r.id}>Round {r.seq}: {r.name}</option>)}
      </select>

      {loading ? <div className="loading-center"><Spinner /></div> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Team</th><th>Jury</th><th>Round</th><th>Total</th><th>Remarks</th><th>Actions</th></tr></thead>
            <tbody>
              {filtered.map(ev => (
                <tr key={ev.id}>
                  <td style={{ fontWeight: 700 }}>{ev.team_name}</td>
                  <td style={{ color: 'var(--gray-700)' }}>{ev.jury_name}</td>
                  <td><span className="badge badge-purple">R{ev.round_seq}: {ev.round_name}</span></td>
                  <td style={{ fontFamily: 'var(--mono)', fontWeight: 700, color: 'var(--yellow)' }}>{ev.total}</td>
                  <td style={{ color: 'var(--gray-600)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.remarks || '—'}</td>
                  <td>
                    <button className="btn btn-danger btn-sm" onClick={() => setConfirmDelete(ev)}><Trash2 size={12} />Delete</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--gray-600)', padding: '2rem' }}>No evaluations yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          message={`Delete this evaluation for ${confirmDelete.team_name}?`}
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

// ── SHARE TAB ──
function ShareTab({ event, onEventChange }: { event: Event; onEventChange: (e: Event) => void }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);
  const shareUrl = `${window.location.origin}/l/${event.public_token}`;

  const handleToggle = async () => {
    setLoading(true);
    try {
      await eventService.toggleLeaderboard(event.id, !event.leaderboard_enabled);
      onEventChange({ ...event, leaderboard_enabled: !event.leaderboard_enabled });
      showToast(`Leaderboard ${!event.leaderboard_enabled ? 'enabled' : 'disabled'}`, 'success');
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  const handleRegenToken = async () => {
    setLoading(true);
    try {
      const token = await eventService.regenerateToken(event.id);
      onEventChange({ ...event, public_token: token });
      showToast('Share link regenerated', 'success');
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Share & Public Leaderboard</h2>
      <div className="card" style={{ boxShadow: event.leaderboard_enabled ? 'var(--shadow-green)' : undefined }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>Public Leaderboard</h3>
            <p>When enabled, anyone with the link can view rank and team name only.</p>
          </div>
          <button className={`btn ${event.leaderboard_enabled ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleToggle} disabled={loading}>
            {event.leaderboard_enabled ? <><EyeOff size={14} />Disable</> : <><Globe size={14} />Enable</>}
          </button>
        </div>

        {event.leaderboard_enabled && (
          <>
            <div className="cred-box" style={{ marginBottom: '1rem' }}>
              <div className="cred-row">
                <span className="cred-key">Share URL</span>
                <span className="cred-val" style={{ fontSize: '0.8rem' }}>{shareUrl}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <CopyButton text={shareUrl} label="Copy Link" />
              <button className="btn btn-ghost btn-sm" onClick={() => window.open(shareUrl, '_blank')}>
                <ExternalLink size={12} />Open
              </button>
              <button className="btn btn-ghost btn-sm" onClick={handleRegenToken} disabled={loading}>
                <RefreshCw size={12} />Regenerate
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── EXPORT TAB ──
function ExportTab({ event, eventId }: { event: Event; eventId: string }) {
  const { showToast } = useApp();
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const [teams, juries, rounds, evals, lb] = await Promise.all([
        teamsService.getTeams(eventId),
        juryService.getJuries(eventId),
        roundsService.getRounds(eventId),
        evaluationService.getEvaluations(eventId),
        leaderboardService.getLeaderboard(eventId),
      ]);
      exportEventCSV(event, teams, juries, rounds, evals, lb);
      showToast('Export downloaded', 'success');
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h2 className="section-title" style={{ marginBottom: '1.5rem' }}>Export Event Data</h2>
      <div className="card" style={{ maxWidth: '500px' }}>
        <h3 style={{ marginBottom: '0.5rem' }}>CSV Export Bundle</h3>
        <p style={{ marginBottom: '1.5rem' }}>Downloads a ZIP containing: teams, participants, juries, rounds, criteria, all evaluations, and leaderboard. No passwords or hashes included.</p>
        <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
          {loading ? <><Spinner size={14} />Preparing...</> : <><Download size={14} />Download CSV Bundle</>}
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// JURY CONSOLE
// ─────────────────────────────────────────────────────────────────────────────
function JuryConsole({ eventId }: { eventId: string }) {
  const { showToast, userId } = useApp();
  const [teams, setTeams] = useState<Team[]>([]);
  const [myEvals, setMyEvals] = useState<Evaluation[]>([]);
  const [activeRound, setActiveRound] = useState<Round | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [scoringTeam, setScoringTeam] = useState<Team | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, ev, me, rounds] = await Promise.all([
        teamsService.getTeams(eventId),
        eventService.getEvent(eventId),
        evaluationService.getMyEvaluations(eventId),
        roundsService.getRounds(eventId),
      ]);
      setTeams(t); setEvent(ev); setMyEvals(me);
      setActiveRound(rounds.find(r => r.status === 'active') || null);
    } catch (e: unknown) { showToast((e as Error).message, 'error'); }
    finally { setLoading(false); }
  }, [eventId, showToast]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (q: string) => {
    setSearch(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { load(); return; }
    searchTimer.current = setTimeout(async () => {
      const results = await teamsService.searchTeams(eventId, q);
      setTeams(results);
    }, 200);
  };

  const evaluatedTeamIds = new Set(myEvals.filter(e => activeRound && e.round_id === activeRound.id).map(e => e.team_id));

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.25rem' }}>Jury <span style={{ color: 'var(--cyan)' }}>Console</span></h1>
        {event && <p>{event.name}</p>}
      </div>

      {/* Active Round Banner */}
      {activeRound ? (
        <div className="info-banner" style={{ marginBottom: '1.5rem' }}>
          <Zap size={14} />
          <strong>Active:</strong> Round {activeRound.seq} — {activeRound.name}
          &nbsp;| Max Marks: <strong>{activeRound.max_marks_total}</strong>
        </div>
      ) : (
        <div className="warn-banner" style={{ marginBottom: '1.5rem' }}>
          <AlertTriangle size={14} />No active round. Scoring is currently disabled.
        </div>
      )}

      {/* Search */}
      <div className="search-box" style={{ marginBottom: '1.5rem' }}>
        <Search size={14} className="search-icon" />
        <input className="input" placeholder="Search teams or members (typo-tolerant)..."
          value={search} onChange={e => handleSearch(e.target.value)} style={{ paddingLeft: '2.25rem' }} />
      </div>

      {loading ? <div className="loading-center"><Spinner /></div> : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {teams.map(t => {
            const evaluated = evaluatedTeamIds.has(t.id);
            return (
              <div key={t.id} className={`team-eval-card ${evaluated ? 'evaluated' : ''}`}
                onClick={() => activeRound && setScoringTeam(t)}
                style={{ cursor: activeRound ? 'pointer' : 'default', opacity: activeRound ? 1 : 0.6 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{t.name}</div>
                    {t.members && <div style={{ color: 'var(--gray-600)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{t.members}</div>}
                    {t.tag && <span className="badge badge-cyan" style={{ marginTop: '0.4rem' }}>{t.tag}</span>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                    <span className={`badge ${evaluated ? 'badge-green' : 'badge-gray'}`}>
                      {evaluated ? <><Check size={10} />Evaluated</> : 'Pending'}
                    </span>
                    {activeRound && <span style={{ color: 'var(--gray-600)', fontSize: '0.75rem' }}>Click to score →</span>}
                  </div>
                </div>
              </div>
            );
          })}
          {teams.length === 0 && <div className="empty-state"><Users size={40} /><h3>No teams found</h3></div>}
        </div>
      )}

      {scoringTeam && activeRound && (
        <ScoringModal
          team={scoringTeam}
          round={activeRound}
          eventId={eventId}
          existingEval={myEvals.find(e => e.team_id === scoringTeam.id && e.round_id === activeRound.id) || null}
          onClose={() => setScoringTeam(null)}
          onSubmitted={() => { setScoringTeam(null); load(); }}
        />
      )}
    </div>
  );
}

function ScoringModal({ team, round, eventId, existingEval, onClose, onSubmitted }: {
  team: Team; round: Round; eventId: string;
  existingEval: Evaluation | null;
  onClose: () => void; onSubmitted: () => void;
}) {
  const { showToast } = useApp();
  const criteria = round.criteria || [];
  const [scores, setScores] = useState<Record<string, number>>(() => {
    if (existingEval) return { ...existingEval.scores };
    return Object.fromEntries(criteria.map(c => [c.id, 0]));
  });
  const [remarks, setRemarks] = useState(existingEval?.remarks || '');
  const [submitting, setSubmitting] = useState(false);

  const total = Object.values(scores).reduce((s, v) => s + Number(v), 0);
  const maxTotal = round.max_marks_total ?? criteria.reduce((s, c) => s + c.max_marks, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await evaluationService.submitEvaluation({ eventId, roundId: round.id, teamId: team.id, scores, remarks });
      showToast('Scores submitted!', 'success');
      onSubmitted();
    } catch (err: unknown) { showToast((err as Error).message, 'error'); }
    finally { setSubmitting(false); }
  };

  return (
    <Modal title={`Score: ${team.name}`} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className="modal-body">
          <p style={{ marginBottom: '1rem', color: 'var(--gray-600)' }}>Round {round.seq}: {round.name}</p>

          {criteria.map(c => (
            <div key={c.id} className="score-row">
              <span className="score-label">{c.label}</span>
              <span className="score-max">/{c.max_marks}</span>
              <div className="slider-wrap" style={{ flex: 1 }}>
                <input type="range" min={0} max={c.max_marks} step={0.5}
                  value={scores[c.id] ?? 0}
                  onChange={e => setScores(prev => ({ ...prev, [c.id]: Number(e.target.value) }))} />
              </div>
              <input className="input" type="number" min={0} max={c.max_marks} step={0.5}
                style={{ width: '70px', textAlign: 'center' }}
                value={scores[c.id] ?? 0}
                onChange={e => {
                  const v = Math.min(c.max_marks, Math.max(0, Number(e.target.value)));
                  setScores(prev => ({ ...prev, [c.id]: v }));
                }} />
            </div>
          ))}

          <div style={{ margin: '1rem 0', padding: '0.75rem', background: 'var(--gray-300)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 700 }}>Total Score</span>
            <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '1.5rem', color: 'var(--yellow)' }}>
              {total} <span style={{ color: 'var(--gray-600)', fontSize: '1rem' }}>/ {maxTotal}</span>
            </span>
          </div>

          <div className="input-group">
            <label className="input-label">Remarks (Optional)</label>
            <textarea className="input" rows={3} placeholder="Brief feedback..."
              value={remarks} onChange={e => setRemarks(e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={submitting}>
            {submitting ? <Spinner size={14} /> : <><CheckCircle2 size={14} />{existingEval ? 'Update' : 'Submit'} Scores</>}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC LEADERBOARD (route: /l/:token)
// ─────────────────────────────────────────────────────────────────────────────
function PublicLeaderboard({ token }: { token: string }) {
  const [entries, setEntries] = useState<PublicLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventName, setEventName] = useState('');
  const [available, setAvailable] = useState(true);
  const [search, setSearch] = useState('');
  const [projector, setProjector] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await leaderboardService.getPublicLeaderboard(token);
      if (data.length === 0) { setAvailable(false); setLoading(false); return; }
      setEntries(data);
      setEventName(data[0]?.event_name || '');
      setAvailable(true);
      setLastUpdated(new Date());
    } catch { setAvailable(false); }
    finally { setLoading(false); }
  }, [token]);

  useEffect(() => {
    load();
    // Poll every 5s
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const filtered = entries.filter(e => !search || e.team_name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="public-lb">
      <div className="loading-center" style={{ flex: 1 }}><Spinner size={48} /><p>Loading leaderboard...</p></div>
    </div>
  );

  if (!available) return (
    <div className="public-lb" style={{ alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <EyeOff size={64} style={{ color: 'var(--gray-600)', marginBottom: '1rem' }} />
        <h2>Leaderboard Unavailable</h2>
        <p>This leaderboard is currently offline or the link is invalid.</p>
      </div>
    </div>
  );

  return (
    <div className={`public-lb ${projector ? 'projector' : ''}`}>
      <div className="public-lb-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: 'var(--yellow)', border: '2px solid var(--black)', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
              <Trophy size={28} color="var(--black)" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
                <h1 style={{ fontSize: '1.75rem', margin: 0, padding: 0, lineHeight: 1, color: 'var(--black)' }}>EVALPRO</h1>
                <span className="badge badge-cyan" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', border: '2px solid var(--black)', boxShadow: 'none' }}>ROUND 1 ACTIVE</span>
                <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#fdfbf7', border: '2px solid var(--black)', boxShadow: 'none' }}>LOCAL MODE</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                OFFICIAL COMPETITION • LIVE SCORING PORTAL
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button className="btn btn-primary" style={{ border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)' }}>PUBLIC LEADERBOARD</button>
            <button className="btn btn-ghost btn-icon" onClick={() => setProjector(!projector)} style={{ background: 'var(--white)', border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)', color: 'var(--black)' }}>
              <RefreshCw size={18} strokeWidth={2.5} />
            </button>
            <button className="btn btn-cyan" onClick={() => window.location.href = '/'} style={{ border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)' }}><Key size={16} strokeWidth={2.5} /> JURY LOGIN</button>
          </div>
        </div>
      </div>

      <div className="page-wide" style={{ paddingTop: '1.5rem' }}>
        <div className="banner-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '2rem', padding: '2rem', boxShadow: '6px 6px 0px var(--black)', border: 'var(--border-thick)' }}>
          <div>
            <span className="badge badge-black" style={{ marginBottom: '1rem', color: 'var(--yellow)', padding: '0.5rem 1rem', fontSize: '0.85rem', border: '2px solid var(--black)' }}>OFFICIAL COMPETITION STANDINGS</span>
            <h1 style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', color: 'var(--black)', margin: '0.5rem 0', letterSpacing: '-0.02em', lineHeight: 1 }}>LIVE LEADERBOARD</h1>
            <p style={{ color: 'var(--black)', fontSize: '1.1rem', fontWeight: 800 }}>Official rankings and team marks. Round 1 & Round 2 cumulative evaluations.</p>
          </div>
          
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div className="stat-card white" style={{ padding: '1rem 1.5rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-sm)' }}>
              <span className="stat-label">Participating Teams</span>
              <span className="stat-value">{filtered.length}</span>
            </div>
            <div className="stat-card cyan" style={{ padding: '1rem 1.5rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-sm)' }}>
              <span className="stat-label">Current Phase</span>
              <span className="stat-value" style={{ fontSize: '2.2rem' }}>Round 1</span>
            </div>
            <div className="stat-card green" style={{ padding: '1rem 1.5rem', border: 'var(--border-thick)', boxShadow: 'var(--shadow-sm)' }}>
              <span className="stat-label">Marks Logged</span>
              <span className="stat-value" style={{ fontSize: '2.2rem' }}>0</span>
            </div>
          </div>
        </div>

        <div style={{ background: 'var(--white)', border: 'var(--border-thick)', padding: '1rem', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', boxShadow: '4px 4px 0px var(--black)' }}>
          <div className="search-box" style={{ flex: 1, maxWidth: '600px' }}>
            <Search size={20} className="search-icon" style={{ left: '1rem' }} />
            <input className="input" placeholder="SEARCH TEAM NAME OR MEMBERS..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '3rem', border: '3px solid var(--black)', fontWeight: 800, fontSize: '1.1rem', boxShadow: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontWeight: 800, fontSize: '0.85rem' }}>DISPLAY:</span>
            <button className="btn btn-primary" style={{ padding: '0.6rem 1.2rem', border: '3px solid var(--black)', boxShadow: '2px 2px 0px var(--black)' }}>CUMULATIVE</button>
            <button className="btn btn-ghost" style={{ padding: '0.6rem 1.2rem', background: 'var(--white)', border: '3px solid var(--black)', boxShadow: '2px 2px 0px var(--black)', color: 'var(--black)' }}>ROUND 1</button>
            <button className="btn btn-ghost" style={{ padding: '0.6rem 1.2rem', background: 'var(--white)', border: '3px solid var(--black)', boxShadow: '2px 2px 0px var(--black)', color: 'var(--black)' }}>ROUND 2</button>
          </div>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: '80px', textAlign: 'center' }}>RANK</th>
                <th>TEAM NAME & MEMBERS</th>
                <th style={{ textAlign: 'center' }}>ROUND 1<br/>MARK</th>
                <th style={{ textAlign: 'center' }}>ROUND 2<br/>MARK</th>
                <th style={{ textAlign: 'right' }}>CUMULATIVE<br/>SCORE</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr key={`${entry.rank}-${idx}`}>
                  <td style={{ textAlign: 'center' }}>
                    <div className={`rank-pill ${entry.rank === 1 ? 'rank-1' : entry.rank === 2 ? 'rank-2' : entry.rank === 3 ? 'rank-3' : ''}`}>
                      {entry.rank <= 3 && <Award size={16} />}
                      #{entry.rank}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span className="lb-team-name" style={{ fontSize: '1.1rem' }}>{entry.team_name}</span>
                      <span className="badge badge-gray" style={{ fontSize: '0.65rem' }}>OPEN INNOVATION</span>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--gray-600)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Users size={12} /> Team Members Hidden
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic', fontSize: '0.85rem' }}>Pending</td>
                  <td style={{ textAlign: 'center', color: 'var(--gray-400)', fontStyle: 'italic', fontSize: '0.85rem' }}>Not Started</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge badge-green" style={{ fontSize: '1rem', padding: '0.5rem 1rem' }}>0 / 100</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="empty-state"><Trophy size={48} /><h3>No rankings yet</h3><p>Rankings appear as juries submit scores.</p></div>
        )}
      </div>

      <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--gray-600)', fontSize: '0.75rem', borderTop: 'var(--border-dim)' }}>
        EvalPro • Live leaderboard updates every 5 seconds
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CSV EXPORT UTILITY
// ─────────────────────────────────────────────────────────────────────────────
async function exportEventCSV(
  event: Event, teams: Team[], juries: EventMember[],
  rounds: Round[], evaluations: Evaluation[], leaderboard: LeaderboardRank[]
) {
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const row = (...cols: (string | number | null | undefined)[]) => cols.map(escape).join(',');

  const teamsCSV = [
    row('team_id','team_name','tag','members','created_at'),
    ...teams.map(t => row(t.id, t.name, t.tag, t.members ?? '', t.created_at))
  ].join('\n');

  const juriesCSV = [
    row('jury_id','jury_name','jury_email'),
    ...juries.map(j => row(j.user_id, j.display_name, j.email))
  ].join('\n');

  const roundsCSV = [
    row('round_seq','round_name','status','weight','criteria'),
    ...rounds.map(r => row(r.seq, r.name, r.status, r.weight,
      (r.criteria || []).map(c => `${c.label}(${c.max_marks})`).join(';')
    ))
  ].join('\n');

  const evalsCSV = [
    row('team_name','jury_name','round','scores_json','total','remarks','submitted_at'),
    ...evaluations.map(e => row(
      e.team_name, e.jury_name, `R${e.round_seq}:${e.round_name}`,
      JSON.stringify(e.scores), e.total, e.remarks, e.submitted_at
    ))
  ].join('\n');

  const lbCSV = [
    row('rank','team_name'),
    ...leaderboard.map(r => row(r.rank ?? '', r.team_name))
  ].join('\n');

  // Download each as separate blobs
  const files = [
    { name: 'teams.csv', content: teamsCSV },
    { name: 'juries.csv', content: juriesCSV },
    { name: 'rounds_criteria.csv', content: roundsCSV },
    { name: 'evaluations.csv', content: evalsCSV },
    { name: 'leaderboard.csv', content: lbCSV },
  ];

  for (const f of files) {
    const blob = new Blob(['\uFEFF' + f.content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${event.slug}_${f.name}`; a.click();
    URL.revokeObjectURL(url);
    await new Promise(r => setTimeout(r, 200));
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVBAR
// ─────────────────────────────────────────────────────────────────────────────
function Navbar({ role, userEmail, onLogout }: { role: UserRole; userEmail: string | null; onLogout: () => void }) {
  const roleLabels: Record<UserRole, string> = {
    platform_admin: 'Super Admin',
    organizer: 'Organizer',
    jury: 'Jury',
    public: '',
  };

  return (
    <nav className="navbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '1rem' }}>
      <a href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'var(--yellow)', border: '2px solid var(--black)', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
            <Trophy size={28} color="var(--black)" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.2rem' }}>
              <h1 style={{ fontSize: '1.75rem', margin: 0, padding: 0, lineHeight: 1, color: 'var(--black)' }}>EVALPRO</h1>
              {role === 'public' && <span className="badge" style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: '#fdfbf7', border: '2px solid var(--black)', boxShadow: 'none' }}>LOGIN</span>}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--gray-600)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              OFFICIAL COMPETITION • LIVE SCORING PORTAL
            </div>
          </div>
        </div>
      </a>
      <div className="navbar-actions" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {userEmail && (
          <>
            {role === 'platform_admin' && (
              <button 
                className="btn btn-primary" 
                style={{ border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)' }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-create'))}
              >
                CREATE EVENT
              </button>
            )}
            
            <button 
              className="btn btn-ghost btn-icon" 
              onClick={() => window.location.reload()} 
              style={{ background: 'var(--white)', border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)', color: 'var(--black)' }}
            >
              <RefreshCw size={18} strokeWidth={2.5} />
            </button>

            <button className="btn btn-cyan" onClick={onLogout} style={{ border: '2px solid var(--black)', boxShadow: 'var(--shadow-sm)' }}>
              <LogOut size={16} strokeWidth={2.5} /> SIGN OUT
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [role, setRole] = useState<UserRole>('public');
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [slug, setSlug] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [toasts, setToasts] = useState<Array<Toast & { id: number }>>([]);
  const toastCounter = useRef(0);

  const showToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = ++toastCounter.current;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const loadUserContext = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setRole('public'); setUserId(null); setUserEmail(null); setAuthLoading(false); return; }

      setUserId(user.id);
      setUserEmail(user.email ?? null);

      const r = await authService.getRole();
      setRole(r);

      if (r === 'organizer' || r === 'jury') {
        const ctx = await authService.getEventContext();
        if (ctx) { setEventId(ctx.eventId); setSlug(ctx.slug); }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUserContext();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadUserContext());
    return () => subscription.unsubscribe();
  }, [loadUserContext]);

  const handleLogout = async () => {
    await authService.signOut();
    setRole('public'); setUserId(null); setUserEmail(null);
    setEventId(null); setSlug(null);
  };

  // Check if this is a public leaderboard URL
  const publicToken = (() => {
    const path = window.location.pathname;
    if (path.startsWith('/l/')) return path.slice(3);
    return null;
  })();

  const ctx: AppCtx = { role, userId, userEmail, eventId, slug, showToast };

  if (publicToken) {
    return (
      <AppContext.Provider value={ctx}>
        <PublicLeaderboard token={publicToken} />
        <ToastContainer toasts={toasts} />
      </AppContext.Provider>
    );
  }

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--black)' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem' }}>EVAL<span style={{ color: 'var(--yellow)' }}>PRO</span></div>
          <Spinner size={40} />
        </div>
      </div>
    );
  }

  return (
    <AppContext.Provider value={ctx}>
      <div className="app-shell">
        <div className="top-accent" />
        {role !== 'public' && <Navbar role={role} userEmail={userEmail} onLogout={handleLogout} />}

        {role === 'public' && <LoginPage onLogin={loadUserContext} />}
        {role === 'platform_admin' && <AdminDashboard />}
        {role === 'organizer' && eventId && slug && <OrganizerWorkspace eventId={eventId} slug={slug} />}
        {role === 'jury' && eventId && <JuryConsole eventId={eventId} />}
      </div>
      <ToastContainer toasts={toasts} />
    </AppContext.Provider>
  );
}
