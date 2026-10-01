import { expectedProfit, scoreEvBets, shortEdge, shrinkFair } from "./ev";
import { marketIsFinished } from "./polymarket";
import type { Trade } from "./polymarket";

let failed = 0;

function fill(partial: Partial<Trade> & Pick<Trade, "wallet" | "side" | "tokenId">): Trade {
  return {
    name: partial.wallet,
    profileImage: null,
    size: 100,
    price: 0.5,
    timestamp: 1,
    title: "Spain vs England",
    slug: "spain-vs-england",
    eventSlug: "spain-vs-england",
    icon: null,
    outcome: "Yes",
    conditionId: "cond-spain",
    transactionHash: `${partial.wallet}-${partial.tokenId}-${partial.timestamp ?? 1}`,
    ...partial,
  };
}

function assert(label: string, ok: boolean, detail = "") {
  if (ok) {
    console.log(`ok  ${label}`);
    return;
  }
  failed += 1;
  console.error(`fail  ${label}${detail ? ` — ${detail}` : ""}`);
}

function closeTo(got: number | undefined, want: number, eps = 1e-9): boolean {
  return got != null && Number.isFinite(got) && Math.abs(got - want) <= eps;
}

const tokenA = "token-spain-ml";
const tokenB = "token-spain-spread";

{
  const bets = scoreEvBets([
    ...["w1", "w2"].map((wallet, i) =>
      fill({ wallet, side: "BUY", tokenId: tokenA, timestamp: i + 1 }),
    ),
    ...["w1", "w2", "w3"].map((wallet, i) =>
      fill({
        wallet,
        side: "BUY",
        tokenId: tokenB,
        timestamp: i + 10,
        title: "Spain vs England: Spain +1.5",
        outcome: "Spain +1.5",
        conditionId: "cond-spread",
      }),
    ),
  ]);
  assert("two tokens, same event → two rows", bets.length === 2, `got ${bets.length}`);
  assert(
    "rows are exact contracts",
    bets.some((bet) => bet.tokenId === tokenA) && bets.some((bet) => bet.tokenId === tokenB),
  );
}

{
  const bets = scoreEvBets([
    fill({ wallet: "w1", side: "BUY", tokenId: tokenA, timestamp: 1 }),
    fill({ wallet: "w1", side: "SELL", tokenId: tokenA, timestamp: 2 }),
    fill({ wallet: "w2", side: "BUY", tokenId: tokenA, timestamp: 3 }),
  ]);
  const row = bets.find((bet) => bet.tokenId === tokenA);
  assert("buy then sell counts as fading", row?.sellers === 1 && row.buyers === 1, JSON.stringify(row));
}

{
  const one = scoreEvBets([fill({ wallet: "w1", side: "BUY", tokenId: tokenA, timestamp: 1 })]);
  assert("1 trader is hidden", one.length === 0, `got ${one.length}`);

  const prices = new Map([[tokenA, 0.9]]);
  const two = scoreEvBets(
    ["w1", "w2"].map((wallet, i) =>
      fill({ wallet, side: "BUY", tokenId: tokenA, timestamp: i + 1, price: 0.9, size: 2_000 }),
    ),
    { prices },
  );
  const row = two[0];
  const fair = shrinkFair(1, 0.9, 2);
  const ev = shortEdge(fair, 0.9);
  assert("2/2 at 90¢ is not +100%", row != null && row.ev < 0.2, `ev=${row?.ev}`);
  assert("2/2 short-term edge matches shrink", closeTo(row?.ev, ev), `ev=${row?.ev} want ${ev}`);
  assert("2/2 copy is 2/2 long", row?.buyers === 2 && row.board === 2);
}

{
  const prices = new Map([[tokenA, 0.4]]);
  const wallets = Array.from({ length: 10 }, (_, i) => `w${i + 1}`);
  const bets = scoreEvBets(
    wallets.map((wallet, i) =>
      fill({
        wallet,
        side: i < 8 ? "BUY" : "SELL",
        tokenId: tokenA,
        timestamp: i + 1,
        price: 0.4,
        size: 12_500,
      }),
    ),
    { prices },
  );
  const row = bets[0];
  const fair = shrinkFair(0.8, 0.4, 10);
  const ev = shortEdge(fair, 0.4);
  assert("8/10 at 40¢ is fair minus price", closeTo(row?.ev, ev), `ev=${row?.ev} want ${ev}`);
  assert("8/10 long · 2 fading", row?.buyers === 8 && row.board === 10 && row.sellers === 2);
  assert("8/10 fair is 67% vs 40¢", closeTo(row?.fair, 2 / 3) && closeTo(row?.price, 0.4), `fair=${row?.fair}`);
  assert(
    "$10 at 40¢ expected profit is stake * edge / price",
    closeTo(expectedProfit(10, fair, 0.4) ?? NaN, (10 * ev) / 0.4),
  );
}

{
  const prices = new Map([[tokenA, 0.5]]);
  const equal = scoreEvBets(
    [
      ...["b1", "b2"].map((wallet, i) =>
        fill({ wallet, side: "BUY", tokenId: tokenA, timestamp: i + 1, price: 0.5, size: 2_000 }),
      ),
      ...["s1", "s2"].map((wallet, i) =>
        fill({ wallet, side: "SELL", tokenId: tokenA, timestamp: i + 11, price: 0.5, size: 2_000 }),
      ),
    ],
    { prices },
  );
  const heavy = scoreEvBets(
    [
      fill({ wallet: "b1", side: "BUY", tokenId: tokenA, timestamp: 1, price: 0.5, size: 2_000 }),
      fill({ wallet: "whale", side: "BUY", tokenId: tokenA, timestamp: 2, price: 0.5, size: 400_000 }),
      ...["s1", "s2"].map((wallet, i) =>
        fill({ wallet, side: "SELL", tokenId: tokenA, timestamp: i + 11, price: 0.5, size: 2_000 }),
      ),
    ],
    { prices },
  );
  assert("equal buys and sells is ~0 edge", closeTo(equal[0]?.ev, 0, 1e-9), `ev=${equal[0]?.ev}`);
  assert(
    "capped $200k wallet moves p_whales more than $1k",
    (heavy[0]?.ev ?? 0) > (equal[0]?.ev ?? 0) + 0.02,
    `heavy=${heavy[0]?.ev} equal=${equal[0]?.ev}`,
  );
}

{
  const prices = new Map([
    [tokenA, 0.5],
    ["token-finished", 0.5],
  ]);
  const live = ["w1", "w2"].map((wallet, i) =>
    fill({ wallet, side: "BUY", tokenId: tokenA, conditionId: "open-game", timestamp: i + 1 }),
  );
  const done = ["w3", "w4"].map((wallet, i) =>
    fill({
      wallet,
      side: "BUY",
      tokenId: "token-finished",
      conditionId: "finished-game",
      title: "Eagles vs. Bears",
      timestamp: i + 10,
    }),
  );
  const bets = scoreEvBets([...live, ...done], { finished: ["finished-game"], prices });
  assert("finished games are hidden", bets.every((bet) => bet.conditionId !== "finished-game"), JSON.stringify(bets));
  assert("open games still score", bets.some((bet) => bet.tokenId === tokenA), JSON.stringify(bets));
}

{
  assert(
    "closed CLOB market is finished",
    marketIsFinished({ closed: true, accepting_orders: false, tokens: [{ winner: true }] }),
  );
  assert(
    "winner announced is finished even if book still flagged open",
    marketIsFinished({ closed: false, accepting_orders: true, tokens: [{ winner: false }, { winner: true }] }),
  );
  assert(
    "live market is not finished",
    !marketIsFinished({
      closed: false,
      accepting_orders: true,
      tokens: [
        { winner: false, price: 0.62 },
        { winner: false, price: 0.38 },
      ],
    }),
  );
  assert(
    "winner-announced prices are finished even while the book is still open",
    marketIsFinished({
      closed: false,
      accepting_orders: true,
      tokens: [
        { winner: false, price: 0.9995 },
        { winner: false, price: 0.0005 },
      ],
    }),
  );
}

if (failed > 0) {
  console.error(`\n${failed} check(s) failed`);
  process.exit(1);
}

console.log("\nall ev checks passed");
