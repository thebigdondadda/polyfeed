export const PERIODS = [
  { id: "all", label: "All" },
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
] as const;

export type Period = (typeof PERIODS)[number]["id"];

export const CATEGORIES = [
  { id: "OVERALL", label: "All", tagSlug: null },
  { id: "SPORTS", label: "Sports", tagSlug: "sports" },
  { id: "ESPORTS", label: "Esports", tagSlug: "esports" },
  { id: "POLITICS", label: "News", tagSlug: "politics" },
  { id: "CRYPTO", label: "Crypto", tagSlug: "crypto" },
  { id: "CULTURE", label: "Culture", tagSlug: "culture" },
  { id: "MENTIONS", label: "Mentions", tagSlug: "mentions" },
  { id: "WEATHER", label: "Weather", tagSlug: "weather" },
  { id: "ECONOMICS", label: "Economics", tagSlug: "economics" },
  { id: "TECH", label: "Tech", tagSlug: "tech" },
  { id: "FINANCE", label: "Finance", tagSlug: "finance" },
] as const;

export type Category = (typeof CATEGORIES)[number]["id"];

export type Trader = {
  rank: number;
  wallet: string;
  name: string;
  pnl: number;
  volume: number;
  profileImage: string | null;
  verified: boolean;
};

export type Trade = {
  wallet: string;
  name: string;
  profileImage: string | null;
  side: "BUY" | "SELL";
  size: number;
  price: number;
  timestamp: number;
  title: string;
  slug: string;
  eventSlug: string;
  icon: string | null;
  outcome: string;
  conditionId: string;
  tokenId: string;
  transactionHash: string;
};

type Envelope<T> = {
  data?: T | null;
  pagination?: { next_cursor?: string | null };
};

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string") {
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

function str(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return fallback;
}

function num(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

const DEFAULT_PROXY = "https://ndsucycfijwxhcvrsick.supabase.co/functions/v1/poly";

type ProxyKind = "api" | "gamma" | "clob" | "chain";

function apiPath(kind: ProxyKind, path: string): string {
  const proxy = (import.meta.env?.VITE_POLY_PROXY || DEFAULT_PROXY).replace(/\/$/, "");
  return `${proxy}/${kind}${path}`;
}

function pick(row: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return undefined;
}

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    let detail = "";
    try {
      const body = asRecord(await response.json());
      detail = str(body.error);
    } catch {
      detail = "";
    }
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return response.json();
}

function unwrapList(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const envelope = payload as Envelope<unknown[]>;
  return Array.isArray(envelope.data) ? envelope.data : [];
}

function mapTrader(row: unknown): Trader | null {
  const item = asRecord(row);
  const wallet = str(pick(item, "proxy_wallet", "proxyWallet", "user_id", "userId", "wallet")).toLowerCase();
  if (!wallet) return null;
  return {
    rank: num(pick(item, "rank"), 0),
    wallet,
    name: str(pick(item, "user_name", "userName", "name"), shortFallback(wallet)),
    pnl: num(pick(item, "pnl")),
    volume: num(pick(item, "volume", "vol")),
    profileImage: nonempty(str(pick(item, "profile_image", "profileImage"))),
    verified: Boolean(pick(item, "verified", "verifiedBadge")),
  };
}

function mapTrade(row: unknown): Trade | null {
  const item = asRecord(row);
  const wallet = str(
    pick(item, "proxy_wallet", "proxyWallet", "wallet", "user_id", "userId"),
  ).toLowerCase();
  const hash = str(pick(item, "transaction_hash", "transactionHash"));
  if (!wallet || !hash) return null;

  let timestamp = num(pick(item, "timestamp"));
  if (timestamp > 1e12) timestamp = Math.floor(timestamp / 1000);
  if (!timestamp && typeof pick(item, "timestamp") === "string") {
    const parsed = Date.parse(str(pick(item, "timestamp")));
    if (!Number.isNaN(parsed)) timestamp = Math.floor(parsed / 1000);
  }

  const side = str(pick(item, "side")).toUpperCase() === "SELL" ? "SELL" : "BUY";

  return {
    wallet,
    name: str(pick(item, "name", "user_name", "userName", "pseudonym"), shortFallback(wallet)),
    profileImage: nonempty(str(pick(item, "profile_image", "profileImage", "profile_image_optimized"))),
    side,
    size: num(pick(item, "size")),
    price: num(pick(item, "price")),
    timestamp,
    title: str(pick(item, "title"), "Unknown market"),
    slug: str(pick(item, "slug")),
    eventSlug: str(pick(item, "eventSlug", "event_slug")),
    icon: nonempty(str(pick(item, "icon"))),
    outcome: str(pick(item, "outcome")),
    conditionId: str(pick(item, "condition_id", "conditionId")).toLowerCase(),
    tokenId: str(pick(item, "token_id", "tokenId", "asset", "asset_id", "assetId")),
    transactionHash: hash,
  };
}

function shortFallback(wallet: string): string {
  return `${wallet.slice(0, 6)}…${wallet.slice(-4)}`;
}

function nonempty(value: string): string | null {
  return value ? value : null;
}

const TIME_PERIOD: Record<Period, string> = {
  all: "ALL",
  day: "DAY",
  week: "WEEK",
  month: "MONTH",
};

const DAY_SEC = 24 * 60 * 60;

export function periodCutoffSec(period: Period, nowMs = Date.now()): number | null {
  const now = Math.floor(nowMs / 1000);
  if (period === "day") return now - DAY_SEC;
  if (period === "week") return now - 7 * DAY_SEC;
  if (period === "month") return now - 30 * DAY_SEC;
  return null;
}

export function tradeInWindow(trade: Trade, cutoff: number | null): boolean {
  return cutoff == null || trade.timestamp >= cutoff;
}

export const MIN_TRADE_USD = 1_000;

export function tradeNotional(trade: Trade): number {
  return trade.size * trade.price;
}

export function isSizedTrade(trade: Trade): boolean {
  return tradeNotional(trade) >= MIN_TRADE_USD;
}

const BOARD_LIMIT = 100;
const PAGE_LIMIT = 50;

async function fetchLeaderboardPage(period: Period, category: Category, offset: number): Promise<Trader[]> {
  const params = new URLSearchParams({
    timePeriod: TIME_PERIOD[period],
    orderBy: "PNL",
    limit: String(PAGE_LIMIT),
    offset: String(offset),
    category,
  });
  const payload = await fetchJson(apiPath("api", `/v1/leaderboard?${params.toString()}`)).catch(() =>
    fetchJson(
      apiPath(
        "api",
        `/v2/leaderboard?${new URLSearchParams({
          timePeriod: TIME_PERIOD[period],
          time_period: TIME_PERIOD[period],
          orderBy: "PNL",
          order_by: "PNL",
          sort_by: "PNL",
          limit: String(PAGE_LIMIT),
          offset: String(offset),
          category,
        }).toString()}`,
      ),
    ),
  );
  return unwrapList(payload)
    .map(mapTrader)
    .filter((row): row is Trader => row !== null);
}

export async function fetchLeaderboard(period: Period, category: Category): Promise<Trader[]> {
  const pages = await Promise.all([
    fetchLeaderboardPage(period, category, 0),
    fetchLeaderboardPage(period, category, PAGE_LIMIT),
  ]);
  const seen = new Set<string>();
  const board: Trader[] = [];
  for (const row of pages.flat()) {
    if (!row.wallet || seen.has(row.wallet)) continue;
    seen.add(row.wallet);
    board.push(row);
    if (board.length >= BOARD_LIMIT) break;
  }
  return board;
}

function tradesQuery(params: URLSearchParams): Promise<unknown> {
  return fetchJson(apiPath("api", `/trades?${params.toString()}`)).catch(() => {
    const fallback = new URLSearchParams(params);
    fallback.delete("start");
    fallback.delete("takerOnly");
    fallback.set("taker_only", "false");
    return fetchJson(apiPath("api", `/v2/trades?${fallback.toString()}`));
  });
}

export async function fetchRecentTrades(limit = 100, start?: number | null): Promise<Trade[]> {
  const params = new URLSearchParams({
    limit: String(limit),
    takerOnly: "false",
    taker_only: "false",
  });
  if (start != null) {
    params.set("start", String(start));
  }
  const payload = await tradesQuery(params);
  return unwrapList(payload)
    .map(mapTrade)
    .filter((row): row is Trade => row !== null);
}

export async function fetchUserTrades(
  wallet: string,
  limit = 10,
  side?: "BUY" | "SELL",
  offset = 0,
  start?: number | null,
): Promise<Trade[]> {
  const params = new URLSearchParams({
    user: wallet,
    limit: String(limit),
    offset: String(offset),
    takerOnly: "false",
    taker_only: "false",
  });
  if (side) params.set("side", side);
  if (start != null) params.set("start", String(start));

  const payload = await tradesQuery(params);
  return unwrapList(payload)
    .map(mapTrade)
    .filter((row): row is Trade => row !== null);
}

export async function fetchUserBuysAndSells(wallet: string, limit = 10): Promise<Trade[]> {
  const [buys, sells] = await Promise.all([
    fetchUserTrades(wallet, limit, "BUY"),
    fetchUserTrades(wallet, limit, "SELL"),
  ]);
  return [...buys, ...sells];
}

const PAGE_SIZE = 50;
const MAX_PAGES = 6;

export async function fetchUserTradesInWindow(
  wallet: string,
  cutoff: number | null,
  conditions?: Set<string> | null,
): Promise<Trade[]> {
  const tagged = Boolean(conditions && conditions.size > 0);
  const collected: Trade[] = [];

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const rows = await fetchUserTrades(wallet, PAGE_SIZE, undefined, page * PAGE_SIZE, cutoff);
    if (rows.length === 0) break;
    collected.push(
      ...rows.filter((row) => tradeInWindow(row, cutoff) && isSizedTrade(row)),
    );
    const oldest = Math.min(...rows.map((row) => row.timestamp));
    if (cutoff != null && oldest < cutoff) break;
    if (rows.length < PAGE_SIZE) break;
    if (tagged) {
      const hits = collected.filter((row) => row.conditionId && conditions!.has(row.conditionId));
      if (hits.length > 0) return hits;
    } else if (collected.length > 0) {
      break;
    }
  }

  if (!tagged) return collected;
  return collected.filter((row) => row.conditionId && conditions!.has(row.conditionId));
}

function collectConditionIds(rows: unknown[]): Set<string> {
  const ids = new Set<string>();
  for (const row of rows) {
    const item = asRecord(row);
    const direct = str(pick(item, "conditionId", "condition_id")).toLowerCase();
    if (direct) ids.add(direct);
    for (const market of asArray(pick(item, "markets"))) {
      const marketRow = asRecord(market);
      const id = str(pick(marketRow, "conditionId", "condition_id")).toLowerCase();
      if (id) ids.add(id);
    }
  }
  return ids;
}

export async function fetchCategoryConditionIds(tagSlug: string): Promise<Set<string>> {
  const ids = new Set<string>();
  const pages = 3;
  const pageSize = 100;

  for (let page = 0; page < pages; page += 1) {
    const eventsParams = new URLSearchParams({
      tag_slug: tagSlug,
      related_tags: "true",
      active: "true",
      closed: "false",
      limit: String(pageSize),
      offset: String(page * pageSize),
      order: "volume24hr",
      ascending: "false",
    });
    try {
      const events = unwrapList(await fetchJson(apiPath("gamma", `/events?${eventsParams.toString()}`)));
      for (const id of collectConditionIds(events)) ids.add(id);
      if (events.length < pageSize) break;
    } catch {
      break;
    }
  }

  try {
    const marketsParams = new URLSearchParams({
      tag_slug: tagSlug,
      closed: "false",
      limit: "100",
      order: "volume24hr",
      ascending: "false",
    });
    const markets = unwrapList(await fetchJson(apiPath("gamma", `/markets?${marketsParams.toString()}`)));
    for (const id of collectConditionIds(markets)) ids.add(id);
  } catch {
    // Markets tag filter is optional; events IDs are enough.
  }

  return ids;
}

export function categoryTagSlug(category: Category): string | null {
  return CATEGORIES.find((item) => item.id === category)?.tagSlug ?? null;
}

export type MarketStates = {
  finished: Set<string>;
  prices: Map<string, number>;
};

type MarketCacheHit = {
  finished: boolean;
  prices: Map<string, number>;
  checkedAt: number;
};

const MARKET_CACHE = new Map<string, MarketCacheHit>();
const OPEN_RECHECK_MS = 5_000;

function flag(value: unknown): boolean {
  return value === true || value === "true" || value === 1 || value === "1";
}

export function marketIsFinished(payload: unknown): boolean {
  const item = asRecord(payload);
  if (flag(pick(item, "closed"))) return true;
  if (pick(item, "accepting_orders", "acceptingOrders") === false) return true;
  if (pick(item, "accepting_orders", "acceptingOrders") === "false") return true;
  if (flag(pick(item, "ended"))) return true;
  const prices: number[] = [];
  for (const token of asArray(pick(item, "tokens"))) {
    const row = asRecord(token);
    if (flag(row.winner)) return true;
    const price = num(row.price, Number.NaN);
    if (Number.isFinite(price) && price >= 0 && price <= 1) prices.push(price);
  }
  const listed = pick(item, "outcomePrices", "outcome_prices");
  if (typeof listed === "string" && listed.trim()) {
    try {
      for (const value of asArray(JSON.parse(listed))) {
        const price = num(value, Number.NaN);
        if (Number.isFinite(price) && price >= 0 && price <= 1) prices.push(price);
      }
    } catch {
      // ignore malformed gamma blobs
    }
  }
  if (prices.length >= 2) {
    const high = Math.max(...prices);
    const low = Math.min(...prices);
    if (high >= 0.99 && low <= 0.01) return true;
  }
  return false;
}

function tokenPricesFromMarket(payload: unknown): Map<string, number> {
  const prices = new Map<string, number>();
  for (const token of asArray(pick(asRecord(payload), "tokens"))) {
    const row = asRecord(token);
    const id = str(pick(row, "token_id", "tokenId"));
    const price = num(row.price, Number.NaN);
    if (id && Number.isFinite(price) && price > 0 && price <= 1) {
      prices.set(id, price);
    }
  }
  return prices;
}

async function fetchMarketSnapshot(conditionId: string): Promise<Omit<MarketCacheHit, "checkedAt">> {
  const payload = await fetchJson(apiPath("clob", `/markets/${conditionId}`));
  return {
    finished: marketIsFinished(payload),
    prices: tokenPricesFromMarket(payload),
  };
}

export async function fetchMarketStates(conditionIds: string[]): Promise<MarketStates> {
  const unique = [...new Set(conditionIds.map((id) => id.trim().toLowerCase()).filter(Boolean))];
  const now = Date.now();
  const missing: string[] = [];
  for (const id of unique) {
    const hit = MARKET_CACHE.get(id);
    if (!hit) {
      missing.push(id);
      continue;
    }
    if (hit.finished) continue;
    if (now - hit.checkedAt >= OPEN_RECHECK_MS) missing.push(id);
  }

  const chunk = 8;
  for (let i = 0; i < missing.length; i += chunk) {
    await Promise.all(
      missing.slice(i, i + chunk).map(async (id) => {
        try {
          const snap = await fetchMarketSnapshot(id);
          MARKET_CACHE.set(id, { ...snap, checkedAt: Date.now() });
        } catch {
          if (!MARKET_CACHE.has(id)) {
            MARKET_CACHE.set(id, { finished: false, prices: new Map(), checkedAt: Date.now() });
          }
        }
      }),
    );
  }

  const finished = new Set<string>();
  const prices = new Map<string, number>();
  for (const id of unique) {
    const hit = MARKET_CACHE.get(id);
    if (!hit) continue;
    if (hit.finished) finished.add(id);
    for (const [tokenId, price] of hit.prices) prices.set(tokenId, price);
  }
  return { finished, prices };
}

export async function fetchFinishedConditionIds(conditionIds: string[]): Promise<Set<string>> {
  const states = await fetchMarketStates(conditionIds);
  return states.finished;
}

export async function fetchTokenPrice(
  tokenId: string,
  prefer: "last" | "mid" = "last",
): Promise<number | null> {
  if (!tokenId) return null;
  const params = new URLSearchParams({ token_id: tokenId });

  const lastTrade = async (): Promise<number | null> => {
    try {
      const last = asRecord(await fetchJson(apiPath("clob", `/last-trade-price?${params.toString()}`)));
      const lastPrice = num(pick(last, "price"));
      const lastSide = str(pick(last, "side")).toUpperCase();
      if (lastPrice > 0 && lastPrice <= 1 && (lastSide === "BUY" || lastSide === "SELL")) {
        return lastPrice;
      }
    } catch {
      return null;
    }
    return null;
  };

  const midpoint = async (): Promise<number | null> => {
    try {
      const payload = asRecord(await fetchJson(apiPath("clob", `/midpoint?${params.toString()}`)));
      const mid = num(pick(payload, "mid", "mid_price", "price"));
      return mid > 0 && mid <= 1 ? mid : null;
    } catch {
      return null;
    }
  };

  if (prefer === "mid") {
    return (await fetchLiveMid(tokenId)) ?? (await fetchBookQuote(tokenId)).mid;
  }
  return (await lastTrade()) ?? (await fetchLiveMid(tokenId));
}

export async function fetchLiveMid(tokenId: string): Promise<number | null> {
  if (!tokenId) return null;
  try {
    const params = new URLSearchParams({ token_id: tokenId });
    const payload = asRecord(await fetchJson(apiPath("clob", `/midpoint?${params.toString()}`)));
    const mid = num(pick(payload, "mid", "mid_price", "price"));
    return mid > 0 && mid <= 1 ? mid : null;
  } catch {
    return null;
  }
}

export type BookQuote = {
  bid: number | null;
  ask: number | null;
  mid: number | null;
};

export async function fetchBookQuote(tokenId: string): Promise<BookQuote> {
  const empty: BookQuote = { bid: null, ask: null, mid: null };
  if (!tokenId) return empty;
  try {
    const params = new URLSearchParams({ token_id: tokenId });
    const book = asRecord(await fetchJson(apiPath("clob", `/book?${params.toString()}`)));
    const bids = asArray(book.bids);
    const asks = asArray(book.asks);
    let bestBid = 0;
    let bestAsk = 0;
    for (const row of bids) {
      const price = num(pick(asRecord(row), "price"));
      if (price > 0 && price <= 1 && price > bestBid) bestBid = price;
    }
    for (const row of asks) {
      const price = num(pick(asRecord(row), "price"));
      if (price > 0 && price <= 1 && (bestAsk === 0 || price < bestAsk)) bestAsk = price;
    }
    const bid = bestBid > 0 ? bestBid : null;
    const ask = bestAsk > 0 ? bestAsk : null;
    const mid = bid != null && ask != null && ask >= bid ? (bid + ask) / 2 : null;
    return { bid, ask, mid };
  } catch {
    return empty;
  }
}

export async function fetchBookMid(tokenId: string): Promise<number | null> {
  const quote = await fetchBookQuote(tokenId);
  return quote.mid;
}

export type UserPosition = {
  tokenId: string;
  conditionId: string;
  title: string;
  outcome: string;
  shares: number;
  entryPrice: number;
  markPrice: number;
  cost: number;
  cashPnl: number;
};

export type PolyAccount = {
  wallet: string;
  name: string;
};

export function accountHandle(name: string | null | undefined, fallback = ""): string {
  const raw = (name || fallback).trim();
  if (!raw || /^0x[a-fA-F0-9]{40}$/i.test(raw)) return fallback ? shortFallback(fallback) : "";
  return raw.startsWith("@") ? raw : `@${raw}`;
}

export function polymarketProfileUrl(name: string, wallet: string): string {
  const handle = name.replace(/^@/, "").trim();
  const looksLikeWallet = /^0x/i.test(handle) || handle.includes("…") || handle.includes("...");
  if (handle && !looksLikeWallet) {
    return `https://polymarket.com/@${encodeURIComponent(handle)}`;
  }
  if (wallet) return `https://polymarket.com/profile/${wallet}`;
  return "https://polymarket.com";
}

export function polymarketMarketUrl(trade: { slug?: string; eventSlug?: string }): string {
  const eventSlug = eventSlugOf(trade);
  if (!eventSlug) return "";
  const series = sportsSeriesFromEventSlug(eventSlug);
  if (series) {
    return `https://polymarket.com/sports/${encodeURIComponent(series)}/${encodeURIComponent(eventSlug)}`;
  }
  return `https://polymarket.com/event/${encodeURIComponent(eventSlug)}`;
}

function eventSlugOf(trade: { slug?: string; eventSlug?: string }): string {
  const explicit = (trade.eventSlug || "").trim();
  if (explicit) return explicit;
  const slug = (trade.slug || "").trim();
  const dated = slug.match(/^((?:[a-z0-9]+-)+?\d{4}-\d{2}-\d{2})/i);
  return dated?.[1] ?? "";
}

const SPORT_SERIES: Record<string, string> = {
  nba: "nba",
  wnba: "wnba",
  nfl: "nfl",
  mlb: "mlb",
  nhl: "nhl",
  mls: "mls",
  epl: "epl",
  ucl: "ucl",
  ufc: "ufc",
  atp: "atp",
  wta: "wta",
  f1: "f1",
  cfb: "cfb",
  cbb: "cbb",
  lol: "lol",
  cs2: "cs2",
  dota2: "dota-2",
  valorant: "valorant",
  r6: "rainbow-six",
  rl: "rocket-league",
  ow: "overwatch",
  cod: "call-of-duty",
  mlbb: "mobile-legends",
};

function sportsSeriesFromEventSlug(eventSlug: string): string | null {
  const prefix = eventSlug.split("-")[0]?.toLowerCase() ?? "";
  return SPORT_SERIES[prefix] ?? null;
}

function profileUsername(item: Record<string, unknown>, nested: Record<string, unknown>): string {
  const displayPublic = pick(item, "displayUsernamePublic", "display_username_public") ??
    pick(nested, "displayUsernamePublic", "display_username_public");
  const publicName = str(
    pick(item, "name", "username", "userName", "user_name") ??
      pick(nested, "name", "username", "userName", "user_name"),
  );
  if (publicName && !/^0x[a-fA-F0-9]{40}$/i.test(publicName) && displayPublic !== false) {
    return publicName.replace(/^@/, "");
  }
  for (const row of asArray(item.users)) {
    const user = asRecord(row);
    const handle = str(pick(user, "name", "username", "userName"));
    if (handle && !/^0x[a-fA-F0-9]{40}$/i.test(handle)) return handle.replace(/^@/, "");
  }
  const fallback = str(pick(item, "pseudonym") ?? pick(nested, "pseudonym"));
  return fallback.replace(/^@/, "");
}

function mapProfile(row: unknown, fallbackAddress = ""): PolyAccount | null {
  const item = asRecord(row);
  const nested = asRecord(item.user);
  const wallet = str(
    pick(item, "proxyWallet", "proxy_wallet", "wallet", "user_id", "userId") ??
      pick(nested, "proxyWallet", "proxy_wallet", "wallet"),
    fallbackAddress,
  ).toLowerCase();
  if (!wallet) return null;
  const name = profileUsername(item, nested) || shortFallback(wallet);
  return { wallet, name };
}

export async function fetchPublicProfile(address: string): Promise<PolyAccount | null> {
  if (!address) return null;
  try {
    const params = new URLSearchParams({ address });
    return mapProfile(await fetchJson(apiPath("gamma", `/public-profile?${params.toString()}`)), address.toLowerCase());
  } catch {
    return null;
  }
}

export async function resolvePolyAccount(query: string): Promise<PolyAccount> {
  const value = query.trim();
  if (!value) throw new Error("Enter your Polymarket username or profile address.");

  if (/^0x[a-fA-F0-9]{40}$/.test(value)) {
    const address = value.toLowerCase();
    const profile = await fetchPublicProfile(address);
    return profile ?? { wallet: address, name: shortFallback(address) };
  }

  const params = new URLSearchParams({
    q: value,
    search_profiles: "true",
    limit_per_type: "10",
  });
  const payload = asRecord(await fetchJson(apiPath("gamma", `/public-search?${params.toString()}`)));
  const profiles = asArray(payload.profiles).map((row) => mapProfile(row)).filter((row): row is PolyAccount => row !== null);
  const needle = value.toLowerCase();
  const match =
    profiles.find((row) => row.name.toLowerCase() === needle || row.wallet === needle) ??
    profiles[0];
  if (!match) throw new Error("No Polymarket account found for that username.");
  return match;
}

export async function fetchUserPnl(user: string): Promise<number | null> {
  if (!user) return null;
  const params = new URLSearchParams({ user });
  const payload = asRecord(await fetchJson(apiPath("api", `/v2/user-stats?${params.toString()}`)));
  const data = asRecord(payload.data ?? payload);
  const point = asRecord(pick(data, "all_time_pnl", "allTimePnl") ?? {});
  const economic = num(pick(point, "economic_pnl", "economicPnl"), Number.NaN);
  if (Number.isFinite(economic)) return economic;
  const position = num(pick(point, "position_pnl", "positionPnl"), Number.NaN);
  if (Number.isFinite(position)) return position;
  const realized = num(pick(point, "realized_pnl", "realizedPnl"), Number.NaN);
  const unrealized = num(pick(point, "unrealized_pnl", "unrealizedPnl"), Number.NaN);
  if (Number.isFinite(realized) || Number.isFinite(unrealized)) {
    return (Number.isFinite(realized) ? realized : 0) + (Number.isFinite(unrealized) ? unrealized : 0);
  }
  return null;
}

export async function fetchUserPositions(user: string): Promise<UserPosition[]> {
  if (!user) return [];
  const params = new URLSearchParams({
    user,
    sizeThreshold: "0",
    limit: "200",
  });
  const payload = await fetchJson(apiPath("api", `/positions?${params.toString()}`));
  return unwrapList(payload)
    .map((row) => {
      const item = asRecord(row);
      const tokenId = str(pick(item, "asset", "assetId", "asset_id", "tokenId", "token_id"));
      const shares = num(pick(item, "size", "currentSize", "current_size"));
      const entryPrice = num(pick(item, "avgPrice", "avg_price"));
      if (!tokenId || shares <= 0) return null;
      const cost = num(pick(item, "initialValue", "entryCostUsdc", "entry_cost_usdc"), shares * entryPrice);
      return {
        tokenId,
        conditionId: str(pick(item, "conditionId", "condition_id")).toLowerCase(),
        title: str(pick(item, "title"), "Unknown market"),
        outcome: str(pick(item, "outcome")),
        shares,
        entryPrice,
        markPrice: num(pick(item, "curPrice", "currentPrice", "current_price"), entryPrice),
        cost,
        cashPnl: num(pick(item, "cashPnl", "cash_pnl", "unrealizedPnl", "unrealized_pnl")),
      } satisfies UserPosition;
    })
    .filter((row): row is UserPosition => row !== null);
}

export async function fetchOnchainCash(wallets: string[]): Promise<number> {
  const owners = [
    ...new Set(wallets.map((row) => row.toLowerCase()).filter((row) => /^0x[a-f0-9]{40}$/.test(row))),
  ];
  if (!owners.length) return 0;
  const params = new URLSearchParams();
  for (const owner of owners) params.append("address", owner);
  const payload = asRecord(await fetchJson(apiPath("chain", `/balances?${params.toString()}`)));
  return num(pick(payload, "balance"));
}

export function serviceOrigin(kind: ProxyKind): string {
  return apiPath(kind, "").replace(/\/$/, "");
}
