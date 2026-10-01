import { useState } from "react";
import { useDemoAccount } from "../hooks/useDemoAccount";
import { useTraderFeed } from "../hooks/useTraderFeed";
import type { Category, Period } from "../lib/polymarket";
import { ActiveBets } from "./ActiveBets";
import { ConnectPolymarket } from "./ConnectPolymarket";
import { EvBoard } from "./EvBoard";
import { Header } from "./Header";
import { Toasts } from "./Toasts";
import { TradeFeed } from "./TradeFeed";
import { TraderList } from "./TraderList";

type DashboardProps = {
  onSignOut: () => void;
};

export function Dashboard({ onSignOut }: DashboardProps) {
  const [period, setPeriod] = useState<Period>("day");
  const [category, setCategory] = useState<Category>("OVERALL");
  const [connectOpen, setConnectOpen] = useState(false);
  const feed = useTraderFeed(period, category);
  const demo = useDemoAccount();

  return (
    <div className="relative isolate flex h-svh flex-col bg-bg-primary overflow-hidden">
      <Header
        period={period}
        category={category}
        walletBalance={demo.cash}
        currentBets={demo.currentBets}
        profitLoss={demo.profitLoss}
        address={demo.address}
        accountName={demo.accountName}
        connecting={demo.connecting}
        onConnect={() => setConnectOpen(true)}
        onDisconnect={demo.disconnect}
        onSignOut={onSignOut}
        onPeriod={setPeriod}
        onCategory={setCategory}
      />
      <main className="flex min-h-0 flex-1 flex-row">
        <aside className="flex w-80 shrink-0 flex-col bg-bg-primary">
          <div className="flex h-[49px] shrink-0 items-center px-5 border-b border-bg-tertiary">
            <h2>Profitable traders</h2>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto border-r border-bg-tertiary">
            <TraderList
              traders={feed.traders}
              ready={feed.ready}
              selectedWallet={feed.selectedWallet}
              onSelect={feed.setSelectedWallet}
            />
          </div>
        </aside>
        <TradeFeed
          trades={feed.trades}
          newKeys={feed.newKeys}
          ready={feed.ready}
          error={feed.error}
          traderByWallet={feed.traderByWallet}
          nowMs={feed.nowMs}
          heldKeys={demo.heldKeys}
          onBuy={demo.buy}
        />
        <EvBoard
          trades={feed.evTrades}
          ready={feed.ready}
          heldKeys={demo.heldKeys}
          onBuy={demo.buy}
        />
        <ActiveBets positions={demo.positions} onSell={demo.sell} nowMs={feed.nowMs} />
      </main>
      <ConnectPolymarket
        open={connectOpen}
        busy={demo.connecting}
        error={demo.connectError}
        onClose={() => setConnectOpen(false)}
        onConnect={async () => {
          await demo.connect();
          setConnectOpen(false);
        }}
      />
      <Toasts toasts={demo.toasts} />
    </div>
  );
}
