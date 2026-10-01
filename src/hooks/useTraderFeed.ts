import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { readFeedCache, writeFeedCache } from "../lib/feedCache";
import { tradeKey } from "../lib/format";
import {
  categoryTagSlug,
  fetchCategoryConditionIds,
  fetchLeaderboard,
  fetchRecentTrades,
  fetchUserTradesInWindow,
  isSizedTrade,
  periodCutoffSec,
  tradeInWindow,
  type Category,
  type Period,
  type Trade,
  type Trader,
} from "../lib/polymarket";

const POLL_MS = 5_000;
const BOARD_MS = 60_000;
const TAPE_CAP = 250;
const EV_CAP = 4_000;
const ROTATE_USERS = 6;
const BOOT_BATCH = 8;

function keepValid(
  trades: Trade[],
  wallets: Set<string>,
  conditions: Set<string> | null,
  cutoff: number | null,
  cap: number,
): Trade[] {
  return trades
    .filter((trade) => {
      if (wallets.size > 0 && !wallets.has(trade.wallet)) return false;
      if (!tradeInWindow(trade, cutoff)) return false;
      if (!isSizedTrade(trade)) return false;
      if (conditions && conditions.size > 0) {
        if (!trade.conditionId || !conditions.has(trade.conditionId)) return false;
      }
      return true;
    })
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, cap);
}

function mergeTrades(
  current: Trade[],
  incoming: Trade[],
  wallets: Set<string>,
  conditions: Set<string> | null,
  cutoff: number | null,
  cap: number,
): { next: Trade[]; added: string[] } {
  const base = keepValid(current, wallets, conditions, cutoff, cap);
  const seen = new Set(base.map(tradeKey));
  const added: string[] = [];
  const fresh: Trade[] = [];

  for (const trade of keepValid(incoming, wallets, conditions, cutoff, cap)) {
    const key = tradeKey(trade);
    if (seen.has(key)) continue;
    seen.add(key);
    added.push(key);
    fresh.push(trade);
  }

  const next = [...fresh, ...base]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, cap);

  return { next, added };
}

async function mapPool<T, R>(items: T[], size: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += size) {
    const chunk = await Promise.all(items.slice(i, i + size).map(fn));
    out.push(...chunk);
  }
  return out;
}

export function useTraderFeed(period: Period, category: Category) {
  const cached = readFeedCache(period, category);
  const firstWallets = new Set(cached?.traders.map((trader) => trader.wallet) ?? []);
  const firstConditions = cached?.conditionIds?.length ? new Set(cached.conditionIds) : null;
  const firstCutoff = periodCutoffSec(period);
  const firstTrades = cached
    ? keepValid(cached.trades, firstWallets, firstConditions, firstCutoff, TAPE_CAP)
    : [];
  const firstEv = cached
    ? keepValid(cached.evTrades ?? cached.trades, firstWallets, firstConditions, firstCutoff, EV_CAP)
    : [];
  const [traders, setTraders] = useState<Trader[]>(() => cached?.traders ?? []);
  const [trades, setTrades] = useState<Trade[]>(() => firstTrades);
  const [evTrades, setEvTrades] = useState<Trade[]>(() => firstEv);
  const [newKeys, setNewKeys] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState<string | null>(null);
  const [ready, setReady] = useState(() => Boolean(cached));
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(() => cached?.updatedAt ?? null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const walletsRef = useRef<Set<string>>(new Set(cached?.traders.map((trader) => trader.wallet) ?? []));
  const conditionsRef = useRef<Set<string> | null>(
    cached?.conditionIds?.length ? new Set(cached.conditionIds) : null,
  );
  const rotateRef = useRef(0);
  const tradersRef = useRef(traders);
  const tradesRef = useRef(trades);
  const evTradesRef = useRef(evTrades);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 1_000);
    return () => window.clearInterval(tick);
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    let pollTimer = 0;
    let boardTimer = 0;
    const cutoff = () => periodCutoffSec(period);

    rotateRef.current = 0;
    setNewKeys([]);
    setSelectedWallet(null);
    setError(null);

    const hit = readFeedCache(period, category);
    if (hit) {
      const wallets = new Set(hit.traders.map((trader) => trader.wallet));
      const conditions = hit.conditionIds?.length ? new Set(hit.conditionIds) : null;
      const valid = keepValid(hit.trades, wallets, conditions, cutoff(), TAPE_CAP);
      const validEv = keepValid(hit.evTrades ?? hit.trades, wallets, conditions, cutoff(), EV_CAP);
      setTraders(hit.traders);
      setTrades(valid);
      setEvTrades(validEv);
      setUpdatedAt(hit.updatedAt);
      setReady(true);
      tradersRef.current = hit.traders;
      tradesRef.current = valid;
      evTradesRef.current = validEv;
      walletsRef.current = wallets;
      conditionsRef.current = conditions;
    } else {
      setTraders([]);
      setTrades([]);
      setEvTrades([]);
      setUpdatedAt(null);
      setReady(false);
      tradersRef.current = [];
      tradesRef.current = [];
      evTradesRef.current = [];
      walletsRef.current = new Set();
      conditionsRef.current = null;
    }

    const persist = (nextTraders = tradersRef.current) => {
      const valid = keepValid(tradesRef.current, walletsRef.current, conditionsRef.current, cutoff(), TAPE_CAP);
      const validEv = keepValid(
        evTradesRef.current,
        walletsRef.current,
        conditionsRef.current,
        cutoff(),
        EV_CAP,
      );
      tradersRef.current = nextTraders;
      tradesRef.current = valid;
      evTradesRef.current = validEv;
      writeFeedCache(period, category, {
        traders: nextTraders,
        trades: valid,
        evTrades: validEv,
        conditionIds: conditionsRef.current ? [...conditionsRef.current] : null,
        updatedAt: Date.now(),
      });
      return valid;
    };

    const applyIncoming = (incoming: Trade[], markNew: boolean) => {
      setUpdatedAt(Date.now());
      setNowMs(Date.now());
      setTrades((current) => {
        const { next, added } = mergeTrades(
          current,
          incoming,
          walletsRef.current,
          conditionsRef.current,
          cutoff(),
          TAPE_CAP,
        );
        tradesRef.current = next;
        if (markNew && added.length > 0) {
          setNewKeys(added);
          window.setTimeout(() => {
            if (!cancelled) setNewKeys([]);
          }, 900);
        }
        return next;
      });
      setEvTrades((current) => {
        const { next } = mergeTrades(
          current,
          incoming,
          walletsRef.current,
          conditionsRef.current,
          cutoff(),
          EV_CAP,
        );
        evTradesRef.current = next;
        persist();
        return next;
      });
    };

    const loadLeaderboard = async () => {
      const board = await fetchLeaderboard(period, category);
      if (cancelled) return board;
      const wallets = new Set(board.map((trader) => trader.wallet));
      walletsRef.current = wallets;
      setTraders(board);
      const next = keepValid(tradesRef.current, wallets, conditionsRef.current, cutoff(), TAPE_CAP);
      tradesRef.current = next;
      const nextEv = keepValid(evTradesRef.current, wallets, conditionsRef.current, cutoff(), EV_CAP);
      evTradesRef.current = nextEv;
      persist(board);
      setTrades(next);
      setEvTrades(nextEv);
      return board;
    };

    const loadConditions = async () => {
      const tag = categoryTagSlug(category);
      if (!tag) {
        conditionsRef.current = null;
        return;
      }
      try {
        const ids = await fetchCategoryConditionIds(tag);
        if (cancelled) return;
        conditionsRef.current = ids.size > 0 ? ids : null;
        const next = keepValid(
          tradesRef.current,
          walletsRef.current,
          conditionsRef.current,
          cutoff(),
          TAPE_CAP,
        );
        tradesRef.current = next;
        const nextEv = keepValid(
          evTradesRef.current,
          walletsRef.current,
          conditionsRef.current,
          cutoff(),
          EV_CAP,
        );
        evTradesRef.current = nextEv;
        persist();
        setTrades(next);
        setEvTrades(nextEv);
      } catch {
        if (!cancelled) conditionsRef.current = null;
      }
    };

    const rotateUsers = () => {
      const wallets = [...walletsRef.current];
      if (wallets.length === 0) return [];
      const start = rotateRef.current % wallets.length;
      const slice = wallets.slice(start, start + ROTATE_USERS);
      if (slice.length < ROTATE_USERS) {
        slice.push(...wallets.slice(0, ROTATE_USERS - slice.length));
      }
      rotateRef.current = (start + ROTATE_USERS) % wallets.length;
      return slice;
    };

    const fillsFor = async (wallets: string[]) => {
      const rows: Trade[] = [];
      await mapPool(wallets, BOOT_BATCH, async (wallet) => {
        const fills = await fetchUserTradesInWindow(wallet, cutoff(), conditionsRef.current).catch(
          () => [] as Trade[],
        );
        if (cancelled || fills.length === 0) return;
        rows.push(...fills);
        applyIncoming(fills, false);
      });
      return rows;
    };

    const pollLive = async () => {
      const started = Date.now();
      try {
        const live = await fetchRecentTrades(200, cutoff());
        if (cancelled) return;
        applyIncoming(live, true);
        setError(null);

        const slice = rotateUsers();
        void fillsFor(slice).catch(() => undefined);
      } catch {
        if (!cancelled) setUpdatedAt(Date.now());
      } finally {
        const wait = Math.max(0, POLL_MS - (Date.now() - started));
        if (!cancelled) pollTimer = window.setTimeout(() => void pollLive(), wait);
      }
    };

    const boot = async () => {
      try {
        const board = await loadLeaderboard();
        if (cancelled) return;
        setReady(true);
        setError(null);

        pollTimer = window.setTimeout(() => void pollLive(), POLL_MS);
        boardTimer = window.setInterval(() => {
          void Promise.all([loadLeaderboard(), loadConditions()]).catch(() => undefined);
        }, BOARD_MS);

        const seeding = fillsFor(board.map((trader) => trader.wallet));
        const live = await fetchRecentTrades(200, cutoff()).catch(() => [] as Trade[]);
        if (cancelled) return;
        applyIncoming(live, false);

        await loadConditions();
        if (cancelled) return;
        await seeding;
      } catch (err) {
        if (!cancelled && tradersRef.current.length === 0) {
          setError(err instanceof Error ? err.message : "Could not load Polymarket data");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void boot();

    return () => {
      cancelled = true;
      window.clearTimeout(pollTimer);
      window.clearInterval(boardTimer);
    };
  }, [period, category]);

  const visibleTrades = useMemo(() => {
    const cutoff = periodCutoffSec(period, nowMs);
    const inWindow = keepValid(trades, walletsRef.current, conditionsRef.current, cutoff, TAPE_CAP);
    if (!selectedWallet) return inWindow;
    return inWindow.filter((trade) => trade.wallet === selectedWallet);
  }, [selectedWallet, trades, period, nowMs]);

  const traderByWallet = useMemo(() => {
    const map = new Map<string, Trader>();
    for (const trader of traders) map.set(trader.wallet, trader);
    return map;
  }, [traders]);

  return {
    traders,
    trades: visibleTrades,
    allTrades: trades,
    evTrades,
    newKeys,
    selectedWallet,
    setSelectedWallet,
    ready,
    error,
    updatedAt,
    nowMs,
    traderByWallet,
  };
}
