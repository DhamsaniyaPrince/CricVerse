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
import { Activity, Radio, List, BookOpen, AlertCircle, RefreshCw, Star } from 'lucide-react';

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

  const { score, liveState, commentary, status, teamA, teamB, result } = currentMatch;
  const isLive = status === 'Live';

  // Math helpers for Run Rates
  const getBallsCount = (overs: number) => {
    const oversInt = Math.floor(overs);
    const ballsPart = Math.round((overs - oversInt) * 10);
    return oversInt * 6 + ballsPart;
  };

  const activeInningsIdx = currentMatch ? currentMatch.innings.length - 1 : -1;
  const isSecondInnings = currentMatch ? currentMatch.innings.length === 2 : false;

  // Identify who is batting in active innings
  const activeBattingTeamId = currentMatch && activeInningsIdx >= 0 ? currentMatch.innings[activeInningsIdx].battingTeam._id : null;
  const isTeamBActiveBatting = activeBattingTeamId === teamB._id;
  
  const activeRuns = isTeamBActiveBatting ? score.teamB.runs : score.teamA.runs;
  const activeOvers = isTeamBActiveBatting ? score.teamB.overs : score.teamA.overs;

  const crr = calculateCRR(activeRuns, activeOvers);
  const rrr = calculateRRR();

  function calculateCRR(runs: number, overs: number) {
    const totalBalls = getBallsCount(overs);
    if (totalBalls === 0) return '0.00';
    return ((runs / totalBalls) * 6).toFixed(2);
  }

  function calculateRRR() {
    if (!isSecondInnings || !currentMatch) return null;
    const target = (activeBattingTeamId === teamA._id ? score.teamB.runs : score.teamA.runs) + 1;
    const totalBallsLimit = currentMatch.oversCount * 6;
    const ballsBowled = getBallsCount(activeOvers);
    const ballsRemaining = Math.max(0, totalBallsLimit - ballsBowled);
    
    if (ballsRemaining === 0) return activeRuns >= target ? '0.00' : 'N/A';
    const runsNeeded = Math.max(0, target - activeRuns);
    return ((runsNeeded / ballsRemaining) * 6).toFixed(2);
  }

  // Aggregate partnership runs & balls
  const getPartnership = () => {
    if (!isLive || !liveState?.striker || !liveState?.nonStriker || activeInningsIdx < 0 || !currentMatch) return null;
    const activeInnings = currentMatch.innings[activeInningsIdx];
    const strikerCard = activeInnings.scorecard.batsmen.find(
      b => b.player._id === liveState.striker?._id
    );
    const nonStrikerCard = activeInnings.scorecard.batsmen.find(
      b => b.player._id === liveState.nonStriker?._id
    );
    const runsVal = (strikerCard?.runs || 0) + (nonStrikerCard?.runs || 0);
    const ballsVal = (strikerCard?.balls || 0) + (nonStrikerCard?.balls || 0);
    return { runs: runsVal, balls: ballsVal };
  };

  const partnership = getPartnership();

  return (
    <div className="flex flex-col min-h-screen bg-[#0b0c10]">
      <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      <div className="flex flex-1">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full">
          {/* Live Score Header Card */}
          <div className="glass-card p-6 md:p-8 mb-8 border-[#66fcf1]/10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#66fcf1]/5 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              {/* Teams & Scores */}
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1.5">
                    <Radio className="w-4 h-4 text-red-500 animate-pulse" />
                    <span>{status} Feed</span>
                  </span>
                  {isLive && (
                    <span className="flex items-center space-x-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14] animate-pulse-fast neon-glow-green"></span>
                      <span className="text-[10px] font-bold text-[#39ff14] tracking-widest uppercase">LIVE PULSE</span>
                    </span>
                  )}
                </div>

                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl md:text-3xl font-black text-white">{teamA.name}</h2>
                    <span className="text-xl md:text-2xl font-mono text-[#66fcf1] font-bold">
                      {score.teamA.runs}/{score.teamA.wickets}
                      <span className="text-xs text-gray-500 pl-1.5">({score.teamA.overs} ov)</span>
                    </span>
                  </div>
                  <div className="flex items-center space-x-4">
                    <h2 className="text-2xl md:text-3xl font-black text-white">{teamB.name}</h2>
                    <span className="text-xl md:text-2xl font-mono text-[#66fcf1] font-bold">
                      {score.teamB.runs}/{score.teamB.wickets}
                      <span className="text-xs text-gray-500 pl-1.5">({score.teamB.overs} ov)</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Match Run Rates & Partnerships */}
              <div className="flex flex-col items-start md:items-end justify-center space-y-3">
                {isLive && (
                  <div className="flex flex-wrap gap-2 text-xs font-mono">
                    <div className="bg-[#1f2833]/60 border border-white/5 py-1.5 px-3 rounded-xl">
                      <span className="text-gray-500 font-bold block text-[9px] uppercase">CRR</span>
                      <span className="text-[#66fcf1] font-bold">{crr}</span>
                    </div>
                    {rrr && (
                      <div className="bg-[#1f2833]/60 border border-white/5 py-1.5 px-3 rounded-xl">
                        <span className="text-gray-500 font-bold block text-[9px] uppercase">RRR</span>
                        <span className="text-[#ff007f] font-bold">{rrr}</span>
                      </div>
                    )}
                    {partnership && (
                      <div className="bg-[#1f2833]/60 border border-white/5 py-1.5 px-3 rounded-xl">
                        <span className="text-gray-500 font-bold block text-[9px] uppercase">PARTNERSHIP</span>
                        <span className="text-[#39ff14] font-bold">{partnership.runs} ({partnership.balls}b)</span>
                      </div>
                    )}
                  </div>
                )}

                {status === 'Completed' && result ? (
                  <div className="bg-emerald-950/45 border border-emerald-500/30 py-3 px-5 rounded-2xl">
                    <p className="text-xs uppercase text-gray-500 font-bold tracking-widest">Match Result</p>
                    <p className="text-emerald-400 font-extrabold text-sm md:text-base mt-1">
                      {result.winner?.name || 'Winner'} won {result.margin}
                    </p>
                  </div>
                ) : (
                  <div className="bg-[#1f2833]/60 border border-[#66fcf1]/20 py-3 px-5 rounded-2xl">
                    <p className="text-xs uppercase text-gray-500 font-bold tracking-widest">Toss Decision</p>
                    <p className="text-white font-extrabold text-sm mt-1 uppercase">
                      {currentMatch.toss?.wonBy === teamA._id ? teamA.name : teamB.name} won & chose{' '}
                      <span className="text-[#66fcf1]">{currentMatch.toss?.decision}</span>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Over Ticker Panel (Live status only) */}
            {isLive && liveState && liveState.currentOverRuns && (
              <div className="border-t border-[#66fcf1]/10 mt-6 pt-4 flex items-center justify-between">
                <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Current Over:</span>
                <div className="flex items-center space-x-2">
                  {liveState.currentOverRuns.length === 0 ? (
                    <span className="text-xs text-gray-500 italic">Starting new over...</span>
                  ) : (
                    liveState.currentOverRuns.map((ball, i) => {
                      let text = String(ball.run);
                      let style = 'bg-[#1f2833]/80 border-white/5 text-white';

                      if (ball.isWicket) {
                        text = 'W';
                        style = 'bg-[#ff007f]/20 border-[#ff007f]/45 text-[#ff007f] font-bold';
                      } else if (ball.isExtra) {
                        text = `${ball.extraType === 'wide' ? 'WD' : 'NB'}`;
                        style = 'bg-yellow-500/10 border-yellow-500/35 text-yellow-500';
                      } else if (ball.run === 4 || ball.run === 6) {
                        style = 'bg-[#66fcf1]/20 border-[#66fcf1]/45 text-[#66fcf1] font-bold';
                      }

                      return (
                        <div
                          key={i}
                          className={`w-8 h-8 rounded-full border flex items-center justify-center text-xs font-mono select-none ${style}`}
                        >
                          {text}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Active room tabs */}
          <div className="flex border-b border-[#66fcf1]/15 mb-8">
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

          {/* Tabs switchboard */}
          {activeTab === 'live' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column: Live Batter/Bowler status + commentary stream */}
              <div className="lg:col-span-2 space-y-8">
                {/* Active Partnership Card */}
                {isLive && liveState && (
                  <div className="glass-card p-6 border-[#66fcf1]/10 space-y-4">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-[#66fcf1]/10 pb-3 mb-2 flex items-center justify-between">
                      <span>Live Batting & Bowling</span>
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Active Batsmen */}
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase">BATSMEN</p>
                        <div className="space-y-2.5">
                          {/* Striker */}
                          {liveState.striker && (
                            <div className="flex items-center justify-between text-sm bg-[#66fcf1]/5 p-2 rounded-xl border border-[#66fcf1]/10">
                              <span className="font-semibold text-white flex items-center space-x-2">
                                <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse"></span>
                                <span>{liveState.striker.name}</span>
                              </span>
                              <span className="font-mono text-gray-400">Striker</span>
                            </div>
                          )}
                          {/* Non-Striker */}
                          {liveState.nonStriker && (
                            <div className="flex items-center justify-between text-sm p-2">
                              <span className="text-gray-300 font-semibold pl-4">{liveState.nonStriker.name}</span>
                              <span className="font-mono text-gray-500">Non-Striker</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Active Bowler */}
                      <div className="space-y-3">
                        <p className="text-[10px] text-gray-500 font-extrabold tracking-widest uppercase">BOWLER</p>
                        {liveState.currentBowler && (
                          <div className="p-3 bg-[#ff007f]/5 rounded-xl border border-[#ff007f]/10 text-sm flex items-center justify-between">
                            <span className="font-semibold text-white">{liveState.currentBowler.name}</span>
                            <span className="font-mono text-pink-400 font-bold">Active Bowler</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Commentary list */}
                <div className="glass-card p-6 border-[#66fcf1]/10">
                  <div className="flex items-center space-x-2 mb-6">
                    <BookOpen className="w-5 h-5 text-[#66fcf1]" />
                    <h3 className="text-sm uppercase font-extrabold tracking-widest text-white">Ball Commentary</h3>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                    {commentary.length === 0 ? (
                      <p className="text-gray-600 text-sm italic">Commentary loading...</p>
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
                            <div className="flex-shrink-0 bg-[#0b0c10] border border-[#66fcf1]/20 rounded px-2.5 py-1 text-center min-w-[55px]">
                              <p className="text-xs font-mono font-bold text-white">
                                {comm.overNum}.{comm.ballNum}
                              </p>
                              <span className="text-[8px] uppercase tracking-widest font-black text-[#66fcf1] block mt-0.5">
                                {tag}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">{comm.text}</p>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Wagon Wheel */}
              <div>
                <WagonWheel points={currentMatch.wagonWheel} />
              </div>
            </div>
          ) : (
            /* Scorecard tab */
            <div className="space-y-10">
              {currentMatch.innings.map((innings, idx) => (
                <div key={idx} className="glass-card p-6 border-[#66fcf1]/10 space-y-6">
                  <div className="border-b border-[#66fcf1]/15 pb-4">
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">
                      {innings.battingTeam.name} Innings
                    </h3>
                  </div>

                  {/* Batting scorecard */}
                  <div className="space-y-4">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">BATTING</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                          <tr>
                            <th className="py-2.5 px-2">BATSMAN</th>
                            <th className="py-2.5 px-2">STATUS</th>
                            <th className="py-2.5 px-2 font-mono text-center">R</th>
                            <th className="py-2.5 px-2 font-mono text-center">B</th>
                            <th className="py-2.5 px-2 font-mono text-center">4s</th>
                            <th className="py-2.5 px-2 font-mono text-center">6s</th>
                            <th className="py-2.5 px-2 font-mono text-right">SR</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.scorecard.batsmen.map((batsman, bIdx) => {
                            const sr = batsman.balls > 0 ? ((batsman.runs / batsman.balls) * 100).toFixed(1) : '0.0';
                            return (
                              <tr key={bIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3 px-2 font-bold text-white">{batsman.player.name}</td>
                                <td className="py-3 px-2 text-xs truncate max-w-[150px]">
                                  {batsman.howOut === 'Not Out' ? (
                                    <span className="text-[#39ff14] font-semibold">not out</span>
                                  ) : (
                                    <span className="text-gray-500">
                                      out {batsman.howOut} b {batsman.bowler?.name || 'Bowler'}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-2 font-mono font-bold text-white text-center">{batsman.runs}</td>
                                <td className="py-3 px-2 font-mono text-center">{batsman.balls}</td>
                                <td className="py-3 px-2 font-mono text-center">{batsman.fours}</td>
                                <td className="py-3 px-2 font-mono text-center">{batsman.sixes}</td>
                                <td className="py-3 px-2 font-mono text-right text-gray-500">{sr}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Bowling scorecard */}
                  <div className="space-y-4 pt-4 border-t border-[#66fcf1]/5">
                    <p className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f]">BOWLING</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-gray-400">
                        <thead className="text-xs uppercase text-gray-500 font-bold border-b border-white/5">
                          <tr>
                            <th className="py-2.5 px-2">BOWLER</th>
                            <th className="py-2.5 px-2 font-mono text-center">O</th>
                            <th className="py-2.5 px-2 font-mono text-center">M</th>
                            <th className="py-2.5 px-2 font-mono text-center">R</th>
                            <th className="py-2.5 px-2 font-mono text-center">W</th>
                            <th className="py-2.5 px-2 font-mono text-right">ECON</th>
                          </tr>
                        </thead>
                        <tbody>
                          {innings.scorecard.bowlers.map((bowler, bwIdx) => {
                            const economy = bowler.overs > 0 ? (bowler.runs / bowler.overs).toFixed(2) : '0.00';
                            return (
                              <tr key={bwIdx} className="border-b border-white/5 hover:bg-white/5 transition">
                                <td className="py-3 px-2 font-bold text-white">{bowler.player.name}</td>
                                <td className="py-3 px-2 font-mono text-center">{bowler.overs}</td>
                                <td className="py-3 px-2 font-mono text-center">{bowler.maidens}</td>
                                <td className="py-3 px-2 font-mono text-center">{bowler.runs}</td>
                                <td className="py-3 px-2 font-mono font-bold text-white text-center">{bowler.wickets}</td>
                                <td className="py-3 px-2 font-mono text-right text-gray-500">{economy}</td>
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
