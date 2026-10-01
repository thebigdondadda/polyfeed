import { useState } from "react";
import { useEvBets } from "../hooks/useEvBets";
import { expectedProfit } from "../lib/ev";
import { polymarketMarketUrl, type Trade } from "../lib/polymarket";
import { loadStake, rememberStake } from "../lib/stake";
import { Thumb } from "./Logo";

function money(value: number): string {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  return `${sign}$${Math.abs(value).toFixed(2)}`;
}

type EvBoardProps = {
  trades: Trade[];
  ready?: boolean;
  heldKeys?: Set<string>;
  onBuy?: (trade: Trade, amount: number) => void;
};

function marketKey(trade: Trade): string {
  return trade.tokenId || `${trade.conditionId}:${trade.outcome}`;
}

export function EvBoard({ trades, ready = true, heldKeys, onBuy }: EvBoardProps) {
  const bets = useEvBets(trades);
  const [buying, setBuying] = useState<string | null>(null);
  const [stake, setStake] = useState(loadStake);

  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-bg-primary">
      <div className="flex h-[49px] shrink-0 items-center px-5 border-b border-bg-tertiary">
        <h2>EV</h2>
      </div>

      {bets.length === 0 ? (
        <p className="min-h-0 flex-1 border-l border-bg-tertiary px-5 py-8 text-white/60">
          {ready ? "No consensus from these traders yet." : ""}
        </p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto border-l border-bg-tertiary">
          {bets.map((bet) => {
            const up = bet.ev > 0;
            const down = bet.ev < 0;
            const tone = up ? "text-green-500" : down ? "text-red-500" : "text-white/55";
            const evPct = `${bet.ev > 0 ? "+" : ""}${(bet.ev * 100).toFixed(0)}%`;
            const marketUrl = polymarketMarketUrl(bet.trade);
            const held = heldKeys?.has(marketKey(bet.trade)) ?? false;
            const pending = buying === bet.id;
            const amount = Number(stake);
            const profit = expectedProfit(amount, bet.fair, bet.price);
            const canBuy = Boolean(onBuy && bet.trade.tokenId && bet.trade.price > 0);
            return (
              <li key={bet.id} className="flex flex-col gap-2 px-5 py-3 border-b border-bg-tertiary">
                <div className="flex items-center gap-3">
                  <Thumb src={bet.icon} />
                  <div className="min-w-0 flex-1">
                    {marketUrl ? (
                      <a
                        href={marketUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate hover:underline"
                      >
                        {bet.title}
                      </a>
                    ) : (
                      <p className="truncate">{bet.title}</p>
                    )}
                    <p className="mt-1 truncate text-sm text-white/55">{bet.outcome || "Yes"}</p>
                    <p className="mt-1 text-sm text-white/55">
                      {bet.buyers}/{bet.board} long
                      {bet.sellers > 0 ? ` · ${bet.sellers} fading` : ""}
                    </p>
                    <p className="mt-1 text-sm text-white/55">
                      {`${Math.round(bet.fair * 100)}% vs ${Math.round(bet.price * 100)}¢`}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="inline-flex h-7 items-center rounded-lg bg-white px-2 text-sm font-bold text-ev ring ring-white">
                      {`EV: ${evPct}`}
                    </p>
                    {profit != null ? (
                      <p className={`mt-1 text-sm font-bold ${tone}`}>{`Profit: ${money(profit)}`}</p>
                    ) : null}
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                    disabled={held || pending || !canBuy || !Number.isFinite(amount) || amount < 1}
                    onClick={() => {
                      if (!Number.isFinite(amount) || amount < 1) return;
                      rememberStake(stake);
                      setBuying(bet.id);
                      onBuy?.(bet.trade, amount);
                      window.setTimeout(() => setBuying((current) => (current === bet.id ? null : current)), 800);
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
      )}
    </section>
  );
}
