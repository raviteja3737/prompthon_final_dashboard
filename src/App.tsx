import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Trophy,
  Users,
  Shield,
  KeyRound,
  Search,
  Upload,
  UserPlus,
  Trash2,
  Edit3,
  CheckCircle2,
  LogOut,
  FileSpreadsheet,
  AlertTriangle,
  Copy,
  Layers,
  Award,
  X,
  RefreshCw,
  Database,
  Eye,
  EyeOff
} from 'lucide-react';
import { competitionService } from './services/competitionService';
import { isSupabaseConfigured } from './lib/supabaseClient';
import { Team, Jury, Evaluation, CompetitionSettings, EvaluationCriteria } from './types';
import { INITIAL_TEAMS, INITIAL_EVALUATIONS } from './data/teamsData';

const INITIAL_JURIES: Jury[] = [
  { id: 'jury-1', email: 'jury1@evalpro.org', password: 'Jury#9412!X', name: 'Jury Panel 01', created_at: '2026-09-20' },
  { id: 'jury-2', email: 'jury2@evalpro.org', password: 'Jury#8831!K', name: 'Jury Panel 02', created_at: '2026-09-20' },
  { id: 'jury-3', email: 'jury3@evalpro.org', password: 'Jury#7124!M', name: 'Jury Panel 03', created_at: '2026-09-20' },
];

const generateSecurePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const symbols = '!@#$%&*';
  let pass = 'Jury#';
  for (let i = 0; i < 4; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  pass += symbols.charAt(Math.floor(Math.random() * symbols.length));
  pass += Math.floor(10 + Math.random() * 90);
  return pass;
};

export default function App() {
  const [currentView, setCurrentView] = useState<'leaderboard' | 'jury-console' | 'admin-dashboard'>('leaderboard');
  const [currentUserRole, setCurrentUserRole] = useState<'public' | 'jury' | 'admin'>('public');
  const [loggedJury, setLoggedJury] = useState<Jury | null>(null);

  const [teams, setTeams] = useState<Team[]>(INITIAL_TEAMS);
  const [juries, setJuries] = useState<Jury[]>(INITIAL_JURIES);
  const [evaluations, setEvaluations] = useState<Evaluation[]>(INITIAL_EVALUATIONS);

  const [currentActiveRound, setCurrentActiveRound] = useState<number>(1);
  const [round1Locked, setRound1Locked] = useState<boolean>(false);
  const [round2Started, setRound2Started] = useState<boolean>(false);
  const [leaderboardVisible, setLeaderboardVisible] = useState<boolean>(true);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [supabaseActive, setSupabaseActive] = useState<boolean>(false);

  // Modals state
  const [isJuryLoginOpen, setIsJuryLoginOpen] = useState(false);
  const [isAdminLoginOpen, setIsAdminLoginOpen] = useState(false);
  const [isScoreModalOpen, setIsScoreModalOpen] = useState(false);
  const [selectedTeamForScoring, setSelectedTeamForScoring] = useState<Team | null>(null);

  const [isCreateJuryOpen, setIsCreateJuryOpen] = useState(false);
  const [isUploadCSVOpen, setIsUploadCSVOpen] = useState(false);
  const [isEditMarkModalOpen, setIsEditMarkModalOpen] = useState(false);
  const [selectedEvaluationToEdit, setSelectedEvaluationToEdit] = useState<Evaluation | null>(null);

  const [leaderboardSearch, setLeaderboardSearch] = useState('');
  const [selectedLeaderboardRound, setSelectedLeaderboardRound] = useState<'all' | '1' | '2'>('all');
  const [jurySearchQuery, setJurySearchQuery] = useState('');

  const [toast, setToast] = useState<{ message: string; type?: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3600);
  };

  /* Login Form States */
  const [juryLoginForm, setJuryLoginForm] = useState({ email: '', password: '' });
  const [adminLoginForm, setAdminLoginForm] = useState({ email: 'ravitejaraviteja900@gmail.com', password: 'prompthon_final_dashboard' });
  const [loginError, setLoginError] = useState('');

  // Restore saved session from localStorage on initial load
  useEffect(() => {
    try {
      const savedRole = localStorage.getItem('evalpro_role');
      const savedJury = localStorage.getItem('evalpro_jury');
      if (savedRole === 'admin') {
        setCurrentUserRole('admin');
      } else if (savedRole === 'jury' && savedJury) {
        setCurrentUserRole('jury');
        setLoggedJury(JSON.parse(savedJury));
      }
    } catch (e) {
      console.error('Session restore error:', e);
    }
  }, []);

  // Fetch all data from Supabase / Database API
  const loadSupabaseData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedTeams, fetchedJuries, fetchedEvaluations, fetchedSettings] = await Promise.all([
        competitionService.getTeams(),
        competitionService.getJuries(),
        competitionService.getEvaluations(),
        competitionService.getSettings()
      ]);

      const isLive = isSupabaseConfigured() || (fetchedTeams && fetchedTeams.length > 0);
      setSupabaseActive(isLive);

      if (fetchedTeams && fetchedTeams.length > 0) setTeams(fetchedTeams);
      if (fetchedJuries && fetchedJuries.length > 0) setJuries(fetchedJuries);
      if (fetchedEvaluations) setEvaluations(fetchedEvaluations);

      if (fetchedSettings) {
        setCurrentActiveRound(fetchedSettings.current_active_round);
        setRound1Locked(fetchedSettings.round_1_locked);
        setRound2Started(fetchedSettings.round_2_started);
        if (fetchedSettings.leaderboard_visible !== undefined) {
          setLeaderboardVisible(fetchedSettings.leaderboard_visible);
        }
      }
    } catch (err: any) {
      console.warn('Data load notice (using fallback or local data):', err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load and Realtime listener
  useEffect(() => {
    loadSupabaseData();

    // Subscribe to realtime changes across evaluations, teams, juries, settings
    const unsubscribe = competitionService.subscribeToAll(() => {
      loadSupabaseData();
    });

    return () => {
      unsubscribe();
    };
  }, [loadSupabaseData]);

  const handleToggleLeaderboardVisibility = async () => {
    const nextVal = !leaderboardVisible;
    setLeaderboardVisible(nextVal);
    try {
      await competitionService.updateSettings({
        leaderboard_visible: nextVal
      });
      showToast(
        nextVal
          ? 'Leaderboard is now LIVE and visible to all participants publicly!'
          : 'Leaderboard is now TURNED OFF and hidden from public view.',
        nextVal ? 'success' : 'info'
      );
    } catch (err: any) {
      console.error('Error updating leaderboard visibility:', err);
      showToast('Visibility toggled locally.', 'info');
    }
  };

  const handleJuryLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const enteredEmail = juryLoginForm.email.toLowerCase().trim();
    const matched = juries.find(
      (j) => j.email.toLowerCase().trim() === enteredEmail && (j.password === juryLoginForm.password || (j as any).password_plain === juryLoginForm.password)
    );

    if (matched) {
      setLoggedJury(matched);
      setCurrentUserRole('jury');
      setCurrentView('jury-console');
      setIsJuryLoginOpen(false);
      setJuryLoginForm({ email: '', password: '' });
      localStorage.setItem('evalpro_role', 'jury');
      localStorage.setItem('evalpro_jury', JSON.stringify(matched));
      showToast(`Logged in as ${matched.name || matched.email}`);
    } else {
      setLoginError('Invalid Jury credentials. Contact Super Admin for auto password.');
    }
  };

  const handleAdminLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (adminLoginForm.email === 'ravitejaraviteja900@gmail.com' && adminLoginForm.password === 'prompthon_final_dashboard') {
      setCurrentUserRole('admin');
      setCurrentView('admin-dashboard');
      setIsAdminLoginOpen(false);
      localStorage.setItem('evalpro_role', 'admin');
      showToast('Super Admin authorization verified!');
    } else {
      setLoginError('Access denied: Invalid Super Admin master password.');
    }
  };

  const handleLogout = () => {
    setCurrentUserRole('public');
    setLoggedJury(null);
    setCurrentView('leaderboard');
    localStorage.removeItem('evalpro_role');
    localStorage.removeItem('evalpro_jury');
    showToast('Logged out to public view.');
  };

  const [newJuryEmail, setNewJuryEmail] = useState('');
  const [newJuryName, setNewJuryName] = useState('');
  const [generatedJuryCreds, setGeneratedJuryCreds] = useState<Jury | null>(null);

  const handleCreateJury = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newJuryEmail.trim()) return;

    if (juries.some((j) => j.email.toLowerCase() === newJuryEmail.toLowerCase().trim())) {
      showToast('A jury evaluator with this email already exists!', 'error');
      return;
    }

    const autoPassword = generateSecurePassword();
    const juryName = newJuryName.trim() || `Jury Panel #${juries.length + 1}`;

    if (supabaseActive) {
      try {
        const created = await competitionService.createJury({
          email: newJuryEmail.trim().toLowerCase(),
          name: juryName,
          password: autoPassword
        });
        setJuries((prev) => [created, ...prev]);
        setGeneratedJuryCreds(created);
        setNewJuryEmail('');
        setNewJuryName('');
        showToast('Jury created & synced to Supabase!');
        return;
      } catch (err: any) {
        console.error('Supabase jury create error:', err);
        showToast('Error syncing with Supabase: ' + err.message, 'error');
      }
    }

    // Local state fallback
    const juryObj: Jury = {
      id: `jury-${Date.now()}`,
      email: newJuryEmail.trim().toLowerCase(),
      password: autoPassword,
      name: juryName,
      created_at: new Date().toISOString().split('T')[0]
    };

    setJuries((prev) => [juryObj, ...prev]);
    setGeneratedJuryCreds(juryObj);
    setNewJuryEmail('');
    setNewJuryName('');
    showToast('Jury created! Auto password generated.');
  };

  const handleDeleteJury = async (juryId: string) => {
    if (supabaseActive) {
      try {
        await competitionService.deleteJury(juryId);
      } catch (err: any) {
        console.error('Failed to delete jury in Supabase:', err);
      }
    }
    setJuries((prev) => prev.filter((j) => j.id !== juryId));
    setEvaluations((prev) => prev.filter((e) => (e.juryId !== juryId && e.jury_id !== juryId)));
    showToast('Jury and their submitted marks removed.', 'info');
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvUploadText, setCsvUploadText] = useState('');

  const parseAndAddTeams = async (rawText: string) => {
    const lines = rawText.split(/\r?\n/).filter((l) => l.trim() !== '');
    if (lines.length === 0) {
      showToast('The CSV file or text is empty.', 'error');
      return;
    }

    const newParsedTeams: { name: string; members: string; tag: string }[] = [];
    const startIndex = lines[0].toLowerCase().includes('team') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];
      const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length >= 1) {
        const teamName = parts[0].replace(/"/g, '').trim();
        const members = parts[1] ? parts[1].replace(/"/g, '').trim() : 'Unspecified';
        if (teamName) {
          newParsedTeams.push({
            name: teamName,
            members: members,
            tag: 'Batch Registered'
          });
        }
      }
    }

    if (newParsedTeams.length > 0) {
      if (supabaseActive) {
        try {
          const inserted = await competitionService.batchAddTeams(newParsedTeams);
          setTeams((prev) => [...prev, ...inserted]);
          showToast(`Imported ${inserted.length} new teams via CSV & saved to Supabase!`);
          setIsUploadCSVOpen(false);
          setCsvUploadText('');
          return;
        } catch (err: any) {
          console.error('CSV Supabase error:', err);
        }
      }

      // Local fallback
      const localTeams: Team[] = newParsedTeams.map((t, i) => ({
        id: `team-${Date.now()}-${i}`,
        ...t
      }));
      setTeams((prev) => [...prev, ...localTeams]);
      showToast(`Imported ${localTeams.length} new teams via CSV!`);
      setIsUploadCSVOpen(false);
      setCsvUploadText('');
    } else {
      showToast('Could not find valid rows. Expected format: Team Name, Team Members', 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      parseAndAddTeams(evt.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleStartRound2 = async () => {
    setRound1Locked(true);
    setRound2Started(true);
    setCurrentActiveRound(2);

    if (supabaseActive) {
      try {
        await competitionService.updateSettings({
          round_1_locked: true,
          round_2_started: true,
          current_active_round: 2
        });
      } catch (err) {
        console.error('Error starting round 2 in Supabase:', err);
      }
    }
    showToast('Round 1 locked! Round 2 is now open for evaluation.');
  };

  const handleSwitchActiveRound = async (roundNumber: number) => {
    setCurrentActiveRound(roundNumber);
    if (supabaseActive) {
      try {
        await competitionService.updateSettings({
          current_active_round: roundNumber
        });
      } catch (err) {
        console.error('Error switching round in Supabase:', err);
      }
    }
    showToast(`Switched active scoring to Round ${roundNumber}.`);
  };

  const [scoringCriteria, setScoringCriteria] = useState<EvaluationCriteria>({
    innovation: 20,
    tech: 20,
    feasibility: 20,
    presentation: 20
  });
  const [scoringRemarks, setScoringRemarks] = useState('');

  const openScoringModal = (team: Team) => {
    const existingMark = evaluations.find(
      (ev) =>
        (ev.teamId === team.id || ev.team_id === team.id) &&
        (ev.juryId === loggedJury?.id || ev.jury_id === loggedJury?.id) &&
        ev.round === currentActiveRound
    );

    if (existingMark) {
      showToast(`You have already scored ${team.name} in Round ${currentActiveRound}. Admin override required to reset.`, 'info');
      return;
    }

    setSelectedTeamForScoring(team);
    setScoringCriteria({ innovation: 20, tech: 20, feasibility: 20, presentation: 20 });
    setScoringRemarks('');
    setIsScoreModalOpen(true);
  };

  const handleScoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeamForScoring || !loggedJury) return;

    const total =
      Number(scoringCriteria.innovation) +
      Number(scoringCriteria.tech) +
      Number(scoringCriteria.feasibility) +
      Number(scoringCriteria.presentation);

    if (supabaseActive) {
      try {
        const submitted = await competitionService.submitEvaluation({
          teamId: selectedTeamForScoring.id,
          juryId: loggedJury.id,
          juryEmail: loggedJury.email,
          round: currentActiveRound,
          criteria: scoringCriteria,
          remarks: scoringRemarks.trim() || 'No remarks provided.'
        });
        setEvaluations((prev) => [submitted, ...prev]);
        setIsScoreModalOpen(false);
        showToast(`Marks saved to Supabase for ${selectedTeamForScoring.name}: Total ${total}/100`);
        return;
      } catch (err: any) {
        console.error('Supabase submit score error:', err);
        showToast('Error saving to Supabase: ' + err.message, 'error');
      }
    }

    // Local fallback
    const newEval: Evaluation = {
      id: `eval-${Date.now()}`,
      teamId: selectedTeamForScoring.id,
      juryId: loggedJury.id,
      juryEmail: loggedJury.email,
      round: currentActiveRound,
      criteria: { ...scoringCriteria },
      total,
      remarks: scoringRemarks.trim() || 'No remarks provided.',
      timestamp: new Date().toLocaleString()
    };

    setEvaluations((prev) => [...prev, newEval]);
    setIsScoreModalOpen(false);
    showToast(`Marks saved for ${selectedTeamForScoring.name}: Total ${total}/100`);
  };

  const handleOpenEditMark = (evaluation: Evaluation) => {
    const crit = evaluation.criteria || {
      innovation: evaluation.innovation ?? 20,
      tech: evaluation.tech ?? 20,
      feasibility: evaluation.feasibility ?? 20,
      presentation: evaluation.presentation ?? 20
    };
    setSelectedEvaluationToEdit({
      ...evaluation,
      criteria: { ...crit }
    });
    setIsEditMarkModalOpen(true);
  };

  const handleSaveEditedMark = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvaluationToEdit || !selectedEvaluationToEdit.criteria) return;

    const newTotal =
      Number(selectedEvaluationToEdit.criteria.innovation) +
      Number(selectedEvaluationToEdit.criteria.tech) +
      Number(selectedEvaluationToEdit.criteria.feasibility) +
      Number(selectedEvaluationToEdit.criteria.presentation);

    if (supabaseActive) {
      try {
        await competitionService.updateEvaluation(
          selectedEvaluationToEdit.id,
          selectedEvaluationToEdit.criteria,
          selectedEvaluationToEdit.remarks || ''
        );
      } catch (err: any) {
        console.error('Error updating mark in Supabase:', err);
      }
    }

    setEvaluations((prev) =>
      prev.map((item) =>
        item.id === selectedEvaluationToEdit.id
          ? {
              ...selectedEvaluationToEdit,
              total: newTotal,
              timestamp: `${new Date().toLocaleTimeString()} (Admin Modified)`
            }
          : item
      )
    );

    setIsEditMarkModalOpen(false);
    showToast('Mark modified successfully by Super Admin.');
  };

  const handleDeleteEvaluationMark = async (evalId: string) => {
    if (supabaseActive) {
      try {
        await competitionService.deleteEvaluation(evalId);
      } catch (err: any) {
        console.error('Error deleting evaluation in Supabase:', err);
      }
    }
    setEvaluations((prev) => prev.filter((ev) => ev.id !== evalId));
    showToast('Mark deleted. Jury member can freshly re-score this team.', 'info');
  };

  // Memoized public leaderboard calculation (only team names and their marks, completely anonymous to juries)
  const leaderboardData = useMemo(() => {
    return teams
      .map((team) => {
        const teamR1Marks = evaluations.filter((ev) => (ev.teamId === team.id || ev.team_id === team.id) && ev.round === 1);
        const teamR2Marks = evaluations.filter((ev) => (ev.teamId === team.id || ev.team_id === team.id) && ev.round === 2);

        const r1Avg = teamR1Marks.length > 0
          ? (teamR1Marks.reduce((acc, curr) => acc + curr.total, 0) / teamR1Marks.length).toFixed(1)
          : null;

        const r2Avg = teamR2Marks.length > 0
          ? (teamR2Marks.reduce((acc, curr) => acc + curr.total, 0) / teamR2Marks.length).toFixed(1)
          : null;

        let cumulativeScore = '0.0';
        if (r1Avg && r2Avg) {
          cumulativeScore = ((parseFloat(r1Avg) + parseFloat(r2Avg)) / 2).toFixed(1);
        } else if (r1Avg) {
          cumulativeScore = r1Avg;
        } else if (r2Avg) {
          cumulativeScore = r2Avg;
        }

        return {
          ...team,
          r1Avg: r1Avg ? parseFloat(r1Avg) : null,
          r1Count: teamR1Marks.length,
          r2Avg: r2Avg ? parseFloat(r2Avg) : null,
          r2Count: teamR2Marks.length,
          overallScore: parseFloat(cumulativeScore),
          displayScore:
            selectedLeaderboardRound === '1'
              ? r1Avg ? parseFloat(r1Avg) : 0
              : selectedLeaderboardRound === '2'
              ? r2Avg ? parseFloat(r2Avg) : 0
              : parseFloat(cumulativeScore)
        };
      })
      .filter((t) => {
        if (!leaderboardSearch.trim()) return true;
        const q = leaderboardSearch.toLowerCase();
        return t.name.toLowerCase().includes(q) || (t.members && t.members.toLowerCase().includes(q));
      })
      .sort((a, b) => b.displayScore - a.displayScore);
  }, [teams, evaluations, selectedLeaderboardRound, leaderboardSearch]);

  const filteredTeamsForJury = useMemo(() => {
    if (!loggedJury) return [];
    return teams.filter((team) => {
      const q = jurySearchQuery.toLowerCase();
      return team.name.toLowerCase().includes(q) || (team.members && team.members.toLowerCase().includes(q));
    });
  }, [teams, jurySearchQuery, loggedJury]);

  const copyToClipboard = (text: string, label = 'Credentials') => {
    navigator.clipboard.writeText(text);
    showToast(`${label} copied to clipboard!`);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF0] text-black font-sans selection:bg-[#FFE600] selection:text-black">
      
      {/* Toast Alert with Neo-Brutalist Hard Shadow */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] font-black text-xs uppercase tracking-wider animate-bounce">
          {toast.type === 'error' ? (
            <div className="w-4 h-4 bg-rose-500 border border-black" />
          ) : toast.type === 'info' ? (
            <div className="w-4 h-4 bg-cyan-400 border border-black" />
          ) : (
            <div className="w-4 h-4 bg-[#00F5A0] border border-black" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Taskbar Header */}
      <header className="border-b-[3px] border-black bg-white sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
          
          {/* Brand Emblem */}
          <div
            onClick={() => setCurrentView('leaderboard')}
            className="flex items-center gap-3 cursor-pointer select-none group"
          >
            <div className="w-11 h-11 bg-[#FFE600] border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center group-hover:translate-x-0.5 group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0px_0px_#000] transition-all">
              <Trophy className="w-6 h-6 text-black stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-xl tracking-tight uppercase">EvalPro</span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#00F0FF] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                  {round2Started ? 'ROUND 2 LIVE' : 'ROUND 1 ACTIVE'}
                </span>
                {supabaseActive ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 bg-[#00F5A0] border border-black" title="Connected to Supabase PostgreSQL Realtime">
                    <Database className="w-2.5 h-2.5" /> Live Cloud
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase px-1.5 py-0.5 bg-yellow-200 border border-black" title="Local Evaluation Mode">
                    Local Mode
                  </span>
                )}
              </div>
              <p className="text-[11px] font-bold text-gray-700 tracking-wider">OFFICIAL COMPETITION &bull; LIVE SCORING PORTAL</p>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setCurrentView('leaderboard')}
              className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-[2.5px] border-black transition-all flex items-center gap-1.5 ${
                currentView === 'leaderboard'
                  ? 'bg-[#FFE600] shadow-[3px_3px_0px_0px_#000]'
                  : 'bg-white hover:bg-yellow-100 shadow-[2px_2px_0px_0px_#000]'
              }`}
            >
              <span>Public Leaderboard</span>
              {!leaderboardVisible && (
                <span className="text-[9px] px-1.5 py-0.2 bg-rose-400 text-black border border-black font-black">
                  OFF
                </span>
              )}
            </button>

            {currentUserRole === 'jury' && (
              <button
                onClick={() => setCurrentView('jury-console')}
                className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-[2.5px] border-black transition-all ${
                  currentView === 'jury-console'
                    ? 'bg-[#00F0FF] shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-white hover:bg-cyan-100 shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                My Scoring Panel
              </button>
            )}

            {currentUserRole === 'admin' && (
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`px-3.5 py-2 text-xs font-black uppercase tracking-wider border-[2.5px] border-black transition-all ${
                  currentView === 'admin-dashboard'
                    ? 'bg-[#FF66C4] shadow-[3px_3px_0px_0px_#000]'
                    : 'bg-white hover:bg-pink-100 shadow-[2px_2px_0px_0px_#000]'
                }`}
              >
                Super Admin Dashboard
              </button>
            )}

            {/* Sync indicator button */}
            <button
              onClick={() => loadSupabaseData()}
              title="Refresh live data"
              className="p-2 bg-white hover:bg-gray-100 border-[2px] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-black ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {/* Auth Action in Taskbar */}
            {currentUserRole === 'public' ? (
              <button
                onClick={() => {
                  setLoginError('');
                  setIsJuryLoginOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#00F5A0] hover:bg-[#00E090] text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all"
              >
                <KeyRound className="w-4 h-4 stroke-[2.5]" />
                <span>Jury Login</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 border-l-[2.5px] border-black pl-3">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-black uppercase">
                    {currentUserRole === 'admin' ? 'Super Admin' : loggedJury?.name}
                  </p>
                  <p className="text-[10px] font-mono text-gray-600">
                    {currentUserRole === 'admin' ? 'Master Authority' : loggedJury?.email}
                  </p>
                </div>
                <button
                  onClick={handleLogout}
                  title="Logout"
                  className="p-2 bg-rose-400 hover:bg-rose-500 border-[2px] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none transition-all"
                >
                  <LogOut className="w-4 h-4 text-black stroke-[2.5]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto m-[10pt] p-[10pt] space-y-[10pt]">

        {/* ========================================================
            VIEW 1: PUBLIC LEADERBOARD (NO JURY NAMES - ONLY TEAMS & MARKS)
            ======================================================== */}
        {currentView === 'leaderboard' && (
          <div className="space-y-[10pt]">
            {!leaderboardVisible && currentUserRole !== 'admin' ? (
              <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-10 m-[10pt] text-center max-w-2xl mx-auto my-12">
                <div className="w-16 h-16 bg-rose-300 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] mx-auto flex items-center justify-center mb-6">
                  <EyeOff className="w-8 h-8 text-black stroke-[2.5]" />
                </div>
                <div className="inline-block px-3 py-1 bg-black text-rose-300 font-black text-xs uppercase tracking-widest border border-black mb-3">
                  Standings Offline
                </div>
                <h2 className="text-2xl sm:text-3xl font-black uppercase text-black mb-3">
                  Leaderboards Currently Turned Off
                </h2>
                <p className="text-sm font-bold text-gray-700 max-w-md mx-auto mb-6">
                  The competition administrators have temporarily disabled public visibility for the leaderboard. Standings, rankings, and marks are hidden. Please check back later!
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => loadSupabaseData()}
                    className="px-4 py-2.5 bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none flex items-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    <span>Check Status Again</span>
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Admin Warning Banner when Leaderboard is Turned Off */}
                {!leaderboardVisible && currentUserRole === 'admin' && (
                  <div className="bg-rose-100 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-4 m-[10pt] flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-rose-400 border-[2px] border-black">
                        <EyeOff className="w-5 h-5 text-black stroke-[2.5]" />
                      </div>
                      <div>
                        <span className="text-xs font-black uppercase text-black block">
                          Super Admin Notice: Leaderboard is TURNED OFF for the public
                        </span>
                        <p className="text-[11px] font-bold text-gray-700">
                          Public visitors and juries cannot see this leaderboard. You are viewing this preview as Super Admin.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleLeaderboardVisibility}
                      className="px-4 py-2 bg-[#00F5A0] hover:bg-emerald-400 text-black font-black text-xs uppercase border-[2px] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none whitespace-nowrap"
                    >
                      Turn On Leaderboard
                    </button>
                  </div>
                )}

                {/* Hero Banner Card */}
                <div className="bg-[#FFE600] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-6 m-[10pt]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <div className="inline-block px-3 py-1 bg-black text-[#FFE600] font-black text-xs uppercase tracking-widest border border-black mb-2">
                    Official Competition Standings
                  </div>
                  <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-black">
                    Live Leaderboard
                  </h1>
                  <p className="text-sm font-bold text-black mt-1 max-w-xl">
                    Official rankings and team marks. Round 1 & Round 2 cumulative evaluations.
                  </p>
                </div>

                {/* Metric blocks (Strictly public: Teams and Total Evaluations Logged) */}
                <div className="flex flex-wrap gap-3">
                  <div className="bg-white border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] px-4 py-2 text-center min-w-[100px]">
                    <span className="block text-[10px] font-black uppercase text-gray-600">Participating Teams</span>
                    <span className="text-2xl font-black text-black">{teams.length}</span>
                  </div>
                  <div className="bg-[#00F0FF] border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] px-4 py-2 text-center min-w-[100px]">
                    <span className="block text-[10px] font-black uppercase text-black">Current Phase</span>
                    <span className="text-2xl font-black text-black">{round2Started ? 'Round 2' : 'Round 1'}</span>
                  </div>
                  <div className="bg-[#00F5A0] border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] px-4 py-2 text-center min-w-[100px]">
                    <span className="block text-[10px] font-black uppercase text-black">Marks Logged</span>
                    <span className="text-2xl font-black text-black">{evaluations.length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Filter and Adaptive Search Bar */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] p-4 m-[10pt] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="relative w-full md:max-w-md">
                <Search className="w-5 h-5 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
                <input
                  type="text"
                  placeholder="SEARCH TEAM NAME OR MEMBERS..."
                  value={leaderboardSearch}
                  onChange={(e) => setLeaderboardSearch(e.target.value)}
                  className="w-full bg-[#FFFDF0] border-[2.5px] border-black pl-11 pr-4 py-2.5 text-xs font-black uppercase tracking-wider text-black placeholder-gray-500 focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              {/* Round Selector Pill Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider mr-1">Display:</span>
                <button
                  onClick={() => setSelectedLeaderboardRound('all')}
                  className={`px-3 py-2 text-xs font-black uppercase border-[2px] border-black transition-all ${
                    selectedLeaderboardRound === 'all'
                      ? 'bg-[#FFE600] shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_#000]'
                  }`}
                >
                  Cumulative
                </button>
                <button
                  onClick={() => setSelectedLeaderboardRound('1')}
                  className={`px-3 py-2 text-xs font-black uppercase border-[2px] border-black transition-all ${
                    selectedLeaderboardRound === '1'
                      ? 'bg-[#00F0FF] shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_#000]'
                  }`}
                >
                  Round 1
                </button>
                <button
                  onClick={() => setSelectedLeaderboardRound('2')}
                  className={`px-3 py-2 text-xs font-black uppercase border-[2px] border-black transition-all ${
                    selectedLeaderboardRound === '2'
                      ? 'bg-[#FF66C4] shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]'
                      : 'bg-white hover:bg-gray-100 shadow-[1px_1px_0px_0px_#000]'
                  }`}
                >
                  Round 2
                </button>
              </div>
            </div>

            {/* Public Table: STRICTLY TEAM NAMES AND MARKS ONLY (NO JURY NAMES OR COUNTS) */}
            <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] m-[10pt] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-black text-white font-black uppercase tracking-wider border-b-[3px] border-black">
                    <tr>
                      <th className="py-4 px-5 w-24">Rank</th>
                      <th className="py-4 px-5">Team Name & Members</th>
                      <th className="py-4 px-5 text-center">Round 1 Mark</th>
                      <th className="py-4 px-5 text-center">Round 2 Mark</th>
                      <th className="py-4 px-5 text-right">
                        {selectedLeaderboardRound === '1'
                          ? 'Round 1 Score'
                          : selectedLeaderboardRound === '2'
                          ? 'Round 2 Score'
                          : 'Cumulative Score'}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black font-bold">
                    {leaderboardData.length > 0 ? (
                      leaderboardData.map((team, idx) => {
                        const rank = idx + 1;
                        const isTop1 = rank === 1;
                        const isTop2 = rank === 2;
                        const isTop3 = rank === 3;

                        return (
                          <tr
                            key={team.id}
                            className={`hover:bg-[#FFFDE5] transition-colors ${
                              isTop1 ? 'bg-yellow-50' : ''
                            }`}
                          >
                            {/* Rank Indicator */}
                            <td className="py-4 px-5">
                              {isTop1 ? (
                                <span className="inline-flex items-center justify-center px-3 py-1 bg-[#FFE600] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] font-black text-sm">
                                  🥇 #1
                                </span>
                              ) : isTop2 ? (
                                <span className="inline-flex items-center justify-center px-3 py-1 bg-white border-[2px] border-black shadow-[2px_2px_0px_0px_#000] font-black text-sm">
                                  🥈 #2
                                </span>
                              ) : isTop3 ? (
                                <span className="inline-flex items-center justify-center px-3 py-1 bg-[#FF9F1C] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] font-black text-sm text-white">
                                  🥉 #3
                                </span>
                              ) : (
                                <span className="font-mono text-sm pl-2">#{rank}</span>
                              )}
                            </td>

                            {/* Team Name & Members */}
                            <td className="py-4 px-5">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-base uppercase text-black">{team.name}</span>
                                {team.tag && (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-gray-100 border border-black">
                                    {team.tag}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-700 mt-1 flex items-center gap-1.5 font-medium">
                                <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                                <span>{team.members}</span>
                              </div>
                            </td>

                            {/* Round 1 Mark (Clean numeric score, completely anonymous) */}
                            <td className="py-4 px-5 text-center">
                              {team.r1Avg !== null ? (
                                <div className="inline-block px-4 py-1.5 bg-[#00F0FF]/30 border-[1.5px] border-black">
                                  <span className="font-black text-sm text-black font-mono">{team.r1Avg}</span>
                                  <span className="text-[10px] font-bold text-gray-600 block">/ 100</span>
                                </div>
                              ) : (
                                <span className="text-gray-400 font-mono italic">Pending</span>
                              )}
                            </td>

                            {/* Round 2 Mark (Clean numeric score, completely anonymous) */}
                            <td className="py-4 px-5 text-center">
                              {team.r2Avg !== null ? (
                                <div className="inline-block px-4 py-1.5 bg-[#FF66C4]/30 border-[1.5px] border-black">
                                  <span className="font-black text-sm text-black font-mono">{team.r2Avg}</span>
                                  <span className="text-[10px] font-bold text-gray-600 block">/ 100</span>
                                </div>
                              ) : round2Started ? (
                                <span className="text-amber-700 font-bold bg-amber-100 px-2 py-1 border border-black text-[10px] uppercase">
                                  Awaiting R2
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono text-[11px]">Not Started</span>
                              )}
                            </td>

                            {/* Cumulative Display Score */}
                            <td className="py-4 px-5 text-right">
                              <span className="inline-block px-3 py-1.5 bg-[#00F5A0] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] font-black text-base text-black font-mono">
                                {team.displayScore} <span className="text-[10px]">/ 100</span>
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-sm font-black uppercase text-gray-500">
                          No teams matched &ldquo;{leaderboardSearch}&rdquo;
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            </>
            )}
          </div>
        )}

        {/* ========================================================
            VIEW 2: JURY SCORING CONSOLE (PRIVATE TO LOGGED JURY)
            ======================================================== */}
        {currentView === 'jury-console' && loggedJury && (
          <div className="space-y-[10pt]">
            
            {/* Jury Identity Block */}
            <div className="bg-[#00F0FF] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-6 m-[10pt] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="inline-block px-2.5 py-0.5 bg-black text-[#00F0FF] font-black text-xs uppercase mb-2 border border-black">
                  Authenticated Evaluator
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                  {loggedJury.name}
                </h1>
                <p className="text-xs font-bold text-black mt-1">
                  Email: <span className="font-mono bg-white px-2 py-0.5 border border-black">{loggedJury.email}</span> &bull; Confidential Scoring Console.
                </p>
              </div>

              {/* Active Evaluation Round Badge */}
              <div className="bg-white border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] p-4 text-center">
                <span className="block text-[10px] font-black uppercase text-gray-600">Active Scoring Phase</span>
                <span className="text-2xl font-black uppercase text-black">Round {currentActiveRound}</span>
              </div>
            </div>

            {/* Search Filter for Jury */}
            <div className="bg-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-4 m-[10pt]">
              <label className="block text-xs font-black uppercase tracking-wider mb-2 text-black">
                Adaptive Team Search (Instant Filter by Team Name or Team Members)
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-black absolute left-3.5 top-1/2 -translate-y-1/2 stroke-[2.5]" />
                <input
                  type="text"
                  placeholder="TYPE TEAM NAME (E.G. 'NEURALCRAFTERS') OR STUDENT NAME..."
                  value={jurySearchQuery}
                  onChange={(e) => setJurySearchQuery(e.target.value)}
                  className="w-full bg-[#FFFDF0] border-[2.5px] border-black pl-11 pr-16 py-3 text-xs font-black uppercase tracking-wider text-black placeholder-gray-500 focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
                />
                {jurySearchQuery && (
                  <button
                    onClick={() => setJurySearchQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-black text-white text-[10px] font-black uppercase border border-black"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Team Evaluation Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[10pt] m-[10pt]">
              {filteredTeamsForJury.map((team) => {
                const myEval = evaluations.find(
                  (ev) =>
                    (ev.teamId === team.id || ev.team_id === team.id) &&
                    (ev.juryId === loggedJury.id || ev.jury_id === loggedJury.id) &&
                    ev.round === currentActiveRound
                );

                return (
                  <div
                    key={team.id}
                    className={`border-[3px] border-black p-5 flex flex-col justify-between transition-all ${
                      myEval
                        ? 'bg-[#EBFBF3] shadow-[4px_4px_0px_0px_#000]'
                        : 'bg-white shadow-[5px_5px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[7px_7px_0px_0px_#000]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-black text-lg uppercase tracking-tight text-black">
                          {team.name}
                        </h3>
                        {myEval ? (
                          <span className="px-2.5 py-1 bg-[#00F5A0] border-[2px] border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                            Scored
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-[#FFE600] border-[2px] border-black text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000]">
                            Pending
                          </span>
                        )}
                      </div>

                      <div className="mt-2 text-xs font-semibold text-gray-700 flex items-start gap-1.5">
                        <Users className="w-4 h-4 text-black shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{team.members}</span>
                      </div>

                      {myEval && (
                        <div className="mt-4 p-3 bg-white border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                          <div className="flex items-center justify-between text-xs font-black">
                            <span>Your Round {currentActiveRound} Score:</span>
                            <span className="text-base font-black font-mono text-black">{myEval.total} / 100</span>
                          </div>
                          <p className="text-[11px] font-bold text-gray-600 mt-1 italic">
                            &ldquo;{myEval.remarks}&rdquo;
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-5 pt-3 border-t-[2px] border-black">
                      {myEval ? (
                        <div className="text-[11px] font-black uppercase text-gray-500 text-center py-1">
                          Marks Locked &bull; Super Admin Edit Required
                        </div>
                      ) : (
                        <button
                          onClick={() => openScoringModal(team)}
                          className="w-full py-2.5 bg-[#FFE600] hover:bg-[#FFD700] text-black font-black text-xs uppercase tracking-wider border-[2px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] flex items-center justify-center gap-2 transition-all"
                        >
                          <Edit3 className="w-4 h-4 stroke-[2.5]" />
                          <span>Score Team &bull; Round {currentActiveRound}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ========================================================
            VIEW 3: SUPER ADMIN DASHBOARD
            ======================================================== */}
        {currentView === 'admin-dashboard' && currentUserRole === 'admin' && (
          <div className="space-y-[10pt]">
            
            {/* Top Admin Banner */}
            <div className="bg-[#FF66C4] border-[3px] border-black shadow-[6px_6px_0px_0px_#000] p-6 m-[10pt] flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-block px-3 py-1 bg-black text-[#FF66C4] font-black text-xs uppercase tracking-widest border border-black mb-2">
                  Super Admin Central Operations
                </div>
                <h1 className="text-3xl font-black uppercase tracking-tight text-black">
                  Control Console
                </h1>
                <p className="text-xs font-bold text-black mt-1 max-w-xl">
                  Manage jury email accounts, auto-generated passwords, inspect all evaluation marks, modify scores, and sequence competition rounds.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsCreateJuryOpen(true)}
                  className="px-4 py-2.5 bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none transition-all flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Jury (Auto-Pass)</span>
                </button>
                <button
                  onClick={() => setIsUploadCSVOpen(true)}
                  className="px-4 py-2.5 bg-white hover:bg-gray-100 text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none transition-all flex items-center gap-2"
                >
                  <Upload className="w-4 h-4 stroke-[2.5]" />
                  <span>Import CSV Participants</span>
                </button>
              </div>
            </div>

            {/* Leaderboard Public Visibility Switch Card */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] p-5 m-[10pt]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-black text-xl uppercase tracking-tight text-black flex items-center gap-2">
                      <Eye className="w-5 h-5 stroke-[2.5]" />
                      Public Leaderboard Visibility
                    </h2>
                    <span className={`px-2.5 py-0.5 text-[11px] font-black uppercase border-[2px] border-black ${
                      leaderboardVisible ? 'bg-[#00F5A0] text-black' : 'bg-rose-400 text-black'
                    }`}>
                      {leaderboardVisible ? '● Active & Public' : '✕ Turned Off / Hidden'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-700 max-w-xl">
                    {leaderboardVisible
                      ? 'The Leaderboard is currently visible to everyone publicly. Participants, mentors, and audience can view live rankings.'
                      : 'The Leaderboard is turned OFF. Standings and marks are hidden from public view and evaluators until you turn it back on.'}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={handleToggleLeaderboardVisibility}
                    className={`flex items-center gap-2 px-5 py-3 text-xs font-black uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] transition-all ${
                      leaderboardVisible
                        ? 'bg-rose-300 hover:bg-rose-400 text-black'
                        : 'bg-[#00F5A0] hover:bg-emerald-400 text-black'
                    }`}
                  >
                    {leaderboardVisible ? (
                      <>
                        <EyeOff className="w-4 h-4 stroke-[2.5]" />
                        <span>Turn Off Leaderboard</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 stroke-[2.5]" />
                        <span>Turn On Leaderboard</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Two Evaluation Rounds Lifecycle */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] p-5 m-[10pt]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-[2px] border-black">
                <div>
                  <h2 className="font-black text-xl uppercase tracking-tight text-black flex items-center gap-2">
                    <Layers className="w-5 h-5 stroke-[2.5]" />
                    Two Evaluation Rounds Lifecycle
                  </h2>
                  <p className="text-xs font-bold text-gray-700">
                    Switch active rounds or lock Round 1 to start Round 2 marks collection.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleSwitchActiveRound(1)}
                    className={`px-3 py-1.5 text-xs font-black uppercase border-[2px] border-black ${
                      currentActiveRound === 1
                        ? 'bg-[#FFE600] shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    Activate Round 1
                  </button>
                  <button
                    onClick={() => handleSwitchActiveRound(2)}
                    className={`px-3 py-1.5 text-xs font-black uppercase border-[2px] border-black ${
                      currentActiveRound === 2
                        ? 'bg-[#00F0FF] shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    Activate Round 2
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-[10pt] mt-4">
                <div className="p-4 bg-[#FFFDF0] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-600 block">Evaluation Round 1</span>
                    <span className="text-base font-black uppercase text-black">
                      {round1Locked ? 'Locked for Evaluators' : 'Live for Scoring'}
                    </span>
                    <p className="text-[11px] font-mono font-bold text-gray-600 mt-1">
                      {evaluations.filter((e) => e.round === 1).length} submissions logged
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 text-xs font-black uppercase border-[2px] border-black ${
                    round1Locked ? 'bg-rose-300' : 'bg-[#00F5A0]'
                  }`}>
                    {round1Locked ? 'Locked' : 'Active'}
                  </span>
                </div>

                <div className="p-4 bg-[#FFFDF0] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-600 block">Evaluation Round 2</span>
                    <span className="text-base font-black uppercase text-black">
                      {round2Started ? 'Live & In Progress' : 'Not Started'}
                    </span>
                    <p className="text-[11px] font-mono font-bold text-gray-600 mt-1">
                      {evaluations.filter((e) => e.round === 2).length} submissions logged
                    </p>
                  </div>
                  {!round2Started ? (
                    <button
                      onClick={handleStartRound2}
                      className="px-3.5 py-2 bg-[#00F5A0] hover:bg-emerald-400 text-black font-black text-xs uppercase border-[2px] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none"
                    >
                      Start Round 2
                    </button>
                  ) : (
                    <span className="px-2.5 py-1 text-xs font-black uppercase border-[2px] border-black bg-[#00F0FF]">
                      Live
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Juries Table */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] m-[10pt] overflow-hidden">
              <div className="p-4 border-b-[2px] border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FFE600]">
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight text-black flex items-center gap-2">
                    <Users className="w-5 h-5 stroke-[2.5]" />
                    Jury Members & Auto-Generated Credentials ({juries.length} Juries)
                  </h2>
                  <p className="text-xs font-bold text-black">
                    Super Admin can create juries with email. Passwords are auto-generated and cannot be altered by juries.
                  </p>
                </div>
                <button
                  onClick={() => setIsCreateJuryOpen(true)}
                  className="px-3 py-1.5 bg-black text-white hover:bg-gray-800 text-xs font-black uppercase tracking-wider border border-black shadow-[2px_2px_0px_0px_#FFF]"
                >
                  + Add Jury
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-black text-white font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Panel Name</th>
                      <th className="py-3 px-4">Evaluator Email</th>
                      <th className="py-3 px-4">Auto-Generated Password</th>
                      <th className="py-3 px-4 text-center">Marks Given</th>
                      <th className="py-3 px-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black font-bold">
                    {juries.map((jury) => {
                      const marksCount = evaluations.filter((e) => (e.juryId === jury.id || e.jury_id === jury.id)).length;
                      const pwd = jury.password || (jury as any).password_plain || 'Jury#Default';
                      return (
                        <tr key={jury.id} className="hover:bg-yellow-50">
                          <td className="py-3 px-4 text-black uppercase font-black">{jury.name}</td>
                          <td className="py-3 px-4 font-mono">{jury.email}</td>
                          <td className="py-3 px-4 font-mono">
                            <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-[#FFFDF0] border-[1.5px] border-black shadow-[1px_1px_0px_0px_#000]">
                              <span className="font-black text-black">{pwd}</span>
                              <button
                                onClick={() => copyToClipboard(`Email: ${jury.email}\nPassword: ${pwd}`, 'Credentials')}
                                title="Copy email & auto password"
                                className="text-black hover:text-indigo-600"
                              >
                                <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2 py-0.5 bg-black text-white font-mono font-bold text-xs">
                              {marksCount}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleDeleteJury(jury.id)}
                              className="p-1.5 bg-rose-400 hover:bg-rose-500 border border-black shadow-[1px_1px_0px_0px_#000]"
                              title="Delete Jury"
                            >
                              <Trash2 className="w-4 h-4 stroke-[2.5] text-black" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* All Marks Table (Super Admin Override Console) */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] m-[10pt] overflow-hidden">
              <div className="p-4 border-b-[2px] border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#00F0FF]">
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight text-black flex items-center gap-2">
                    <Award className="w-5 h-5 stroke-[2.5]" />
                    All Marks Given by Each Jury (Super Admin Override Console)
                  </h2>
                  <p className="text-xs font-bold text-black">
                    Super Admin can modify marks or delete marks so juries can re-evaluate freshly.
                  </p>
                </div>
                <div className="text-xs font-black uppercase">
                  Logged: <span className="bg-black text-white px-2 py-0.5">{evaluations.length} Marks</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-black text-white font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Team</th>
                      <th className="py-3 px-4">Jury Member</th>
                      <th className="py-3 px-4 text-center">Round</th>
                      <th className="py-3 px-4 text-center">Breakdown (Inn / Tech / Feas / Pres)</th>
                      <th className="py-3 px-4 text-center">Total Score</th>
                      <th className="py-3 px-4">Remarks</th>
                      <th className="py-3 px-4 text-right">Admin Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black font-bold">
                    {evaluations.length > 0 ? (
                      evaluations.map((ev) => {
                        const targetTeam = teams.find((t) => t.id === ev.teamId || t.id === ev.team_id);
                        const inn = ev.criteria?.innovation ?? ev.innovation ?? 0;
                        const tch = ev.criteria?.tech ?? ev.tech ?? 0;
                        const fea = ev.criteria?.feasibility ?? ev.feasibility ?? 0;
                        const pre = ev.criteria?.presentation ?? ev.presentation ?? 0;

                        return (
                          <tr key={ev.id} className="hover:bg-cyan-50">
                            <td className="py-3 px-4 font-black uppercase text-black">
                              {targetTeam ? targetTeam.name : 'Unknown Team'}
                            </td>
                            <td className="py-3 px-4 font-mono text-gray-700">{ev.juryEmail || ev.jury_email}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-0.5 bg-black text-[#FFE600] font-black text-xs uppercase">
                                R{ev.round}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-mono">
                              {inn} / {tch} / {fea} / {pre}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className="px-2 py-1 bg-[#00F5A0] border border-black font-black font-mono text-sm">
                                {ev.total}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-gray-700 max-w-xs truncate font-medium" title={ev.remarks}>
                              {ev.remarks}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  onClick={() => handleOpenEditMark(ev)}
                                  title="Edit Marks"
                                  className="p-1.5 bg-[#FFE600] hover:bg-yellow-300 border border-black shadow-[1px_1px_0px_0px_#000]"
                                >
                                  <Edit3 className="w-3.5 h-3.5 stroke-[2.5] text-black" />
                                </button>
                                <button
                                  onClick={() => handleDeleteEvaluationMark(ev.id)}
                                  title="Delete Mark (Allows Jury Fresh Re-Score)"
                                  className="p-1.5 bg-rose-400 hover:bg-rose-500 border border-black shadow-[1px_1px_0px_0px_#000]"
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[2.5] text-black" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-xs font-black uppercase text-gray-500">
                          No marks have been recorded yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Participants & Teams Directory */}
            <div className="bg-white border-[3px] border-black shadow-[5px_5px_0px_0px_#000] m-[10pt] overflow-hidden">
              <div className="p-4 border-b-[2px] border-black flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FF66C4]">
                <div>
                  <h2 className="font-black text-lg uppercase tracking-tight text-black flex items-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 stroke-[2.5]" />
                    Participants & Teams Directory ({teams.length} Teams)
                  </h2>
                  <p className="text-xs font-bold text-black">
                    Registered through CSV upload or administrative registration.
                  </p>
                </div>
                <button
                  onClick={() => setIsUploadCSVOpen(true)}
                  className="px-3 py-1.5 bg-white text-black hover:bg-gray-100 text-xs font-black uppercase border border-black shadow-[2px_2px_0px_0px_#000]"
                >
                  Upload CSV
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-black text-white font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">Team Name</th>
                      <th className="py-3 px-4">Members</th>
                      <th className="py-3 px-4 text-center">Round 1 Scores</th>
                      <th className="py-3 px-4 text-center">Round 2 Scores</th>
                      <th className="py-3 px-4 text-right">Delete</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y-[2px] divide-black font-bold">
                    {teams.map((tm) => {
                      const r1Count = evaluations.filter((e) => (e.teamId === tm.id || e.team_id === tm.id) && e.round === 1).length;
                      const r2Count = evaluations.filter((e) => (e.teamId === tm.id || e.team_id === tm.id) && e.round === 2).length;
                      return (
                        <tr key={tm.id} className="hover:bg-pink-50">
                          <td className="py-3 px-4 font-black uppercase text-black">{tm.name}</td>
                          <td className="py-3 px-4 font-medium text-gray-700">{tm.members}</td>
                          <td className="py-3 px-4 text-center font-mono">{r1Count}</td>
                          <td className="py-3 px-4 text-center font-mono">{r2Count}</td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={async () => {
                                if (supabaseActive) {
                                  try {
                                    await competitionService.deleteTeam(tm.id);
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                                setTeams((prev) => prev.filter((t) => t.id !== tm.id));
                                setEvaluations((prev) => prev.filter((e) => (e.teamId !== tm.id && e.team_id !== tm.id)));
                                showToast(`Removed ${tm.name}`, 'info');
                              }}
                              className="p-1.5 bg-rose-400 hover:bg-rose-500 border border-black shadow-[1px_1px_0px_0px_#000]"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.5] text-black" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t-[3px] border-black bg-white mt-12 py-6 m-[10pt]">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs font-black uppercase tracking-wider text-black">
            EvalPro &bull; Neo-Brutalist Scoring Engine &bull; Default 10pt Margins
          </div>

          <div>
            <button
              onClick={() => {
                setLoginError('');
                setIsAdminLoginOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none transition-all"
            >
              <Shield className="w-4 h-4 stroke-[2.5]" />
              <span>Super Admin Login</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL 1: JURY LOGIN */}
      {isJuryLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00F0FF] border-[2px] border-black flex items-center justify-center">
                  <KeyRound className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Jury Login</h3>
                  <p className="text-[10px] font-bold text-gray-600">Enter your auto-generated credentials</p>
                </div>
              </div>
              <button onClick={() => setIsJuryLoginOpen(false)} className="p-1 hover:bg-gray-100">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {loginError && (
              <div className="mt-4 p-3 bg-rose-200 border-[2px] border-black font-black text-xs uppercase">
                {loginError}
              </div>
            )}

            <form onSubmit={handleJuryLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Jury Email</label>
                <input
                  type="email"
                  required
                  placeholder="jury1@evalpro.org"
                  value={juryLoginForm.email}
                  onChange={(e) => setJuryLoginForm({ ...juryLoginForm, email: e.target.value })}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-bold font-mono focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Auto-Generated Password</label>
                <input
                  type="password"
                  required
                  placeholder="Password provided by Super Admin"
                  value={juryLoginForm.password}
                  onChange={(e) => setJuryLoginForm({ ...juryLoginForm, password: e.target.value })}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-bold font-mono focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                />
                <p className="text-[10px] font-bold text-gray-500 mt-1">
                  * Passwords cannot be altered by jury members once generated.
                </p>
              </div>

              {/* Demo Fill Shortcuts if juries exist */}
              {juries.length > 0 && (
                <div className="p-3 bg-yellow-50 border-[2px] border-black text-xs">
                  <span className="font-black uppercase block mb-1">Test Quick-Fill:</span>
                  <div className="flex gap-2 flex-wrap">
                    {juries.slice(0, 3).map((j, i) => (
                      <button
                        key={j.id}
                        type="button"
                        onClick={() =>
                          setJuryLoginForm({
                            email: j.email,
                            password: j.password || (j as any).password_plain || ''
                          })
                        }
                        className="px-2 py-1 bg-white border border-black font-mono text-[10px] hover:bg-gray-100"
                      >
                        Jury {i + 1} Demo
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-[#00F5A0] hover:bg-[#00E090] text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none"
              >
                Enter Scoring Console
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: SUPER ADMIN LOGIN */}
      {isAdminLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FF66C4] border-[2px] border-black flex items-center justify-center">
                  <Shield className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Super Admin Login</h3>
                  <p className="text-[10px] font-bold text-gray-600">Full system override authority</p>
                </div>
              </div>
              <button onClick={() => setIsAdminLoginOpen(false)} className="p-1 hover:bg-gray-100">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {loginError && (
              <div className="mt-4 p-3 bg-rose-200 border-[2px] border-black font-black text-xs uppercase">
                {loginError}
              </div>
            )}

            <form onSubmit={handleAdminLoginSubmit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase mb-1">Super Admin Email</label>
                <input
                  type="email"
                  required
                  value={adminLoginForm.email}
                  onChange={(e) => setAdminLoginForm({ ...adminLoginForm, email: e.target.value })}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-bold font-mono focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Master Password</label>
                <input
                  type="password"
                  required
                  value={adminLoginForm.password}
                  onChange={(e) => setAdminLoginForm({ ...adminLoginForm, password: e.target.value })}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-bold font-mono focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div className="p-3 bg-gray-100 border-[2px] border-black text-xs font-mono">
                Master Credentials: <strong className="text-black">admin@evalpro.org</strong> / <strong className="text-black">superadmin123</strong>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#FFE600] hover:bg-yellow-300 text-black font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none"
              >
                Authorize Super Admin Access
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SCORE SUBMISSION MODAL */}
      {isScoreModalOpen && selectedTeamForScoring && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 my-8 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FFE600] border border-black">
                  Evaluation Round {currentActiveRound}
                </span>
                <h3 className="font-black text-xl uppercase tracking-tight mt-1">
                  Scoring: {selectedTeamForScoring.name}
                </h3>
                <p className="text-xs font-medium text-gray-700">Members: {selectedTeamForScoring.members}</p>
              </div>
              <button onClick={() => setIsScoreModalOpen(false)} className="p-1 hover:bg-gray-100">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleScoreSubmit} className="mt-4 space-y-4">
              <div className="space-y-3">
                <div className="p-3 bg-[#FFFDF0] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>1. Innovation & Originality</span>
                    <span className="font-mono bg-white px-2 py-0.5 border border-black">{scoringCriteria.innovation} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={scoringCriteria.innovation}
                    onChange={(e) => setScoringCriteria({ ...scoringCriteria, innovation: Number(e.target.value) })}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#FFFDF0] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>2. Technical Depth & Architecture</span>
                    <span className="font-mono bg-white px-2 py-0.5 border border-black">{scoringCriteria.tech} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={scoringCriteria.tech}
                    onChange={(e) => setScoringCriteria({ ...scoringCriteria, tech: Number(e.target.value) })}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#FFFDF0] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>3. Feasibility & Market Viability</span>
                    <span className="font-mono bg-white px-2 py-0.5 border border-black">{scoringCriteria.feasibility} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={scoringCriteria.feasibility}
                    onChange={(e) => setScoringCriteria({ ...scoringCriteria, feasibility: Number(e.target.value) })}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>

                <div className="p-3 bg-[#FFFDF0] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                  <div className="flex justify-between text-xs font-black uppercase mb-1">
                    <span>4. Presentation & Defense</span>
                    <span className="font-mono bg-white px-2 py-0.5 border border-black">{scoringCriteria.presentation} / 25</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="25"
                    value={scoringCriteria.presentation}
                    onChange={(e) => setScoringCriteria({ ...scoringCriteria, presentation: Number(e.target.value) })}
                    className="w-full accent-black cursor-pointer"
                  />
                </div>
              </div>

              {/* Total Summary */}
              <div className="p-3 bg-[#00F5A0] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-between font-black">
                <span className="uppercase text-xs">Total Calculated Score:</span>
                <span className="text-xl font-mono">
                  {Number(scoringCriteria.innovation) +
                    Number(scoringCriteria.tech) +
                    Number(scoringCriteria.feasibility) +
                    Number(scoringCriteria.presentation)}{' '}
                  <span className="text-xs">/ 100</span>
                </span>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Evaluator Feedback</label>
                <textarea
                  rows={2}
                  placeholder="Key observations and constructive critique..."
                  value={scoringRemarks}
                  onChange={(e) => setScoringRemarks(e.target.value)}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black p-2.5 text-xs font-bold text-black focus:outline-none focus:bg-white shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsScoreModalOpen(false)}
                  className="px-4 py-2 border-[2px] border-black font-black text-xs uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FFE600] hover:bg-yellow-300 border-[2.5px] border-black font-black text-xs uppercase shadow-[3px_3px_0px_0px_#000] active:shadow-none"
                >
                  Confirm & Submit Marks
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CREATE JURY */}
      {isCreateJuryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FFE600] border-[2px] border-black flex items-center justify-center">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Create Jury Member</h3>
                  <p className="text-[10px] font-bold text-gray-600">Password is auto-generated immediately</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsCreateJuryOpen(false);
                  setGeneratedJuryCreds(null);
                }}
                className="p-1 hover:bg-gray-100"
              >
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            {generatedJuryCreds ? (
              <div className="mt-4 space-y-4">
                <div className="p-3 bg-[#00F5A0] border-[2px] border-black font-black text-xs uppercase flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                  <span>Jury Evaluator Account Created!</span>
                </div>

                <div className="p-4 bg-[#FFFDF0] border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] space-y-2">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-600 block">Jury Email:</span>
                    <span className="font-mono text-sm font-black">{generatedJuryCreds.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-600 block">Auto-Generated Password:</span>
                    <span className="font-mono text-base font-black bg-white px-2 py-0.5 border border-black inline-block text-indigo-700">
                      {generatedJuryCreds.password || (generatedJuryCreds as any).password_plain}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      copyToClipboard(
                        `Jury Portal Login:\nEmail: ${generatedJuryCreds.email}\nPassword: ${generatedJuryCreds.password || (generatedJuryCreds as any).password_plain}`,
                        'Credentials'
                      )
                    }
                    className="flex-1 py-2.5 bg-black text-white font-black text-xs uppercase flex items-center justify-center gap-2 border border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    <Copy className="w-4 h-4 stroke-[2.5]" />
                    <span>Copy Credentials</span>
                  </button>
                  <button
                    onClick={() => setGeneratedJuryCreds(null)}
                    className="px-4 py-2.5 bg-[#FFE600] font-black text-xs uppercase border border-black shadow-[2px_2px_0px_0px_#000]"
                  >
                    + Create Another
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleCreateJury} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1">Jury Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="evaluator@university.org"
                    value={newJuryEmail}
                    onChange={(e) => setNewJuryEmail(e.target.value)}
                    className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-mono font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black uppercase mb-1">Jury Panel Name (Optional)</label>
                  <input
                    type="text"
                    placeholder={`Jury Panel #${juries.length + 1}`}
                    value={newJuryName}
                    onChange={(e) => setNewJuryName(e.target.value)}
                    className="w-full bg-[#FFFDF0] border-[2px] border-black px-3 py-2 text-xs font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                  />
                </div>

                <div className="p-3 bg-[#FFFDF0] border-[1.5px] border-black text-[11px] font-bold text-gray-700">
                  ⚡ When you click Create Jury, a secure password is generated instantly. Juries cannot alter their password.
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-[#FFE600] hover:bg-yellow-300 font-black text-xs uppercase tracking-wider border-[2.5px] border-black shadow-[3px_3px_0px_0px_#000] active:shadow-none"
                >
                  Create Jury & Auto-Generate Password
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* MODAL 5: UPLOAD CSV */}
      {isUploadCSVOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#00F0FF] border-[2px] border-black flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Upload Participants CSV</h3>
                  <p className="text-[10px] font-bold text-gray-600">CSV format: Team Name, Team Members</p>
                </div>
              </div>
              <button onClick={() => setIsUploadCSVOpen(false)} className="p-1 hover:bg-gray-100">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <input
                type="file"
                ref={fileInputRef}
                accept=".csv,.txt"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-[2.5px] border-dashed border-black bg-[#FFFDF0] hover:bg-yellow-50 p-6 text-center cursor-pointer shadow-[3px_3px_0px_0px_#000] transition-all"
              >
                <Upload className="w-8 h-8 text-black mx-auto mb-2 stroke-[2.5]" />
                <p className="text-xs font-black uppercase">Click to select CSV File</p>
                <p className="text-[10px] font-bold text-gray-600 mt-1">Accepts UTF-8 .csv or comma-delimited text</p>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Or Paste CSV Plaintext:</label>
                <textarea
                  rows={4}
                  placeholder={'Team Name,Team Members\nHyperDrive,"Alex Ray, Bob King"\nRoboTech,"Sara Ali, Dan Lee"'}
                  value={csvUploadText}
                  onChange={(e) => setCsvUploadText(e.target.value)}
                  className="w-full bg-[#FFFDF0] border-[2px] border-black p-2.5 text-xs font-mono font-bold focus:bg-white focus:outline-none shadow-[2px_2px_0px_0px_#000]"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadCSVOpen(false)}
                  className="px-4 py-2 border-[2px] border-black font-black text-xs uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  onClick={() => parseAndAddTeams(csvUploadText)}
                  disabled={!csvUploadText.trim()}
                  className="px-5 py-2 bg-[#FFE600] hover:bg-yellow-300 disabled:opacity-50 border-[2px] border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                  Import Teams
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: ADMIN EDIT MARK OVERRIDE */}
      {isEditMarkModalOpen && selectedEvaluationToEdit && selectedEvaluationToEdit.criteria && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md bg-white border-[3px] border-black shadow-[8px_8px_0px_0px_#000] p-6 m-[10pt]">
            <div className="flex items-center justify-between pb-3 border-b-[2px] border-black">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[#FF66C4] border-[2px] border-black flex items-center justify-center">
                  <Edit3 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-lg uppercase tracking-tight">Admin Score Override</h3>
                  <p className="text-[10px] font-bold text-gray-600">Modify jury marks manually</p>
                </div>
              </div>
              <button onClick={() => setIsEditMarkModalOpen(false)} className="p-1 hover:bg-gray-100">
                <X className="w-5 h-5 stroke-[2.5]" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedMark} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase">
                <div>
                  <label className="block mb-1">Innovation (0-25)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={selectedEvaluationToEdit.criteria.innovation}
                    onChange={(e) =>
                      setSelectedEvaluationToEdit({
                        ...selectedEvaluationToEdit,
                        criteria: {
                          ...selectedEvaluationToEdit.criteria!,
                          innovation: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full bg-[#FFFDF0] border-[2px] border-black p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1">Tech (0-25)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={selectedEvaluationToEdit.criteria.tech}
                    onChange={(e) =>
                      setSelectedEvaluationToEdit({
                        ...selectedEvaluationToEdit,
                        criteria: {
                          ...selectedEvaluationToEdit.criteria!,
                          tech: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full bg-[#FFFDF0] border-[2px] border-black p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1">Feasibility (0-25)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={selectedEvaluationToEdit.criteria.feasibility}
                    onChange={(e) =>
                      setSelectedEvaluationToEdit({
                        ...selectedEvaluationToEdit,
                        criteria: {
                          ...selectedEvaluationToEdit.criteria!,
                          feasibility: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full bg-[#FFFDF0] border-[2px] border-black p-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block mb-1">Presentation (0-25)</label>
                  <input
                    type="number"
                    min="0"
                    max="25"
                    value={selectedEvaluationToEdit.criteria.presentation}
                    onChange={(e) =>
                      setSelectedEvaluationToEdit({
                        ...selectedEvaluationToEdit,
                        criteria: {
                          ...selectedEvaluationToEdit.criteria!,
                          presentation: Number(e.target.value)
                        }
                      })
                    }
                    className="w-full bg-[#FFFDF0] border-[2px] border-black p-2 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={selectedEvaluationToEdit.remarks || ''}
                  onChange={(e) =>
                    setSelectedEvaluationToEdit({
                      ...selectedEvaluationToEdit,
                      remarks: e.target.value
                    })
                  }
                  className="w-full bg-[#FFFDF0] border-[2px] border-black p-2 text-xs font-bold"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditMarkModalOpen(false)}
                  className="px-4 py-2 border-[2px] border-black font-black text-xs uppercase hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FFE600] hover:bg-yellow-300 border-[2.5px] border-black font-black text-xs uppercase shadow-[2px_2px_0px_0px_#000]"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
