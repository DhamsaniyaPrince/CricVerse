import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: 'player' | 'captain' | 'organizer' | 'admin';
  isEmailVerified: boolean;
  avatar?: string;
  favoriteTeams?: string[];
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  successMessage: string | null;
}

// Retrieve from local storage if available
const getInitialToken = () => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('token');
  }
  return null;
};

const getInitialUser = () => {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }
  return null;
};

const initialState: AuthState = {
  user: getInitialUser(),
  token: getInitialToken(),
  isAuthenticated: !!getInitialToken(),
  isLoading: false,
  error: null,
  successMessage: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    authStart: (state) => {
      state.isLoading = true;
      state.error = null;
      state.successMessage = null;
    },
    authSuccess: (state, action: PayloadAction<{ user: User; token: string }>) => {
      state.isLoading = false;
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;

      localStorage.setItem('token', action.payload.token);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    authFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    setSuccessMessage: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.successMessage = action.payload;
    },
    clearAuthStatus: (state) => {
      state.isLoading = false;
      state.error = null;
      state.successMessage = null;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.successMessage = null;

      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateUserProfile: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      localStorage.setItem('user', JSON.stringify(action.payload));
    }
  },
});

export const {
  authStart,
  authSuccess,
  authFailure,
  setSuccessMessage,
  clearAuthStatus,
  logout,
  updateUserProfile
} = authSlice.actions;

export default authSlice.reducer;
