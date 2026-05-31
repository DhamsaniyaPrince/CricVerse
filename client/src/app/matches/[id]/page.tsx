'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store';
import {
  fetchCurrentMatchStart,
  fetchCurrentMatchSuccess,
  fetchCurrentMatchFailure,
} from '@/store/slices/matchSlice';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import WagonWheel from '@/components/match/WagonWheel';
import { useSocket } from '@/hooks/useSocket';
import api from '@/utils/api';
import { Activity, Radio, List, BookOpen, AlertCircle, RefreshCw, Star, Trophy, Users, Compass, ChevronRight } from 'lucide-react';

const formatPlayerName = (name?: string) => {
  if (!name) return 'Player';
  // If it's an email address
  if (name.includes('@')) {
    const parts = name.split('@')[0];
    return parts
      .split(/[._\-+]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }
  // If it is a 24-character hexadecimal MongoDB ObjectId
  const hexObjectIdRegex = /^[0-9a-fA-F]{24}$/;
  if (hexObjectIdRegex.test(name)) {
    return 'Player';
  }
  return name;
};

export default function MatchDetailPage() {
  const params = useParams();
  const dispatch = useDispatch();
  const matchId = params?.id as string;

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'scorecard'>('live');

  // Activate live socket connections
  useSocket(matchId);

  const { currentMatch, isLoading, error } = useSelector((state: RootState) => state.match);

  const fetchMatchDetails = async () => {
    dispatch(fetchCurrentMatchStart());
    try {
      const response = await api.get(`/matches/${matchId}`);
      if (response.data.success) {
        dispatch(fetchCurrentMatchSuccess(response.data.data));
      }
    } catch (err: any) {
      console.error(err);
      dispatch(fetchCurrentMatchFailure(err.response?.data?.message || 'Failed to fetch match'));
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatchDetails();
    }
  }, [matchId]);

  if (isLoading && !currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10]">
        <div className="text-center space-y-4">
          <RefreshCw className="w-12 h-12 text-[#66fcf1] animate-spin mx-auto" />
          <p className="text-gray-400 font-bold tracking-wider animate-pulse">CONNECTING TO CRICVERSE STREAM...</p>
        </div>
      </div>
    );
  }

  if (error || !currentMatch) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0b0c10] px-4">
        <div className="glass-card max-w-md w-full p-8 text-center border-red-500/20">
          <AlertCircle className="w-14 h-14 text-red-500 mx-auto mb-4 animate-pulse" />
          <h2 className="text-xl font-bold text-white mb-2">Match Stream Unavailable</h2>
          <p className="text-gray-500 text-sm mb-6">{error || 'Could not locate the requested cricket match'}</p>
          <button
            onClick={fetchMatchDetails}
            className="py-2.5 px-6 rounded-lg bg-[#66fcf1] text-[#0b0c10] font-bold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const { score, liveState, status, teamA, teamB, result } = currentMatch;
  const commentary = currentMatch.commentary || [];
  const isLive = status === 'Live';

  // Math helpers for Run Rates
  const getBallsCount = (overs: number) => {
    const oversInt = Math.floor(overs);
    const ballsPart = Math.round((overs - oversInt) * 10);
    return oversInt * 6 + ballsPart;
  };

  const activeInningsIdx = currentMatch ? currentMatch.innings.length - 1 : -1;
  const isSecondInnings = currentMatch ? currentMatch.innings.length === 2 : false;

  const activeInnings = currentMatch && activeInningsIdx >= 0 ? currentMatch.innings[activeInningsIdx] : null;
  const activeBattingTeamId = activeInnings?.battingTeam?._id || activeInnings?.battingTeam;
  const isTeamBActiveBatting = activeBattingTeamId === teamB._id;

  const battingTeamName = isTeamBActiveBatting ? teamB.name : teamA.name;
  const bowlingTeamName = isTeamBActiveBatting ? teamA.name : teamB.name;

  const battingScore = isTeamBActiveBatting ? score.teamB : score.teamA;
  const bowlingScore = isTeamBActiveBatting ? score.teamA : score.teamB;

  const currentInningsRuns = battingScore?.runs || 0;
  const currentInningsWickets = battingScore?.wickets || 0;
  const currentInningsOvers = battingScore?.overs || 0;

  const target = currentMatch?.target || (isSecondInnings ? ((bowlingScore?.runs || 0) + 1) : 0);
  const runsNeeded = isSecondInnings ? Math.max(0, target - currentInningsRuns) : 0;

  const totalMatchBalls = currentMatch ? currentMatch.oversCount * 6 : 0;
  const ballsBowled = getBallsCount(currentInningsOvers);
  const ballsRemaining = Math.max(0, totalMatchBalls - ballsBowled);

  const crr = getBallsCount(currentInningsOvers) > 0 ? ((currentInningsRuns / getBallsCount(currentInningsOvers)) * 6).toFixed(2) : '0.00';
  const rrr = isSecondInnings && ballsRemaining > 0 ? ((runsNeeded / ballsRemaining) * 6).toFixed(2) : '0.00';

  // Aggregate partnership runs & balls
  const getPartnership = () => {
    if (!isLive || !liveState?.striker || !liveState?.nonStriker || activeInningsIdx < 0 || !currentMatch || !activeInnings) return null;
    const strikerCard = activeInnings.scorecard.batsmen.find(
      b => (b.player?._id || b.player) === liveState.striker?._id
    );
    const nonStrikerCard = activeInnings.scorecard.batsmen.find(
      b => (b.player?._id || b.player) === liveState.nonStriker?._id
    );
    const runsVal = (strikerCard?.runs || 0) + (nonStrikerCard?.runs || 0);
    const ballsVal = (strikerCard?.balls || 0) + (nonStrikerCard?.balls || 0);
    return { runs: runsVal, balls: ballsVal };
  };

  const partnership = getPartnership();

  const getLiveBatters = () => {
    if (!isLive || !liveState || !activeInnings) return [];

    const strikerCard = activeInnings.scorecard.batsmen.find(
      (b: any) => (b.player?._id || b.player) === liveState.striker?._id
    );
    const nonStrikerCard = activeInnings.scorecard.batsmen.find(
      (b: any) => (b.player?._id || b.player) === liveState.nonStriker?._id
    );

    return [
      { card: strikerCard, live: liveState.striker, isStriker: true },
      { card: nonStrikerCard, live: liveState.nonStriker, isStriker: false }
    ].filter(item => item.live);
  };

  const liveBatters = getLiveBatters();

  const getLiveBowler = () => {
    if (!isLive || !liveState || !activeInnings || !liveState.currentBowler) return null;

    const bowlerCard = activeInnings.scorecard.bowlers.find(
      (b: any) => (b.player?._id || b.player) === liveState.currentBowler?._id
    );

    return { card: bowlerCard, live: liveState.currentBowler };
  };

  const liveBowler = getLiveBowler();

  const getLastWicket = () => {
    if (!currentMatch || activeInningsIdx < 0 || !activeInnings) return null;

    const wicketComm = commentary.find((c: any) => c.type === 'wicket');
    if (!wicketComm) return null;

    const batsmanOutId = wicketComm.metadata?.batsmanOutId;
    if (!batsmanOutId) return null;

    const batsmanCard = activeInnings.scorecard.batsmen.find(
      (b: any) => (b.player?._id || b.player) === batsmanOutId
    );
    if (!batsmanCard) return null;

    let runsAfterWicket = 0;
    let wicketsAfterWicket = 0;
    for (let i = 0; i < commentary.length; i++) {
      const comm = commentary[i];
      if (comm.type === 'wicket' && comm.metadata?.batsmanOutId === batsmanOutId) {
        break;
      }
      runsAfterWicket += (comm.runs || 0);
      if (comm.type === 'wicket') {
        wicketsAfterWicket += 1;
      }
    }
    const scoreAtDismissalRuns = currentInningsRuns - runsAfterWicket;
    const scoreAtDismissalWickets = currentInningsWickets - wicketsAfterWicket;

    return {
      name: formatPlayerName(batsmanCard.player?.name),
      runs: batsmanCard.runs,
      balls: batsmanCard.balls,
      scoreAtDismissal: `${scoreAtDismissalRuns}/${scoreAtDismissalWickets}`,
      over: `${wicketComm.overNum}.${wicketComm.ballNum}`
    };
  };

  const lastWicket = getLastWicket();

  const getRecentOvers = () => {
    if (!currentMatch || commentary.length === 0) return [];

    const oversMap: { [key: number]: any[] } = {};
    commentary.forEach((comm: any) => {
      const over = comm.overNum;
      if (!oversMap[over]) {
        oversMap[over] = [];
      }
      oversMap[over].push(comm);
    });

    return Object.keys(oversMap)
      .map(Number)
      .sort((a, b) => b - a)
      .slice(0, 3)
      .map(overNum => {
        const balls = [...oversMap[overNum]].sort((a, b) => a.ballNum - b.ballNum);
        const totalRuns = balls.reduce((sum, b) => sum + (b.runs || 0), 0);
        const bowlerId = balls[0]?.metadata?.bowlerId;

        let bowlerName = 'Bowler';
        if (bowlerId) {
          const allP = [...(currentMatch.playingXIA || []), ...(currentMatch.playingXIB || [])];
          const matching = allP.find(p => p._id === bowlerId);
          if (matching) {
            bowlerName = formatPlayerName(matching.name);
          }
        }

        return {
          overNum,
          balls,
          totalRuns,
          bowlerName
        };
      });
  };

  const recentOversList = getRecentOvers();

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* REDESIGNED HEADER: Match Situation Banner */}
          <div className="mb-6 p-4 rounded-xl border border-[#66fcf1]/25 bg-[#66fcf1]/5 flex flex-col md:flex-row md:items-center justify-between gap-4 select-none">
            <div className="flex items-center space-x-2.5">
              <Radio className="w-5 h-5 text-red-500 animate-pulse" />
              <span className="text-xs uppercase font-extrabold tracking-widest text-gray-400">Match Status:</span>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider ${
                status === 'Live' ? 'bg-[#39ff14]/10 text-[#39ff14]' : status === 'Completed' ? 'bg-[#66fcf1]/10 text-[#66fcf1]' : 'bg-yellow-500/10 text-yellow-400'
              }`}>
                {status}
              </span>
            </div>

            <h2 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
              {status === 'Completed' && result ? (
                result.winner ? (
                  `${formatPlayerName(typeof result.winner === 'object' ? result.winner.name : (result.winner === teamA._id ? teamA.name : teamB.name))} ${result.margin}`
                ) : (
                  result.margin || 'Match Tied'
                )
              ) : isLive && isSecondInnings ? (
                `Need ${runsNeeded} Runs in ${ballsRemaining} Balls (RRR: ${rrr})`
              ) : isLive ? (
                `${formatPlayerName(battingTeamName)} is setting target (CRR: ${crr})`
              ) : (
                `Match starting soon. Toss won by ${formatPlayerName(currentMatch.toss?.wonBy === teamA._id ? teamA.name : teamB.name)}`
              )}
            </h2>
          </div>

          {/* REDESIGNED HERO SCOREBOARD */}
          <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/15 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col lg:flex-row justify-between gap-8">
              {/* Batting Team Column */}
              <div className="flex-1 space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Batting Team</span>
                  <div className="flex items-baseline space-x-3.5">
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-wide uppercase">
                      {formatPlayerName(battingTeamName)}
                    </h1>
                    <p className="text-3xl md:text-4xl font-black text-[#66fcf1] font-mono tracking-tight">
                      {currentInningsRuns}
                      <span className="text-white">/</span>
                      {currentInningsWickets}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl font-mono">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Overs Bowled</span>
                    <span className="text-lg font-bold text-white mt-1 block">{currentInningsOvers} / {currentMatch.oversCount}</span>
                  </div>

                  <div className="bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl font-mono">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Current RR (CRR)</span>
                    <span className="text-lg font-bold text-[#66fcf1] mt-1 block">{crr}</span>
                  </div>

                  {isSecondInnings && (
                    <>
                      <div className="bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl font-mono">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Required RR (RRR)</span>
                        <span className="text-lg font-bold text-yellow-400 mt-1 block">{rrr}</span>
                      </div>

                      <div className="bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl font-mono">
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Target Target</span>
                        <span className="text-lg font-bold text-pink-500 mt-1 block">{target}</span>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Bowling Team / Innings 1 Summary Column */}
              <div className="flex-shrink-0 lg:w-80 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-8 space-y-4">
                <div>
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest block font-bold">Opponent Summary</span>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-sm font-bold text-gray-300 uppercase">{formatPlayerName(bowlingTeamName)}</span>
                    <span className="font-mono text-sm text-gray-400">
                      {isSecondInnings ? (
                        <span className="font-bold text-white">{bowlingScore?.runs}/{bowlingScore?.wickets} <span className="text-xs text-gray-500">({bowlingScore?.overs} ov)</span></span>
                      ) : (
                        <span className="text-xs italic text-gray-500">Yet to bat</span>
                      )}
                    </span>
                  </div>
                </div>

                {isLive && partnership && (
                  <div className="bg-[#1f2833]/40 border border-white/5 p-3 rounded-xl">
                    <span className="text-[9px] text-gray-500 uppercase tracking-widest block font-bold">Active Partnership</span>
                    <span className="text-sm font-extrabold text-[#39ff14] mt-1 block font-mono">
                      {partnership.runs} Runs <span className="text-xs text-gray-400 font-normal">({partnership.balls} balls)</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Current Over ball tracker */}
            {isLive && liveState?.currentOverRuns && (
              <div className="border-t border-white/5 mt-6 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Current Over:</span>
                  <span className="text-xs font-mono font-bold text-[#66fcf1]">
                    (Runs: {liveState.currentOverRuns.reduce((sum, b) => sum + b.run, 0) + liveState.currentOverRuns.filter(b => b.isExtra).length} runs)
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono">
                  {liveState.currentOverRuns.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">Waiting for next delivery...</span>
                  ) : (
                    liveState.currentOverRuns.map((ball, i) => {
                      let text = String(ball.run);
                      let style = 'bg-[#1f2833]/80 border-white/5 text-white';

                      if (ball.isWicket) {
                        text = 'W';
                        style = 'bg-red-600 border-red-500 text-white font-black shadow-md shadow-red-500/25';
                      } else if (ball.isExtra) {
                        text = `${ball.extraType === 'wide' ? 'WD' : 'NB'}`;
                        style = 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400 font-bold';
                      } else if (ball.run === 4 || ball.run === 6) {
                        style = 'bg-[#66fcf1]/20 border-[#66fcf1]/45 text-[#66fcf1] font-bold';
                      }

                      return (
                        <span
                          key={i}
                          className={`w-7 h-7 rounded-full border flex items-center justify-center text-xs select-none ${style}`}
                        >
                          {text}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Matches Navigation Tab Controls */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8 select-none">
            <button
              onClick={() => setActiveTab('live')}
              className={`flex items-center space-x-2 pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'live'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Radio className="w-4 h-4" />
              <span>Live Room</span>
            </button>
            <button
              onClick={() => setActiveTab('scorecard')}
              className={`flex items-center space-x-2 pb-4 px-6 font-bold uppercase tracking-wider text-sm transition focus:outline-none border-b-2 ${
                activeTab === 'scorecard'
                  ? 'border-[#66fcf1] text-[#66fcf1]'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
              <span>Full Scorecard</span>
            </button>
          </div>

          {/* Switch board components */}
          {activeTab === 'live' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Live Batsmen card, Bowler card, Last wicket, Recent overs & commentary */}
              <div className="lg:col-span-2 space-y-8">
                
                {/* Live Batters Card & Live Bowler Card Grid */}
                {isLive && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Live Batters Card */}
                    <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 md:col-span-2 space-y-4">
                      <div className="border-b border-white/5 pb-2 flex justify-between items-center text-[10px] text-gray-500 font-extrabold uppercase tracking-wider">
                        <span>Live Batsmen</span>
                        <span className="font-mono text-[#66fcf1]">R (B) 4s 6s SR</span>
                      </div>
                      
                      <div className="space-y-3 font-mono text-xs">
                        {liveBatters.map((item, bIdx) => {
                          const nameFormatted = formatPlayerName(item.live?.name);
                          const runsVal = item.card?.runs || 0;
                          const ballsVal = item.card?.balls || 0;
                          const foursVal = item.card?.fours || 0;
                          const sixesVal = item.card?.sixes || 0;
                          const srVal = ballsVal > 0 ? ((runsVal / ballsVal) * 100).toFixed(1) : '0.0';

                          return (
                            <div
                              key={bIdx}
                              className={`flex justify-between items-center p-2.5 rounded-xl border transition ${
                                item.isStriker
                                  ? 'bg-[#66fcf1]/5 border-[#66fcf1]/30 text-white font-bold'
                                  : 'bg-transparent border-transparent text-gray-400'
                              }`}
                            >
                              <span className="flex items-center space-x-2 font-sans truncate pr-2">
                                {item.isStriker ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse"></span>
                                    <span className="text-[#66fcf1] uppercase">{nameFormatted} *</span>
                                  </>
                                ) : (
                                  <span className="pl-4 uppercase">{nameFormatted}</span>
                                )}
                              </span>
                              
                              <div className="flex items-center space-x-3 text-right">
                                <span className="font-bold text-white w-14 block">
                                  {runsVal} <span className="text-[10px] text-gray-400 font-normal">({ballsVal})</span>
                                </span>
                                <span className="w-6 text-center text-[10px] text-gray-500">{foursVal}</span>
                                <span className="w-6 text-center text-[10px] text-gray-500">{sixesVal}</span>
                                <span className="w-12 text-[10px] text-gray-500">{srVal}</span>
                              </div>
                            </div>
                          );
                        })}
                        {liveBatters.length === 0 && (
                          <p className="text-gray-600 italic">No batsmen active currently.</p>
                        )}
                      </div>
                    </div>

                    {/* Live Bowler Card */}
                    <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 space-y-4">
                      <div className="border-b border-white/5 pb-2 text-[10px] text-gray-500 font-extrabold uppercase tracking-wider flex justify-between">
                        <span>Active Bowler</span>
                        <span className="font-mono text-[#ff007f]">O M R W EC</span>
                      </div>

                      {liveBowler ? (() => {
                        const nameFormatted = formatPlayerName(liveBowler.live?.name);
                        const oversVal = liveBowler.card?.overs || 0;
                        const maidensVal = liveBowler.card?.maidens || 0;
                        const runsVal = liveBowler.card?.runs || 0;
                        const wicketsVal = liveBowler.card?.wickets || 0;
                        const ballsVal = getBallsCount(oversVal);
                        const econVal = ballsVal > 0 ? ((runsVal / ballsVal) * 6).toFixed(2) : '0.00';

                        return (
                          <div className="p-2.5 rounded-xl bg-[#ff007f]/5 border border-[#ff007f]/20 font-mono text-xs flex justify-between items-center">
                            <span className="font-sans font-bold text-white truncate max-w-[90px] uppercase">{nameFormatted}</span>
                            <div className="flex space-x-1.5 text-right font-bold text-[#66fcf1]">
                              <span className="w-6 block text-[#ff007f]">{oversVal}</span>
                              <span className="w-4 block text-gray-500">{maidensVal}</span>
                              <span className="w-6 block text-gray-400">{runsVal}</span>
                              <span className="w-4 block text-[#39ff14] font-black">{wicketsVal}</span>
                              <span className="w-10 block text-gray-500 text-[10px]">{econVal}</span>
                            </div>
                          </div>
                        );
                      })() : (
                        <p className="text-gray-600 italic text-xs">No active bowler.</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Match Situation Card */}
                {isSecondInnings && status === 'Live' && (
                  <div className="glass-card p-5 border-yellow-500/20 bg-yellow-500/5 flex items-center justify-between gap-4 font-mono text-xs">
                    <span className="text-[10px] text-yellow-500 font-extrabold uppercase tracking-widest">Match Situation:</span>
                    <span className="text-white font-black uppercase text-sm">
                      Need {runsNeeded} runs in {ballsRemaining} balls (Req. Run Rate: {rrr})
                    </span>
                  </div>
                )}

                {/* Last Wicket Card */}
                {lastWicket && (
                  <div className="glass-card p-5 border-white/5 bg-[#0b0c10]/20 space-y-2">
                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block font-bold">Last Wicket Fallen</span>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs font-mono font-bold text-gray-300">
                      <span className="text-[#ff007f] uppercase font-sans">{lastWicket.name}</span>
                      <div className="flex space-x-4 text-[10px] text-gray-500 uppercase mt-1 sm:mt-0">
                        <span>Score: <strong className="text-white font-mono">{lastWicket.runs} ({lastWicket.balls}b)</strong></span>
                        <span>Fell At: <strong className="text-[#66fcf1] font-mono">{lastWicket.scoreAtDismissal}</strong></span>
                        <span>Over: <strong className="text-white font-mono">{lastWicket.over}</strong></span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recent Overs Tracker Section */}
                {recentOversList.length > 0 && (
                  <div className="glass-card p-5 border-[#66fcf1]/10 bg-[#0b0c10]/20 space-y-4 font-mono text-xs">
                    <span className="text-[10px] text-gray-500 font-extrabold uppercase tracking-widest block font-bold">Recent Overs History</span>
                    
                    <div className="space-y-3">
                      {recentOversList.map((over, oIdx) => (
                        <div key={oIdx} className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-2 gap-2">
                          <div className="flex items-center space-x-3.5">
                            <span className="text-[#66fcf1] font-bold">Ov {over.overNum}:</span>
                            <div className="flex gap-1.5">
                              {over.balls.map((ball, bIdx) => {
                                let style = 'text-white border-white/5 bg-[#1f2833]/40';
                                let text = String(ball.runs);
                                if (ball.type === 'wicket') {
                                  style = 'bg-red-600 border-red-500 text-white font-black';
                                  text = 'W';
                                } else if (ball.type === 'boundary') {
                                  style = 'bg-[#66fcf1]/10 border-[#66fcf1]/30 text-[#66fcf1] font-bold';
                                } else if (ball.type === 'extra') {
                                  style = 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400';
                                  text = 'Ex';
                                }
                                return (
                                  <span key={bIdx} className={`w-6 h-6 rounded border flex items-center justify-center text-[10px] ${style}`}>
                                    {text}
                                  </span>
                                );
                              })}
                            </div>
                          </div>
                          
                          <div className="text-[10px] text-gray-500 flex space-x-3 font-bold uppercase sm:text-right">
                            <span>Runs: <strong className="text-white">{over.totalRuns}</strong></span>
                            <span>Bowler: <strong className="text-gray-300 font-sans">{over.bowlerName}</strong></span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Commentary Stream Feed */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <div className="flex items-center space-x-2.5 mb-6 select-none">
                    <BookOpen className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-sm uppercase font-extrabold tracking-widest text-white font-mono">Ball-by-Ball Commentary</h3>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 font-mono">
                    {commentary.length === 0 ? (
                      <p className="text-gray-600 text-sm italic">Live commentary logs will show here.</p>
                    ) : (
                      commentary.map((comm, idx) => {
                        let textTheme = 'text-gray-400 border-white/5';
                        let tag = 'RUNS';

                        if (comm.type === 'wicket') {
                          textTheme = 'bg-[#ff007f]/5 border-[#ff007f]/20 text-pink-300';
                          tag = 'WKT';
                        } else if (comm.type === 'boundary') {
                          textTheme = 'bg-[#66fcf1]/5 border-[#66fcf1]/20 text-cyan-200';
                          tag = comm.runs === 6 ? 'SIX' : 'FOUR';
                        } else if (comm.type === 'extra') {
                          textTheme = 'bg-yellow-500/5 border-yellow-500/20 text-yellow-300';
                          tag = 'EXT';
                        }

                        return (
                          <div
                            key={idx}
                            className={`p-4 rounded-xl border flex items-start space-x-4 ${textTheme}`}
                          >
                            <div className="flex-shrink-0 bg-[#0b0c10] border border-[#66fcf1]/20 rounded px-2.5 py-1 text-center min-w-[55px] select-none">
                              <p className="text-xs font-mono font-bold text-white">
                                {comm.overNum}.{comm.ballNum}
                              </p>
                              <span className="text-[8px] uppercase tracking-widest font-black text-[#66fcf1] block mt-0.5">
                                {tag}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed font-sans">{comm.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Wagon Wheel Shot Vectors */}
              <div>
                <WagonWheel points={currentMatch.wagonWheel} />
              </div>
            </div>
          ) : (
            /* Redesigned Scorecard Tab */
            <div className="space-y-10">
              {currentMatch.innings.map((inn, idx) => (
                <div key={idx} className="glass-card p-6 border-[#66fcf1]/10 space-y-6">
                  <div className="border-b border-[#66fcf1]/15 pb-4 flex justify-between items-center">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      {formatPlayerName(inn.battingTeam.name)} Innings
                    </h3>
                    <span className="font-mono text-sm text-gray-500 uppercase">
                      Innings {idx + 1}
                    </span>
                  </div>

                  {/* Batting Roster */}
                  <div className="space-y-4 font-mono">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">BATTING ROSTER</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400 border-collapse">
                        <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                          <tr>
                            <th className="py-2.5 px-2">Batsman</th>
                            <th className="py-2.5 px-2">Dismissal Status</th>
                            <th className="py-2.5 px-2 text-center font-bold">R</th>
                            <th className="py-2.5 px-2 text-center">B</th>
                            <th className="py-2.5 px-2 text-center">4s</th>
                            <th className="py-2.5 px-2 text-center">6s</th>
                            <th className="py-2.5 px-2 text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inn.scorecard.batsmen.map((batsman, bIdx) => {
                            const sr = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={bIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3 px-2 font-bold text-white font-sans uppercase">{formatPlayerName(batsman.player.name)}</td>
                                <td className="py-3 px-2 text-xs truncate max-w-[150px]">
                                  {batsman.howOut === 'Not Out' ? (
                                    <span className="text-[#39ff14] font-semibold">not out</span>
                                  ) : batsman.howOut === 'run-out' ? (
                                    <span className="text-gray-500">run out</span>
                                  ) : batsman.howOut === 'retired-hurt' ? (
                                    <span className="text-gray-500 font-semibold">retired hurt</span>
                                  ) : (
                                    <span className="text-gray-500">
                                      {batsman.howOut} b {formatPlayerName(batsman.bowler?.name || 'Bowler')}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 font-bold text-white text-center">{batsman.runs}</td>
                                <td className="py-3 px-2 text-center">{batsman.balls}</td>
                                <td className="py-3 px-2 text-center">{batsman.fours}</td>
                                <td className="py-3 px-2 text-center">{batsman.sixes}</td>
                                <td className="py-3 px-2 text-right text-gray-500">{sr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bowling Roster */}
                  <div className="space-y-4 pt-4 border-t border-[#66fcf1]/5 font-mono">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f]">BOWLING ROSTER</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400 border-collapse">
                        <thead className="text-[10px] uppercase text-gray-500 font-bold border-b border-white/5">
                          <tr>
                            <th className="py-2.5 px-2">Bowler</th>
                            <th className="py-2.5 px-2 text-center">O</th>
                            <th className="py-2.5 px-2 text-center">M</th>
                            <th className="py-2.5 px-2 text-center">R</th>
                            <th className="py-2.5 px-2 text-center font-bold">W</th>
                            <th className="py-2.5 px-2 text-right">Econ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inn.scorecard.bowlers.map((bowler, bwIdx) => {
                            const economy = bowler.overs > 0 ? (bowler.runs / bowler.overs).toFixed(2) : '0.00';
                            return (
                              <tr key={bwIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3 px-2 font-bold text-white font-sans uppercase">{formatPlayerName(bowler.player.name)}</td>
                                <td className="py-3 px-2 text-center">{bowler.overs}</td>
                                <td className="py-3 px-2 text-center">{bowler.maidens}</td>
                                <td className="py-3 px-2 text-center">{bowler.runs}</td>
                                <td className="py-3 px-2 font-bold text-white text-center text-[#66fcf1]">{bowler.wickets}</td>
                                <td className="py-3 px-2 text-right text-gray-500">{economy}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
