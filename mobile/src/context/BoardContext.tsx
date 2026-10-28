// mobile/src/context/BoardContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BoardState, Habit, WeekPlan } from '../lib/types';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'streakboard_mobile_state';

const defaultState: BoardState = {
  habits: [
    { id: 'h1', name: 'Wake up early', emoji: '⏰', color: 'mint', sched: { t: 'daily' } },
    { id: 'h2', name: 'Read 10 pages', emoji: '📖', color: 'blue', sched: { t: 'daily' } },
    { id: 'h3', name: 'Workout 30 mins', emoji: '💪', color: 'coral', sched: { t: 'daily' } },
    { id: 'h4', name: 'Deep Work Session', emoji: '⚡', color: 'lavender', sched: { t: 'daily' } }
  ],
  checks: {},
  weeks: {},
  rev: 1
};

export function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

interface BoardContextType {
  state: BoardState;
  loading: boolean;
  syncing: boolean;
  toggleHabitCheck: (habitId: string, dateKey?: string) => void;
  addHabit: (name: string, emoji: string, color: string) => void;
  updateBig3: (index: number, text: string) => void;
  syncWithCloud: () => Promise<void>;
  getStreak: (habitId: string) => number;
  getTodayProgress: () => { done: number; total: number; percent: number };
}

const BoardContext = createContext<BoardContextType>({} as BoardContextType);

export const BoardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isConfigured } = useAuth();
  const [state, setState] = useState<BoardState>(defaultState);
  const [loading, setLoading] = useState<boolean>(true);
  const [syncing, setSyncing] = useState<boolean>(false);

  // Load cached state on boot
  useEffect(() => {
    (async () => {
      try {
        const cached = await AsyncStorage.getItem(STORAGE_KEY);
        if (cached) {
          setState(JSON.parse(cached));
        }
      } catch (e) {
        console.error('Failed to load local state', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Sync with Supabase on user change
  useEffect(() => {
    if (user && isConfigured) {
      syncWithCloud();
    }
  }, [user]);

  const saveLocally = async (newState: BoardState) => {
    setState(newState);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (e) {
      console.error('Error saving local state', e);
    }
  };

  const syncWithCloud = async () => {
    if (!user || !isConfigured) return;
    setSyncing(true);
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('state_json, rev')
        .eq('user_id', user.id)
        .single();

      if (!error && data && data.state_json) {
        const cloudState = typeof data.state_json === 'string' ? JSON.parse(data.state_json) : data.state_json;
        const merged: BoardState = {
          ...cloudState,
          rev: data.rev || 1
        };
        saveLocally(merged);
      } else if (error && error.code === 'PGRST116') {
        // No board exists in cloud yet, push current local state
        await pushToCloud(state);
      }
    } catch (e) {
      console.error('Cloud sync error', e);
    } finally {
      setSyncing(false);
    }
  };

  const pushToCloud = async (stateToPush: BoardState) => {
    if (!user || !isConfigured) return;
    try {
      const nextRev = (stateToPush.rev || 0) + 1;
      await supabase.from('boards').upsert({
        user_id: user.id,
        state_json: stateToPush,
        rev: nextRev,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });
    } catch (e) {
      console.error('Failed pushing board to cloud', e);
    }
  };

  const toggleHabitCheck = (habitId: string, dateKey = getTodayKey()) => {
    const currentChecks = { ...(state.checks || {}) };
    const dayChecks = { ...(currentChecks[dateKey] || {}) };

    dayChecks[habitId] = !dayChecks[habitId];
    currentChecks[dateKey] = dayChecks;

    const newState: BoardState = {
      ...state,
      checks: currentChecks,
      rev: (state.rev || 0) + 1
    };

    saveLocally(newState);
    pushToCloud(newState);
  };

  const addHabit = (name: string, emoji: string, color: string) => {
    const newHabit: Habit = {
      id: 'h_' + Date.now().toString(36),
      name: name.trim(),
      emoji: emoji || '🎯',
      color: color || 'mint',
      sched: { t: 'daily' },
      since: getTodayKey()
    };

    const newState: BoardState = {
      ...state,
      habits: [...state.habits, newHabit],
      rev: (state.rev || 0) + 1
    };

    saveLocally(newState);
    pushToCloud(newState);
  };

  const updateBig3 = (index: number, text: string) => {
    const today = getTodayKey();
    const weeks = { ...(state.weeks || {}) };
    const currentWeek: WeekPlan = { ...(weeks[today] || { big3: ['', '', ''], tasks: [] }) };
    const big3 = [...(currentWeek.big3 || ['', '', ''])];
    big3[index] = text;
    currentWeek.big3 = big3;
    weeks[today] = currentWeek;

    const newState: BoardState = {
      ...state,
      weeks,
      rev: (state.rev || 0) + 1
    };

    saveLocally(newState);
    pushToCloud(newState);
  };

  const getStreak = (habitId: string): number => {
    let streak = 0;
    const checks = state.checks || {};
    const d = new Date();

    // Check today first
    const todayKey = getTodayKey();
    if (checks[todayKey]?.[habitId]) {
      streak++;
    }

    // Check consecutive days backwards
    for (let i = 1; i <= 365; i++) {
      const prev = new Date(d);
      prev.setDate(d.getDate() - i);
      const y = prev.getFullYear();
      const m = String(prev.getMonth() + 1).padStart(2, '0');
      const day = String(prev.getDate()).padStart(2, '0');
      const k = `${y}-${m}-${day}`;

      if (checks[k]?.[habitId]) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  };

  const getTodayProgress = () => {
    const today = getTodayKey();
    const activeHabits = state.habits.filter(h => !h.archived);
    const dayChecks = state.checks[today] || {};
    const done = activeHabits.filter(h => dayChecks[h.id]).length;
    const total = activeHabits.length;
    const percent = total > 0 ? Math.round((done / total) * 100) : 0;
    return { done, total, percent };
  };

  return (
    <BoardContext.Provider
      value={{
        state,
        loading,
        syncing,
        toggleHabitCheck,
        addHabit,
        updateBig3,
        syncWithCloud,
        getStreak,
        getTodayProgress
      }}
    >
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => useContext(BoardContext);
