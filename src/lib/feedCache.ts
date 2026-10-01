import type { Category, Period, Trade, Trader } from "./polymarket";

const STORAGE_KEY = "polyfeed-feed-v2";

export type FeedSnapshot = {
  traders: Trader[];
  trades: Trade[];
  evTrades?: Trade[];
  conditionIds: string[] | null;
  updatedAt: number;
};

type Store = Record<string, FeedSnapshot>;

const memory = new Map<string, FeedSnapshot>();

function slot(period: Period, category: Category): string {
  return `${period}:${category}`;
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed !== null && typeof parsed === "object" ? (parsed as Store) : {};
  } catch {
    return {};
  }
}

export function readFeedCache(period: Period, category: Category): FeedSnapshot | null {
  const key = slot(period, category);
  const hit = memory.get(key);
  if (hit) return hit;
  const stored = readStore()[key];
  if (stored?.traders && stored.trades) {
    memory.set(key, stored);
    return stored;
  }
  return null;
}

export function writeFeedCache(
  period: Period,
  category: Category,
  snapshot: FeedSnapshot,
): void {
  const key = slot(period, category);
  memory.set(key, snapshot);
  try {
    const store = readStore();
    store[key] = snapshot;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Quota or private mode — memory cache still works this session.
  }
}
