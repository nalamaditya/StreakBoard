// mobile/src/lib/types.ts
// Shared data types matching Streakboard web schema

export interface Habit {
  id: string;
  name: string;
  emoji: string;
  color: string;
  sched?: { t: string };
  since?: string;
  archived?: boolean;
}

export interface DayChecks {
  [habitId: string]: boolean;
}

export interface WeekPlan {
  big3?: string[];
  tasks?: string[];
}

export interface BoardState {
  habits: Habit[];
  checks: Record<string, DayChecks>; // date string "YYYY-MM-DD" -> { habitId: true }
  weeks?: Record<string, WeekPlan>;
  mind?: Record<string, any>;
  rev?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
}
