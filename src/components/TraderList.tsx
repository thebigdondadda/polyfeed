import { formatUsd, shortWallet } from "../lib/format";
import { polymarketProfileUrl, type Trader } from "../lib/polymarket";
import { Thumb } from "./Logo";

type TraderListProps = {
  traders: Trader[];
  ready?: boolean;
  selectedWallet: string | null;
  onSelect: (wallet: string | null) => void;
};

export function TraderList({ traders, ready = true, selectedWallet, onSelect }: TraderListProps) {
  if (traders.length === 0) {
    if (!ready) return null;
    return (
      <p className="px-5 py-8 text-white/60">No profitable traders for this filter.</p>
    );
  }

  return (
    <ul className="flex flex-col">
      {traders.map((trader) => {
        const selected = selectedWallet === trader.wallet;
        return (
          <li key={trader.wallet}>
            <button
              type="button"
              onClick={() => onSelect(selected ? null : trader.wallet)}
              className={`w-full text-left px-5 py-3 border-b border-bg-tertiary hover:bg-bg-secondary/80 ${
                selected ? "bg-bg-secondary" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <Thumb src={trader.profileImage} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={polymarketProfileUrl(trader.name, trader.wallet)}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(event) => event.stopPropagation()}
                      className="truncate hover:underline"
                    >
                      #{trader.rank} {trader.name}
                    </a>
                    <span className={trader.pnl >= 0 ? "text-green-600" : "text-red-500"}>
                      {formatUsd(trader.pnl, true)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-sm text-white/50">
                    <span>{shortWallet(trader.wallet)}</span>
                    <span>{formatUsd(trader.volume, true)} vol</span>
                  </div>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

