import { useEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import {
  Announcement01,
  AtSign,
  Bank,
  Calendar,
  CalendarDate,
  CloudSun01,
  CpuChip01,
  CurrencyBitcoin,
  GamingPad01,
  LayoutGrid01,
  LineChartUp01,
  Palette,
  Sun,
  Trophy01,
} from "@untitledui/icons";
import { formatUsd, shortWallet } from "../lib/format";
import { Button } from "./Button";
import { Logo } from "./Logo";
import { CATEGORIES, PERIODS, type Category, type Period } from "../lib/polymarket";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const PERIOD_ICONS: Record<Period, IconComp> = {
  all: LayoutGrid01,
  day: Sun,
  week: CalendarDate,
  month: Calendar,
};

const CATEGORY_ICONS: Record<Category, IconComp> = {
  OVERALL: LayoutGrid01,
  SPORTS: Trophy01,
  ESPORTS: GamingPad01,
  POLITICS: Announcement01,
  CRYPTO: CurrencyBitcoin,
  CULTURE: Palette,
  MENTIONS: AtSign,
  WEATHER: CloudSun01,
  ECONOMICS: LineChartUp01,
  TECH: CpuChip01,
  FINANCE: Bank,
};

const POLL_CYCLE_MS = 6_000;

type HeaderProps = {
  period: Period;
  category: Category;
  walletBalance?: number;
  currentBets?: number;
  profitLoss?: number;
  address?: string | null;
  accountName?: string;
  connecting?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onSignOut?: () => void;
  onPeriod: (period: Period) => void;
  onCategory: (category: Category) => void;
};

export function Header({
  period,
  category,
  walletBalance = 0,
  currentBets = 0,
  profitLoss = 0,
  address = null,
  accountName = "",
  connecting = false,
  onConnect,
  onDisconnect,
  onSignOut,
  onPeriod,
  onCategory,
}: HeaderProps) {
  const startedAt = useRef(Date.now());
  const menuRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = window.setInterval(() => setNowMs(Date.now()), 200);
    return () => window.clearInterval(tick);
  }, []);

  useEffect(() => {
    if (!address) setMenuOpen(false);
  }, [address]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [menuOpen]);

  const nextIn = 5 - Math.floor(((nowMs - startedAt.current) % POLL_CYCLE_MS) / 1000);
  const justPolled = nextIn === 0;

  return (
    <header className="flex flex-col gap-4 px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Logo wordmark />
          <span className="flex items-center gap-2 text-sm text-white/70">
            <span
              className={`inline-block size-2 rounded-full ${justPolled ? "bg-white" : "bg-white/70"}`}
            />
            {justPolled ? "Polled just now" : `Next poll in ${nextIn}s`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={address ? () => setMenuOpen((open) => !open) : onConnect}
              disabled={connecting}
              className={`inline-flex h-10 min-w-28 max-w-[9.5rem] items-center justify-center truncate rounded-lg px-2 text-sm font-bold ring disabled:opacity-60 ${
                address
                  ? "bg-bg-secondary text-white ring-bg-tertiary hover:bg-bg-tertiary"
                  : "bg-green-600 text-white ring-green-600 hover:bg-green-600/90"
              }`}
            >
              {connecting
                ? "Connecting…"
                : address
                  ? accountName || shortWallet(address)
                  : "Connect"}
            </button>
            {address && menuOpen ? (
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDisconnect?.();
                }}
                className="absolute right-0 top-[calc(100%+0.5rem)] z-20 inline-flex h-10 min-w-28 items-center justify-center rounded-lg bg-red-600 px-3 text-sm font-bold text-white ring ring-red-600 hover:bg-red-600/90"
              >
                Disconnect
              </button>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="inline-flex h-10 w-28 items-center justify-center rounded-lg bg-white text-sm font-bold text-bg-primary ring ring-white hover:bg-white/90"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="flex items-stretch justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            {PERIODS.map((item) => {
              const Icon = PERIOD_ICONS[item.id];
              return (
                <Button
                  key={item.id}
                  selected={period === item.id}
                  onClick={() => onPeriod(item.id)}
                >
                  <Icon size={12} className="shrink-0" fill="currentColor" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((item) => {
              const Icon = CATEGORY_ICONS[item.id];
              return (
                <Button
                  key={item.id}
                  selected={category === item.id}
                  onClick={() => onCategory(item.id)}
                >
                  <Icon size={12} className="shrink-0" fill="currentColor" />
                  {item.label}
                </Button>
              );
            })}
          </div>
        </div>
        <div className="flex shrink-0 items-stretch gap-2">
          <Stat label="Balance" value={formatUsd(walletBalance, false, false)} />
          <Stat label="Active Bets" value={String(currentBets)} />
          <Stat
            label="P/L"
            value={formatUsd(profitLoss)}
            tone={profitLoss > 0 ? "up" : profitLoss < 0 ? "down" : "flat"}
          />
        </div>
      </div>
    </header>
  );
}

function Stat({
  label,
  value,
  tone = "flat",
}: {
  label: string;
  value: string;
  tone?: "up" | "down" | "flat";
}) {
  const valueColor =
    tone === "up" ? "text-green-600" : tone === "down" ? "text-red-500" : "text-white";

  return (
    <div className="flex w-28 shrink-0 flex-col items-center justify-center rounded-lg bg-bg-secondary px-2 ring ring-bg-tertiary">
      <span className="text-xs text-white/70">{label}</span>
      <span className={`mt-1 text-base leading-none ${valueColor}`}>{value}</span>
    </div>
  );
}
