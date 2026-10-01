import { useEffect, useMemo, useState } from "react";
import { scoreEvBets } from "../lib/ev";
import { fetchLiveMid, fetchMarketStates, type Trade } from "../lib/polymarket";

const PRICE_MS = 2_000;
const STATE_MS = 15_000;

function conditionKey(ids: string[]): string {
  return [...new Set(ids.map((id) => id.toLowerCase()).filter(Boolean))].sort().join(",");
}

function tokenKey(ids: string[]): string {
  return [...new Set(ids.filter(Boolean))].sort().join(",");
}

export function useEvBets(trades: Trade[]): ReturnType<typeof scoreEvBets> {
  const [finished, setFinished] = useState<Set<string>>(() => new Set());
  const [prices, setPrices] = useState<Map<string, number>>(() => new Map());
  const draft = useMemo(() => scoreEvBets(trades, { prices }), [prices, trades]);
  const idsKey = conditionKey(draft.map((bet) => bet.conditionId));
  const tokensKey = tokenKey(draft.map((bet) => bet.tokenId));

  useEffect(() => {
    const ids = idsKey ? idsKey.split(",") : [];
    if (ids.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const states = await fetchMarketStates(ids);
      if (cancelled) return;
      setFinished(states.finished);
      setPrices((current) => {
        const next = new Map(current);
        for (const [tokenId, price] of states.prices) next.set(tokenId, price);
        return next;
      });
    };

    void load();
    const timer = window.setInterval(() => void load(), STATE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [idsKey]);

  useEffect(() => {
    const tokens = tokensKey ? tokensKey.split(",") : [];
    if (tokens.length === 0) return;

    let cancelled = false;
    const load = async () => {
      const rows = await Promise.all(
        tokens.map(async (tokenId) => [tokenId, await fetchLiveMid(tokenId)] as const),
      );
      if (cancelled) return;
      setPrices((current) => {
        let changed = false;
        const next = new Map(current);
        for (const [tokenId, price] of rows) {
          if (price == null || price <= 0 || price > 1) continue;
          if (next.get(tokenId) === price) continue;
          next.set(tokenId, price);
          changed = true;
        }
        return changed ? next : current;
      });
    };

    void load();
    const timer = window.setInterval(() => void load(), PRICE_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [tokensKey]);

  return useMemo(
    () => draft.filter((bet) => !finished.has((bet.conditionId || "").toLowerCase())),
    [draft, finished],
  );
}
