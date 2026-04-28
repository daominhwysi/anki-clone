import { get, set } from "idb-keyval";
import type { Deck } from "../types";

const STORAGE_KEY = "quizlet_clone_decks";
const ACTIVITY_KEY = "quizlet_clone_activity";

export const getDecks = async (): Promise<Deck[]> => {
  try {
    const stored = await get(STORAGE_KEY);
    // Support migrating from old localStorage if not in idb yet
    if (!stored) {
      const oldStorage = localStorage.getItem(STORAGE_KEY);
      if (oldStorage) {
        const parsed = JSON.parse(oldStorage);
        await set(STORAGE_KEY, parsed);
        return parsed;
      }
      return [];
    }
    return stored;
  } catch (e) {
    return [];
  }
};

export const saveDecks = async (decks: Deck[]): Promise<void> => {
  await set(STORAGE_KEY, decks);
};

export const getDeckById = async (id: string): Promise<Deck | undefined> => {
  const decks = await getDecks();
  return decks.find((d) => d.id === id);
};

// Activity Log
export interface ActivityLog {
  [dateString: string]: number; // "Mon Apr 24 2026"
}

export const getActivityLog = async (): Promise<ActivityLog> => {
  try {
    const stored = await get(ACTIVITY_KEY);
    return stored || {};
  } catch (e) {
    return {};
  }
};

export const saveActivityLog = async (log: ActivityLog): Promise<void> => {
  await set(ACTIVITY_KEY, log);
};

export const logReviewSession = async (minutes: number): Promise<void> => {
  if (minutes <= 0) return;

  const log = await getActivityLog();
  const dateStr = new Date().toDateString();
  log[dateStr] = (log[dateStr] || 0) + minutes;
  await saveActivityLog(log);
};
