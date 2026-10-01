import { useState } from "react";
import { formatPrice, formatShares, formatUsd, relativeTime, tradeKey } from "../lib/format";
import { polymarketProfileUrl, type Trade, type Trader } from "../lib/polymarket";
import { loadStake, rememberStake } from "../lib/stake";
import { Thumb } from "./Logo";

type TradeFeedProps = {
  trades: Trade[];
  newKeys: string[];
  ready?: boolean;
  error: string | null;
  traderByWallet: Map<string, Trader>;
  nowMs: number;
  heldKeys?: Set<string>;
  onBuy?: (trade: Trade, amount: number) => void;
};

function marketKey(trade: Trade): string {
  return trade.tokenId || `${trade.conditionId}:${trade.outcome}`;
}

export function TradeFeed({
  trades,
  newKeys,
  ready = true,
  error,
  traderByWallet,
  nowMs,
  heldKeys,
  onBuy,
}: TradeFeedProps) {
  const fresh = new Set(newKeys);
  const [buying, setBuying] = useState<string | null>(null);
  const [stake, setStake] = useState(loadStake);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-[49px] items-center px-5 border-b border-bg-tertiary">
        <h2>Trades</h2>
      </div>

      {error ? (
        <p className="px-5 py-4 text-white/70">{error}</p>
      ) : null}

      {ready && trades.length === 0 && !error ? (
        <p className="px-5 py-8 text-white/60">
          No $1,000+ fills from these traders yet. Trades refresh every 5 seconds.
        </p>
      ) : null}

      <ul className="flex-1 overflow-y-auto">
        {trades.map((trade) => {
          const key = tradeKey(trade);
          const trader = traderByWallet.get(trade.wallet);
          const held = heldKeys?.has(marketKey(trade)) ?? false;
          const pending = buying === key;
          const amount = Number(stake);
          return (
            <li
              key={key}
              className={`flex items-center gap-3 px-5 py-3 border-b border-bg-tertiary ${
                fresh.has(key) ? "tape-in bg-bg-secondary/60" : ""
              }`}
            >
              <Thumb src={trade.icon} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <a
                    href={polymarketProfileUrl(trader?.name ?? trade.name, trade.wallet)}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    {trader?.name ?? trade.name}
                  </a>
                  <span
                    className={`h-7 px-3 rounded-lg text-sm leading-7 ring ring-bg-tertiary ${
                      trade.side === "BUY"
                        ? "bg-green-600 text-white"
                        : "bg-red-600 text-white"
                    }`}
                  >
                    {trade.side}
                  </span>
                  <span className="text-white/55">{relativeTime(trade.timestamp, nowMs)}</span>
                </div>
                <p className="mt-1 truncate text-white/85">{trade.title}</p>
                <p className="mt-1 text-sm text-white/55">
                  {trade.outcome ? `${trade.outcome} · ` : ""}
                  {formatShares(trade.size)} sh @ {formatPrice(trade.price)}
                  {" · "}
                  {formatUsd(trade.size * trade.price)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <label className="flex h-7 items-center rounded-lg bg-bg-secondary px-2 ring ring-bg-tertiary">
                  <span className="mr-1 text-sm text-white/55">$</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="decimal"
                    value={stake}
                    onChange={(event) => {
                      const next = event.target.value;
                      setStake(next);
                      rememberStake(next);
                    }}
                    className="w-14 bg-transparent text-sm outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    aria-label="Quick buy amount"
                  />
                </label>
                <button
                  type="button"
                  disabled={held || pending || !onBuy || trade.price <= 0 || !Number.isFinite(amount) || amount < 1}
                  onClick={() => {
                    if (!Number.isFinite(amount) || amount < 1) return;
                    rememberStake(stake);
                    setBuying(key);
                    onBuy?.(trade, amount);
                    window.setTimeout(() => setBuying((current) => (current === key ? null : current)), 800);
                  }}
                  className={`h-7 shrink-0 rounded-lg px-3 text-sm font-bold ring ${
                    held
                      ? "bg-bg-secondary text-white/45 ring-bg-tertiary"
                      : "bg-green-600 text-white ring-green-600 hover:bg-green-600/90 disabled:opacity-50"
                  }`}
                >
                  {held ? "Held" : pending ? "Buying…" : "Quick buy"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
