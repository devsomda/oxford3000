import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { OXFORD_3000, Word, CEFR } from '../data/oxford3000';

const STORAGE_KEY = 'oxford3000_progress';

export interface WordProgress {
  wordId: number;
  status: 'unseen' | 'learning' | 'mastered' | 'confirmed';
  correctCount: number;
  wrongCount: number;
  lastSeen: number; // timestamp
  nextReview: number; // timestamp for SRS
  bookmarked: boolean;
}

interface DailyStats {
  date: string; // YYYY-MM-DD
  studied: number;
  correct: number;
  wrong: number;
}

interface WordStore {
  progress: Record<number, WordProgress>;
  dailyGoal: number;
  dailyStats: DailyStats[];
  streak: number;
  isLoaded: boolean;

  // Actions
  load: () => Promise<void>;
  save: () => Promise<void>;
  markWord: (wordId: number, correct: boolean) => void;
  confirmWord: (wordId: number) => void;
  unconfirmWord: (wordId: number) => void;
  toggleBookmark: (wordId: number) => void;
  setDailyGoal: (goal: number) => void;
  resetProgress: () => void;

  // Selectors (computed)
  getWordProgress: (wordId: number) => WordProgress;
  getDueWords: (level?: CEFR) => Word[];
  getConfirmedWords: () => Word[];
  getBookmarkedWords: () => Word[];
  getMasteredCount: () => number;
  getConfirmedCount: () => number;
  getTodayStudied: () => number;
  getStreakCount: () => number;
}

const today = () => new Date().toISOString().slice(0, 10);

const defaultProgress = (wordId: number): WordProgress => ({
  wordId,
  status: 'unseen',
  correctCount: 0,
  wrongCount: 0,
  lastSeen: 0,
  nextReview: 0,
  bookmarked: false,
});

// SRS interval in ms: correct answers increase interval exponentially
const srsInterval = (correctCount: number): number => {
  const intervals = [0, 1, 3, 7, 14, 30, 60, 120]; // days
  const idx = Math.min(correctCount, intervals.length - 1);
  return intervals[idx] * 24 * 60 * 60 * 1000;
};

export const useWordStore = create<WordStore>((set, get) => ({
  progress: {},
  dailyGoal: 20,
  dailyStats: [],
  streak: 0,
  isLoaded: false,

  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        set({
          progress: saved.progress || {},
          dailyGoal: saved.dailyGoal || 20,
          dailyStats: saved.dailyStats || [],
          streak: saved.streak || 0,
          isLoaded: true,
        });
      } else {
        set({ isLoaded: true });
      }
    } catch {
      set({ isLoaded: true });
    }
  },

  save: async () => {
    const { progress, dailyGoal, dailyStats, streak } = get();
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ progress, dailyGoal, dailyStats, streak })
      );
    } catch {
      // ignore
    }
  },

  confirmWord: (wordId) => {
    const { progress } = get();
    const prev = progress[wordId] || defaultProgress(wordId);
    set({ progress: { ...progress, [wordId]: { ...prev, status: 'confirmed', lastSeen: Date.now() } } });
    get().save();
  },

  unconfirmWord: (wordId) => {
    const { progress } = get();
    const prev = progress[wordId] || defaultProgress(wordId);
    set({ progress: { ...progress, [wordId]: { ...prev, status: prev.correctCount > 0 ? 'learning' : 'unseen', nextReview: 0 } } });
    get().save();
  },

  markWord: (wordId, correct) => {
    const { progress, dailyStats } = get();
    const prev = progress[wordId] || defaultProgress(wordId);
    const now = Date.now();
    const newCorrect = correct ? prev.correctCount + 1 : prev.correctCount;
    const newWrong = correct ? prev.wrongCount : prev.wrongCount + 1;

    let status: WordProgress['status'] = 'learning';
    if (newCorrect >= 5 && newWrong === 0) status = 'mastered';
    else if (newCorrect >= 3 && newCorrect > newWrong * 2) status = 'mastered';

    const updated: WordProgress = {
      ...prev,
      status,
      correctCount: newCorrect,
      wrongCount: newWrong,
      lastSeen: now,
      nextReview: now + srsInterval(newCorrect),
    };

    // Update daily stats
    const dateKey = today();
    const existing = dailyStats.find((d) => d.date === dateKey);
    let newStats: DailyStats[];
    if (existing) {
      newStats = dailyStats.map((d) =>
        d.date === dateKey
          ? {
              ...d,
              studied: d.studied + 1,
              correct: correct ? d.correct + 1 : d.correct,
              wrong: correct ? d.wrong : d.wrong + 1,
            }
          : d
      );
    } else {
      newStats = [
        ...dailyStats,
        { date: dateKey, studied: 1, correct: correct ? 1 : 0, wrong: correct ? 0 : 1 },
      ];
    }

    // Calculate streak
    let streak = 0;
    const sortedStats = [...newStats].sort((a, b) => b.date.localeCompare(a.date));
    let checkDate = new Date();
    for (const stat of sortedStats) {
      const statDate = stat.date;
      const expected = checkDate.toISOString().slice(0, 10);
      if (statDate === expected && stat.studied > 0) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    set({
      progress: { ...progress, [wordId]: updated },
      dailyStats: newStats,
      streak,
    });
    get().save();
  },

  toggleBookmark: (wordId) => {
    const { progress } = get();
    const prev = progress[wordId] || defaultProgress(wordId);
    set({
      progress: {
        ...progress,
        [wordId]: { ...prev, bookmarked: !prev.bookmarked },
      },
    });
    get().save();
  },

  setDailyGoal: (goal) => {
    set({ dailyGoal: goal });
    get().save();
  },

  resetProgress: () => {
    set({ progress: {}, dailyStats: [], streak: 0 });
    get().save();
  },

  getWordProgress: (wordId) => {
    return get().progress[wordId] || defaultProgress(wordId);
  },

  getDueWords: (level?: CEFR) => {
    const { progress } = get();
    const now = Date.now();
    return OXFORD_3000.filter((w) => {
      if (level && w.level !== level) return false;
      const p = progress[w.id];
      if (!p) return true; // unseen words are always due
      if (p.status === 'mastered' || p.status === 'confirmed') return false;
      return now >= p.nextReview;
    });
  },

  getConfirmedWords: () => {
    const { progress } = get();
    return OXFORD_3000.filter((w) => progress[w.id]?.status === 'confirmed');
  },

  getBookmarkedWords: () => {
    const { progress } = get();
    return OXFORD_3000.filter((w) => progress[w.id]?.bookmarked);
  },

  getMasteredCount: () => {
    const { progress } = get();
    return Object.values(progress).filter((p) => p.status === 'mastered').length;
  },

  getConfirmedCount: () => {
    const { progress } = get();
    return Object.values(progress).filter((p) => p.status === 'confirmed').length;
  },

  getTodayStudied: () => {
    const { dailyStats } = get();
    const stat = dailyStats.find((d) => d.date === today());
    return stat?.studied || 0;
  },

  getStreakCount: () => get().streak,
}));
