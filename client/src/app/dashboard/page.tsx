'use client';

import React, { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { RootState } from '@/store';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import Sidebar from '@/components/layout/Sidebar';
import ShareModal from '@/components/common/ShareModal';
import api from '@/utils/api';
import { getSiteUrl } from '@/utils/urlHelper';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar,
  AreaChart, Area, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  User, Trophy, Award, Activity, Calendar, 
  Zap, Star, RefreshCw, Share2, Download, 
  Flame, ChevronRight, TrendingUp, ShieldAlert,
  Edit2, X, Camera, Shield, Users, Briefcase, PlusCircle, ArrowRight,
  Vote, HelpCircle, CheckCircle, HelpCircle as TriviaIcon, Settings as ConfigIcon, Pin
} from 'lucide-react';

interface PlayerStats {
  batting: {
    matches: number;
    innings: number;
    runs: number;
    ballsFaced: number;
    highestScore: number;
    average: number;
    strikeRate: number;
    fours: number;
    sixes: number;
    fifties: number;
    hundreds: number;
    ducks: number;
  };
  bowling: {
    matches: number;
    wickets: number;
    ballsBowled: number;
    runsConceded: number;
    bestBowling: string;
    economy: number;
    maidens: number;
    average: number;
    strikeRate: number;
    fiveWickets: number;
  };
  fielding: {
    catches: number;
    runOuts: number;
    stumpings: number;
  };
}

interface Player {
  _id: string;
  name: string;
  avatar: string;
  username?: string;
  role: string;
  battingStyle: string;
  bowlingStyle: string;
  bio: string;
  stats: PlayerStats;
  catches: number;
  mvpAwards: number;
  teamHistory: { teamName: string; year: string }[];
  currentTeam?: {
    _id: string;
    name: string;
    logo?: string;
  };
  matchHistory: Array<{
    matchId: string;
    runs: number;
    balls: number;
    wickets: number;
    overs: number;
    opponentName: string;
    tournamentName: string;
    resultText: string;
    mvpStatus: boolean;
    date: string;
  }>;
  longestStreak?: number;
  recentFormRating?: number;
  bestMatch?: {
    matchId?: string;
    title?: string;
    runs?: number;
    wickets?: number;
  };
  worstMatch?: {
    matchId?: string;
    title?: string;
    runs?: number;
    wickets?: number;
  };
  playerLevel?: number;
  playerXP?: number;
  careerRank?: string;
  badges?: string[];
  achievementHistory?: Array<{
    title: string;
    description: string;
    date: string;
  }>;
  xpHistory?: Array<{
    amount: number;
    reason: string;
    matchId?: string;
    date: string;
  }>;
}

interface AwardItem {
  _id: string;
  awardType: string;
  performance: string;
  date: string;
  match: {
    _id: string;
    title: string;
    date: string;
  };
}

const BADGES_METADATA = [
  { id: 'First Fifty', title: 'First Fifty', emoji: '🏏', desc: 'Score a half-century (50+ runs) in a match.', color: 'from-blue-500 to-cyan-500' },
  { id: 'First Century', title: 'First Century', emoji: '💯', desc: 'Score a century (100+ runs) in a match.', color: 'from-amber-500 to-orange-500' },
  { id: 'First Five Wicket Haul', title: 'First Five Wicket Haul', emoji: '🎳', desc: 'Take 5+ wickets in a single match.', color: 'from-pink-500 to-rose-500' },
  { id: 'Hat-Trick Hero', title: 'Hat-Trick Hero', emoji: '🔥', desc: 'Take 3 wickets in 3 consecutive deliveries.', color: 'from-red-500 to-orange-600' },
  { id: 'MVP King', title: 'MVP King', emoji: '👑', desc: 'Win the Player of the Match award.', color: 'from-yellow-400 to-amber-600' },
  { id: 'Six Machine', title: 'Six Machine', emoji: '⚡', desc: 'Hit 10+ career sixes.', color: 'from-violet-500 to-purple-500' },
  { id: 'Yorker Specialist', title: 'Yorker Specialist', emoji: '🎯', desc: 'Take 5+ career bowled wickets.', color: 'from-indigo-500 to-blue-600' },
  { id: 'Safe Hands', title: 'Safe Hands', emoji: '🧤', desc: 'Take 5+ career outfield catches.', color: 'from-emerald-500 to-teal-500' },
  { id: 'Tournament Champion', title: 'Tournament Champion', emoji: '🏆', desc: 'Member of a tournament winning squad.', color: 'from-yellow-500 to-gold-500' },
];

const getNextLevelXp = (lvl: number) => {
  const thresholds = [0, 0, 100, 250, 500, 1000];
  let prevDiff = 500;
  for (let l = 6; l <= 100; l++) {
    const diff = prevDiff + 100 + (l - 5) * 10;
    thresholds.push(thresholds[l - 1] + diff);
    prevDiff = diff;
  }
  const nextLvl = Math.min(100, lvl + 1);
  return thresholds[nextLvl] || 100;
};

const getRank = (lvl: number) => {
  if (lvl <= 10) return '🏏 Rookie';
  if (lvl <= 20) return '⭐ Rising Star';
  if (lvl <= 35) return '🔥 Match Winner';
  if (lvl <= 50) return '🏆 Elite Performer';
  if (lvl <= 75) return '💎 Cricket Legend';
  return '👑 Hall of Fame';
};

// Trivia database for the engagement feature
const TRIVIA_DATABASE = [
  {
    question: "Who holds the record for the highest individual score in Test Cricket?",
    options: ["Sachin Tendulkar", "Brian Lara", "Sir Don Bradman", "Virat Kohli"],
    answer: "Brian Lara"
  },
  {
    question: "Which country won the inaugural ICC T20 World Cup in 2007?",
    options: ["India", "Pakistan", "Australia", "South Africa"],
    answer: "India"
  },
  {
    question: "What is the maximum number of overs a bowler can bowl in a standard One Day International?",
    options: ["10 overs", "8 overs", "12 overs", "6 overs"],
    answer: "10 overs"
  }
];

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useSelector((state: RootState) => state.auth);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [player, setPlayer] = useState<Player | null>(null);
  const [timeline, setTimeline] = useState<AwardItem[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'graphs' | 'matches' | 'achievements' | 'controls' | 'engagement'>('overview');
  
  // Real-time matches & leaderboard states
  const [matches, setMatches] = useState<any[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [matchAnalytics, setMatchAnalytics] = useState<any | null>(null);
  const [matchTab, setMatchTab] = useState<'live' | 'upcoming' | 'completed'>('live');
  const [leaderboardData, setLeaderboardData] = useState<any | null>(null);
  const [teamRankings, setTeamRankings] = useState<any[]>([]);
  const [awardsSeason, setAwardsSeason] = useState<any[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(true);
  
  // Share & Edit states
  const [shareOpen, setShareOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    role: 'Batsman',
    battingStyle: 'Right-hand bat',
    bowlingStyle: '',
    bio: '',
    avatar: '',
  });

  // Gamification & Personalization states (with local storage bindings)
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<number>(1);
  const [streak, setStreak] = useState<number>(3);
  const [triviaIndex, setTriviaIndex] = useState<number>(0);
  const [triviaAnswered, setTriviaAnswered] = useState<boolean>(false);
  const [triviaCorrect, setTriviaCorrect] = useState<boolean | null>(null);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<string | null>(null);
  
  const [favTeam, setFavTeam] = useState<string>('GT');
  const [predictVotes, setPredictVotes] = useState<{ [matchId: string]: string }>({});
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [activeWidgets, setActiveWidgets] = useState<string[]>(['kpis', 'live_center', 'caps', 'wagon_wheel', 'trivia', 'predictions']);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // Initialize Gamification from local storage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedXp = localStorage.getItem('cv_xp');
      const savedLevel = localStorage.getItem('cv_level');
      const savedStreak = localStorage.getItem('cv_streak');
      const savedFavTeam = localStorage.getItem('cv_fav_team');
      const savedPredictVotes = localStorage.getItem('cv_predict_votes');
      const savedChallenges = localStorage.getItem('cv_challenges');
      const savedWidgets = localStorage.getItem('cv_widgets');

      if (savedXp) setXp(parseInt(savedXp));
      if (savedLevel) setLevel(parseInt(savedLevel));
      if (savedStreak) setStreak(parseInt(savedStreak));
      if (savedFavTeam) setFavTeam(savedFavTeam);
      if (savedPredictVotes) setPredictVotes(JSON.parse(savedPredictVotes));
      if (savedChallenges) setCompletedChallenges(JSON.parse(savedChallenges));
      if (savedWidgets) setActiveWidgets(JSON.parse(savedWidgets));

      // Choose a random trivia for the day
      setTriviaIndex(Math.floor(Math.random() * TRIVIA_DATABASE.length));
    }
  }, []);

  const gainXp = async (amount: number, reason: string) => {
    try {
      const response = await api.post('/players/xp', { amount, reason });
      if (response.data.success) {
        const { playerXP, playerLevel, careerRank, badges, xpHistory } = response.data.data;
        
        // Show Level Up alert if level increased
        if (player && playerLevel > (player.playerLevel || 1)) {
          alert(`🎉 LEVEL UP! You reached Level ${playerLevel}!`);
        }
        
        // Update local player state
        setPlayer(prev => prev ? {
          ...prev,
          playerLevel,
          playerXP,
          careerRank,
          badges,
          xpHistory
        } : null);

        // Update local state for UI components
        setXp(playerXP);
        setLevel(playerLevel);
        localStorage.setItem('cv_xp', String(playerXP));
        localStorage.setItem('cv_level', String(playerLevel));
      }
    } catch (err) {
      console.error('Error adding player XP to DB:', err);
      // Fallback local logic in case API fails
      let newXp = xp + amount;
      let newLevel = level;
      let targetXp = newLevel * 500;
      let leveledUp = false;

      while (newXp >= targetXp) {
        newXp -= targetXp;
        newLevel += 1;
        targetXp = newLevel * 500;
        leveledUp = true;
      }

      setXp(newXp);
      setLevel(newLevel);
      localStorage.setItem('cv_xp', String(newXp));
      localStorage.setItem('cv_level', String(newLevel));
      
      if (leveledUp) {
        alert(`🎉 LEVEL UP! You reached Level ${newLevel}!`);
      } else {
        console.log(`Earned +${amount} XP for ${reason}`);
      }
    }
  };

  const completeChallenge = (challengeId: string, xpReward: number) => {
    if (completedChallenges.includes(challengeId)) return;
    const updated = [...completedChallenges, challengeId];
    setCompletedChallenges(updated);
    localStorage.setItem('cv_challenges', JSON.stringify(updated));
    gainXp(xpReward, `Challenge: ${challengeId}`);
  };

  const handlePredictVote = (matchId: string, teamChoice: string) => {
    if (predictVotes[matchId]) return; // Already voted
    const updated = { ...predictVotes, [matchId]: teamChoice };
    setPredictVotes(updated);
    localStorage.setItem('cv_predict_votes', JSON.stringify(updated));
    completeChallenge('prediction', 100);
  };

  const handleTriviaAnswer = (option: string) => {
    if (triviaAnswered) return;
    setSelectedTriviaOption(option);
    setTriviaAnswered(true);
    const correct = option === TRIVIA_DATABASE[triviaIndex].answer;
    setTriviaCorrect(correct);
    if (correct) {
      gainXp(150, "Trivia Correct Answer");
      completeChallenge('trivia', 150);
    } else {
      gainXp(30, "Trivia Participation");
    }
  };

  const toggleWidget = (widgetId: string) => {
    let updated = [];
    if (activeWidgets.includes(widgetId)) {
      updated = activeWidgets.filter(w => w !== widgetId);
    } else {
      updated = [...activeWidgets, widgetId];
    }
    setActiveWidgets(updated);
    localStorage.setItem('cv_widgets', JSON.stringify(updated));
  };

  // Fetch telemetry matches and dashboard analytics
  const fetchLiveMatches = async () => {
    setIsLoadingMatches(true);
    try {
      const response = await api.get('/matches');
      if (response.data.success) {
        setMatches(response.data.data);
        // Default select first Live match, or first completed match, or first scheduled
        const live = response.data.data.find((m: any) => m.status === 'Live');
        const completed = response.data.data.find((m: any) => m.status === 'Completed');
        const scheduled = response.data.data.find((m: any) => m.status === 'Scheduled' || m.status === 'Upcoming');
        
        const defaultMatch = live || completed || scheduled;
        if (defaultMatch) {
          setSelectedMatch(defaultMatch);
          fetchMatchWorm(defaultMatch._id);
        }
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
    } finally {
      setIsLoadingMatches(false);
    }
  };

  const fetchMatchWorm = async (matchId: string) => {
    try {
      const response = await api.get(`/analytics/match/${matchId}`);
      if (response.data.success) {
        setMatchAnalytics(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching match worm analytics:', err);
      setMatchAnalytics(null);
    }
  };

  const fetchLeaderboards = async () => {
    setIsLoadingLeaderboard(true);
    try {
      // Aggregated leaderboard fetch
      const lbResponse = await api.get('/leaderboard');
      if (lbResponse.data.success) {
        setLeaderboardData(lbResponse.data.data);
      }

      // Teams rankings fetch
      const teamsResponse = await api.get('/leaderboard?type=teams');
      if (teamsResponse.data.success) {
        setTeamRankings(teamsResponse.data.data);
      }

      // Awards Season fetch
      const awardsResponse = await api.get('/awards/season');
      if (awardsResponse.data.success) {
        setAwardsSeason(awardsResponse.data.data);
      }
    } catch (err) {
      console.error('Error fetching leaderboards:', err);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const fetchPlayerProfile = async () => {
    if (!user) return;
    setIsLoadingProfile(true);
    try {
      const slugifiedUsername = user.username
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');

      const response = await api.get(`/players/${slugifiedUsername}`);
      if (response.data.success) {
        const pData = response.data.data;
        setPlayer(pData);
        if (pData.playerXP !== undefined) setXp(pData.playerXP);
        if (pData.playerLevel !== undefined) setLevel(pData.playerLevel);
        setEditForm({
          name: pData.name,
          role: pData.role || 'Batsman',
          battingStyle: pData.battingStyle || 'Right-hand bat',
          bowlingStyle: pData.bowlingStyle || 'None',
          bio: pData.bio || '',
          avatar: pData.avatar || '',
        });

        // Fetch timeline
        try {
          const timelineRes = await api.get(`/awards/player-timeline/${pData._id}`);
          if (timelineRes.data.success) {
            setTimeline(timelineRes.data.data);
          }
        } catch (err) {
          console.error('Error fetching awards timeline:', err);
        }

        // Fetch analytics
        try {
          const analyticsResponse = await api.get(`/analytics/player/${pData._id}`);
          if (analyticsResponse.data.success) {
            setAnalyticsData(analyticsResponse.data.data);
          }
        } catch (err) {
          console.error('Error fetching player analytics:', err);
        }
      }
    } catch (err) {
      console.log('Player profile not created or lookup failed for user:', user.username, err);
      // Instantiate a fallback player profile matching Case A dashboard structure
      const fallbackPlayer: Player = {
        _id: '',
        name: user.username,
        avatar: user.avatar || '',
        username: user.username,
        role: user.role === 'admin' || user.role === 'organizer' ? 'All-Rounder' : 'Batsman',
        battingStyle: 'Right-hand bat',
        bowlingStyle: 'None',
        bio: 'Welcome to CricVerse! Edit details to build your athlete card.',
        stats: {
          batting: {
            matches: 0,
            innings: 0,
            runs: 0,
            ballsFaced: 0,
            highestScore: 0,
            average: 0,
            strikeRate: 0,
            fours: 0,
            sixes: 0,
            fifties: 0,
            hundreds: 0,
            ducks: 0,
          },
          bowling: {
            matches: 0,
            wickets: 0,
            ballsBowled: 0,
            runsConceded: 0,
            bestBowling: '0/0',
            economy: 0,
            maidens: 0,
            average: 0,
            strikeRate: 0,
            fiveWickets: 0,
          },
          fielding: {
            catches: 0,
            runOuts: 0,
            stumpings: 0,
          },
        },
        catches: 0,
        mvpAwards: 0,
        teamHistory: [],
        matchHistory: [],
      };
      setPlayer(fallbackPlayer);
      setEditForm({
        name: fallbackPlayer.name,
        role: fallbackPlayer.role,
        battingStyle: fallbackPlayer.battingStyle,
        bowlingStyle: fallbackPlayer.bowlingStyle,
        bio: fallbackPlayer.bio,
        avatar: fallbackPlayer.avatar,
      });
    } finally {
      setIsLoadingProfile(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPlayerProfile().then(() => {
        completeChallenge('login', 50); // Daily Checkin Challenge
      });
      fetchLiveMatches();
      fetchLeaderboards();
    }
  }, [user]);

  const handleEditToggle = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!player) return;
    setUpdating(true);
    try {
      const response = await api.put(`/players/${player._id}`, editForm);
      if (response.data.success) {
        setPlayer(response.data.data);
        setIsEditing(false);
        alert('Your player profile was updated successfully!');
        fetchPlayerProfile();
        completeChallenge('edit_profile', 100);
      }
    } catch (err) {
      console.error('Error updating player:', err);
      alert('Failed to save profile changes');
    } finally {
      setUpdating(false);
    }
  };

  const mockAvatarUpload = () => {
    const randomAvatars = [
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150'
    ];
    const picked = randomAvatars[Math.floor(Math.random() * randomAvatars.length)];
    setEditForm({ ...editForm, avatar: picked });
  };

  const handleDownloadCard = () => {
    if (!player) return;
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createLinearGradient(0, 0, 600, 400);
    grad.addColorStop(0, '#0b0c10');
    grad.addColorStop(1, '#1f2833');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 600, 400);

    ctx.strokeStyle = '#66fcf1';
    ctx.lineWidth = 3;
    ctx.strokeRect(15, 15, 570, 370);

    ctx.fillStyle = '#66fcf1';
    ctx.font = 'bold 20px Helvetica';
    ctx.fillText('CRICVERSE ATHLETE DECK', 40, 50);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Helvetica';
    ctx.fillText((player.name || 'Player').toUpperCase(), 40, 100);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '14px Helvetica';
    ctx.fillText(`${(player.role || 'Player').toUpperCase()} | ${player.currentTeam?.name || 'FREE AGENT'}`, 40, 125);

    ctx.strokeStyle = 'rgba(102, 252, 241, 0.2)';
    ctx.beginPath();
    ctx.moveTo(40, 145);
    ctx.lineTo(560, 145);
    ctx.stroke();

    const drawCardStat = (x: number, y: number, label: string, val: string) => {
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '10px Helvetica';
      ctx.fillText(label.toUpperCase(), x, y);
      ctx.fillStyle = '#66fcf1';
      ctx.font = 'bold 24px Helvetica';
      ctx.fillText(val, x, y + 30);
    };

    drawCardStat(40, 180, 'Matches', String(player.stats?.batting?.matches || 0));
    drawCardStat(160, 180, 'Runs', String(player.stats?.batting?.runs || 0));
    drawCardStat(280, 180, 'Wickets', String(player.stats?.bowling?.wickets || 0));
    drawCardStat(400, 180, 'Form Rating', `${player.stats?.batting?.average || 0}%`);

    drawCardStat(40, 260, 'Bat Avg', String(player.stats?.batting?.average || '0.0'));
    drawCardStat(160, 260, 'Wkts Best', player.stats?.bowling?.bestBowling || '0/0');
    drawCardStat(280, 260, 'MVPs Won', String(player.mvpAwards || 0));
    drawCardStat(400, 260, 'Style', (player.battingStyle || 'Right-hand').split('-')[0] + ' Bat');

    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = '9px Helvetica';
    ctx.fillText('POWERED BY CRICVERSE DIGITAL ENGINE', 40, 360);

    const link = document.createElement('a');
    link.download = `cricverse_player_${(player.name || 'Player').replace(/\s+/g, '_')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    completeChallenge('card_download', 100);
  };

  const siteUrl = getSiteUrl();
  const shareUrl = player ? `${siteUrl}/players/${player._id}` : '';
  const shareText = player ? `🏆 Check out my player stats and awards for ${player.name || 'Player'} on CricVerse! Total Runs: ${player.stats?.batting?.runs || 0} | Wickets: ${player.stats?.bowling?.wickets || 0} | MVPs: ${player.mvpAwards || 0}.` : '';

  const recentHistoryData = player && player.matchHistory && player.matchHistory.length > 0
    ? [...player.matchHistory].reverse().map((m, idx) => ({
        name: `G ${idx + 1}`,
        runs: m.runs || 0,
        wickets: m.wickets || 0,
      }))
    : [];

  const potmCount = timeline.filter(a => a.awardType === 'Player of the Match').length;
  const bestBatterCount = timeline.filter(a => ['Highest Run Scorer', 'Fastest Scorer', 'Most Sixes', 'Most Fours'].includes(a.awardType)).length;
  const bestBowlerCount = timeline.filter(a => ['Best Bowler', 'Economy King'].includes(a.awardType)).length;

  // Recharts wagon wheel data formatting
  const wheelData = [
    { name: 'Off Side', value: analyticsData?.shotDistribution?.offSide || 4, color: '#66fcf1' },
    { name: 'Leg Side', value: analyticsData?.shotDistribution?.legSide || 5, color: '#ff007f' },
  ];

  // Live match center filtering
  const liveMatchesList = matches.filter(m => m.status === 'Live');
  const upcomingMatchesList = matches.filter(m => m.status === 'Scheduled' || m.status === 'Upcoming' || m.status === 'Ready');
  const completedMatchesList = matches.filter(m => m.status === 'Completed');

  // Cap Leader Lists from Leaderboard API
  const runsLeaders = leaderboardData?.batsmen || [];
  const wicketsLeaders = leaderboardData?.bowlers || [];
  const mvpLeaders = leaderboardData?.mvp || [];

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-screen bg-[#0b0c10] relative overflow-hidden cyber-grid">
        {/* Animated Background Particles */}
        <div className="absolute top-[15%] left-[8%] w-1.5 h-1.5 bg-[#66fcf1] rounded-full cyber-particle-slow"></div>
        <div className="absolute top-[45%] right-[12%] w-2 h-2 bg-[#ff007f] rounded-full cyber-particle-fast"></div>
        <div className="absolute bottom-[20%] left-[25%] w-1.5 h-1.5 bg-[#66fcf1] rounded-full cyber-particle-slow"></div>
        
        {/* Glowing Background Radial Accents */}
        <div className="absolute top-[-25%] left-[-20%] w-[70%] h-[70%] rounded-full bg-[#66fcf1]/5 blur-[150px] pointer-events-none"></div>
        <div className="absolute bottom-[-25%] right-[-20%] w-[70%] h-[70%] rounded-full bg-[#ff007f]/5 blur-[150px] pointer-events-none"></div>

        <Navbar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        <div className="flex flex-1 relative z-10 overflow-hidden">
          <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

          <main className="flex-1 px-4 md:px-8 py-8 overflow-y-auto max-w-7xl mx-auto w-full space-y-8">
            
            {/* 1. FUTURISTIC SPORTS HERO SECTION & PROGRESS HUD */}
            {player && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Hero Banner Cover Card */}
                <div className="lg:col-span-2 glass-card border-[#66fcf1]/10 overflow-hidden relative flex flex-col justify-between p-6 h-64 md:h-72">
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent z-0"></div>
                  <img 
                    src="https://images.unsplash.com/photo-1540747737956-37872f747ee7?auto=format&fit=crop&q=80&w=1200" 
                    alt="Stadium Lights Cover" 
                    className="absolute inset-0 w-full h-full object-cover brightness-[0.25] -z-10" 
                  />
                  
                  <div className="flex justify-between items-start z-10">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-[#1f2833]/40 border-2 border-[#66fcf1]/45 flex items-center justify-center overflow-hidden shadow-[0_0_15px_rgba(102,252,241,0.25)] relative group">
                        {player?.avatar || editForm.avatar ? (
                          <img src={editForm.avatar || player?.avatar} alt={player?.name || 'Player'} className="w-full h-full object-cover" />
                        ) : (
                          (player?.name || 'P').charAt(0).toUpperCase()
                        )}
                        {isEditing && (
                          <button
                            onClick={mockAvatarUpload}
                            className="absolute inset-0 bg-black/60 flex items-center justify-center text-[#66fcf1]"
                          >
                            <Camera className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                      <div>
                        <h1 className="text-xl md:text-3xl font-black text-white uppercase tracking-wider">{player?.name || 'Player'}</h1>
                        <p className="text-xs font-digital text-gray-500 uppercase tracking-widest mt-0.5">@{player?.username || user?.username || 'user'} | {player?.role || 'Player'}</p>
                        <div className="flex space-x-2 mt-2">
                          <span className="bg-[#66fcf1]/10 border border-[#66fcf1]/25 text-[#66fcf1] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Team: {player.currentTeam?.name || 'FREE AGENT'}
                          </span>
                          <span className="bg-[#ff007f]/10 border border-[#ff007f]/25 text-[#ff007f] text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {favTeam} FAN
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleEditToggle}
                      className="py-1.5 px-3 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] text-[10px] font-black uppercase rounded-lg shadow-lg transition duration-200 flex items-center space-x-1"
                    >
                      {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                      <span>{isEditing ? 'Cancel' : 'Edit'}</span>
                    </button>
                  </div>

                  {/* Profile Edit Overlay Form (Inline) */}
                  {isEditing && (
                    <form onSubmit={handleFormSubmit} className="absolute inset-0 bg-[#0f131a]/95 z-20 p-5 flex flex-col justify-between overflow-y-auto">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">Player Name</label>
                          <input
                            type="text"
                            name="name"
                            required
                            value={editForm.name}
                            onChange={handleInputChange}
                            className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/20 rounded-lg py-1.5 px-3 text-xs text-white focus:outline-none focus:border-[#66fcf1]"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">Cricket Role</label>
                          <select
                            name="role"
                            value={editForm.role}
                            onChange={handleInputChange}
                            className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/20 rounded-lg py-1.5 px-3 text-xs text-white"
                          >
                            <option value="Batsman">Batsman</option>
                            <option value="Bowler">Bowler</option>
                            <option value="All-Rounder">All-Rounder</option>
                            <option value="Wicket-Keeper">Wicket-Keeper</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="text-[9px] font-black uppercase tracking-wider text-gray-500 block mb-1">Bio Description</label>
                          <textarea
                            name="bio"
                            rows={2}
                            value={editForm.bio}
                            onChange={handleInputChange}
                            className="w-full bg-[#1f2833]/30 border border-[#66fcf1]/20 rounded-lg py-1.5 px-3 text-xs text-white"
                          />
                        </div>
                      </div>
                      <div className="flex space-x-3 mt-4">
                        <button type="submit" disabled={updating} className="flex-1 py-2 bg-[#66fcf1] text-[#0b0c10] font-black text-xs uppercase rounded-lg">
                          {updating ? 'Saving...' : 'Save Athlete Config'}
                        </button>
                        <button type="button" onClick={handleEditToggle} className="py-2 px-4 bg-gray-800 text-white font-black text-xs uppercase rounded-lg">
                          Close
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Actions & telemetry indicators */}
                  <div className="flex justify-between items-center z-10 border-t border-white/5 pt-4">
                    <div className="flex space-x-4 text-xs font-digital text-gray-400">
                      <div>
                        <span className="block text-[8px] text-gray-600 uppercase">SYS TELEMETRY</span>
                        <span className="text-[#39ff14] font-bold">ONLINE</span>
                      </div>
                      <div>
                        <span className="block text-[8px] text-gray-600 uppercase">LOCATION</span>
                        <span className="text-white font-bold uppercase">{player.currentTeam?.name || 'GLOBAL'}</span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button onClick={() => setShareOpen(true)} className="p-2 bg-[#1f2833]/30 hover:bg-[#1f2833]/70 border border-[#66fcf1]/25 text-[#66fcf1] rounded-xl text-xs transition duration-200">
                        <Share2 className="w-4 h-4" />
                      </button>
                      <button onClick={handleDownloadCard} className="p-2 bg-[#66fcf1] hover:bg-cyan-400 text-[#0b0c10] rounded-xl text-xs transition duration-200">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Gamification Progression HUD Card */}
                <div className="glass-card border-[#ff007f]/10 p-6 flex flex-col justify-between relative overflow-hidden">
                  <div className="absolute top-[-30%] right-[-30%] w-32 h-32 bg-[#ff007f]/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-center border-b border-white/5 pb-3">
                    <div className="flex items-center space-x-2">
                      <Zap className="w-5 h-5 text-[#ff007f] animate-pulse" />
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f]">CRICKET PROGRESSION</h3>
                    </div>
                    <div className="flex items-center space-x-1 text-orange-400 text-xs">
                      <Flame className="w-4 h-4 animate-bounce" />
                      <span className="font-digital font-bold">{streak}-DAY STREAK</span>
                    </div>
                  </div>

                  {/* Level Progress Visualizer */}
                  <div className="my-4 space-y-2">
                    <div className="flex justify-between items-end">
                      <div className="flex flex-col">
                        <span className="text-3xl font-black text-white font-digital tracking-tighter">LVL {player?.playerLevel || level}</span>
                        <span className="text-[9px] text-[#66fcf1] font-bold uppercase tracking-wider">{player?.careerRank || getRank(player?.playerLevel || level)}</span>
                      </div>
                      <span className="text-[10px] text-gray-500 font-digital">{player?.playerXP || xp} / {getNextLevelXp(player?.playerLevel || level)} XP</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ff007f] to-[#66fcf1] rounded-full progress-core-glow"
                        style={{ width: `${Math.min(100, ((player?.playerXP || xp) / getNextLevelXp(player?.playerLevel || level)) * 100)}%` }}
                      ></div>
                    </div>
                    <p className="text-[9px] text-gray-500 italic">Gain XP by answering trivia, predicting matches, and checkins!</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 border-t border-white/5 pt-3 text-center">
                    <div>
                      <span className="text-[8px] text-gray-500 block uppercase">Unlocked Badges</span>
                      <strong className="text-lg font-bold text-white font-digital mt-0.5 block">{player?.badges?.length || 0} / 9</strong>
                    </div>
                    <div>
                      <span className="text-[8px] text-gray-500 block uppercase">Multiplier BONUS</span>
                      <strong className="text-lg font-bold text-[#66fcf1] font-digital mt-0.5 block">+{streak * 5}% XP</strong>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* TAB SELECTOR SYSTEM */}
            <div className="flex border-b border-[#66fcf1]/15 overflow-x-auto whitespace-nowrap scrollbar-hide relative z-20">
              <button
                onClick={() => setActiveTab('overview')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                  activeTab === 'overview' ? 'border-[#66fcf1] text-[#66fcf1] neon-text-cyan' : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Overview Hub</span>
              </button>
              <button
                onClick={() => setActiveTab('engagement')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                  activeTab === 'engagement' ? 'border-[#ff007f] text-[#ff007f] text-shadow-magenta' : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Vote className="w-4 h-4" />
                <span>Fan Engagement & Game</span>
              </button>
              <button
                onClick={() => setActiveTab('graphs')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                  activeTab === 'graphs' ? 'border-[#66fcf1] text-[#66fcf1] neon-text-cyan' : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>Advanced Analytics</span>
              </button>
              <button
                onClick={() => setActiveTab('matches')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                  activeTab === 'matches' ? 'border-[#66fcf1] text-[#66fcf1] neon-text-cyan' : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Calendar className="w-4 h-4" />
                <span>Match History</span>
              </button>
              <button
                onClick={() => setActiveTab('achievements')}
                className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                  activeTab === 'achievements' ? 'border-[#66fcf1] text-[#66fcf1] neon-text-cyan' : 'border-transparent text-gray-500 hover:text-white'
                }`}
              >
                <Trophy className="w-4 h-4" />
                <span>Progression & Badges</span>
              </button>
              {(user?.role === 'admin' || user?.role === 'organizer' || user?.role === 'captain') && (
                <button
                  onClick={() => setActiveTab('controls')}
                  className={`pb-4 px-6 font-bold uppercase tracking-wider text-xs transition duration-300 border-b-2 flex items-center space-x-1.5 ${
                    activeTab === 'controls' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-500 hover:text-white'
                  }`}
                >
                  <Shield className="w-4 h-4" />
                  <span>Role Controls</span>
                </button>
              )}
            </div>

            {/* TAB PANEL CONTENTS */}

            {/* A: OVERVIEW HUB VIEW */}
            {activeTab === 'overview' && player && (
              <div className="space-y-8 animate-fadeIn">
                
                {/* Global Widget Personalization Panel (Always accessible) */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-[#1f2833]/15 p-3.5 rounded-xl border border-[#66fcf1]/10">
                    <span className="text-xs text-white uppercase font-black tracking-widest flex items-center space-x-2">
                      <ConfigIcon className="w-4 h-4 text-[#66fcf1] animate-pulse" />
                      <span>Telemetry Console Layout</span>
                    </span>
                    <button 
                      onClick={() => setShowConfig(!showConfig)} 
                      className={`py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-wider transition duration-200 flex items-center space-x-1.5 border ${
                        showConfig 
                          ? 'bg-[#ff007f]/20 text-[#ff007f] border-[#ff007f]/30' 
                          : 'bg-[#66fcf1]/10 text-[#66fcf1] border-[#66fcf1]/25 hover:bg-[#66fcf1]/20'
                      }`}
                    >
                      <ConfigIcon className="w-3.5 h-3.5" />
                      <span>{showConfig ? 'Close Customizer' : 'Customize Layout'}</span>
                    </button>
                  </div>

                  {showConfig && (
                    <div className="glass-card p-4 border-[#66fcf1]/20 bg-slate-950/60 mb-4 animate-fadeIn space-y-3">
                      <span className="text-[10px] text-gray-500 uppercase font-black block">Toggle Visible Dashboard Widgets</span>
                      <div className="flex flex-wrap gap-2.5">
                        {['kpis', 'live_center', 'caps', 'wagon_wheel', 'trivia', 'predictions'].map(widgetId => (
                          <button 
                            key={widgetId} 
                            onClick={() => toggleWidget(widgetId)}
                            className={`py-1.5 px-3 rounded-lg text-[10px] font-black uppercase transition duration-200 flex items-center space-x-1.5 ${
                              activeWidgets.includes(widgetId) ? 'bg-[#66fcf1]/20 text-[#66fcf1] border border-[#66fcf1]/30' : 'bg-gray-800 text-gray-400 border border-transparent'
                            }`}
                          >
                            <Pin className="w-3.5 h-3.5" />
                            <span>{widgetId.replace('_', ' ')}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 10-KPI career digital stat readout */}
                {activeWidgets.includes('kpis') && (
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1">
                      <Activity className="w-4 h-4" />
                      <span>ATHLETE TELEMETRY READOUT</span>
                    </h3>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      {[
                        { label: 'Matches', val: player.stats?.batting?.matches || player.stats?.bowling?.matches || 0, color: 'text-white' },
                        { label: 'Innings', val: player.stats?.batting?.innings || 0, color: 'text-white' },
                        { label: 'Runs Scored', val: player.stats?.batting?.runs || 0, color: 'text-emerald-400' },
                        { label: 'Batting Avg', val: player.stats?.batting?.average ? player.stats.batting.average.toFixed(2) : '0.00', color: 'text-white' },
                        { label: 'Strike Rate', val: player.stats?.batting?.strikeRate ? player.stats.batting.strikeRate.toFixed(2) : '0.00', color: 'text-[#66fcf1]' },
                        { label: 'High Score', val: player.stats?.batting?.highestScore || 0, color: 'text-amber-400' },
                        { label: 'Wickets', val: player.stats?.bowling?.wickets || 0, color: 'text-pink-500' },
                        { label: 'Bowling Avg', val: player.stats?.bowling?.average ? player.stats.bowling.average.toFixed(2) : '0.00', color: 'text-white' },
                        { label: 'Economy', val: player.stats?.bowling?.economy ? player.stats.bowling.economy.toFixed(2) : '0.00', color: 'text-[#66fcf1]' },
                        { label: 'Catches', val: player.stats?.fielding?.catches || player.catches || 0, color: 'text-yellow-400' }
                      ].map((item, idx) => (
                        <div key={idx} className="glass-card p-4 border-white/5 text-center flex flex-col justify-center relative overflow-hidden group hover:border-[#66fcf1]/30 transition duration-300">
                          <span className="text-[9px] text-gray-500 font-bold block uppercase tracking-wider">{item.label}</span>
                          <span className={`text-2xl font-black font-digital mt-1 block ${item.color}`}>{item.val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Grid Column 1 & 2: Live Match Center & Orange/Purple Caps */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Live Match Center Widget */}
                    {activeWidgets.includes('live_center') && (
                      <div className="glass-card p-5 border-white/5 space-y-4">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-3 gap-2">
                          <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">LIVE MATCH TELEMETRY CENTER</h3>
                          <div className="flex space-x-1.5 text-[9px] font-black font-digital">
                            <button onClick={() => setMatchTab('live')} className={`px-2.5 py-1 rounded ${matchTab === 'live' ? 'bg-[#ff007f] text-white shadow-lg shadow-[#ff007f]/20' : 'bg-slate-900 text-gray-500'}`}>LIVE</button>
                            <button onClick={() => setMatchTab('upcoming')} className={`px-2.5 py-1 rounded ${matchTab === 'upcoming' ? 'bg-[#66fcf1] text-[#0b0c10]' : 'bg-slate-900 text-gray-500'}`}>UPCOMING</button>
                            <button onClick={() => setMatchTab('completed')} className={`px-2.5 py-1 rounded ${matchTab === 'completed' ? 'bg-gray-800 text-white' : 'bg-slate-900 text-gray-500'}`}>COMPLETED</button>
                          </div>
                        </div>

                        {isLoadingMatches ? (
                          <div className="py-10 text-center"><RefreshCw className="w-8 h-8 text-[#66fcf1] animate-spin mx-auto" /></div>
                        ) : (
                          <div className="space-y-4">
                            {/* Rendering selected list of matches */}
                            {matchTab === 'live' && liveMatchesList.length === 0 && (
                              <div className="glass-card p-6 text-center border-dashed border-[#66fcf1]/15 text-gray-500 text-xs italic">
                                No active matches live. Check out upcoming or completed matches.
                              </div>
                            )}

                            {matchTab === 'upcoming' && upcomingMatchesList.length === 0 && (
                              <div className="glass-card p-6 text-center border-dashed border-[#66fcf1]/15 text-gray-500 text-xs italic">
                                No scheduled matches logged in tournament database.
                              </div>
                            )}

                            {matchTab === 'completed' && completedMatchesList.length === 0 && (
                              <div className="glass-card p-6 text-center border-dashed border-[#66fcf1]/15 text-gray-500 text-xs italic">
                                No completed matches logged in database.
                              </div>
                            )}

                            {/* Render Match Card list */}
                            {((matchTab === 'live' ? liveMatchesList : matchTab === 'upcoming' ? upcomingMatchesList : completedMatchesList)).map((m) => (
                              <div 
                                key={m._id} 
                                onClick={() => { setSelectedMatch(m); fetchMatchWorm(m._id); }}
                                className={`p-4 rounded-2xl border transition duration-300 cursor-pointer flex flex-col justify-between gap-3 ${
                                  selectedMatch?._id === m._id ? 'border-[#66fcf1] bg-[#66fcf1]/5 shadow-[0_0_15px_rgba(102,252,241,0.1)]' : 'border-white/5 bg-slate-950/20 hover:border-white/10'
                                }`}
                              >
                                <div className="flex justify-between items-center text-[10px] text-gray-500">
                                  <span className="font-digital uppercase">{m.venue || 'Platform Oval'}</span>
                                  <span className={`px-2 py-0.5 rounded font-black uppercase text-[8px] tracking-widest ${
                                    m.status === 'Live' ? 'bg-[#ff007f]/10 text-[#ff007f] border border-[#ff007f]/20 animate-pulse' : m.status === 'Completed' ? 'bg-blue-900/10 text-blue-400 border border-blue-900/20' : 'bg-slate-800 text-gray-400'
                                  }`}>{m.status}</span>
                                </div>

                                <div className="flex justify-between items-center font-digital">
                                  {/* Team A */}
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-white text-xs">
                                      {m.teamA?.logo ? <img src={m.teamA.logo} alt={m.teamA?.name || 'Team'} className="w-full h-full object-cover" /> : (m.teamA?.name || 'T').charAt(0)}
                                    </div>
                                    <span className="text-sm font-black text-white">{m.teamA?.name || 'Deleted Team'}</span>
                                  </div>

                                  {/* Scores comparison */}
                                  {m.status !== 'Scheduled' && (
                                    <div className="text-right">
                                      <span className="text-sm font-black text-white">{m.score?.teamA?.runs}/{m.score?.teamA?.wickets}</span>
                                      <span className="text-[10px] text-gray-500 block">{m.score?.teamA?.overs || 0} ov</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex justify-between items-center font-digital">
                                  {/* Team B */}
                                  <div className="flex items-center space-x-2.5">
                                    <div className="w-8 h-8 rounded bg-gray-800 flex items-center justify-center font-bold text-white text-xs">
                                      {m.teamB?.logo ? <img src={m.teamB.logo} alt={m.teamB?.name || 'Team'} className="w-full h-full object-cover" /> : (m.teamB?.name || 'T').charAt(0)}
                                    </div>
                                    <span className="text-sm font-black text-white">{m.teamB?.name || 'Deleted Team'}</span>
                                  </div>

                                  {/* Scores comparison */}
                                  {m.status !== 'Scheduled' && (
                                    <div className="text-right">
                                      <span className="text-sm font-black text-white">{m.score?.teamB?.runs}/{m.score?.teamB?.wickets}</span>
                                      <span className="text-[10px] text-gray-500 block">{m.score?.teamB?.overs || 0} ov</span>
                                    </div>
                                  )}
                                </div>

                                {m.result && m.result.margin && (
                                  <div className="text-center text-[10px] font-black uppercase text-[#66fcf1] border-t border-white/5 pt-2">
                                    🏆 {m.result.winner?.name || 'Match'} {m.result.margin}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* selected match telemetry visuals */}
                        {selectedMatch && selectedMatch.status !== 'Scheduled' && (
                          <div className="border-t border-white/5 pt-5 space-y-5">
                            <h4 className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Selected Match telemetry: {selectedMatch.title}</h4>
                            
                            {/* Live over timeline logs */}
                            {selectedMatch.liveState && (
                              <div className="space-y-2.5">
                                <span className="text-[9px] text-gray-500 uppercase font-black block">Current Over Ball-by-ball Timeline</span>
                                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-hide">
                                  {selectedMatch.liveState.currentOverRuns && selectedMatch.liveState.currentOverRuns.length > 0 ? (
                                    selectedMatch.liveState.currentOverRuns.map((r: any, idx: number) => {
                                      let badgeColor = 'bg-gray-800 text-white';
                                      if (r.isWicket) badgeColor = 'bg-[#ff007f] text-white shadow-lg shadow-[#ff007f]/30 border border-[#ff007f]/40 animate-pulse';
                                      else if (r.run === 4 || r.run === 6) badgeColor = 'bg-[#66fcf1] text-[#0b0c10] shadow-lg shadow-[#66fcf1]/30 font-black';
                                      return (
                                        <div key={idx} className={`w-8 h-8 rounded-xl flex items-center justify-center font-digital text-xs ${badgeColor}`}>
                                          {r.isWicket ? 'W' : r.isExtra ? `${r.run}*` : r.run}
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-[10px] text-gray-600 italic">No balls bowled in this over yet.</div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Worm chart momentum overlay */}
                            {matchAnalytics && matchAnalytics.wormChart && (
                              <div className="space-y-2.5">
                                <span className="text-[9px] text-gray-500 uppercase font-black block">Cumulative Run Progression (Worm Graph)</span>
                                <div className="h-44">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={matchAnalytics.wormChart}>
                                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                                      <XAxis dataKey="over" stroke="rgba(255,255,255,0.3)" style={{ fontSize: '9px' }} />
                                      <YAxis stroke="rgba(255,255,255,0.3)" style={{ fontSize: '9px' }} />
                                      <Tooltip contentStyle={{ backgroundColor: '#0b0c10', border: '1px solid rgba(102,252,241,0.2)' }} />
                                      <Line type="monotone" dataKey={selectedMatch?.teamA?.name || 'Team A'} stroke="#66fcf1" strokeWidth={2.5} dot={false} />
                                      <Line type="monotone" dataKey={selectedMatch?.teamB?.name || 'Team B'} stroke="#ff007f" strokeWidth={2.5} dot={false} />
                                    </LineChart>
                                  </ResponsiveContainer>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cap leaders and rankings podium widget */}
                    {activeWidgets.includes('caps') && (
                      <div className="glass-card p-5 border-white/5 space-y-6">
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f]">CRICVERSE AWARDS PODIUM</h3>
                        
                        {isLoadingLeaderboard ? (
                          <div className="py-10 text-center"><RefreshCw className="w-8 h-8 text-[#ff007f] animate-spin mx-auto" /></div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            {/* Orange Cap Podium */}
                            <div className="space-y-4">
                              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block text-center border-b border-orange-500/10 pb-1.5 text-orange-400">🔥 ORANGE CAP LEADERS (RUNS)</span>
                              <div className="flex justify-around items-end pt-8 h-40 font-digital relative">
                                
                                {/* 2nd Place */}
                                {runsLeaders[1] && (
                                  <div className="flex flex-col items-center z-10 w-20">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-400 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1">
                                      {runsLeaders[1].avatar ? <img src={runsLeaders[1].avatar} className="w-full h-full object-cover" /> : runsLeaders[1].name.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-sans text-white truncate max-w-[80px] block">{runsLeaders[1].name}</span>
                                    <span className="text-[10px] text-[#66fcf1] font-bold">{runsLeaders[1].runs} runs</span>
                                    <div className="w-16 h-12 bg-slate-900 border border-slate-700/50 flex items-center justify-center font-black text-slate-400 text-sm mt-1 rounded-t-lg">2</div>
                                  </div>
                                )}

                                {/* 1st Place */}
                                {runsLeaders[0] && (
                                  <div className="flex flex-col items-center z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-yellow-400 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                                      {runsLeaders[0].avatar ? <img src={runsLeaders[0].avatar} className="w-full h-full object-cover" /> : runsLeaders[0].name.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-sans text-white truncate max-w-[90px] block font-black">{runsLeaders[0].name}</span>
                                    <span className="text-xs text-orange-400 font-black">{runsLeaders[0].runs} runs</span>
                                    <div className="w-20 h-16 bg-slate-900 border border-yellow-500/20 flex items-center justify-center font-black text-yellow-400 text-lg mt-1 rounded-t-xl">1</div>
                                  </div>
                                )}

                                {/* 3rd Place */}
                                {runsLeaders[2] && (
                                  <div className="flex flex-col items-center z-10 w-20">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-amber-600 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1">
                                      {runsLeaders[2].avatar ? <img src={runsLeaders[2].avatar} className="w-full h-full object-cover" /> : runsLeaders[2].name.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-sans text-white truncate max-w-[80px] block">{runsLeaders[2].name}</span>
                                    <span className="text-[10px] text-[#66fcf1] font-bold">{runsLeaders[2].runs} runs</span>
                                    <div className="w-16 h-8 bg-slate-900 border border-slate-700/50 flex items-center justify-center font-black text-amber-600 text-xs mt-1 rounded-t-lg">3</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Purple Cap Podium */}
                            <div className="space-y-4">
                              <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest block text-center border-b border-purple-500/10 pb-1.5 text-purple-400">🍇 PURPLE CAP LEADERS (WICKETS)</span>
                              <div className="flex justify-around items-end pt-8 h-40 font-digital relative">
                                
                                {/* 2nd Place */}
                                {wicketsLeaders[1] && (
                                  <div className="flex flex-col items-center z-10 w-20">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-slate-400 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1">
                                      {wicketsLeaders[1].avatar ? <img src={wicketsLeaders[1].avatar} className="w-full h-full object-cover" /> : wicketsLeaders[1].name.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-sans text-white truncate max-w-[80px] block">{wicketsLeaders[1].name}</span>
                                    <span className="text-[10px] text-[#66fcf1] font-bold">{wicketsLeaders[1].wickets} wkts</span>
                                    <div className="w-16 h-12 bg-slate-900 border border-slate-700/50 flex items-center justify-center font-black text-slate-400 text-sm mt-1 rounded-t-lg">2</div>
                                  </div>
                                )}

                                {/* 1st Place */}
                                {wicketsLeaders[0] && (
                                  <div className="flex flex-col items-center z-10 w-24">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 border-2 border-yellow-400 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1 shadow-[0_0_12px_rgba(250,204,21,0.3)]">
                                      {wicketsLeaders[0].avatar ? <img src={wicketsLeaders[0].avatar} className="w-full h-full object-cover" /> : wicketsLeaders[0].name.charAt(0)}
                                    </div>
                                    <span className="text-[10px] font-sans text-white truncate max-w-[90px] block font-black">{wicketsLeaders[0].name}</span>
                                    <span className="text-xs text-purple-400 font-black">{wicketsLeaders[0].wickets} wkts</span>
                                    <div className="w-20 h-16 bg-slate-900 border border-yellow-500/20 flex items-center justify-center font-black text-yellow-400 text-lg mt-1 rounded-t-xl">1</div>
                                  </div>
                                )}

                                {/* 3rd Place */}
                                {wicketsLeaders[2] && (
                                  <div className="flex flex-col items-center z-10 w-20">
                                    <div className="w-8 h-8 rounded-full bg-slate-800 border-2 border-amber-600 overflow-hidden flex items-center justify-center font-bold text-white text-xs mb-1">
                                      {wicketsLeaders[2].avatar ? <img src={wicketsLeaders[2].avatar} className="w-full h-full object-cover" /> : wicketsLeaders[2].name.charAt(0)}
                                    </div>
                                    <span className="text-[9px] font-sans text-white truncate max-w-[80px] block">{wicketsLeaders[2].name}</span>
                                    <span className="text-[10px] text-[#66fcf1] font-bold">{wicketsLeaders[2].wickets} wkts</span>
                                    <div className="w-16 h-8 bg-slate-900 border border-slate-700/50 flex items-center justify-center font-black text-amber-600 text-xs mt-1 rounded-t-lg">3</div>
                                  </div>
                                )}
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Grid Column 3: Personalization sidebar & Wagon Wheel */}
                  <div className="space-y-6">
                    
                    {/* User profile styling details */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">Profile Overview</h3>
                      <div className="space-y-4 font-mono text-xs">
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px]">Style Configuration</span>
                          <strong className="text-white block mt-0.5">{player.battingStyle} | {player.bowlingStyle || 'None'}</strong>
                        </div>
                        <div>
                          <span className="text-gray-500 block uppercase text-[8px]">Biography logs</span>
                          <p className="text-gray-400 font-sans mt-1 leading-relaxed text-[11px]">{player.bio || 'Welcome athlete.'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Wagon Wheel Shot Distribution Widget */}
                    {activeWidgets.includes('wagon_wheel') && (
                      <div className="glass-card p-5 border-white/5 space-y-4 flex flex-col items-center">
                        <div className="w-full border-b border-white/5 pb-2">
                          <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">SHOT DIRECTION TELEMETRY</h3>
                        </div>
                        <div className="w-32 h-32 relative">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={wheelData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={50}
                                dataKey="value"
                              >
                                {wheelData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-gray-500 text-[8px] uppercase">Shots</span>
                            <span className="text-white font-bold text-sm font-digital">{analyticsData?.shotDistribution?.totalShots || 9}</span>
                          </div>
                        </div>
                        <div className="flex space-x-6 text-[10px] font-digital">
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2.5 h-2.5 bg-[#66fcf1] rounded"></div>
                            <span className="text-white">Offside ({analyticsData?.shotDistribution?.offSide || 4})</span>
                          </div>
                          <div className="flex items-center space-x-1.5">
                            <div className="w-2.5 h-2.5 bg-[#ff007f] rounded"></div>
                            <span className="text-white">Legside ({analyticsData?.shotDistribution?.legSide || 5})</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Daily Trivia core game widget */}
                    {activeWidgets.includes('trivia') && (
                      <div className="glass-card p-5 border-[#ff007f]/15 bg-gradient-to-br from-[#ff007f]/5 to-transparent space-y-4 relative overflow-hidden">
                        <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                          <HelpCircle className="w-4 h-4 text-[#ff007f]" />
                          <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f]">DAILY TRIVIA CHALLENGE</h3>
                        </div>
                        
                        <div className="space-y-3">
                          <p className="text-xs text-white leading-relaxed">{TRIVIA_DATABASE[triviaIndex].question}</p>
                          <div className="space-y-2">
                            {TRIVIA_DATABASE[triviaIndex].options.map(option => (
                              <button
                                key={option}
                                onClick={() => handleTriviaAnswer(option)}
                                disabled={triviaAnswered}
                                className={`w-full py-2 px-3 text-left text-xs rounded-lg transition duration-200 block border ${
                                  selectedTriviaOption === option 
                                    ? (triviaCorrect ? 'bg-green-950/20 border-green-500 text-green-400' : 'bg-red-950/20 border-red-500 text-red-400')
                                    : 'bg-[#1f2833]/20 border-white/5 text-gray-400 hover:border-white/20'
                                }`}
                              >
                                {option}
                              </button>
                            ))}
                          </div>

                          {triviaAnswered && (
                            <div className="text-[10px] font-bold text-center uppercase tracking-wide">
                              {triviaCorrect ? (
                                <span className="text-green-400">🎯 Correct! +150 XP Credited</span>
                              ) : (
                                <span className="text-red-400">❌ Incorrect! Correct is: {TRIVIA_DATABASE[triviaIndex].answer} (+30 XP)</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>

                </div>

              </div>
            )}

            {/* B: FAN ENGAGEMENT & RETENTION GAME HUB */}
            {activeTab === 'engagement' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Column: Daily Streaks & Prediction list */}
                  <div className="lg:col-span-2 space-y-6">
                    
                    {/* Live Predictor Console */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                        <Vote className="w-5 h-5 text-[#66fcf1]" />
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">CRICVERSE PREDICTIONS MARKET</h3>
                      </div>

                      {isLoadingMatches ? (
                        <div className="py-10 text-center"><RefreshCw className="w-8 h-8 text-[#66fcf1] animate-spin mx-auto" /></div>
                      ) : (
                        <div className="space-y-4">
                          {upcomingMatchesList.length === 0 ? (
                            <div className="p-8 text-center text-gray-500 italic text-xs">No upcoming matches available to predict.</div>
                          ) : (
                            upcomingMatchesList.map(m => {
                              const alreadyVoted = !!predictVotes[m._id];
                              const voteA = alreadyVoted ? (predictVotes[m._id] === m.teamA?.name ? 68 : 32) : 50;
                              const voteB = 100 - voteA;

                              return (
                                <div key={m._id} className="p-4 rounded-xl bg-slate-950/45 border border-white/5 space-y-3">
                                  <div className="flex justify-between text-[10px] text-gray-500 font-digital uppercase">
                                    <span>{m.venue || 'Platform Ground'}</span>
                                    <span>{new Date(m.date).toLocaleDateString()}</span>
                                  </div>
                                  <p className="text-xs text-white text-center font-bold">Predict the Winner</p>
                                  
                                  <div className="flex justify-around items-center gap-4">
                                    <button
                                      onClick={() => m.teamA?.name && handlePredictVote(m._id, m.teamA.name)}
                                      disabled={alreadyVoted}
                                      className={`flex-1 py-3 text-center rounded-xl font-digital font-bold text-xs uppercase border transition duration-200 ${
                                        predictVotes[m._id] === m.teamA?.name 
                                          ? 'bg-[#66fcf1]/20 border-[#66fcf1] text-[#66fcf1]' 
                                          : 'bg-slate-900 border-white/5 text-white hover:border-white/20'
                                      }`}
                                    >
                                      {m.teamA?.name || 'Team A'} {alreadyVoted && `(${voteA}%)`}
                                    </button>
                                    <span className="text-[10px] font-digital text-gray-600 font-black">VS</span>
                                    <button
                                      onClick={() => m.teamB?.name && handlePredictVote(m._id, m.teamB.name)}
                                      disabled={alreadyVoted}
                                      className={`flex-1 py-3 text-center rounded-xl font-digital font-bold text-xs uppercase border transition duration-200 ${
                                        predictVotes[m._id] === m.teamB?.name 
                                          ? 'bg-[#ff007f]/20 border-[#ff007f] text-[#ff007f]' 
                                          : 'bg-slate-900 border-white/5 text-white hover:border-white/20'
                                      }`}
                                    >
                                      {m.teamB?.name || 'Team B'} {alreadyVoted && `(${voteB}%)`}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* Daily Challenges list */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-yellow-500">ATHLETE DAILY CHALLENGES</h3>
                      </div>
                      
                      <div className="space-y-3">
                        {[
                          { id: 'login', title: 'Daily Check-in', desc: 'Visit the CricVerse dashboard console today.', reward: 50 },
                          { id: 'trivia', title: 'Daily Trivia', desc: 'Submit an answer to the daily cricket question.', reward: 150 },
                          { id: 'prediction', title: 'Predict Master', desc: 'Cast a vote on an upcoming match outcome.', reward: 100 },
                          { id: 'edit_profile', title: 'Profile Configurator', desc: 'Update details on your athlete scorecard.', reward: 100 },
                          { id: 'card_download', title: 'Player Card Generator', desc: 'Generate and export your customized player deck.', reward: 100 }
                        ].map(ch => {
                          const completed = completedChallenges.includes(ch.id);
                          return (
                            <div key={ch.id} className="flex justify-between items-center p-3 rounded-lg bg-slate-950/20 border border-white/5">
                              <div>
                                <span className={`text-xs font-bold block ${completed ? 'text-gray-500 line-through' : 'text-white'}`}>{ch.title}</span>
                                <span className="text-[10px] text-gray-500 mt-0.5 block">{ch.desc}</span>
                              </div>
                              <div className="flex items-center space-x-2.5">
                                <span className="text-[9px] text-[#66fcf1] font-digital font-bold">+{ch.reward} XP</span>
                                {completed ? (
                                  <CheckCircle className="w-5 h-5 text-green-400" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full border border-white/10 flex-shrink-0"></div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                  </div>

                  {/* Right Column: Personalization controls */}
                  <div className="space-y-6">
                    
                    {/* Favorite team & customization selector */}
                    <div className="glass-card p-5 border-white/5 space-y-5">
                      <div className="flex items-center space-x-2 border-b border-white/5 pb-2">
                        <ConfigIcon className="w-4 h-4 text-[#66fcf1]" />
                        <h3 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1]">DASHBOARD PERSONALIZATION</h3>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-[9px] text-gray-500 block uppercase font-bold">Select Favorite CricVerse Team</label>
                          <select 
                            value={favTeam} 
                            onChange={(e) => { setFavTeam(e.target.value); localStorage.setItem('cv_fav_team', e.target.value); }}
                            className="w-full bg-[#1f2833]/30 border border-white/10 rounded-lg py-2 px-3 text-xs text-white"
                          >
                            <option value="GT">Gujarat Titans (GT)</option>
                            <option value="RCB">Royal Challengers Bangalore (RCB)</option>
                            <option value="MI">Mumbai Indians (MI)</option>
                            <option value="CSK">Chennai Super Kings (CSK)</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] text-gray-500 block uppercase font-bold">Streak Booster Multiplier</label>
                          <div className="p-3 bg-slate-950/40 rounded-xl border border-white/5 flex justify-between items-center">
                            <span className="text-xs font-digital text-white font-bold">{streak}-Day Streak Active</span>
                            <span className="text-[10px] text-orange-400 font-digital uppercase">+{streak * 5}% XP Boost</span>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              </div>
            )}

            {/* C: ADVANCED PERFORMANCE ANALYTICS VIEWS */}
            {activeTab === 'graphs' && (
              <div className="space-y-8 animate-fadeIn">
                
                {recentHistoryData.length === 0 ? (
                  <div className="glass-card p-12 text-center border-white/5 text-gray-500 italic">
                    No stats logs logged to render advanced trend profiles.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    {/* Runs trend */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#66fcf1] flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Cumulative Runs Telemetry</span>
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={recentHistoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '9px' }} />
                            <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '9px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0b0c10', border: '1px solid rgba(102,252,241,0.2)' }} />
                            <Line type="monotone" dataKey="runs" stroke="#66fcf1" strokeWidth={2.5} dot={{ r: 4 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Wickets trend */}
                    <div className="glass-card p-5 border-white/5 space-y-4">
                      <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f] flex items-center space-x-1">
                        <TrendingUp className="w-4 h-4" />
                        <span>Match-by-Match Wickets taken</span>
                      </h4>
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={recentHistoryData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                            <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" style={{ fontSize: '9px' }} />
                            <YAxis stroke="rgba(255,255,255,0.4)" style={{ fontSize: '9px' }} />
                            <Tooltip contentStyle={{ backgroundColor: '#0b0c10', border: '1px solid rgba(255,0,127,0.2)' }} />
                            <Bar dataKey="wickets" fill="#ff007f" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* D: HISTORICAL MATCH HISTORY VIEW */}
            {activeTab === 'matches' && player && (
              <div className="space-y-6 animate-fadeIn">
                {player.matchHistory.length === 0 ? (
                  <div className="glass-card p-12 text-center border-white/5 text-gray-500 italic">
                    No completed matches recorded in this user history.
                  </div>
                ) : (
                  <div className="glass-card border-white/5 overflow-hidden">
                    <table className="w-full text-left text-xs text-gray-400 border-collapse">
                      <thead className="bg-[#1f2833]/20 text-[10px] uppercase text-gray-500 font-bold border-b border-white/5 font-mono">
                        <tr>
                          <th className="p-4">Opponent</th>
                          <th className="p-4">Tournament</th>
                          <th className="p-4 text-center">Runs (Balls)</th>
                          <th className="p-4 text-center">Wickets (Overs)</th>
                          <th className="p-4 text-center">MVP Winner</th>
                          <th className="p-4 text-right">Match Result</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono">
                        {player.matchHistory.map((m, idx) => (
                          <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition">
                            <td className="p-4 text-white font-bold font-sans uppercase">{m.opponentName}</td>
                            <td className="p-4">{m.tournamentName}</td>
                            <td className="p-4 text-center text-white font-bold">{m.runs} <span className="text-[10px] text-gray-500 font-normal">({m.balls}b)</span></td>
                            <td className="p-4 text-center text-white font-bold">{m.wickets} <span className="text-[10px] text-gray-500 font-normal">({m.overs}ov)</span></td>
                            <td className="p-4 text-center">
                              {m.mvpStatus ? (
                                <Trophy className="w-4 h-4 text-yellow-500 mx-auto animate-bounce" />
                              ) : (
                                <span className="text-gray-600">-</span>
                              )}
                            </td>
                            <td className="p-4 text-right text-gray-300 font-sans uppercase font-bold max-w-[150px] truncate">{m.resultText}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* E: PROGRESSION, BADGES, AND TROPHIES SECTION */}
            {activeTab === 'achievements' && (
              <div className="space-y-8 animate-fadeIn">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Level Progress */}
                  <div className="glass-card p-5 border-[#66fcf1]/10 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-500 uppercase tracking-widest block mb-1">Current Level</span>
                    <strong className="text-3xl font-black text-white font-digital tracking-tight">LVL {player?.playerLevel || level}</strong>
                    <span className="text-xs text-[#66fcf1] font-bold mt-1 uppercase tracking-wide">{player?.careerRank || getRank(player?.playerLevel || level)}</span>
                  </div>

                  {/* XP Progress Bar */}
                  <div className="glass-card p-5 border-[#ff007f]/10 md:col-span-2 flex flex-col justify-center">
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">XP Progress to Level {Math.min(100, (player?.playerLevel || level) + 1)}</span>
                      <span className="text-xs text-white font-mono font-bold">{player?.playerXP || xp} / {getNextLevelXp(player?.playerLevel || level)} XP</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden p-0.5 border border-white/5">
                      <div 
                        className="h-full bg-gradient-to-r from-[#ff007f] to-[#66fcf1] rounded-full progress-core-glow"
                        style={{ width: `${Math.min(100, ((player?.playerXP || xp) / getNextLevelXp(player?.playerLevel || level)) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-[10px] text-gray-400 mt-2 block italic">
                      Progress: {Math.round(Math.min(100, ((player?.playerXP || xp) / getNextLevelXp(player?.playerLevel || level)) * 100))}% to next level
                    </span>
                  </div>
                </div>

                {/* Badges Showcase */}
                <div className="space-y-4">
                  <h3 className="text-sm uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">Achievement Badges</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {BADGES_METADATA.map(badge => {
                      const isUnlocked = player?.badges?.includes(badge.id);
                      return (
                        <div 
                          key={badge.id} 
                          className={`glass-card p-4 border transition duration-300 relative overflow-hidden ${
                            isUnlocked 
                              ? 'border-[#66fcf1]/30 bg-gradient-to-br from-[#1f2833]/20 to-[#66fcf1]/5 shadow-[0_0_15px_rgba(102,252,241,0.05)]' 
                              : 'border-white/5 opacity-50 bg-[#0b0c10]/40'
                          }`}
                        >
                          {isUnlocked && (
                            <div className={`absolute top-0 right-0 w-16 h-16 bg-gradient-to-tr ${badge.color} opacity-[0.08] rounded-full blur-xl pointer-events-none`}></div>
                          )}
                          <div className="flex items-start space-x-3">
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 border ${
                              isUnlocked 
                                ? 'bg-slate-900 border-[#66fcf1]/30 shadow-[0_0_10px_rgba(102,252,241,0.1)]' 
                                : 'bg-black/30 border-white/5 text-gray-600'
                            }`}>
                              {isUnlocked ? badge.emoji : '🔒'}
                            </div>
                            <div>
                              <strong className={`text-xs uppercase tracking-wide block ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>{badge.title}</strong>
                              <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{badge.desc}</p>
                              <span className={`text-[8px] font-black uppercase mt-1.5 inline-block px-1.5 py-0.5 rounded ${
                                isUnlocked 
                                  ? 'bg-[#66fcf1]/15 text-[#66fcf1]' 
                                  : 'bg-gray-800 text-gray-500'
                              }`}>
                                {isUnlocked ? 'Unlocked' : 'Locked'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Audit Logs and Milestones */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* XP History */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-[#ff007f] border-b border-white/5 pb-2">XP Log History</h4>
                    {(!player?.xpHistory || player.xpHistory.length === 0) ? (
                      <div className="glass-card p-6 text-center border-white/5 text-gray-500 text-xs italic">
                        No XP transactions logged.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {player.xpHistory.slice().reverse().map((log, idx) => (
                          <div key={idx} className="glass-card p-3 border-white/5 flex justify-between items-center text-xs bg-[#0b0c10]/20 hover:border-white/10 transition">
                            <div>
                              <span className="font-bold text-white block">{log.reason}</span>
                              <span className="text-[9px] text-gray-500 mt-0.5 block">{new Date(log.date).toLocaleString()}</span>
                            </div>
                            <span className="font-digital text-sm font-black text-[#66fcf1] bg-[#66fcf1]/10 px-2.5 py-1 rounded-lg">
                              +{log.amount} XP
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Achievement History */}
                  <div className="space-y-4">
                    <h4 className="text-xs uppercase font-extrabold tracking-widest text-orange-400 border-b border-white/5 pb-2">Achievement Milestones</h4>
                    {(!player?.achievementHistory || player.achievementHistory.length === 0) ? (
                      <div className="glass-card p-6 text-center border-white/5 text-gray-500 text-xs italic">
                        No milestone achievements unlocked yet.
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {player.achievementHistory.slice().reverse().map((ach, idx) => (
                          <div key={idx} className="glass-card p-3 border-white/5 flex items-start space-x-3 bg-[#0b0c10]/20 hover:border-white/10 transition">
                            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-sm flex-shrink-0 mt-0.5">
                              ⭐
                            </div>
                            <div>
                              <span className="font-bold text-white block uppercase tracking-wide text-[11px]">{ach.title}</span>
                              <p className="text-[10px] text-gray-400 mt-0.5 leading-relaxed">{ach.description}</p>
                              <span className="text-[9px] text-gray-500 mt-1 block">{new Date(ach.date).toLocaleDateString()}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Match Trophies */}
                <div className="space-y-4">
                  <h3 className="text-sm uppercase font-extrabold tracking-widest text-[#66fcf1] border-b border-white/5 pb-2">Match Awards Timeline</h3>
                  {timeline.length === 0 ? (
                    <div className="glass-card p-8 text-center border-white/5 text-gray-500 text-xs italic">
                      No match awards catalogued for this player profile.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {timeline.map((item, idx) => (
                        <div key={item._id || idx} className="glass-card p-4 border-[#66fcf1]/10 flex justify-between items-center gap-4 hover:border-[#66fcf1]/30 transition duration-300">
                          <div className="flex items-center space-x-3.5">
                            <div className="w-10 h-10 rounded-xl bg-[#66fcf1]/10 border border-[#66fcf1]/20 flex items-center justify-center text-[#66fcf1] flex-shrink-0">
                              {item.awardType === 'Player of the Match' ? <Trophy className="w-5 h-5 text-yellow-400" /> : <Award className="w-5 h-5 text-[#ff007f]" />}
                            </div>
                            <div>
                              <strong className="text-white text-xs uppercase tracking-wide block">{item.awardType}</strong>
                              <span className="text-[10px] text-gray-400 block">{item.performance}</span>
                            </div>
                          </div>
                          
                          <div className="text-right font-mono text-[9px] text-gray-500">
                            <span className="text-gray-300 font-bold uppercase block">{item.match?.title || 'Match Fixture'}</span>
                            <span className="mt-0.5 block">{new Date(item.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* F: ROLE CONTROLS VIEW (FOR SCORERS/ADMINS) */}
            {activeTab === 'controls' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="glass-card p-6 md:p-8 border-[#66fcf1]/10 bg-[#1f2833]/10 space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-white uppercase tracking-wider">Role Control Panel</h3>
                    <p className="text-gray-400 text-xs mt-1">Authorized platform shortcuts based on user role.</p>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div onClick={() => router.push('/teams')} className="p-5 rounded-2xl bg-[#0b0c10]/40 border border-white/5 hover:border-[#39ff14]/30 hover:bg-[#1f2833]/15 cursor-pointer transition group flex flex-col justify-between h-44">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-[#39ff14]/10 rounded-xl text-[#39ff14]"><Users className="w-5 h-5" /></div>
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#39ff14] transition" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm uppercase tracking-wide">Manage Teams</p>
                        <p className="text-gray-500 text-[10px] mt-1">Review active squad registries, recruits, and memberships.</p>
                      </div>
                    </div>

                    <div onClick={() => router.push('/tournaments')} className="p-5 rounded-2xl bg-[#0b0c10]/40 border border-white/5 hover:border-purple-500/30 hover:bg-[#1f2833]/15 cursor-pointer transition group flex flex-col justify-between h-44">
                      <div className="flex justify-between items-start">
                        <div className="p-3 bg-purple-500/10 rounded-xl text-purple-400"><Trophy className="w-5 h-5" /></div>
                        <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-purple-400 transition" />
                      </div>
                      <div>
                        <p className="font-bold text-white text-sm uppercase tracking-wide">Tournaments Panel</p>
                        <p className="text-gray-500 text-[10px] mt-1">Configure leagues, organize tournament brackets, and manage fixtures.</p>
                      </div>
                    </div>

                    {user?.role === 'admin' ? (
                      <div onClick={() => router.push('/admin-dashboard')} className="p-5 rounded-2xl bg-[#0b0c10]/40 border border-white/5 hover:border-red-500/30 hover:bg-[#1f2833]/15 cursor-pointer transition group flex flex-col justify-between h-44">
                        <div className="flex justify-between items-start">
                          <div className="p-3 bg-red-500/10 rounded-xl text-red-400"><Shield className="w-5 h-5" /></div>
                          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-red-400 transition" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm uppercase tracking-wide">System Admin Panel</p>
                          <p className="text-gray-500 text-[10px] mt-1">Supervise user registrations, assign roles, and resolve report concern tickets.</p>
                        </div>
                      </div>
                    ) : (
                      <div onClick={() => router.push('/players')} className="p-5 rounded-2xl bg-[#0b0c10]/40 border border-white/5 hover:border-[#66fcf1]/30 hover:bg-[#1f2833]/15 cursor-pointer transition group flex flex-col justify-between h-44">
                        <div className="flex justify-between items-start">
                          <div className="p-3 bg-[#66fcf1]/10 rounded-xl text-[#66fcf1]"><User className="w-5 h-5" /></div>
                          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-[#66fcf1] transition" />
                        </div>
                        <div>
                          <p className="font-bold text-white text-sm uppercase tracking-wide">Players Database</p>
                          <p className="text-gray-500 text-[10px] mt-1">Explore rosters and statistics profiles of CricVerse cricketers.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* Share profile modal overlay */}
        {player && (
          <ShareModal
            isOpen={shareOpen}
            onClose={() => setShareOpen(false)}
            shareUrl={shareUrl}
            shareText={shareText}
            title={`Share My CricVerse Athlete Card`}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
