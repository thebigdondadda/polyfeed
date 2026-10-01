import { useEffect, useRef, useState } from "react";
import type { ToastItem } from "../components/Toasts";
import {
  clearCreds,
  connectTradingClient,
  fetchWalletCash,
  getStoredCreds,
  hasStoredCreds,
  orderError,
  peekAddress,
  placeBuy,
  placeSell,
  requestAddress,
  type TradingClient,
} from "../lib/clob";
import { formatPrice, formatUsd } from "../lib/format";
import {
  accountHandle,
  fetchLiveMid,
  fetchPublicProfile,
  fetchUserPnl,
  fetchUserPositions,
  type Trade,
} from "../lib/polymarket";

const PRICE_MS = 1_000;
const ACCOUNT_MS = 5_000;
const STORAGE_KEY = "polyfeed-account-v1";
const CONNECTED_KEY = "polyfeed-connected";
const DISMISSED_KEY = "polyfeed-dismissed-v1";
const LOCAL_HOLD_MS = 90_000;

export type DemoPosition = {
  id: string;
  tokenId: string;
  conditionId: string;
  title: string;
  outcome: string;
  entryPrice: number;
  markPrice: number;
  shares: number;
  cost: number;
  copiedFrom: string;
  copiedName: string;
  sourceHash: string;
  openedAt: number;
  quotedAt?: number;
};

type SavedAccount = {
  wallet?: string;
  name?: string;
  cash?: number;
  positions?: DemoPosition[];
};

type ToastKind = ToastItem["kind"];

function gainOf(entry: number, mark: number): number {
  return entry > 0 ? (mark - entry) / entry : 0;
}

async function quoteMark(tokenId: string, fallback: number): Promise<number> {
  if (!tokenId) return fallback;
  return (await fetchLiveMid(tokenId)) ?? fallback;
}

function isSessionOn() {
  return localStorage.getItem(CONNECTED_KEY) === "1";
}

function loadSavedAccount(): SavedAccount | null {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as SavedAccount | null;
  } catch {
    return null;
  }
}

function loadSavedHandle() {
  if (!isSessionOn()) return "";
  const name = loadSavedAccount()?.name;
  return name?.startsWith("@") ? name : "";
}

function loadSavedWallet() {
  if (!isSessionOn()) return "";
  return loadSavedAccount()?.wallet?.toLowerCase() || "";
}

function loadDismissed(): Set<string> {
  try {
    const rows = JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]") as unknown;
    return new Set(Array.isArray(rows) ? rows.filter((row): row is string => typeof row === "string" && row.length > 0) : []);
  } catch {
    return new Set();
  }
}

function writeDismissed(ids: Set<string>) {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
}

function isDeadMarket(position: DemoPosition) {
  return gainOf(position.entryPrice, position.markPrice) <= -0.99 || position.markPrice <= 0.01;
}

function isIlliquidError(message: string) {
  return /liquidit|no (orders|match|bids)|orderbook|fully filled|fak|killed|not enough|no opposite|unable to fill/i.test(
    message,
  );
}

export function useDemoAccount() {
  const saved = isSessionOn() ? loadSavedAccount() : null;
  const [address, setAddress] = useState<string | null>(null);
  const [accountName, setAccountName] = useState(loadSavedHandle);
  const [client, setClient] = useState<TradingClient | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [cash, setCash] = useState(saved?.cash ?? 0);
  const [positions, setPositions] = useState<DemoPosition[]>(() => {
    const dismissed = loadDismissed();
    return (saved?.positions ?? []).filter((row) => !row.tokenId || !dismissed.has(row.tokenId));
  });
  const [profitLoss, setProfitLoss] = useState(0);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const positionsRef = useRef(positions);
  const cashRef = useRef(cash);
  const clientRef = useRef(client);
  const addressRef = useRef(address);
  const lastMutationRef = useRef(saved?.cash || saved?.positions?.length ? Date.now() : 0);
  const soldAtRef = useRef(new Map<string, number>());
  const dismissedRef = useRef(loadDismissed());
  const syncGenRef = useRef(0);
  positionsRef.current = positions;
  cashRef.current = cash;
  clientRef.current = client;
  addressRef.current = address;

  const tradingWallet = client?.account.wallet ?? address;

  const pushToast = (kind: ToastKind, title: string, detail: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, kind, title, detail }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 4500);
  };

  const writeCash = (value: number) => {
    const next = Math.max(0, value);
    cashRef.current = next;
    lastMutationRef.current = Date.now();
    setCash(next);
  };

  const holdSyncing = () => {
    const id = ++syncGenRef.current;
    setSyncing(true);
    return () => {
      if (syncGenRef.current === id) setSyncing(false);
    };
  };

  const remember = (wallet: string, name: string) => {
    localStorage.setItem(CONNECTED_KEY, "1");
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        wallet,
        name,
        cash: cashRef.current,
        positions: positionsRef.current,
      } satisfies SavedAccount),
    );
  };

  const refreshAccount = async (wallet = tradingWallet) => {
    const live = clientRef.current;
    const eoa = addressRef.current ?? live?.account.wallet ?? wallet;
    const book = live?.account.wallet ?? wallet;
    const wallets = [
      ...new Set([wallet, eoa, book, loadSavedWallet()].filter(Boolean).map((row) => row.toLowerCase())),
    ];
    if (!wallets.length) {
      writeCash(0);
      setPositions([]);
      return;
    }
    const done = holdSyncing();
    const applyCash = fetchWalletCash(
      wallets,
      live?.credentials ?? (eoa ? getStoredCreds(eoa) : undefined),
      eoa ?? undefined,
    )
      .catch(() => 0)
      .then((usdc) => {
        const local = cashRef.current;
        const mutatedAgo = Date.now() - lastMutationRef.current;
        if (usdc <= 0 && local > 0.5 && mutatedAgo < LOCAL_HOLD_MS) return;
        if (mutatedAgo < LOCAL_HOLD_MS && Math.abs(usdc - local) > 1) return;
        cashRef.current = usdc;
        setCash(usdc);
      });
    const applyPositions = Promise.all(wallets.map((owner) => fetchUserPositions(owner).catch(() => []))).then(
      (lists) => {
        const byToken = new Map<string, (typeof lists)[number][number]>();
        for (const row of lists.flat()) {
          const prev = byToken.get(row.tokenId);
          if (!prev || row.shares > prev.shares) byToken.set(row.tokenId, row);
        }
        const rows = [...byToken.values()];
        const now = Date.now();
        setPositions((current) => {
          const fromApi = rows
            .filter((row) => {
              if (dismissedRef.current.has(row.tokenId)) return false;
              const soldAt = soldAtRef.current.get(row.tokenId);
              return !soldAt || now - soldAt > LOCAL_HOLD_MS;
            })
            .map((row) => {
              const prev = current.find((item) => item.tokenId === row.tokenId);
              return {
                id: row.tokenId,
                tokenId: row.tokenId,
                conditionId: row.conditionId,
                title: row.title,
                outcome: row.outcome,
                entryPrice: row.entryPrice,
                markPrice: prev?.markPrice || row.markPrice,
                shares: row.shares,
                cost: row.cost,
                copiedFrom: prev?.copiedFrom ?? wallet ?? "",
                copiedName: prev?.copiedName ?? "You",
                sourceHash: row.tokenId,
                openedAt: prev?.openedAt ?? now,
                quotedAt: prev?.quotedAt ?? now,
              } satisfies DemoPosition;
            });
          const seen = new Set(fromApi.map((row) => row.tokenId));
          const pending = current.filter((row) => !seen.has(row.tokenId) && now - row.openedAt < LOCAL_HOLD_MS);
          return pending.length ? [...fromApi, ...pending] : fromApi;
        });
      },
    );
    const applyPnl = Promise.all(
      wallets.map((owner) => fetchUserPnl(owner).catch(() => null)),
    ).then((rows) => {
      const hit = rows.find((value) => value != null && Number.isFinite(value));
      if (hit != null) setProfitLoss(hit);
    });
    try {
      await Promise.all([applyCash, applyPositions, applyPnl]);
    } finally {
      done();
    }
  };

  const attachClient = async (nextAddress: `0x${string}`) => {
    addressRef.current = nextAddress;
    setAddress(nextAddress);
    const next = await connectTradingClient(nextAddress);
    clientRef.current = next;
    setClient(next);
    const profile =
      (await fetchPublicProfile(next.account.wallet)) ??
      (await fetchPublicProfile(nextAddress));
    const name = accountHandle(profile?.name, nextAddress);
    setAccountName(name);
    remember(next.account.wallet, name);
    void refreshAccount(next.account.wallet);
    return next;
  };

  const connect = async () => {
    if (connecting) return;
    setConnecting(true);
    setConnectError(null);
    try {
      const nextAddress = await requestAddress();
      await attachClient(nextAddress);
      pushToast("buy", "Polymarket connected", "Quick buy and Sell place real orders.");
    } catch (error) {
      const message = orderError(error);
      setConnectError(message);
      throw error;
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    clearCreds();
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(CONNECTED_KEY);
    setClient(null);
    setAddress(null);
    setAccountName("");
    setCash(0);
    cashRef.current = 0;
    lastMutationRef.current = 0;
    soldAtRef.current.clear();
    setPositions([]);
    setProfitLoss(0);
  };

  useEffect(() => {
    if (!isSessionOn()) return;
    let cancelled = false;
    void (async () => {
      const existing = await peekAddress();
      if (!existing || cancelled) return;
      setAddress(existing);
      const profile = await fetchPublicProfile(existing);
      if (cancelled) return;
      setAccountName(accountHandle(profile?.name, existing));
      if (hasStoredCreds(existing)) {
        try {
          await attachClient(existing);
          return;
        } catch {
          // Stay signed in for the book until they reconnect trading.
        }
      }
      if (!cancelled) await refreshAccount(profile?.wallet ?? existing);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isSessionOn()) return;
    const saved = loadSavedAccount() ?? {};
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        wallet: saved.wallet,
        name: accountName || saved.name,
        cash,
        positions,
      } satisfies SavedAccount),
    );
  }, [accountName, cash, positions]);

  useEffect(() => {
    if (!tradingWallet) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await refreshAccount(tradingWallet).catch(() => undefined);
    };
    void tick();
    const timer = window.setInterval(() => void tick(), ACCOUNT_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tradingWallet]);

  useEffect(() => {
    if (positions.length === 0) return;
    let cancelled = false;
    let inflight = false;

    const markToMarket = async () => {
      const open = positionsRef.current;
      if (cancelled || inflight || open.length === 0) return;
      inflight = true;
      try {
        const tokens = [...new Set(open.map((row) => row.tokenId).filter(Boolean))];
        const quotes = await Promise.all(
          tokens.map(async (tokenId) => [tokenId, await fetchLiveMid(tokenId)] as const),
        );
        const byToken = new Map(quotes);
        if (cancelled) return;

        setPositions((current) => {
          let changed = false;
          const now = Date.now();
          const next = current.map((row) => {
            const mark = byToken.get(row.tokenId) ?? null;
            if (mark == null) return row;
            if (mark === row.markPrice && row.quotedAt && now - row.quotedAt < 800) return row;
            changed = true;
            return { ...row, markPrice: mark, quotedAt: now };
          });
          return changed ? next : current;
        });
      } finally {
        inflight = false;
      }
    };

    void markToMarket();
    const timer = window.setInterval(() => void markToMarket(), PRICE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [positions.length]);

  const requireClient = (): TradingClient | null => {
    if (clientRef.current?.signer) return clientRef.current;
    pushToast(
      "error",
      "Reconnect Polymarket",
      "Disconnect, then Connect again so buys use your deposit wallet.",
    );
    return null;
  };

  const dismissPosition = (position: DemoPosition, detail: string) => {
    if (position.tokenId) {
      soldAtRef.current.set(position.tokenId, Date.now());
      dismissedRef.current.add(position.tokenId);
      writeDismissed(dismissedRef.current);
    }
    setPositions((current) => current.filter((row) => row.id !== position.id));
    const pnl = (position.markPrice - position.entryPrice) * position.shares;
    const pct = `${gainOf(position.entryPrice, position.markPrice) >= 0 ? "+" : ""}${(gainOf(position.entryPrice, position.markPrice) * 100).toFixed(1)}%`;
    pushToast("sell", position.title, `${detail} · ${formatUsd(pnl)} · ${pct}`);
  };

  const closePosition = async (position: DemoPosition, reason: string) => {
    if (isDeadMarket(position)) {
      dismissPosition(position, "Cleared");
      return;
    }

    const live = requireClient();
    if (!live || !position.tokenId) return;
    const proceeds = position.shares * position.markPrice;
    soldAtRef.current.set(position.tokenId, Date.now());
    setPositions((current) => current.filter((row) => row.id !== position.id));
    writeCash(cashRef.current + proceeds);
    const done = holdSyncing();
    try {
      const response = await placeSell(live, position.tokenId, position.shares);
      if (!response.ok) {
        writeCash(cashRef.current - proceeds);
        done();
        if (isIlliquidError(response.message) || isDeadMarket(position)) {
          dismissPosition(position, "Cleared");
          return;
        }
        soldAtRef.current.delete(position.tokenId);
        setPositions((current) => [position, ...current.filter((row) => row.id !== position.id)]);
        pushToast("error", position.title, response.message);
        return;
      }
      if (response.taking > 0) writeCash(cashRef.current - proceeds + response.taking);
      const mark = position.markPrice;
      const pnl = (mark - position.entryPrice) * position.shares;
      const pct = `${gainOf(position.entryPrice, mark) >= 0 ? "+" : ""}${(gainOf(position.entryPrice, mark) * 100).toFixed(1)}%`;
      pushToast("sell", position.title, `${reason} · ${formatUsd(pnl)} · ${pct}`);
      window.setTimeout(() => void refreshAccount(live.account.wallet), 4_000);
      window.setTimeout(done, 2_500);
    } catch (error) {
      writeCash(cashRef.current - proceeds);
      done();
      const message = orderError(error);
      if (isIlliquidError(message) || isDeadMarket(position)) {
        dismissPosition(position, "Cleared");
        return;
      }
      soldAtRef.current.delete(position.tokenId);
      setPositions((current) => [position, ...current.filter((row) => row.id !== position.id)]);
      pushToast("error", position.title, message);
    }
  };

  const openTrade = async (trade: Trade, stake: number, toastDetail: string) => {
    const live = requireClient();
    if (!live || !trade.tokenId) return false;
    if (dismissedRef.current.delete(trade.tokenId)) writeDismissed(dismissedRef.current);
    const spend = Math.max(stake, 0);
    if (spend < 1) return false;
    const price = trade.price > 0 && trade.price < 1 ? trade.price : 0.5;
    const now = Date.now();
    writeCash(cashRef.current - spend);
    setPositions((current) => {
      const existing = current.find((row) => row.tokenId === trade.tokenId);
      if (existing) {
        const nextShares = existing.shares + spend / price;
        const nextCost = existing.cost + spend;
        return current.map((row) =>
          row.tokenId === trade.tokenId
            ? {
                ...row,
                shares: nextShares,
                cost: nextCost,
                entryPrice: nextShares > 0 ? nextCost / nextShares : row.entryPrice,
                quotedAt: now,
              }
            : row,
        );
      }
      return [
        {
          id: trade.tokenId,
          tokenId: trade.tokenId,
          conditionId: trade.conditionId,
          title: trade.title,
          outcome: trade.outcome,
          entryPrice: price,
          markPrice: price,
          shares: spend / price,
          cost: spend,
          copiedFrom: trade.wallet,
          copiedName: trade.name,
          sourceHash: trade.transactionHash,
          openedAt: now,
          quotedAt: now,
        },
        ...current,
      ];
    });
    const done = holdSyncing();
    try {
      const response = await placeBuy(live, trade.tokenId, spend);
      if (!response.ok) {
        writeCash(cashRef.current + spend);
        setPositions((current) => {
          const row = current.find((item) => item.tokenId === trade.tokenId);
          if (!row) return current;
          const nextCost = row.cost - spend;
          if (nextCost <= 0.5) return current.filter((item) => item.tokenId !== trade.tokenId);
          const nextShares = Math.max(0, row.shares - spend / price);
          return current.map((item) =>
            item.tokenId === trade.tokenId
              ? {
                  ...item,
                  cost: nextCost,
                  shares: nextShares,
                  entryPrice: nextShares > 0 ? nextCost / nextShares : item.entryPrice,
                }
              : item,
          );
        });
        pushToast("error", trade.title, response.message);
        done();
        return false;
      }
      const cost = response.making > 0 ? response.making : spend;
      const shares = response.taking > 0 ? response.taking : cost / price;
      const entry = shares > 0 ? cost / shares : price;
      if (Math.abs(cost - spend) > 0.01) {
        writeCash(cashRef.current + spend - cost);
      }
      setPositions((current) =>
        current.map((row) => {
          if (row.tokenId !== trade.tokenId) return row;
          if (row.sourceHash === trade.transactionHash) {
            return { ...row, cost, shares, entryPrice: entry, markPrice: entry, quotedAt: Date.now() };
          }
          const nextCost = row.cost - spend + cost;
          const nextShares = Math.max(0, row.shares - spend / price + shares);
          return {
            ...row,
            cost: nextCost,
            shares: nextShares,
            entryPrice: nextShares > 0 ? nextCost / nextShares : entry,
            quotedAt: Date.now(),
          };
        }),
      );
      pushToast("buy", trade.title, `${trade.outcome || "Yes"} · ${formatPrice(entry)} · ${toastDetail}`);
      void quoteMark(trade.tokenId, entry).then((mark) => {
        setPositions((current) =>
          current.map((row) =>
            row.tokenId === trade.tokenId ? { ...row, markPrice: mark, quotedAt: Date.now() } : row,
          ),
        );
      });
      window.setTimeout(() => void refreshAccount(live.account.wallet), 4_000);
      window.setTimeout(done, 2_500);
      return true;
    } catch (error) {
      writeCash(cashRef.current + spend);
      setPositions((current) => {
        const row = current.find((item) => item.tokenId === trade.tokenId);
        if (!row) return current;
        const nextCost = row.cost - spend;
        if (nextCost <= 0.5) return current.filter((item) => item.tokenId !== trade.tokenId);
        const nextShares = Math.max(0, row.shares - spend / price);
        return current.map((item) =>
          item.tokenId === trade.tokenId
            ? {
                ...item,
                cost: nextCost,
                shares: nextShares,
                entryPrice: nextShares > 0 ? nextCost / nextShares : item.entryPrice,
              }
            : item,
        );
      });
      pushToast("error", trade.title, orderError(error));
      done();
      return false;
    }
  };

  return {
    address,
    accountName,
    connecting,
    connectError,
    ready: Boolean(client),
    syncing,
    cash,
    currentBets: positions.length,
    profitLoss,
    positions,
    toasts,
    connect,
    disconnect,
    sell: (id: string) => {
      const position = positionsRef.current.find((row) => row.id === id);
      if (position) void closePosition(position, "Manual sell");
    },
    buy: (trade: Trade, stake = 10) => {
      if (trade.price <= 0) return;
      void openTrade(trade, stake, `copied ${trade.name}`);
    },
    heldKeys: new Set(
      positions.map((row) => row.tokenId || `${row.conditionId}:${row.outcome}`),
    ),
  };
}
