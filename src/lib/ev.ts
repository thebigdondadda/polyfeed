import type { Trade } from "./polymarket";

export const MIN_EV_WALLETS = 2;
export const PRIOR_WALLETS = 5;
export const NOTIONAL_CAP = 25_000;
export const PRICE_FLOOR = 0.02;
export const PRICE_CEILING = 0.98;

export type EvBet = {
  id: string;
  tokenId: string;
  conditionId: string;
  title: string;
  outcome: string;
  icon: string | null;
  buyers: number;
  sellers: number;
  board: number;
  net: number;
  fair: number;
  price: number;
  ev: number;
  lastTs: number;
  trade: Trade;
};

export type ScoreEvOptions = {
  finished?: Iterable<string>;
  prices?: Map<string, number> | Record<string, number>;
};

export function betKey(trade: Trade): string {
  return trade.tokenId || `${trade.conditionId}:${trade.outcome}`;
}

export function fillWeight(trade: Trade): number {
  const notional = trade.size * trade.price;
  if (!Number.isFinite(notional) || notional <= 0) return 0;
  return Math.min(notional, NOTIONAL_CAP);
}

export function clampPrice(price: number): number {
  if (!Number.isFinite(price)) return PRICE_FLOOR;
  return Math.min(PRICE_CEILING, Math.max(PRICE_FLOOR, price));
}

export function shrinkFair(pWhales: number, price: number, n: number): number {
  const wallets = Math.max(n, 0);
  const weight = wallets / (wallets + PRIOR_WALLETS);
  return weight * pWhales + (1 - weight) * price;
}

export function shortEdge(fair: number, price: number): number {
  return fair - clampPrice(price);
}

export function expectedProfit(stake: number, fair: number, price: number): number | null {
  if (!Number.isFinite(stake) || stake < 1) return null;
  const pi = clampPrice(price);
  if (pi <= 0) return null;
  return (stake * (fair - pi)) / pi;
}

function lookupPrice(tokenId: string, prices?: ScoreEvOptions["prices"]): number | null {
  if (!tokenId || !prices) return null;
  if (prices instanceof Map) {
    const hit = prices.get(tokenId) ?? prices.get(tokenId.toLowerCase());
    return typeof hit === "number" && Number.isFinite(hit) ? hit : null;
  }
  const hit = prices[tokenId] ?? prices[tokenId.toLowerCase()];
  return typeof hit === "number" && Number.isFinite(hit) ? hit : null;
}

function usablePrice(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value) || value <= 0 || value > 1) return null;
  return value;
}

export function scoreEvBets(trades: Trade[], options: ScoreEvOptions = {}): EvBet[] {
  const finished = new Set(
    [...(options.finished ?? [])].map((id) => id.trim().toLowerCase()).filter(Boolean),
  );
  type Acc = {
    lastByWallet: Map<string, Trade>;
    lastTs: number;
    trade: Trade;
  };
  const byKey = new Map<string, Acc>();

  for (const trade of trades) {
    const id = betKey(trade);
    if (!id) continue;
    let row = byKey.get(id);
    if (!row) {
      row = {
        lastByWallet: new Map(),
        lastTs: trade.timestamp,
        trade,
      };
      byKey.set(id, row);
    }
    const prev = row.lastByWallet.get(trade.wallet);
    if (!prev || trade.timestamp >= prev.timestamp) {
      row.lastByWallet.set(trade.wallet, trade);
    }
    if (trade.timestamp >= row.lastTs) {
      row.lastTs = trade.timestamp;
      row.trade = trade;
    }
  }

  const bets: EvBet[] = [];
  for (const [id, row] of byKey) {
    let buyers = 0;
    let sellers = 0;
    let buyWeight = 0;
    let sellWeight = 0;
    for (const fill of row.lastByWallet.values()) {
      const weight = fillWeight(fill);
      if (fill.side === "BUY") {
        buyers += 1;
        buyWeight += weight;
      } else if (fill.side === "SELL") {
        sellers += 1;
        sellWeight += weight;
      }
    }
    const board = buyers + sellers;
    const conditionId = (row.trade.conditionId || "").toLowerCase();
    if (conditionId && finished.has(conditionId)) continue;
    if (board < MIN_EV_WALLETS) continue;
    const totalWeight = buyWeight + sellWeight;
    if (totalWeight <= 0) continue;
    const live = usablePrice(lookupPrice(row.trade.tokenId, options.prices));
    const fallback = usablePrice(row.trade.price);
    const raw = live ?? fallback;
    if (raw == null) continue;
    const price = clampPrice(raw);
    const pWhales = buyWeight / totalWeight;
    const fair = shrinkFair(pWhales, price, board);
    const net = buyers - sellers;
    bets.push({
      id,
      tokenId: row.trade.tokenId,
      conditionId: row.trade.conditionId,
      title: row.trade.title,
      outcome: row.trade.outcome,
      icon: row.trade.icon,
      buyers,
      sellers,
      board,
      net,
      fair,
      price,
      ev: shortEdge(fair, price),
      lastTs: row.lastTs,
      trade: row.trade,
    });
  }

  bets.sort(
    (a, b) =>
      b.ev - a.ev || Math.abs(b.fair - b.price) - Math.abs(a.fair - a.price) || b.lastTs - a.lastTs,
  );
  return bets;
}
