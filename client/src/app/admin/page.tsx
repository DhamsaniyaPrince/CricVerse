'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Radio,
  Award,
  Users,
  Compass,
  ArrowRight,
  ArrowLeft,
  PlusCircle,
  Trash2,
  ListRestart
} from 'lucide-react';

interface Player {
  _id: string;
  name: string;
  role: string;
  battingStyle?: string;
  bowlingStyle?: string;
}

interface ScoreDetail {
  runs: number;
  wickets: number;
  overs: number;
}

interface BatsmanScorecard {
  player: { _id: string; name: string; role: string };
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  howOut: string;
  bowler?: { _id: string; name: string };
}

interface BowlerScorecard {
  player: { _id: string; name: string; role: string };
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
}

interface Innings {
  battingTeam: { _id: string; name: string; logo?: string };
  bowlingTeam: { _id: string; name: string; logo?: string };
  scorecard: {
    batsmen: BatsmanScorecard[];
    bowlers: BowlerScorecard[];
  };
}

interface Match {
  _id: string;
  title: string;
  teamA: { _id: string; name: string; logo?: string; players: Player[] };
  teamB: { _id: string; name: string; logo?: string; players: Player[] };
  status: 'Upcoming' | 'Live' | 'Completed';
  oversCount: number;
  tournament?: string | { _id: string; name?: string };
  playingXIA?: Player[];
  playingXIB?: Player[];
  toss?: { wonBy: string | { _id: string; name: string }; decision: 'Batting' | 'Bowling' };
  score: {
    teamA: ScoreDetail;
    teamB: ScoreDetail;
  };
  innings: Innings[];
  liveState?: {
    battingTeam: { _id: string; name: string; logo?: string };
    bowlingTeam: { _id: string; name: string; logo?: string };
    striker?: { _id: string; name: string; role: string; battingStyle: string };
    nonStriker?: { _id: string; name: string; role: string; battingStyle: string };
    currentBowler?: { _id: string; name: string; role: string; bowlingStyle: string };
    currentOverRuns: { run: number; isExtra: boolean; extraType?: string; isWicket: boolean }[];
  };
  commentary: any[];
  wagonWheel: any[];
  result?: { winner?: { _id: string; name: string }; margin?: string };
  target?: number;
  playerOfMatch?: any;
}

const getBallsBowled = (overs: number) => {
  const oversInt = Math.floor(overs);
  const balls = Math.round((overs - oversInt) * 10);
  return (oversInt * 6) + balls;
};

export default function AdminScoringPage() {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Local Scoring States
  const [wagonPoint, setWagonPoint] = useState<{ angle: number; distance: number } | null>(null);

  // Modals / Selection overlays
  const [showWicketModal, setShowWicketModal] = useState(false);
  const [wicketType, setWicketType] = useState('bowled');
  const [fielderId, setFielderId] = useState('');
  const [batsmanOutId, setBatsmanOutId] = useState('');
  const [incomingBatsmanId, setIncomingBatsmanId] = useState('');
  const [wicketCompletedRuns, setWicketCompletedRuns] = useState(0);

  // Extra Runs Popup (Bye / Leg Bye)
  const [showRunsSelection, setShowRunsSelection] = useState(false);
  const [extraTypeForSelection, setExtraTypeForSelection] = useState<'bye' | 'leg-bye' | null>(null);

  // New Calculator Modal States
  const [showWideModal, setShowWideModal] = useState(false);
  const [showNoBallModal, setShowNoBallModal] = useState(false);
  const [showByeModal, setShowByeModal] = useState(false);
  const [showLegByeModal, setShowLegByeModal] = useState(false);
  const [showRunOutModal, setShowRunOutModal] = useState(false);
  const [runOutCompletedRuns, setRunOutCompletedRuns] = useState(0);
  const [runOutDismissedPlayerId, setRunOutDismissedPlayerId] = useState('');
  const [runOutIncomingBatsmanId, setRunOutIncomingBatsmanId] = useState('');
  const [showChangeBowlerModal, setShowChangeBowlerModal] = useState(false);
  const [manualBowlerId, setManualBowlerId] = useState('');

  // New Bowler Overlay (Over completed)
  const [showNewBowlerPrompt, setShowNewBowlerPrompt] = useState(false);
  const [newBowlerId, setNewBowlerId] = useState('');

  // POM / Scorecard States
  const [activeScorecardTab, setActiveScorecardTab] = useState(0);
  const [selectedPomId, setSelectedPomId] = useState('');

  // Setup Form / Wizard state
  const [showSetupForm, setShowSetupForm] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [tournamentsList, setTournamentsList] = useState<any[]>([]);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>('');
  const [registeredTeams, setRegisteredTeams] = useState<any[]>([]);
  const [teamAId, setTeamAId] = useState<string>('');
  const [teamBId, setTeamBId] = useState<string>('');
  const [isCreatingNewMatch, setIsCreatingNewMatch] = useState<boolean>(true);
  const [selectedScheduledMatchId, setSelectedScheduledMatchId] = useState<string>('');
  const [newMatchOvers, setNewMatchOvers] = useState<number>(20);

  const [playingXI_A, setPlayingXI_A] = useState<string[]>([]);
  const [playingXI_B, setPlayingXI_B] = useState<string[]>([]);
  const [tossWinnerId, setTossWinnerId] = useState<string>('');
  const [tossDecision, setTossDecision] = useState<'Batting' | 'Bowling'>('Batting');
  const [strikerId, setStrikerId] = useState<string>('');
  const [nonStrikerId, setNonStrikerId] = useState<string>('');
  const [bowlerId, setBowlerId] = useState<string>('');

  const fetchLiveMatches = async (autoSelectId?: string) => {
    setIsLoading(true);
    try {
      const response = await api.get('/matches');
      if (response.data.success) {
        // Filter Live & Upcoming matches to score
        const list: Match[] = response.data.data.filter((m: Match) => m.status !== 'Completed');
        
        let toSelect = autoSelectId ? list.find((m: Match) => m._id === autoSelectId) : null;
        if (!toSelect && autoSelectId) {
          // Fetch the match directly from API if not found in list
          try {
            const singleRes = await api.get(`/matches/${autoSelectId}`);
            if (singleRes.data.success) {
              const directMatch = singleRes.data.data;
              list.push(directMatch);
              toSelect = directMatch;
            }
          } catch (e) {
            console.error('Could not load specific match', e);
          }
        }

        setMatches(list);
        if (toSelect) {
          handleSelectMatch(toSelect);
        } else if (list.length > 0) {
          handleSelectMatch(list[0]);
        }
      }
    } catch (err: any) {
      console.error(err);
      setError('Could not connect to backend server');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTournaments = async () => {
    try {
      const response = await api.get('/tournaments');
      if (response.data.success) {
        setTournamentsList(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching tournaments:', err);
    }
  };

  useEffect(() => {
    // Read matchId from query params if available
    const queryParams = new URLSearchParams(window.location.search);
    const matchIdParam = queryParams.get('matchId');
    if (matchIdParam) {
      fetchLiveMatches(matchIdParam);
    } else {
      fetchLiveMatches();
    }
    fetchTournaments();
  }, []);

  // Sync squads and Playing XI when selectedMatch shifts
  useEffect(() => {
    if (selectedMatch) {
      if (selectedMatch.teamA?.players) {
        const teamAPlayerIds = selectedMatch.teamA.players.map((p: any) => p._id || p);
        setPlayingXI_A(teamAPlayerIds.slice(0, 11));
      }
      if (selectedMatch.teamB?.players) {
        const teamBPlayerIds = selectedMatch.teamB.players.map((p: any) => p._id || p);
        setPlayingXI_B(teamBPlayerIds.slice(0, 11));
      }
      
      setTeamAId(selectedMatch.teamA._id);
      setTeamBId(selectedMatch.teamB._id);
      
      if (selectedMatch.playerOfMatch) {
        const pomVal = selectedMatch.playerOfMatch;
        setSelectedPomId(typeof pomVal === 'object' && pomVal ? pomVal._id : pomVal);
      } else {
        setSelectedPomId('');
      }

      if (selectedMatch.toss?.wonBy) {
        const wonByVal = selectedMatch.toss.wonBy;
        const wonById = typeof wonByVal === 'object' && wonByVal ? wonByVal._id : wonByVal;
        setTossWinnerId(wonById);
        setTossDecision(selectedMatch.toss.decision);
      } else {
        setTossWinnerId(selectedMatch.teamA._id);
        setTossDecision('Batting');
      }
    }
  }, [selectedMatch]);

  const handleSelectMatch = async (match: Match) => {
    setError(null);
    try {
      const response = await api.get(`/matches/${match._id}`);
      if (response.data.success) {
        const fullMatch = response.data.data;
        setSelectedMatch(fullMatch);

        // Check if Setup Form is needed
        const hasLiveState =
          fullMatch.liveState &&
          fullMatch.liveState.striker &&
          fullMatch.liveState.nonStriker &&
          fullMatch.liveState.currentBowler;

        const isFirstInningsComplete = fullMatch.target > 0 && fullMatch.innings && fullMatch.innings.length === 1;

        if (fullMatch.status === 'Ready') {
          // Sync playing XI A & B from match
          setPlayingXI_A(fullMatch.playingXIA ? fullMatch.playingXIA.map((p: any) => p._id || p) : []);
          setPlayingXI_B(fullMatch.playingXIB ? fullMatch.playingXIB.map((p: any) => p._id || p) : []);
          if (fullMatch.toss?.wonBy) {
            const wonByVal = fullMatch.toss.wonBy;
            setTossWinnerId(typeof wonByVal === 'object' && wonByVal ? wonByVal._id : wonByVal);
            setTossDecision(fullMatch.toss.decision || 'Batting');
          }
          setShowSetupForm(true);
          setWizardStep(5); // Skip directly to striker/non-striker/bowler selection!
        } else if (isFirstInningsComplete) {
          setShowSetupForm(true);
          setWizardStep(4); // Select Opening Batsmen for Innings 2!
          setStrikerId('');
          setNonStrikerId('');
          setBowlerId('');
        } else if (fullMatch.status === 'Scheduled' || fullMatch.status === 'Upcoming' || !hasLiveState) {
          setShowSetupForm(true);
          setWizardStep(2);
        } else {
          setShowSetupForm(false);
          detectOverCompletion(fullMatch);
        }
      }
    } catch (err) {
      console.error(err);
      setError('Failed to fetch full match details');
    }
  };

  const handleTogglePlayer_A = (playerId: string) => {
    if (playingXI_A.includes(playerId)) {
      setPlayingXI_A(playingXI_A.filter(id => id !== playerId));
    } else {
      if (playingXI_A.length < 11) {
        setPlayingXI_A([...playingXI_A, playerId]);
      } else {
        alert("Exactly 11 players must be selected. Uncheck a player first.");
      }
    }
  };

  const handleTogglePlayer_B = (playerId: string) => {
    if (playingXI_B.includes(playerId)) {
      setPlayingXI_B(playingXI_B.filter(id => id !== playerId));
    } else {
      if (playingXI_B.length < 11) {
        setPlayingXI_B([...playingXI_B, playerId]);
      } else {
        alert("Exactly 11 players must be selected. Uncheck a player first.");
      }
    }
  };

  const handleStartNewMatchWizard = () => {
    setSelectedMatch(null);
    setShowSetupForm(true);
    setWizardStep(1);
    setSelectedTournamentId('');
    setTeamAId('');
    setTeamBId('');
    setPlayingXI_A([]);
    setPlayingXI_B([]);
    setTossWinnerId('');
    setTossDecision('Batting');
    setStrikerId('');
    setNonStrikerId('');
    setBowlerId('');
  };

  const handleTournamentChange = (tournamentId: string) => {
    setSelectedTournamentId(tournamentId);
    setTeamAId('');
    setTeamBId('');
    setSelectedScheduledMatchId('');
    
    const tournament = tournamentsList.find(t => t._id === tournamentId);
    if (tournament) {
      setRegisteredTeams(tournament.teams || []);
    } else {
      setRegisteredTeams([]);
    }
  };

  const handleCreateMatchSubmit = async () => {
    if (!selectedTournamentId) {
      setError('Please select a tournament');
      return;
    }
    if (!teamAId || !teamBId) {
      setError('Please select both Team A and Team B');
      return;
    }
    if (teamAId === teamBId) {
      setError('Team A and Team B cannot be the same');
      return;
    }

    setSubmitting(true);
    setError(null);

    const teamAObj = registeredTeams.find(t => t._id === teamAId);
    const teamBObj = registeredTeams.find(t => t._id === teamBId);
    const title = `${teamAObj?.name || 'Team A'} vs ${teamBObj?.name || 'Team B'}`;

    try {
      const response = await api.post('/matches', {
        title,
        tournament: selectedTournamentId,
        teamA: teamAId,
        teamB: teamBId,
        oversCount: newMatchOvers,
        status: 'Upcoming'
      });

      if (response.data.success) {
        const matchData = response.data.data;
        // Fetch the full populated match
        await handleSelectMatch(matchData);
        setWizardStep(2);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectScheduledMatchSubmit = async () => {
    if (!selectedScheduledMatchId) {
      setError('Please select a scheduled match');
      return;
    }
    const match = matches.find(m => m._id === selectedScheduledMatchId);
    if (match) {
      await handleSelectMatch(match);
      setWizardStep(2);
    }
  };

  // Helper to trigger short success notification
  const triggerNotification = (text: string) => {
    setSuccessMsg(text);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // Detect if bowler needs rotation (over completed)
  const detectOverCompletion = (match: Match) => {
    if (!match.liveState) return;
    const currentRuns = match.liveState.currentOverRuns || [];
    const legalBalls = currentRuns.filter(
      r => !r.isExtra || (r.extraType !== 'wide' && r.extraType !== 'no-ball')
    ).length;

    if (legalBalls >= 6) {
      setShowNewBowlerPrompt(true);
      setNewBowlerId('');
    } else {
      setShowNewBowlerPrompt(false);
    }
  };

  const getBattingAndBowlingTeams = () => {
    if (!selectedMatch) return { battingTeamId: '', bowlingTeamId: '', battingTeamName: '', bowlingTeamName: '' };
    
    const isSecondInnings = selectedMatch.innings && selectedMatch.innings.length > 0;
    
    if (isSecondInnings) {
      const firstInnings = selectedMatch.innings[0];
      const battingId = firstInnings.bowlingTeam._id || firstInnings.bowlingTeam;
      const bowlingId = firstInnings.battingTeam._id || firstInnings.battingTeam;
      const battingName = selectedMatch.teamA._id === battingId.toString() ? selectedMatch.teamA.name : selectedMatch.teamB.name;
      const bowlingName = selectedMatch.teamA._id === bowlingId.toString() ? selectedMatch.teamA.name : selectedMatch.teamB.name;
      return {
        battingTeamId: battingId.toString(),
        bowlingTeamId: bowlingId.toString(),
        battingTeamName: battingName,
        bowlingTeamName: bowlingName
      };
    }

    const isTossWinnerTeamA = tossWinnerId === selectedMatch.teamA._id;
    const isBattingSelected = tossDecision === 'Batting';

    if ((isTossWinnerTeamA && isBattingSelected) || (!isTossWinnerTeamA && !isBattingSelected)) {
      return {
        battingTeamId: selectedMatch.teamA._id,
        bowlingTeamId: selectedMatch.teamB._id,
        battingTeamName: selectedMatch.teamA.name,
        bowlingTeamName: selectedMatch.teamB.name
      };
    } else {
      return {
        battingTeamId: selectedMatch.teamB._id,
        bowlingTeamId: selectedMatch.teamA._id,
        battingTeamName: selectedMatch.teamB.name,
        bowlingTeamName: selectedMatch.teamA.name
      };
    }
  };

  const handleWizardSetupSubmit = async () => {
    if (!selectedMatch) return;
    if (!strikerId || !nonStrikerId || !bowlerId) {
      setError('Please select striker, non-striker, and bowler');
      return;
    }
    if (strikerId === nonStrikerId) {
      setError('Striker and non-striker cannot be the same player');
      return;
    }
    if (playingXI_A.length < 2 || playingXI_B.length < 2) {
      setError('At least 2 players must be selected for both teams');
      return;
    }
    if (playingXI_A.length !== playingXI_B.length) {
      setError('Both teams must have the same number of players selected for their Playing XI');
      return;
    }

    setSubmitting(true);
    setError(null);

    const isSecondInnings = selectedMatch.innings && selectedMatch.innings.length > 0;
    const inningsNumber = isSecondInnings ? 2 : 1;
    const { battingTeamId, bowlingTeamId } = getBattingAndBowlingTeams();

    try {
      const response = await api.put(`/matches/${selectedMatch._id}/setup`, {
        battingTeamId,
        bowlingTeamId,
        strikerId,
        nonStrikerId,
        bowlerId,
        inningsNumber,
        playingXIA: playingXI_A,
        playingXIB: playingXI_B,
        toss: {
          wonBy: tossWinnerId,
          decision: tossDecision
        }
      });

      if (response.data.success) {
        triggerNotification(`Innings ${inningsNumber} successfully started!`);
        setShowSetupForm(false);
        await handleSelectMatch(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to setup innings');
    } finally {
      setSubmitting(false);
    }
  };

  // Record a standard run button click
  const handleRecordRuns = async (runValue: number) => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      runs: runValue,
      isExtra: false,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Could not record ball');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Wide or No Ball (1 extra run penalty, no legal ball)
  const handleRecordExtraPenalty = async (type: 'wide' | 'no-ball') => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);

    const payload = {
      runs: 0,
      isExtra: true,
      extraType: type,
      extraRuns: 1, // 1 run penalty
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record extra');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Bye / Leg Bye (Runs off extras, legal ball)
  const handleExtraRunsSubmit = async (runValue: number) => {
    if (!selectedMatch || !selectedMatch.liveState || !extraTypeForSelection) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);
    setShowRunsSelection(false);

    const payload = {
      runs: 0,
      isExtra: true,
      extraType: extraTypeForSelection,
      extraRuns: runValue,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        setExtraTypeForSelection(null);
        await handleSelectMatch(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record bye/leg bye');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Wicket dismissal
  const handleWicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    if (!batsmanOutId) {
      alert('Please select the batsman who was dismissed');
      return;
    }

    if (wicketType !== 'retired-hurt' && !incomingBatsmanId) {
      alert('Please select the incoming batsman');
      return;
    }

    setSubmitting(true);
    setError(null);
    setShowWicketModal(false);

    const payload = {
      runs: 0,
      isExtra: false,
      isWicket: true,
      wicketType,
      batsmanOutId,
      fielderId: ['caught', 'stumped'].includes(wicketType) ? (fielderId || null) : null,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      incomingBatsmanId: wicketType !== 'retired-hurt' ? incomingBatsmanId : null,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        setIncomingBatsmanId('');
        setFielderId('');
        await handleSelectMatch(response.data.data);
        triggerNotification('Wicket recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record wicket');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Wide with additional runs
  const handleWideSubmit = async (additionalRuns: number) => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);
    setShowWideModal(false);

    const payload = {
      runs: 0,
      isExtra: true,
      extraType: 'wide',
      extraRuns: 1 + additionalRuns,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
        triggerNotification('Wide recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record wide');
    } finally {
      setSubmitting(false);
    }
  };

  // Record No Ball with runs off bat
  const handleNoBallSubmit = async (runsOffBat: number) => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);
    setShowNoBallModal(false);

    const payload = {
      runs: runsOffBat,
      isExtra: true,
      extraType: 'no-ball',
      extraRuns: 1,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
        triggerNotification('No Ball recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record no ball');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Bye with runs
  const handleByeSubmit = async (byeRunsVal: number) => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);
    setShowByeModal(false);

    const payload = {
      runs: 0,
      isExtra: true,
      extraType: 'bye',
      extraRuns: byeRunsVal,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
        triggerNotification('Byes recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record byes');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Leg Bye with runs
  const handleLegByeSubmit = async (lbRunsVal: number) => {
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    setSubmitting(true);
    setError(null);
    setShowLegByeModal(false);

    const payload = {
      runs: 0,
      isExtra: true,
      extraType: 'leg-bye',
      extraRuns: lbRunsVal,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        await handleSelectMatch(response.data.data);
        triggerNotification('Leg Byes recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Could not record leg byes');
    } finally {
      setSubmitting(false);
    }
  };

  // Record Run Out
  const handleRunOutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedMatch.liveState) return;
    const { striker, nonStriker, currentBowler } = selectedMatch.liveState;
    if (!striker || !nonStriker || !currentBowler) return;

    if (!runOutDismissedPlayerId) {
      alert('Please select the player who was run out');
      return;
    }

    if (!runOutIncomingBatsmanId) {
      alert('Please select the incoming batsman');
      return;
    }

    setSubmitting(true);
    setError(null);
    setShowRunOutModal(false);

    const payload = {
      runs: runOutCompletedRuns,
      isExtra: false,
      isWicket: true,
      wicketType: 'run-out',
      batsmanOutId: runOutDismissedPlayerId,
      fielderId: fielderId || null,
      strikerId: striker._id,
      nonStrikerId: nonStriker._id,
      bowlerId: currentBowler._id,
      incomingBatsmanId: runOutIncomingBatsmanId,
      wagonWheel: wagonPoint
    };

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/ball`, payload);
      if (response.data.success) {
        setWagonPoint(null);
        setRunOutIncomingBatsmanId('');
        setFielderId('');
        setRunOutCompletedRuns(0);
        setRunOutDismissedPlayerId('');
        await handleSelectMatch(response.data.data);
        triggerNotification('Run Out recorded successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record run out');
    } finally {
      setSubmitting(false);
    }
  };

  // Swap ends striker and non-striker
  const handleSwapStrike = async () => {
    if (!selectedMatch) return;
    setSubmitting(true);
    setError(null);

    try {
      const response = await api.put(`/matches/${selectedMatch._id}/swap-strike`);
      if (response.data.success) {
        await handleSelectMatch(response.data.data);
        triggerNotification('Strike swapped successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to swap strike');
    } finally {
      setSubmitting(false);
    }
  };

  // Change bowler manually
  const handleChangeBowlerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !manualBowlerId) return;

    setSubmitting(true);
    setError(null);
    setShowChangeBowlerModal(false);

    try {
      const response = await api.put(`/matches/${selectedMatch._id}/change-bowler`, { bowlerId: manualBowlerId });
      if (response.data.success) {
        setManualBowlerId('');
        await handleSelectMatch(response.data.data);
        triggerNotification('Bowler changed successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to change bowler');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit new bowler on over completion
  const handleNewBowlerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || !selectedMatch.liveState || !newBowlerId) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.put(`/matches/${selectedMatch._id}/change-bowler`, { bowlerId: newBowlerId });
      if (response.data.success) {
        setShowNewBowlerPrompt(false);
        setNewBowlerId('');
        await handleSelectMatch(response.data.data);
        triggerNotification('Bowler set for new over!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to set bowler for new over');
    } finally {
      setSubmitting(false);
    }
  };

  // Undo Last Ball recorded
  const handleUndoBall = async () => {
    if (!selectedMatch) return;
    const confirm = window.confirm('Are you sure you want to undo the last ball recorded?');
    if (!confirm) return;

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/matches/${selectedMatch._id}/undo`);
      if (response.data.success) {
        triggerNotification('Last ball undone successfully.');
        await handleSelectMatch(response.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Undo action failed');
    } finally {
      setSubmitting(false);
    }
  };

  // Finish Match
  const handleEndMatch = async () => {
    if (!selectedMatch) return;
    const confirm = window.confirm('Are you sure you want to end this match?');
    if (!confirm) return;

    try {
      const runsA = selectedMatch.score.teamA.runs;
      const runsB = selectedMatch.score.teamB.runs;
      const winnerId = runsA > runsB ? selectedMatch.teamA._id : selectedMatch.teamB._id;
      const margin = runsA > runsB 
        ? `by ${runsA - runsB} runs` 
        : `by ${10 - selectedMatch.score.teamB.wickets} wickets`;

      const response = await api.post(`/matches/${selectedMatch._id}/end`, {
        winnerId,
        margin
      });

      if (response.data.success) {
        alert('Match marked as Completed successfully!');
        router.push('/tournaments');
      }
    } catch (err) {
      console.error(err);
      alert('Could not end match');
    }
  };

  // Wagon wheel click calculation
  const handleFieldClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - 100; // SVG is 200x200, center is (100,100)
    const y = e.clientY - rect.top - 100;

    let angleRad = Math.atan2(y, x);
    let angleDeg = (angleRad * 180) / Math.PI + 90;
    if (angleDeg < 0) angleDeg += 360;

    const maxRadius = 90;
    const distanceVal = Math.min(100, Math.round((Math.sqrt(x*x + y*y) / maxRadius) * 100));

    setWagonPoint({
      angle: Math.round(angleDeg),
      distance: distanceVal
    });
    triggerNotification('Shot vector locked. Tap run to save.');
  };

  const handleOverridePOM = async (playerId: string) => {
    if (!selectedMatch || !playerId) return;
    setSubmitting(true);
    setError(null);
    try {
      const response = await api.put(`/matches/${selectedMatch._id}/player-of-match`, { playerId });
      if (response.data.success) {
        setSelectedPomId(playerId);
        await handleSelectMatch(response.data.data);
        triggerNotification('Player of the Match overridden successfully!');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update Player of the Match');
    } finally {
      setSubmitting(false);
    }
  };

  const { battingTeamId, bowlingTeamId, battingTeamName, bowlingTeamName } = getBattingAndBowlingTeams();

  // Resolve batting / bowling team players list
  const activeInnings = selectedMatch?.innings[selectedMatch.innings.length - 1];
  const isTeamABatting =
    activeInnings?.battingTeam?._id === selectedMatch?.teamA._id ||
    selectedMatch?.liveState?.battingTeam?._id === selectedMatch?.teamA._id ||
    selectedMatch?.liveState?.battingTeam === selectedMatch?.teamA._id;

  const battingTeamPlayers = isTeamABatting
    ? selectedMatch?.teamA.players || []
    : selectedMatch?.teamB.players || [];

  const bowlingTeamPlayers = isTeamABatting
    ? selectedMatch?.teamB.players || []
    : selectedMatch?.teamA.players || [];

  // Candidate incoming batsmen
  const liveStrikerId = selectedMatch?.liveState?.striker?._id;
  const liveNonStrikerId = selectedMatch?.liveState?.nonStriker?._id;
  const alreadyBattedIds = activeInnings?.scorecard?.batsmen
    ?.filter(b => b.howOut !== 'Not Out')
    ?.map(b => b.player._id || b.player) || [];

  const incomingBatsmenCandidates = battingTeamPlayers.filter(
    p => p._id !== liveStrikerId && p._id !== liveNonStrikerId && !alreadyBattedIds.includes(p._id)
  );

  return (
    <ProtectedRoute allowedRoles={['organizer', 'admin']}>
      <div className="flex flex-col min-h-screen bg-[#0b0c10]">
        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

        <div className="flex flex-1">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
            {/* Header / Select Match Option */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4 border-b border-[#66fcf1]/10 pb-6">
              <div>
                <h1 className="text-3xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                  <Radio className="w-8 h-8 text-[#66fcf1] animate-pulse" />
                  <span>One-Click Scoring Deck</span>
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Speedy, touch-friendly grid calculator. Strike rotation, overs, and bowler swaps are fully automated.
                </p>
              </div>

              {/* Match Selection Dropdown */}
              <div className="flex items-center space-x-3">
                <span className="text-gray-500 font-bold text-xs uppercase tracking-wider">Scoring Target:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value === 'new') {
                      handleStartNewMatchWizard();
                    } else {
                      const match = matches.find(m => m._id === e.target.value);
                      if (match) handleSelectMatch(match);
                    }
                  }}
                  value={selectedMatch?._id || (showSetupForm && wizardStep === 1 ? 'new' : '')}
                  className="bg-[#1f2833]/40 border border-[#66fcf1]/25 py-2.5 px-4 rounded-xl text-white text-sm focus:outline-none cursor-pointer"
                >
                  <option value="new" className="bg-[#0b0c10] text-[#66fcf1] font-bold">+ Create Match Wizard</option>
                  {matches.map(m => (
                    <option key={m._id} value={m._id} className="bg-[#0b0c10]">{m.title}</option>
                  ))}
                  {matches.length === 0 && !showSetupForm && (
                    <option value="" className="bg-[#0b0c10]">No Active Match found</option>
                  )}
                </select>
              </div>
            </div>

            {/* Banner Notifications */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-950/45 border border-red-500/30 flex items-center space-x-2.5 text-red-300 text-sm">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {successMsg && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-950/45 border border-emerald-500/30 flex items-center space-x-2.5 text-emerald-300 text-sm">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {showSetupForm ? (
              /* ========================================================
                 SETUP INNINGS WIZARD STATE (STEPS 1 to 6)
                 ======================================================== */
              <div className="glass-card max-w-3xl mx-auto p-6 md:p-8 border-[#66fcf1]/10 space-y-6">
                {/* Stepper Progress Header */}
                <div className="flex items-center justify-between mb-8 max-w-xl mx-auto">
                  {[
                    { number: 1, name: 'Teams' },
                    { number: 2, name: 'Playing XI' },
                    { number: 3, name: 'Toss' },
                    { number: 4, name: 'Batsmen' },
                    { number: 5, name: 'Bowler' },
                    { number: 6, name: 'Confirm' }
                  ].map((s, idx) => (
                    <React.Fragment key={s.number}>
                      {idx > 0 && (
                        <div className={`flex-1 h-0.5 mx-2 ${wizardStep >= s.number ? 'bg-[#66fcf1]' : 'bg-white/10'}`}></div>
                      )}
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                          wizardStep === s.number
                            ? 'bg-[#66fcf1] text-[#0b0c10] ring-4 ring-[#66fcf1]/20 font-bold'
                            : wizardStep > s.number
                            ? 'bg-[#66fcf1]/20 border border-[#66fcf1] text-[#66fcf1]'
                            : 'bg-[#1f2833]/40 border border-white/10 text-gray-500'
                        }`}>
                          {s.number}
                        </div>
                        <span className={`text-[10px] uppercase font-bold mt-1.5 ${
                          wizardStep === s.number ? 'text-[#66fcf1]' : 'text-gray-500'
                        }`}>
                          {s.name}
                        </span>
                      </div>
                    </React.Fragment>
                  ))}
                </div>

                {/* Step Contents */}
                {wizardStep === 1 && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 1: Select Teams</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Choose a tournament and select or generate the match fixtures.
                      </p>
                    </div>

                    <div className="space-y-4">
                      {/* Tournament Dropdown */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Select Tournament</label>
                        <select
                          value={selectedTournamentId}
                          onChange={(e) => handleTournamentChange(e.target.value)}
                          className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                        >
                          <option value="">-- Choose Tournament --</option>
                          {tournamentsList.map(t => (
                            <option key={t._id} value={t._id}>{t.name}</option>
                          ))}
                        </select>
                      </div>

                      {selectedTournamentId && (
                        <div className="space-y-6 pt-4 border-t border-white/5">
                          {/* Selection Flow type: Scheduled or New */}
                          <div className="flex gap-4">
                            <button
                              type="button"
                              onClick={() => setIsCreatingNewMatch(true)}
                              className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition ${
                                isCreatingNewMatch
                                  ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                  : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              Create New Match
                            </button>
                            <button
                              type="button"
                              onClick={() => setIsCreatingNewMatch(false)}
                              className={`flex-1 py-3 rounded-xl border text-xs font-bold uppercase transition ${
                                !isCreatingNewMatch
                                  ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                  : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                              }`}
                            >
                              Select Scheduled Fixture
                            </button>
                          </div>

                          {isCreatingNewMatch ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Team A (Home)</label>
                                  <select
                                    value={teamAId}
                                    onChange={(e) => setTeamAId(e.target.value)}
                                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                                  >
                                    <option value="">-- Select Team A --</option>
                                    {registeredTeams.map(t => (
                                      <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Team B (Away)</label>
                                  <select
                                    value={teamBId}
                                    onChange={(e) => setTeamBId(e.target.value)}
                                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                                  >
                                    <option value="">-- Select Team B --</option>
                                    {registeredTeams.filter(t => t._id !== teamAId).map(t => (
                                      <option key={t._id} value={t._id}>{t.name}</option>
                                    ))}
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Overs Count</label>
                                  <input
                                    type="number"
                                    min={1}
                                    max={50}
                                    value={newMatchOvers}
                                    onChange={(e) => setNewMatchOvers(Number(e.target.value))}
                                    className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2 px-3 text-sm text-white font-mono"
                                  />
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={handleCreateMatchSubmit}
                                disabled={submitting || !teamAId || !teamBId}
                                className="w-full py-3.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider transition disabled:opacity-50 flex items-center justify-center space-x-2"
                              >
                                {submitting ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <span>Create Match & Proceed</span>}
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Select Fixture</label>
                                <select
                                  value={selectedScheduledMatchId}
                                  onChange={(e) => setSelectedScheduledMatchId(e.target.value)}
                                  className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                                >
                                  <option value="">-- Choose Scheduled Match --</option>
                                  {matches
                                    .filter(m => {
                                      const tId = typeof m.tournament === 'object' && m.tournament ? m.tournament._id : m.tournament;
                                      return tId === selectedTournamentId;
                                    })
                                    .filter(m => m.status === 'Upcoming')
                                    .map(m => (
                                      <option key={m._id} value={m._id}>{m.title}</option>
                                    ))}
                                </select>
                              </div>

                              <button
                                type="button"
                                onClick={handleSelectScheduledMatchSubmit}
                                disabled={submitting || !selectedScheduledMatchId}
                                className="w-full py-3.5 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider transition disabled:opacity-50 flex items-center justify-center space-x-2"
                              >
                                {submitting ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <span>Load Match & Proceed</span>}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {wizardStep === 2 && selectedMatch && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 2: Select Playing XI</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Select exactly 11 players from the squad roster for each team.
                      </p>
                    </div>

                    {((selectedMatch.teamA?.players || []).length < 11 || (selectedMatch.teamB?.players || []).length < 11) && (
                      <div className="p-4 rounded-xl bg-red-950/20 border border-red-500/20 text-red-300 text-xs">
                        Warning: One of the team squads has fewer than 11 players. Please add players to the teams first in the Teams Dashboard.
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Team A Roster */}
                      <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="font-extrabold text-white text-sm uppercase">{selectedMatch.teamA.name}</span>
                          <span className={`text-xs font-mono font-bold ${playingXI_A.length === 11 ? 'text-[#66fcf1]' : 'text-yellow-500'}`}>
                            {playingXI_A.length} / 11 Chosen
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                          {(selectedMatch.teamA?.players || []).map((p: any) => {
                            const isSelected = playingXI_A.includes(p._id);
                            return (
                              <label key={p._id} className="flex items-center space-x-3 p-2.5 rounded-lg bg-[#0b0c10]/40 border border-white/5 cursor-pointer hover:border-[#66fcf1]/25 transition">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleTogglePlayer_A(p._id)}
                                  className="w-4 h-4 text-[#66fcf1] border-gray-300 rounded focus:ring-[#66fcf1] bg-[#0b0c10]"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-semibold text-white block leading-tight">{p.name}</span>
                                  <span className="text-[10px] text-gray-500 uppercase leading-none">{p.role}</span>
                                </div>
                              </label>
                            );
                          })}
                          {(selectedMatch.teamA?.players || []).length === 0 && (
                            <p className="text-gray-600 text-xs italic">No players registered on squad roster</p>
                          )}
                        </div>
                      </div>

                      {/* Team B Roster */}
                      <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 space-y-4">
                        <div className="flex justify-between items-center border-b border-white/5 pb-2">
                          <span className="font-extrabold text-white text-sm uppercase">{selectedMatch.teamB.name}</span>
                          <span className={`text-xs font-mono font-bold ${playingXI_B.length === 11 ? 'text-[#66fcf1]' : 'text-yellow-500'}`}>
                            {playingXI_B.length} / 11 Chosen
                          </span>
                        </div>
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                          {(selectedMatch.teamB?.players || []).map((p: any) => {
                            const isSelected = playingXI_B.includes(p._id);
                            return (
                              <label key={p._id} className="flex items-center space-x-3 p-2.5 rounded-lg bg-[#0b0c10]/40 border border-white/5 cursor-pointer hover:border-[#66fcf1]/25 transition">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => handleTogglePlayer_B(p._id)}
                                  className="w-4 h-4 text-[#66fcf1] border-gray-300 rounded focus:ring-[#66fcf1] bg-[#0b0c10]"
                                />
                                <div className="flex-1">
                                  <span className="text-sm font-semibold text-white block leading-tight">{p.name}</span>
                                  <span className="text-[10px] text-gray-500 uppercase leading-none">{p.role}</span>
                                </div>
                              </label>
                            );
                          })}
                          {(selectedMatch.teamB?.players || []).length === 0 && (
                            <p className="text-gray-600 text-xs italic">No players registered on squad roster</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(1)}
                        className="flex-1 py-3 bg-[#1f2833]/40 border border-white/10 hover:border-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(3)}
                        disabled={playingXI_A.length !== 11 || playingXI_B.length !== 11}
                        className="flex-1 py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <span>Next: Toss System</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 3 && selectedMatch && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 3: Toss System</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Declare the toss winner and their batting or fielding decision.
                      </p>
                    </div>

                    <div className="space-y-6 max-w-md mx-auto">
                      {/* Toss Winner */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Toss Winner</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setTossWinnerId(selectedMatch.teamA._id)}
                            className={`py-3 rounded-xl border text-xs font-bold uppercase transition ${
                              tossWinnerId === selectedMatch.teamA._id
                                ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            {selectedMatch.teamA.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => setTossWinnerId(selectedMatch.teamB._id)}
                            className={`py-3 rounded-xl border text-xs font-bold uppercase transition ${
                              tossWinnerId === selectedMatch.teamB._id
                                ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            {selectedMatch.teamB.name}
                          </button>
                        </div>
                      </div>

                      {/* Toss Decision */}
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Toss Decision</label>
                        <div className="grid grid-cols-2 gap-4">
                          <button
                            type="button"
                            onClick={() => setTossDecision('Batting')}
                            className={`py-3 rounded-xl border text-xs font-bold uppercase transition ${
                              tossDecision === 'Batting'
                                ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            Batting First
                          </button>
                          <button
                            type="button"
                            onClick={() => setTossDecision('Bowling')}
                            className={`py-3 rounded-xl border text-xs font-bold uppercase transition ${
                              tossDecision === 'Bowling'
                                ? 'bg-[#66fcf1]/10 border-[#66fcf1] text-[#66fcf1]'
                                : 'bg-transparent border-white/10 text-gray-400 hover:border-white/20'
                            }`}
                          >
                            Bowling First
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(2)}
                        className="flex-1 py-3 bg-[#1f2833]/40 border border-white/10 hover:border-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        disabled={!tossWinnerId}
                        className="flex-1 py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <span>Next: Choose Batsmen</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 4 && selectedMatch && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 4: Select Opening Batsmen</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Choose the opening striker and non-striker for batting team: <span className="text-[#66fcf1] font-bold uppercase">{battingTeamName}</span>
                      </p>
                    </div>

                    {(() => {
                      const battingPlayers = (battingTeamId === selectedMatch.teamA._id ? selectedMatch.teamA.players : selectedMatch.teamB.players).filter((p: any) =>
                        (battingTeamId === selectedMatch.teamA._id ? playingXI_A : playingXI_B).includes(p._id)
                      );

                      return (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
                          {/* Striker Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Opening Striker</label>
                            <select
                              value={strikerId}
                              onChange={(e) => setStrikerId(e.target.value)}
                              className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                            >
                              <option value="">-- Choose Striker --</option>
                              {battingPlayers.map((p: any) => (
                                <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                              ))}
                            </select>
                          </div>

                          {/* Non-Striker Selector */}
                          <div className="space-y-1">
                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Opening Non-Striker</label>
                            <select
                              value={nonStrikerId}
                              onChange={(e) => setNonStrikerId(e.target.value)}
                              className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                            >
                              <option value="">-- Choose Non-Striker --</option>
                              {battingPlayers.filter((p: any) => p._id !== strikerId).map((p: any) => (
                                <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      );
                    })()}

                    {strikerId && nonStrikerId && strikerId === nonStrikerId && (
                      <div className="p-3 bg-red-950/20 border border-red-500/20 rounded-xl text-red-300 text-xs text-center max-w-sm mx-auto">
                        Error: Striker and non-striker cannot be the same player.
                      </div>
                    )}

                    <div className="flex gap-4 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => {
                          const isSecondInnings = selectedMatch.innings && selectedMatch.innings.length > 0;
                          if (isSecondInnings) {
                            setShowSetupForm(false);
                          } else {
                            setWizardStep(3);
                          }
                        }}
                        className="flex-1 py-3 bg-[#1f2833]/40 border border-white/10 hover:border-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(5)}
                        disabled={!strikerId || !nonStrikerId || strikerId === nonStrikerId}
                        className="flex-1 py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <span>Next: Choose Bowler</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 5 && selectedMatch && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 5: Select Opening Bowler</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Choose the opening bowler for bowling team: <span className="text-[#66fcf1] font-bold uppercase">{bowlingTeamName}</span>
                      </p>
                    </div>

                    {(() => {
                      const bowlingPlayers = (bowlingTeamId === selectedMatch.teamA._id ? selectedMatch.teamA.players : selectedMatch.teamB.players).filter((p: any) =>
                        (bowlingTeamId === selectedMatch.teamA._id ? playingXI_A : playingXI_B).includes(p._id)
                      );

                      return (
                        <div className="space-y-1 max-w-xs mx-auto">
                          <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Opening Bowler</label>
                          <select
                            value={bowlerId}
                            onChange={(e) => setBowlerId(e.target.value)}
                            className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                          >
                            <option value="">-- Choose Bowler --</option>
                            {bowlingPlayers.map((p: any) => (
                              <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                            ))}
                          </select>
                        </div>
                      );
                    })()}

                    <div className="flex gap-4 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(4)}
                        className="flex-1 py-3 bg-[#1f2833]/40 border border-white/10 hover:border-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setWizardStep(6)}
                        disabled={!bowlerId}
                        className="flex-1 py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        <span>Next: Confirm Setup</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}

                {wizardStep === 6 && selectedMatch && (
                  <div className="space-y-6">
                    <div className="border-b border-white/5 pb-4">
                      <h2 className="text-xl font-black text-white uppercase tracking-wider flex items-center space-x-2">
                        <Play className="w-6 h-6 text-[#66fcf1]" />
                        <span>Step 6: Confirm Configurations</span>
                      </h2>
                      <p className="text-gray-400 text-xs mt-1">
                        Double check all match settings before initiating the live room.
                      </p>
                    </div>

                    {(() => {
                      const battingPlayers = (battingTeamId === selectedMatch.teamA._id ? selectedMatch.teamA.players : selectedMatch.teamB.players).filter((p: any) =>
                        (battingTeamId === selectedMatch.teamA._id ? playingXI_A : playingXI_B).includes(p._id)
                      );
                      const bowlingPlayers = (bowlingTeamId === selectedMatch.teamA._id ? selectedMatch.teamA.players : selectedMatch.teamB.players).filter((p: any) =>
                        (bowlingTeamId === selectedMatch.teamA._id ? playingXI_A : playingXI_B).includes(p._id)
                      );

                      return (
                        <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 space-y-4 text-xs font-mono text-gray-300">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-white/5 pb-3">
                            <span className="text-gray-500 uppercase font-bold">Match Target:</span>
                            <span className="text-white font-bold">{selectedMatch.title}</span>
                            
                            <span className="text-gray-500 uppercase font-bold">Overs Count:</span>
                            <span className="text-[#66fcf1] font-bold">{selectedMatch.oversCount} Overs</span>

                            <span className="text-gray-500 uppercase font-bold">Toss Winner:</span>
                            <span className="text-white font-bold uppercase">
                              {tossWinnerId === selectedMatch.teamA._id ? selectedMatch.teamA.name : selectedMatch.teamB.name}
                            </span>

                            <span className="text-gray-500 uppercase font-bold">Toss Decision:</span>
                            <span className="text-[#66fcf1] font-bold uppercase">{tossDecision} First</span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-white/5 pb-3">
                            <span className="text-gray-500 uppercase font-bold">Innings 1 Batting:</span>
                            <span className="text-white font-bold uppercase">{battingTeamName}</span>

                            <span className="text-gray-500 uppercase font-bold">Innings 1 Bowling:</span>
                            <span className="text-white font-bold uppercase">{bowlingTeamName}</span>
                          </div>

                          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                            <span className="text-gray-500 uppercase font-bold">Opening striker:</span>
                            <span className="text-white font-bold">
                              {battingPlayers.find((p: any) => p._id === strikerId)?.name}
                            </span>

                            <span className="text-gray-500 uppercase font-bold">Opening Non-Striker:</span>
                            <span className="text-white font-bold">
                              {battingPlayers.find((p: any) => p._id === nonStrikerId)?.name}
                            </span>

                            <span className="text-gray-500 uppercase font-bold">Opening Bowler:</span>
                            <span className="text-white font-bold">
                              {bowlingPlayers.find((p: any) => p._id === bowlerId)?.name}
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex gap-4 border-t border-white/5 pt-4">
                      <button
                        type="button"
                        onClick={() => setWizardStep(5)}
                        className="flex-1 py-3 bg-[#1f2833]/40 border border-white/10 hover:border-white/20 text-white font-bold uppercase text-xs rounded-xl flex items-center justify-center space-x-2"
                      >
                        <ArrowLeft className="w-4 h-4" />
                        <span>Back</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleWizardSetupSubmit}
                        disabled={submitting}
                        className="flex-1 py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider disabled:opacity-50 flex items-center justify-center space-x-2"
                      >
                        {submitting ? <RefreshCw className="w-4.5 h-4.5 animate-spin" /> : <span>Start Match / Live scoring</span>}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : selectedMatch ? (
              // LIVE KEYPAD SCORING ACTIVE
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Live score display & Calculator Keypad */}
                    <div className="lg:col-span-2 space-y-6">
                      {/* Scoring Stats summary */}
                      <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2 text-red-500 font-extrabold uppercase text-xs tracking-wider">
                            <Radio className="w-4 h-4 animate-pulse" />
                            <span>LIVE ENGINE ACTIVE</span>
                          </div>
                          <h2 className="text-xl font-bold text-white uppercase tracking-wider">{selectedMatch.title}</h2>
                          <div className="flex items-center space-x-2 text-xs text-gray-500 font-bold uppercase">
                            <span>Batting: {isTeamABatting ? selectedMatch.teamA.name : selectedMatch.teamB.name}</span>
                            <span>|</span>
                            <span>CRR: {((isTeamABatting ? selectedMatch.score.teamA.runs : selectedMatch.score.teamB.runs) / Math.max(0.1, isTeamABatting ? selectedMatch.score.teamA.overs : selectedMatch.score.teamB.overs)).toFixed(2)}</span>
                          </div>
                        </div>

                        {/* Overs and Scores */}
                        <div className="text-right font-mono self-start md:self-auto border-t border-white/5 md:border-t-0 pt-4 md:pt-0">
                          <p className="text-4xl font-black text-[#66fcf1] leading-none mb-1">
                            {isTeamABatting ? selectedMatch.score.teamA.runs : selectedMatch.score.teamB.runs}
                            <span className="text-white">/</span>
                            {isTeamABatting ? selectedMatch.score.teamA.wickets : selectedMatch.score.teamB.wickets}
                          </p>
                          <p className="text-sm text-gray-400 font-semibold">
                            Overs: {isTeamABatting ? selectedMatch.score.teamA.overs : selectedMatch.score.teamB.overs} / {selectedMatch.oversCount}
                          </p>
                        </div>
                      </div>

                      {/* Active Batsmen and Bowler Row */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Striker Card */}
                        <div className="glass-card p-4 border-[#66fcf1]/20 bg-[#1f2833]/10 relative overflow-hidden">
                          <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-[#66fcf1] shadow-lg shadow-[#66fcf1] animate-pulse"></div>
                          <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#66fcf1] block">Striker</span>
                          <span className="font-bold text-white text-base block truncate uppercase">{selectedMatch.liveState?.striker?.name}</span>
                          <div className="flex justify-between items-center mt-3 font-mono">
                            <span className="text-xs text-gray-500">Runs / Balls</span>
                            <span className="text-sm font-bold text-white">
                              {activeInnings?.scorecard.batsmen.find(b => b.player._id === selectedMatch.liveState?.striker?._id)?.runs || 0}
                              <span className="text-gray-400 text-xs font-normal">
                                ({activeInnings?.scorecard.batsmen.find(b => b.player._id === selectedMatch.liveState?.striker?._id)?.balls || 0})
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Non-Striker Card */}
                        <div className="glass-card p-4 border-white/5 bg-[#0b0c10]/40">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Non-Striker</span>
                          <span className="font-bold text-white text-base block truncate uppercase">{selectedMatch.liveState?.nonStriker?.name}</span>
                          <div className="flex justify-between items-center mt-3 font-mono">
                            <span className="text-xs text-gray-500">Runs / Balls</span>
                            <span className="text-sm font-bold text-white">
                              {activeInnings?.scorecard.batsmen.find(b => b.player._id === selectedMatch.liveState?.nonStriker?._id)?.runs || 0}
                              <span className="text-gray-400 text-xs font-normal">
                                ({activeInnings?.scorecard.batsmen.find(b => b.player._id === selectedMatch.liveState?.nonStriker?._id)?.balls || 0})
                              </span>
                            </span>
                          </div>
                        </div>

                        {/* Bowler Card */}
                        <div className="glass-card p-4 border-white/5 bg-[#0b0c10]/40">
                          <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 block">Current Bowler</span>
                          <span className="font-bold text-white text-base block truncate uppercase">{selectedMatch.liveState?.currentBowler?.name}</span>
                          <div className="flex justify-between items-center mt-3 font-mono">
                            <span className="text-xs text-gray-500">O - M - R - W</span>
                            <span className="text-sm font-bold text-[#66fcf1]">
                              {activeInnings?.scorecard.bowlers.find(b => b.player._id === selectedMatch.liveState?.currentBowler?._id)?.overs || 0} -{' '}
                              {activeInnings?.scorecard.bowlers.find(b => b.player._id === selectedMatch.liveState?.currentBowler?._id)?.maidens || 0} -{' '}
                              {activeInnings?.scorecard.bowlers.find(b => b.player._id === selectedMatch.liveState?.currentBowler?._id)?.runs || 0} -{' '}
                              {activeInnings?.scorecard.bowlers.find(b => b.player._id === selectedMatch.liveState?.currentBowler?._id)?.wickets || 0}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Live Chase Banner */}
                      {selectedMatch.innings && selectedMatch.innings.length === 2 && selectedMatch.status === 'Live' && (
                        <div className="glass-card p-4 border-[#66fcf1]/30 bg-[#66fcf1]/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex items-center space-x-2">
                            <Zap className="w-5 h-5 text-[#66fcf1] animate-pulse" />
                            <span className="text-xs font-extrabold uppercase tracking-wider text-gray-400">Target Chase:</span>
                            <span className="text-sm font-mono font-black text-[#66fcf1]">{selectedMatch.target || 0} Runs</span>
                          </div>
                          <div className="flex items-center space-x-4 font-mono text-sm font-bold">
                            <span>Need <strong className="text-white font-black">{(selectedMatch.target || 0) - (isTeamABatting ? selectedMatch.score.teamA.runs : selectedMatch.score.teamB.runs)}</strong> runs in <strong className="text-[#66fcf1] font-black">{Math.max(0, (selectedMatch.oversCount * 6) - (getBallsBowled(isTeamABatting ? selectedMatch.score.teamA.overs : selectedMatch.score.teamB.overs)))}</strong> balls</span>
                            <span className="text-gray-500">|</span>
                            <span>RRR: <strong className="text-yellow-400 font-black">{(Math.max(0, (selectedMatch.oversCount * 6) - (getBallsBowled(isTeamABatting ? selectedMatch.score.teamA.overs : selectedMatch.score.teamB.overs))) > 0 ? ((((selectedMatch.target || 0) - (isTeamABatting ? selectedMatch.score.teamA.runs : selectedMatch.score.teamB.runs)) / Math.max(1, (selectedMatch.oversCount * 6) - (getBallsBowled(isTeamABatting ? selectedMatch.score.teamA.overs : selectedMatch.score.teamB.overs)))) * 6).toFixed(2) : '0.00')}</strong></span>
                          </div>
                        </div>
                      )}

                      {selectedMatch.status === 'Completed' ? (
                        <div className="glass-card p-6 border-[#66fcf1]/30 bg-[#0b0c10]/40 space-y-6">
                          {/* Match Result Banner */}
                          <div className="p-5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 text-center space-y-2">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                            <h3 className="text-lg font-black text-[#66fcf1] uppercase tracking-widest font-mono">Match Completed</h3>
                            <p className="text-xl font-black text-white uppercase tracking-wider font-mono">
                              {selectedMatch.result ? (
                                selectedMatch.result.winner ? (
                                  `${
                                    typeof selectedMatch.result.winner === 'object'
                                      ? selectedMatch.result.winner.name
                                      : (selectedMatch.result.winner === selectedMatch.teamA._id ? selectedMatch.teamA.name : selectedMatch.teamB.name)
                                  } ${selectedMatch.result.margin}`
                                ) : (
                                  selectedMatch.result.margin || 'Match Tied'
                                )
                              ) : (
                                'Match Completed'
                              )}
                            </p>
                          </div>

                          {/* Player of the Match Override section */}
                          <div className="p-5 rounded-2xl bg-[#1f2833]/20 border border-white/5 space-y-4">
                            <div className="flex items-center space-x-2.5">
                              <Award className="w-6 h-6 text-[#66fcf1]" />
                              <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Player of the Match</h4>
                            </div>
                            
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Awarded To:</span>
                                <span className="text-base font-black text-[#66fcf1] uppercase">
                                  {selectedMatch.playerOfMatch ? (
                                    typeof selectedMatch.playerOfMatch === 'object'
                                      ? selectedMatch.playerOfMatch.name
                                      : (() => {
                                          const allP = [...(selectedMatch.playingXIA || []), ...(selectedMatch.playingXIB || [])];
                                          const matching = allP.find(p => p._id === selectedMatch.playerOfMatch);
                                          return matching ? matching.name : 'Not Assigned';
                                        })()
                                  ) : (
                                    'Not Assigned'
                                  )}
                                </span>
                              </div>

                              <div className="flex items-center space-x-3 self-stretch sm:self-auto">
                                <select
                                  value={selectedPomId}
                                  onChange={(e) => {
                                    setSelectedPomId(e.target.value);
                                    handleOverridePOM(e.target.value);
                                  }}
                                  className="flex-1 sm:flex-initial bg-[#0b0c10] border border-white/10 hover:border-[#66fcf1]/30 rounded-xl py-2 px-3 text-xs font-semibold text-white focus:outline-none cursor-pointer"
                                >
                                  <option value="">-- Override POM --</option>
                                  <optgroup label={selectedMatch.teamA.name}>
                                    {(selectedMatch.playingXIA || []).map((p: any) => (
                                      <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                  </optgroup>
                                  <optgroup label={selectedMatch.teamB.name}>
                                    {(selectedMatch.playingXIB || []).map((p: any) => (
                                      <option key={p._id} value={p._id}>{p.name}</option>
                                    ))}
                                  </optgroup>
                                </select>
                              </div>
                            </div>
                          </div>

                          {/* Scorecard Summary Tabs */}
                          <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-2">
                              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#66fcf1]">Final Scorecard Summary</h4>
                              <div className="flex space-x-2">
                                {selectedMatch.innings.map((inn, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setActiveScorecardTab(idx)}
                                    className={`py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition ${
                                      activeScorecardTab === idx
                                        ? 'bg-[#66fcf1] text-[#0b0c10]'
                                        : 'bg-[#1f2833]/40 text-gray-400 hover:text-white border border-white/5'
                                    }`}
                                  >
                                    {inn.battingTeam?.name || `Innings ${idx + 1}`}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Render Active Innings Scorecard */}
                            {selectedMatch.innings[activeScorecardTab] ? (() => {
                              const inn = selectedMatch.innings[activeScorecardTab];
                              return (
                                <div className="space-y-6 font-mono text-xs">
                                  {/* Batsmen Table */}
                                  <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1">
                                      <span>Batting Scorecard</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="text-gray-500 text-[10px] uppercase border-b border-white/5">
                                            <th className="py-2 px-1">Batsman</th>
                                            <th className="py-2 px-1">Status</th>
                                            <th className="py-2 px-1 text-center font-bold">R</th>
                                            <th className="py-2 px-1 text-center">B</th>
                                            <th className="py-2 px-1 text-center">4s</th>
                                            <th className="py-2 px-1 text-center">6s</th>
                                            <th className="py-2 px-1 text-right">SR</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inn.scorecard.batsmen.map((batsman, bIdx) => {
                                            const sr = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';
                                            return (
                                              <tr key={bIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                                <td className="py-2 px-1 font-bold text-white uppercase">{batsman.player?.name}</td>
                                                <td className="py-2 px-1 text-gray-500 text-[10px] truncate max-w-[120px]">
                                                  {batsman.howOut === 'Not Out' ? (
                                                    <span className="text-[#66fcf1] font-semibold">not out</span>
                                                  ) : batsman.howOut === 'run-out' ? (
                                                    <span>run out</span>
                                                  ) : batsman.howOut === 'retired-hurt' ? (
                                                    <span className="font-semibold">retired hurt</span>
                                                  ) : (
                                                    <span>{batsman.howOut} b {batsman.bowler?.name || 'Bowler'}</span>
                                                  )}
                                                </td>
                                                <td className="py-2 px-1 font-bold text-white text-center">{batsman.runs}</td>
                                                <td className="py-2 px-1 text-center text-gray-300">{batsman.balls}</td>
                                                <td className="py-2 px-1 text-center text-gray-300">{batsman.fours}</td>
                                                <td className="py-2 px-1 text-center text-gray-300">{batsman.sixes}</td>
                                                <td className="py-2 px-1 text-right text-gray-500">{sr}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Bowlers Table */}
                                  <div className="space-y-2 pt-2">
                                    <div className="flex justify-between items-center text-[10px] text-gray-500 uppercase tracking-wider border-b border-white/5 pb-1">
                                      <span>Bowling Scorecard</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-left border-collapse">
                                        <thead>
                                          <tr className="text-gray-500 text-[10px] uppercase border-b border-white/5">
                                            <th className="py-2 px-1">Bowler</th>
                                            <th className="py-2 px-1 text-center">O</th>
                                            <th className="py-2 px-1 text-center">M</th>
                                            <th className="py-2 px-1 text-center">R</th>
                                            <th className="py-2 px-1 text-center font-bold">W</th>
                                            <th className="py-2 px-1 text-right">Econ</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {inn.scorecard.bowlers.map((bowler, bowlerIdx) => {
                                            const balls = getBallsBowled(bowler.overs);
                                            const econ = balls > 0 ? ((bowler.runs / balls) * 6).toFixed(2) : '0.00';
                                            return (
                                              <tr key={bowlerIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                                <td className="py-2 px-1 font-bold text-white uppercase">{bowler.player?.name}</td>
                                                <td className="py-2 px-1 text-center text-gray-300 font-bold">{bowler.overs}</td>
                                                <td className="py-2 px-1 text-center text-gray-300">{bowler.maidens}</td>
                                                <td className="py-2 px-1 text-center text-gray-300">{bowler.runs}</td>
                                                <td className="py-2 px-1 text-center font-bold text-[#66fcf1]">{bowler.wickets}</td>
                                                <td className="py-2 px-1 text-right text-gray-500">{econ}</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </div>
                              );
                            })() : (
                              <p className="text-gray-500 italic text-xs">No scorecard entries recorded.</p>
                            )}
                          </div>

                          {/* Navigation Button */}
                          <button
                            type="button"
                            onClick={() => router.push('/tournaments')}
                            className="w-full py-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] font-black uppercase text-xs rounded-xl tracking-wider transition duration-200"
                          >
                            Go to Tournament Dashboard
                          </button>
                        </div>
                      ) : (
                        <>
                          {/* Calculator Keypad Layout */}
                          <div className="glass-card p-6 border-[#66fcf1]/10 space-y-6 relative">
                            {/* Bowler Over-completion Block Overlay */}
                            {showNewBowlerPrompt && (
                              <div className="absolute inset-0 bg-[#0b0c10]/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center space-y-4">
                                <Compass className="w-12 h-12 text-[#66fcf1] animate-spin" />
                                <h3 className="text-lg font-black text-white uppercase tracking-wider">Over Completed</h3>
                                <p className="text-gray-400 text-xs max-w-sm">
                                  Set the bowler for the next over. Note: The bowler cannot bowl consecutive overs.
                                </p>
                                <form onSubmit={handleNewBowlerSubmit} className="flex flex-col space-y-3 w-full max-w-xs">
                                  <select
                                    required
                                    value={newBowlerId}
                                    onChange={(e) => setNewBowlerId(e.target.value)}
                                    className="bg-[#0b0c10] border border-[#66fcf1]/20 py-2.5 px-3 rounded-lg text-white text-sm"
                                  >
                                    <option value="">Select Bowler</option>
                                    {bowlingTeamPlayers
                                      .filter(p => p._id !== selectedMatch.liveState?.currentBowler?._id)
                                      .map(p => (
                                        <option key={p._id} value={p._id}>{p.name} ({p.role})</option>
                                      ))}
                                  </select>
                                  <button
                                    type="submit"
                                    className="py-2 px-6 bg-[#66fcf1] text-[#0b0c10] font-black uppercase text-xs rounded-lg tracking-wider"
                                  >
                                    Set Bowler
                                  </button>
                                </form>
                              </div>
                            )}

                            {/* Row 1: standard run buttons */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#66fcf1] block">Row 1: Runs off Bat</span>
                              <div className="grid grid-cols-7 gap-2">
                                {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    disabled={submitting}
                                    onClick={() => handleRecordRuns(num)}
                                    className="py-4 bg-[#1f2833]/30 border border-white/10 hover:border-[#66fcf1]/30 hover:bg-[#66fcf1]/5 text-lg font-mono font-black text-white rounded-xl shadow-lg transition duration-200"
                                  >
                                    {num}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Row 2: Extras / Special Events */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#66fcf1] block">Row 2: Extras & Dismissals</span>
                              <div className="grid grid-cols-6 gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowWideModal(true);
                                  }}
                                  className="py-4 bg-[#1f2833]/30 border border-white/10 hover:border-[#66fcf1]/30 hover:bg-[#66fcf1]/5 text-xs font-black text-white rounded-xl uppercase transition duration-200"
                                >
                                  WD
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowNoBallModal(true);
                                  }}
                                  className="py-4 bg-[#1f2833]/30 border border-white/10 hover:border-[#66fcf1]/30 hover:bg-[#66fcf1]/5 text-xs font-black text-white rounded-xl uppercase transition duration-200"
                                >
                                  NB
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowByeModal(true);
                                  }}
                                  className="py-4 bg-[#1f2833]/30 border border-white/10 hover:border-[#66fcf1]/30 hover:bg-[#66fcf1]/5 text-xs font-black text-white rounded-xl uppercase transition duration-200"
                                >
                                  BYE
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowLegByeModal(true);
                                  }}
                                  className="py-4 bg-[#1f2833]/30 border border-white/10 hover:border-[#66fcf1]/30 hover:bg-[#66fcf1]/5 text-xs font-black text-white rounded-xl uppercase transition duration-200"
                                >
                                  LB
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setBatsmanOutId(selectedMatch?.liveState?.striker?._id || '');
                                    setWicketType('bowled');
                                    setShowWicketModal(true);
                                  }}
                                  className="py-4 bg-red-950/30 border border-red-500/30 hover:bg-red-950/50 hover:border-red-500 text-xs font-black text-red-400 rounded-xl uppercase transition duration-200"
                                >
                                  WICKET
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRunOutDismissedPlayerId('');
                                    setRunOutIncomingBatsmanId('');
                                    setRunOutCompletedRuns(0);
                                    setShowRunOutModal(true);
                                  }}
                                  className="py-4 bg-red-950/30 border border-red-500/30 hover:bg-red-950/50 hover:border-red-500 text-xs font-black text-red-400 rounded-xl uppercase transition duration-200"
                                >
                                  RUN OUT
                                </button>
                              </div>
                            </div>

                            {/* Row 3: Admin Actions / Controls */}
                            <div className="space-y-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-[#66fcf1] block">Row 3: Actions & Overrides</span>
                              <div className="grid grid-cols-3 gap-3">
                                <button
                                  type="button"
                                  onClick={handleUndoBall}
                                  className="py-3.5 bg-yellow-950/20 border border-yellow-500/30 hover:border-yellow-500 hover:bg-yellow-950/40 text-xs font-bold text-yellow-400 rounded-xl uppercase tracking-wider transition duration-200"
                                >
                                  UNDO
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setManualBowlerId('');
                                    setShowChangeBowlerModal(true);
                                  }}
                                  className="py-3.5 bg-gray-900 border border-white/10 hover:border-white hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl uppercase tracking-wider transition duration-200"
                                >
                                  CHANGE BOWLER
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSwapStrike}
                                  className="py-3.5 bg-gray-900 border border-white/10 hover:border-white hover:bg-gray-800 text-xs font-bold text-gray-300 rounded-xl uppercase tracking-wider transition duration-200"
                                >
                                  CHANGE STRIKER
                                </button>
                              </div>
                            </div>

                            {/* Ball-by-ball stream at bottom of keypad */}
                            <div className="border-t border-white/5 pt-4 space-y-2">
                              <span className="text-[9px] font-extrabold uppercase tracking-widest text-gray-500 block">Recent Balls (This Over)</span>
                              <div className="flex flex-wrap items-center gap-2">
                                {selectedMatch.liveState?.currentOverRuns.map((ball, i) => (
                                  <span
                                    key={i}
                                    className={`w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold ${
                                      ball.isWicket
                                        ? 'bg-red-600 text-white shadow-md shadow-red-500/25'
                                        : ball.isExtra
                                        ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
                                        : ball.run === 4 || ball.run === 6
                                        ? 'bg-[#66fcf1]/10 border border-[#66fcf1]/30 text-[#66fcf1]'
                                        : 'bg-white/5 text-white'
                                    }`}
                                  >
                                    {ball.isWicket ? 'W' : ball.isExtra ? (ball.extraType === 'wide' ? 'Wd' : 'Nb') : ball.run}
                                  </span>
                                ))}
                                {selectedMatch.liveState?.currentOverRuns.length === 0 && (
                                  <span className="text-gray-600 text-xs italic font-semibold">Opening ball of over...</span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Extra Actions footer */}
                          <div className="flex items-center justify-between border-t border-white/5 pt-4">
                            {/* Declare or Switch Innings button if applicable */}
                            {selectedMatch.innings && selectedMatch.innings.length === 1 && (
                              <button
                                onClick={() => {
                                  const confirm = window.confirm('Declare this innings and setup Innings 2?');
                                  if (confirm) {
                                    setStrikerId('');
                                    setNonStrikerId('');
                                    setBowlerId('');
                                    setWizardStep(4);
                                    setShowSetupForm(true);
                                  }
                                }}
                                className="flex items-center space-x-1.5 text-xs text-[#66fcf1] font-bold uppercase tracking-wider hover:underline"
                              >
                                <ListRestart className="w-4 h-4" />
                                <span>Start 2nd Innings Wizard</span>
                              </button>
                            )}

                            <button
                              onClick={handleEndMatch}
                              className="flex items-center space-x-1.5 text-xs text-red-400 font-bold uppercase tracking-wider hover:underline"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Close / End Match</span>
                            </button>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Right Side: Wagon Wheel Mapper & Active Innings commentary */}
                    <div className="space-y-6">
                      {/* Wagon Wheel vector tracker */}
                      <div className="glass-card p-6 border-[#66fcf1]/10 flex flex-col items-center">
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] mb-2 flex items-center space-x-1.5">
                          <Compass className="w-4.5 h-4.5 text-[#66fcf1]" />
                          <span>Shot Vectors</span>
                        </h3>
                        <p className="text-gray-500 text-xs text-center mb-4">
                          Click field vectors to map placement. Mapped shots are saved on run clicks.
                        </p>

                        <div className="relative border border-white/5 rounded-2xl p-2 bg-[#0b0c10]/30 select-none">
                          <svg
                            viewBox="0 0 200 200"
                            onClick={handleFieldClick}
                            className="w-60 h-60 cursor-crosshair"
                          >
                            {/* Boundaries */}
                            <circle cx="100" cy="100" r="90" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
                            <circle cx="100" cy="100" r="50" fill="none" stroke="rgba(255,255,255,0.02)" strokeDasharray="3 3" />
                            
                            {/* Pitch */}
                            <rect x="96" y="80" width="8" height="40" fill="rgba(255,255,255,0.05)" stroke="rgba(255,255,255,0.15)" strokeWidth="0.5" />
                            
                            {/* Dividers */}
                            <line x1="100" y1="10" x2="100" y2="190" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                            <line x1="10" y1="100" x2="190" y2="100" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />

                            {/* Placement preview */}
                            {wagonPoint && (
                              <g>
                                <line
                                  x1="100"
                                  y1="100"
                                  x2={
                                    100 +
                                    (wagonPoint.distance / 100) * 80 * Math.cos(((wagonPoint.angle - 90) * Math.PI) / 180)
                                  }
                                  y2={
                                    100 +
                                    (wagonPoint.distance / 100) * 80 * Math.sin(((wagonPoint.angle - 90) * Math.PI) / 180)
                                  }
                                  stroke="#66fcf1"
                                  strokeWidth={2}
                                />
                                <circle
                                  cx={
                                    100 +
                                    (wagonPoint.distance / 100) * 80 * Math.cos(((wagonPoint.angle - 90) * Math.PI) / 180)
                                  }
                                  cy={
                                    100 +
                                    (wagonPoint.distance / 100) * 80 * Math.sin(((wagonPoint.angle - 90) * Math.PI) / 180)
                                  }
                                  r={4}
                                  fill="#66fcf1"
                                  stroke="#0b0c10"
                                  strokeWidth={1}
                                />
                              </g>
                            )}
                          </svg>
                        </div>

                        {wagonPoint ? (
                          <div className="mt-4 text-[10px] space-y-1 font-mono text-center">
                            <p className="text-white">Angle: <span className="text-[#66fcf1] font-bold">{wagonPoint.angle}°</span></p>
                            <p className="text-white">Distance: <span className="text-[#66fcf1] font-bold">{wagonPoint.distance} yards</span></p>
                            <button
                              onClick={() => setWagonPoint(null)}
                              className="mt-2 text-red-400 font-bold uppercase hover:underline"
                            >
                              Reset Target
                            </button>
                          </div>
                        ) : (
                          <p className="text-gray-600 text-xs italic mt-4">Field mapper is clear</p>
                        )}
                      </div>

                      {/* Innings commentary stream */}
                      <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">
                          Ball Commentary Feed
                        </h3>

                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                          {selectedMatch.commentary.slice(0, 10).map((cmt, i) => (
                            <div key={i} className="text-xs border-b border-white/5 pb-2 flex items-start space-x-2.5">
                              <span className="font-mono font-bold text-gray-500">{cmt.overNum}.{cmt.ballNum}</span>
                              <p className="text-gray-400 leading-normal">{cmt.text}</p>
                            </div>
                          ))}
                          {selectedMatch.commentary.length === 0 && (
                            <p className="text-gray-600 text-xs italic">Live commentary logs will show here.</p>
                          )}
                        </div>
                      </div>

                      {/* Playing XI Display Card */}
                      <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">
                          Match Playing XI
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          {/* Team A Playing XI list */}
                          <div className="space-y-1.5">
                            <span className="font-extrabold text-white block uppercase border-b border-white/5 pb-1 mb-1 truncate">{selectedMatch.teamA.name}</span>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {(selectedMatch.playingXIA || []).map((player: any) => {
                                const isStriker = selectedMatch.liveState?.striker?._id === player._id;
                                const isNonStriker = selectedMatch.liveState?.nonStriker?._id === player._id;
                                const isBowler = selectedMatch.liveState?.currentBowler?._id === player._id;
                                return (
                                  <div key={player._id} className="flex justify-between items-center py-1">
                                    <span className={`truncate font-medium ${isStriker || isNonStriker ? 'text-[#66fcf1] font-bold' : 'text-gray-400'}`}>
                                      {player.name}
                                    </span>
                                    {(isStriker || isNonStriker) && <span className="text-[9px] bg-[#66fcf1]/10 text-[#66fcf1] px-1.5 py-0.5 rounded font-bold">BAT</span>}
                                    {isBowler && <span className="text-[9px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded font-bold">BOWL</span>}
                                  </div>
                                );
                              })}
                              {(selectedMatch.playingXIA || []).length === 0 && (
                                <span className="text-gray-600 italic">No Playing XI selected</span>
                              )}
                            </div>
                          </div>

                          {/* Team B Playing XI list */}
                          <div className="space-y-1.5">
                            <span className="font-extrabold text-white block uppercase border-b border-white/5 pb-1 mb-1 truncate">{selectedMatch.teamB.name}</span>
                            <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                              {(selectedMatch.playingXIB || []).map((player: any) => {
                                const isStriker = selectedMatch.liveState?.striker?._id === player._id;
                                const isNonStriker = selectedMatch.liveState?.nonStriker?._id === player._id;
                                const isBowler = selectedMatch.liveState?.currentBowler?._id === player._id;
                                return (
                                  <div key={player._id} className="flex justify-between items-center py-1">
                                    <span className={`truncate font-medium ${isStriker || isNonStriker ? 'text-[#66fcf1] font-bold' : 'text-gray-400'}`}>
                                      {player.name}
                                    </span>
                                    {(isStriker || isNonStriker) && <span className="text-[9px] bg-[#66fcf1]/10 text-[#66fcf1] px-1.5 py-0.5 rounded font-bold">BAT</span>}
                                    {isBowler && <span className="text-[9px] bg-yellow-500/10 text-yellow-400 px-1.5 py-0.5 rounded font-bold">BOWL</span>}
                                  </div>
                                );
                              })}
                              {(selectedMatch.playingXIB || []).length === 0 && (
                                <span className="text-gray-600 italic">No Playing XI selected</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
            ) : (
              <div className="glass-card p-10 text-center border-dashed border-[#66fcf1]/20 max-w-lg mx-auto">
                <Radio className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-white font-bold">Please setup match before scoring.</h3>
                <p className="text-gray-500 text-xs mt-2">
                  To begin scoring a match, please launch the wizard or load a scheduled fixture from the tournament.
                </p>
                <button
                  onClick={handleStartNewMatchWizard}
                  className="mt-4 py-2.5 px-6 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-xs font-black uppercase rounded-lg transition"
                >
                  Create Match Wizard
                </button>
              </div>
            )}
          </main>
        </div>

        {/* ==========================================================
           RUN SELECTION MODAL (For Bye / Leg Bye)
           ========================================================== */}
        <AnimatePresence>
          {showRunsSelection && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20"
              >
                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-lg font-black text-white uppercase tracking-wider">
                    Runs taken on {extraTypeForSelection}
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select how many runs were scored as extras.</p>
                </div>

                <div className="grid grid-cols-5 gap-2.5 font-mono">
                  {[1, 2, 3, 4, 6].map((num) => (
                    <button
                      key={num}
                      onClick={() => handleExtraRunsSubmit(num)}
                      className="py-3 bg-[#1f2833]/30 hover:bg-[#66fcf1] border border-white/10 hover:text-[#0b0c10] text-sm font-bold rounded-xl transition duration-150"
                    >
                      {num}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => setShowRunsSelection(false)}
                  className="w-full py-2 border border-white/10 text-gray-400 hover:text-white rounded-lg text-xs uppercase"
                >
                  Cancel Selection
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           WICKET MODAL
           ========================================================== */}
        {/* ==========================================================
           WICKET MODAL (Standard)
           ========================================================== */}
        <AnimatePresence>
          {showWicketModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-md w-full p-6 space-y-6 relative border-red-500/20 bg-[#1f2833]/90 text-white"
              >
                <button
                  type="button"
                  onClick={() => setShowWicketModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider flex items-center space-x-1.5 text-red-500">
                    <Award className="w-6 h-6" />
                    <span>Select Wicket Type</span>
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select the wicket dismissal scenario and incoming batsman.</p>
                </div>

                <form onSubmit={handleWicketSubmit} className="space-y-4">
                  {/* Wicket Type Selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Dismissal Type</label>
                    <select
                      value={wicketType}
                      onChange={(e) => setWicketType(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white"
                    >
                      <option value="bowled">Bowled</option>
                      <option value="caught">Caught</option>
                      <option value="lbw">LBW</option>
                      <option value="stumped">Stumped</option>
                      <option value="hit-wicket">Hit Wicket</option>
                      <option value="obstructing-field">Obstructing Field</option>
                      <option value="timed-out">Timed Out</option>
                      <option value="retired-hurt">Retired Hurt</option>
                    </select>
                  </div>

                  {/* Batsman Out Selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Dismissed Batsman</label>
                    <select
                      value={batsmanOutId}
                      onChange={(e) => setBatsmanOutId(e.target.value)}
                      required
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                    >
                      <option value="">Select Dismissed Batsman</option>
                      <option value={selectedMatch?.liveState?.striker?._id}>
                        {selectedMatch?.liveState?.striker?.name} (Striker)
                      </option>
                      <option value={selectedMatch?.liveState?.nonStriker?._id}>
                        {selectedMatch?.liveState?.nonStriker?.name} (Non-Striker)
                      </option>
                    </select>
                  </div>

                  {/* Fielder Selector (For caught / stumped) */}
                  {['caught', 'stumped'].includes(wicketType) && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Select Fielder</label>
                      <select
                        value={fielderId}
                        onChange={(e) => setFielderId(e.target.value)}
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                      >
                        <option value="">Select Fielder (Optional)</option>
                        {bowlingTeamPlayers.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Incoming Batsman Selector */}
                  {wicketType !== 'retired-hurt' && (
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Select New Batsman</label>
                      <select
                        value={incomingBatsmanId}
                        onChange={(e) => setIncomingBatsmanId(e.target.value)}
                        required
                        className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                      >
                        <option value="">Select New Batsman</option>
                        {incomingBatsmenCandidates.map(p => (
                          <option key={p._id} value={p._id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs rounded-lg tracking-wider transition flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Record Wicket</span>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           WIDE BALL MODAL
           ========================================================== */}
        <AnimatePresence>
          {showWideModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20 bg-[#1f2833]/90 text-white text-center"
              >
                <button
                  type="button"
                  onClick={() => setShowWideModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-[#66fcf1]">
                    Wide Ball
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select Additional Runs Completed (WD is automatically +1 extra)</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Select Additional Runs</span>
                  <div className="grid grid-cols-5 gap-2">
                    {[0, 1, 2, 3, 4].map((run) => (
                      <button
                        key={run}
                        type="button"
                        onClick={() => handleWideSubmit(run)}
                        className="py-3 bg-[#0b0c10] border border-white/10 hover:border-[#66fcf1] hover:bg-[#66fcf1]/10 text-white font-mono font-black rounded-lg transition"
                      >
                        +{run}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           NO BALL MODAL
           ========================================================== */}
        <AnimatePresence>
          {showNoBallModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20 bg-[#1f2833]/90 text-white text-center"
              >
                <button
                  type="button"
                  onClick={() => setShowNoBallModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-[#66fcf1]">
                    No Ball
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select Runs Scored Off Bat (NB is automatically +1 extra)</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Select Runs Off Bat</span>
                  <div className="grid grid-cols-6 gap-2">
                    {[0, 1, 2, 3, 4, 6].map((run) => (
                      <button
                        key={run}
                        type="button"
                        onClick={() => handleNoBallSubmit(run)}
                        className="py-3 bg-[#0b0c10] border border-white/10 hover:border-[#66fcf1] hover:bg-[#66fcf1]/10 text-white font-mono font-black rounded-lg transition"
                      >
                        {run}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           BYE MODAL
           ========================================================== */}
        <AnimatePresence>
          {showByeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20 bg-[#1f2833]/90 text-white text-center"
              >
                <button
                  type="button"
                  onClick={() => setShowByeModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-[#66fcf1]">
                    Bye Runs
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select bye runs completed (ball counts, batsman gets 0)</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Select Runs</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((run) => (
                      <button
                        key={run}
                        type="button"
                        onClick={() => handleByeSubmit(run)}
                        className="py-3 bg-[#0b0c10] border border-white/10 hover:border-[#66fcf1] hover:bg-[#66fcf1]/10 text-white font-mono font-black rounded-lg transition"
                      >
                        {run}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           LEG BYE MODAL
           ========================================================== */}
        <AnimatePresence>
          {showLegByeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20 bg-[#1f2833]/90 text-white text-center"
              >
                <button
                  type="button"
                  onClick={() => setShowLegByeModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-[#66fcf1]">
                    Leg Bye Runs
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select leg bye runs completed (ball counts, batsman gets 0)</p>
                </div>

                <div className="space-y-3">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 block">Select Runs</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((run) => (
                      <button
                        key={run}
                        type="button"
                        onClick={() => handleLegByeSubmit(run)}
                        className="py-3 bg-[#0b0c10] border border-white/10 hover:border-[#66fcf1] hover:bg-[#66fcf1]/10 text-white font-mono font-black rounded-lg transition"
                      >
                        {run}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           RUN OUT MODAL
           ========================================================== */}
        <AnimatePresence>
          {showRunOutModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-md w-full p-6 space-y-6 relative border-red-500/20 bg-[#1f2833]/90 text-white"
              >
                <button
                  type="button"
                  onClick={() => setShowRunOutModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-red-500">
                    Run Out Details
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select runs completed, select the player who is out, and incoming batsman.</p>
                </div>

                <form onSubmit={handleRunOutSubmit} className="space-y-4">
                  {/* Runs Completed Buttons */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Runs Completed</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[0, 1, 2, 3].map((run) => (
                        <button
                          key={run}
                          type="button"
                          onClick={() => setRunOutCompletedRuns(run)}
                          className={`py-2 text-sm font-mono font-bold rounded-lg border transition ${
                            runOutCompletedRuns === run
                              ? 'bg-[#66fcf1] border-[#66fcf1] text-[#0b0c10]'
                              : 'bg-[#0b0c10] border-white/10 text-white hover:border-[#66fcf1]/50'
                          }`}
                        >
                          {run}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Dismissed Player Selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400 block">Dismissed Player</label>
                    <div className="grid grid-cols-2 gap-3 mt-1.5">
                      <label
                        className={`flex items-center space-x-2 py-3 px-3 rounded-lg border cursor-pointer transition ${
                          runOutDismissedPlayerId === selectedMatch?.liveState?.striker?._id
                            ? 'bg-red-500/20 border-red-500 text-white'
                            : 'bg-[#0b0c10] border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="runOutDismissedPlayer"
                          required
                          value={selectedMatch?.liveState?.striker?._id || ''}
                          checked={runOutDismissedPlayerId === selectedMatch?.liveState?.striker?._id}
                          onChange={(e) => setRunOutDismissedPlayerId(e.target.value)}
                          className="accent-red-500"
                        />
                        <div className="text-left">
                          <span className="text-[9px] block font-bold text-red-400 uppercase tracking-widest">Striker</span>
                          <span className="text-xs font-bold block truncate max-w-[100px]">{selectedMatch?.liveState?.striker?.name}</span>
                        </div>
                      </label>

                      <label
                        className={`flex items-center space-x-2 py-3 px-3 rounded-lg border cursor-pointer transition ${
                          runOutDismissedPlayerId === selectedMatch?.liveState?.nonStriker?._id
                            ? 'bg-red-500/20 border-red-500 text-white'
                            : 'bg-[#0b0c10] border-white/10 text-gray-400 hover:border-white/20'
                        }`}
                      >
                        <input
                          type="radio"
                          name="runOutDismissedPlayer"
                          required
                          value={selectedMatch?.liveState?.nonStriker?._id || ''}
                          checked={runOutDismissedPlayerId === selectedMatch?.liveState?.nonStriker?._id}
                          onChange={(e) => setRunOutDismissedPlayerId(e.target.value)}
                          className="accent-red-500"
                        />
                        <div className="text-left">
                          <span className="text-[9px] block font-bold text-red-400 uppercase tracking-widest">Non-Striker</span>
                          <span className="text-xs font-bold block truncate max-w-[100px]">{selectedMatch?.liveState?.nonStriker?.name}</span>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Fielder Selector (For run out - optional) */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Select Fielder</label>
                    <select
                      value={fielderId}
                      onChange={(e) => setFielderId(e.target.value)}
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                    >
                      <option value="">Select Fielder (Optional)</option>
                      {bowlingTeamPlayers.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Incoming Batsman Selector */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Select New Batsman</label>
                    <select
                      value={runOutIncomingBatsmanId}
                      onChange={(e) => setRunOutIncomingBatsmanId(e.target.value)}
                      required
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                    >
                      <option value="">Select Incoming Batsman</option>
                      {incomingBatsmenCandidates.map(p => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold uppercase text-xs rounded-lg tracking-wider transition flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Record Run Out</span>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* ==========================================================
           MANUAL CHANGE BOWLER MODAL
           ========================================================== */}
        <AnimatePresence>
          {showChangeBowlerModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0c10]/80 backdrop-blur-sm p-4">
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-card max-w-sm w-full p-6 space-y-6 relative border-[#66fcf1]/20 bg-[#1f2833]/90 text-white"
              >
                <button
                  type="button"
                  onClick={() => setShowChangeBowlerModal(false)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="border-b border-white/5 pb-3">
                  <h3 className="text-xl font-black uppercase tracking-wider text-[#66fcf1]">
                    Change Bowler
                  </h3>
                  <p className="text-gray-400 text-xs mt-0.5">Select bowler from the bowling team Playing XI.</p>
                </div>

                <form onSubmit={handleChangeBowlerSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Select Bowler</label>
                    <select
                      value={manualBowlerId}
                      onChange={(e) => setManualBowlerId(e.target.value)}
                      required
                      className="w-full bg-[#0b0c10] border border-white/10 rounded-lg py-2.5 px-3 text-sm text-white font-medium"
                    >
                      <option value="">Select Bowler</option>
                      {bowlingTeamPlayers
                        .filter(p => p._id !== selectedMatch?.liveState?.currentBowler?._id)
                        .map(p => (
                          <option key={p._id} value={p._id}>
                            {p.name} ({p.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-[#66fcf1] text-[#0b0c10] font-black uppercase text-xs rounded-lg tracking-wider transition flex items-center justify-center space-x-2 shadow-lg"
                  >
                    {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Change Bowler</span>}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

// Simple cross icon helper
function X({ className, onClick }: { className?: string; onClick?: () => void }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className={className}
      onClick={onClick}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  );
}
