import { formatPrice, formatShares } from "../lib/format";
import type { DemoPosition } from "../hooks/useDemoAccount";

type ActiveBetsProps = {
  positions: DemoPosition[];
  onSell: (id: string) => void;
  nowMs?: number;
};

export function ActiveBets({ positions, onSell, nowMs = Date.now() }: ActiveBetsProps) {
  return (
    <section className="flex w-80 shrink-0 flex-col bg-bg-primary">
      <div className="flex h-[49px] shrink-0 items-center px-5 border-b border-bg-tertiary">
        <h2>Active bets</h2>
      </div>

      {positions.length === 0 ? (
        <p className="min-h-0 flex-1 border-l border-bg-tertiary px-5 py-8 text-white/60">No active bets.</p>
      ) : (
        <ul className="min-h-0 flex-1 overflow-y-auto border-l border-bg-tertiary">
          {positions.map((position) => {
            const gain =
              position.entryPrice > 0
                ? (position.markPrice - position.entryPrice) / position.entryPrice
                : 0;
            return (
              <li key={position.id} className="flex items-center gap-3 px-5 py-3 border-b border-bg-tertiary">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{position.title}</p>
                  <p className="mt-1 text-sm text-white/55">
                    {position.outcome ? `${position.outcome} · ` : ""}
                    {formatShares(position.shares)} sh @ {formatPrice(position.entryPrice)}
                  </p>
                  <p className="mt-1 text-sm text-white/55">
                    Live {formatPrice(position.markPrice)}
                    {position.quotedAt
                      ? ` · ${Math.max(0, Math.round((nowMs - position.quotedAt) / 1000))}s ago`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={gain >= 0 ? "text-sm text-green-500" : "text-sm text-red-500"}>
                    {gain >= 0 ? "+" : ""}
                    {(gain * 100).toFixed(2)}%
                  </span>
                  <button
                    type="button"
                    onClick={() => onSell(position.id)}
                    className="h-7 rounded-lg bg-red-600 px-3 text-sm font-bold text-white ring ring-red-600 hover:bg-red-600/90"
                  >
                    Sell
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
