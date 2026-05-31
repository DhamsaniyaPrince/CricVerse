import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface ScoreDetail {
  runs: number;
  wickets: number;
  overs: number;
}

export interface BatsmanScorecard {
  player: { _id: string; name: string; role: string };
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  howOut: string;
  bowler?: { _id: string; name: string };
}

export interface BowlerScorecard {
  player: { _id: string; name: string; role: string };
  overs: number;
  maidens: number;
  runs: number;
  wickets: number;
}

export interface Innings {
  battingTeam: { _id: string; name: string; logo?: string };
  bowlingTeam: { _id: string; name: string; logo?: string };
  scorecard: {
    batsmen: BatsmanScorecard[];
    bowlers: BowlerScorecard[];
  };
}

export interface Commentary {
  overNum: number;
  ballNum: number;
  text: string;
  type: 'normal' | 'wicket' | 'boundary' | 'extra';
  runs: number;
  metadata?: {
    strikerId?: string;
    nonStrikerId?: string;
    bowlerId?: string;
    runs?: number;
    extraRuns?: number;
    extraType?: string;
    isExtra?: boolean;
    isWicket?: boolean;
    wicketType?: string;
    batsmanOutId?: string;
    isLegalBall?: boolean;
    previousLiveState?: any;
  };
}

export interface WagonWheelPoint {
  playerId: string;
  angle: number;
  distance: number;
  runs: number;
}

export interface Match {
  _id: string;
  title: string;
  tournament?: { _id: string; name: string };
  teamA: { _id: string; name: string; logo?: string; players: string[] };
  teamB: { _id: string; name: string; logo?: string; players: string[] };
  status: 'Upcoming' | 'Live' | 'Completed';
  oversCount: number;
  toss?: { wonBy: string; decision: 'Batting' | 'Bowling' };
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
  commentary: Commentary[];
  wagonWheel: WagonWheelPoint[];
  result?: { winner?: { _id: string; name: string; logo?: string }; margin?: string };
  target?: number;
  playerOfMatch?: any;
  playingXIA?: { _id: string; name: string; email?: string }[];
  playingXIB?: { _id: string; name: string; email?: string }[];
}

interface MatchState {
  matchesList: Match[];
  currentMatch: Match | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: MatchState = {
  matchesList: [],
  currentMatch: null,
  isLoading: false,
  error: null,
};

const matchSlice = createSlice({
  name: 'match',
  initialState,
  reducers: {
    fetchMatchesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchMatchesSuccess: (state, action: PayloadAction<Match[]>) => {
      state.isLoading = false;
      state.matchesList = action.payload;
    },
    fetchMatchesFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    fetchCurrentMatchStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCurrentMatchSuccess: (state, action: PayloadAction<Match>) => {
      state.isLoading = false;
      state.currentMatch = action.payload;
    },
    fetchCurrentMatchFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    // Redux real-time updates from socket
    updateLiveScore: (state, action: PayloadAction<any>) => {
      if (state.currentMatch && state.currentMatch._id === action.payload.matchId) {
        state.currentMatch.score = action.payload.score;
        state.currentMatch.liveState = action.payload.liveState;
        state.currentMatch.innings = action.payload.innings;
      }
      // Also update in list
      const idx = state.matchesList.findIndex(m => m._id === action.payload.matchId);
      if (idx !== -1) {
        state.matchesList[idx].score = action.payload.score;
        state.matchesList[idx].liveState = action.payload.liveState;
        state.matchesList[idx].innings = action.payload.innings;
      }
    },
    appendCommentary: (state, action: PayloadAction<Commentary>) => {
      if (state.currentMatch) {
        state.currentMatch.commentary.unshift(action.payload);
      }
    },
    appendWagonPoint: (state, action: PayloadAction<WagonWheelPoint>) => {
      if (state.currentMatch) {
        state.currentMatch.wagonWheel.push(action.payload);
      }
    }
  },
});

export const {
  fetchMatchesStart,
  fetchMatchesSuccess,
  fetchMatchesFailure,
  fetchCurrentMatchStart,
  fetchCurrentMatchSuccess,
  fetchCurrentMatchFailure,
  updateLiveScore,
  appendCommentary,
  appendWagonPoint
} = matchSlice.actions;

export default matchSlice.reducer;
