import {
  Coins01,
  Lightning01,
  LineChartUp01,
  Play,
  RefreshCcw01,
  Users01,
  Wallet01,
} from "@untitledui/icons";
import type { ComponentType, SVGProps } from "react";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

type IconComp = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

const buckets: { title: string; body: string; Icon: IconComp }[] = [
  {
    title: "Traders",
    body: "see who’s winning on Polymarket right now",
    Icon: Users01,
  },
  {
    title: "Trades",
    body: "watch their buys and sells update every 5 seconds",
    Icon: Lightning01,
  },
  {
    title: "Bets",
    body: "your open bets, with live profit and a sell button",
    Icon: Wallet01,
  },
  {
    title: "Follow",
    body: "pick a winning wallet and see every trade they make",
    Icon: LineChartUp01,
  },
  {
    title: "Copy",
    body: "Quick buy a fill in one click, or type your own size",
    Icon: Coins01,
  },
  {
    title: "Sell",
    body: "sell anytime from Active bets — nothing closes on its own",
    Icon: RefreshCcw01,
  },
];

function Bucket({ title, body, Icon }: { title: string; body: string; Icon: IconComp }) {
  return (
    <article className="group relative flex aspect-square min-w-0 w-full flex-1 shrink flex-col gap-2 overflow-hidden rounded-[25px] border border-[#cbd0eb]/10 bg-[#090B0D] pt-8 pb-0 transition-colors duration-300 hover:border-white/12">
      <p className="relative z-[1] px-5 text-sm uppercase tracking-wide text-white/70 min-[50rem]:px-8">{title}</p>
      <h3 className="relative z-[1] px-5 text-[26px] leading-8 tracking-tight min-[50rem]:px-8 min-[50rem]:text-[32px] min-[50rem]:leading-9">
        {body}
      </h3>
      <div className="relative z-[1] min-h-0 flex-1" aria-hidden="true" />
      <div
        className="pointer-events-none absolute right-5 bottom-5 z-0 size-[4.5rem] min-[50rem]:right-8 min-[50rem]:bottom-8 min-[50rem]:size-20"
        aria-hidden="true"
      >
        <Icon
          size={80}
          strokeWidth={1.5}
          className="size-full text-white/20 transition-colors duration-300 group-hover:text-green-500"
        />
      </div>
    </article>
  );
}

export function Landing() {
  const top = buckets.slice(0, 3);
  const bottom = buckets.slice(3);

  return (
    <div className="flex h-svh flex-col overflow-y-auto bg-bg-primary">
      <header className="flex items-center justify-between px-5 py-4">
        <Logo wordmark href="#home" />
        <div className="flex items-center gap-2">
          <a
            href="#signup"
            className="inline-flex h-10 items-center rounded-lg bg-green-500 px-5 font-bold text-white ring ring-green-500 hover:bg-green-500/90"
          >
            Sign up
          </a>
          <a
            href="#signin"
            className="inline-flex h-10 items-center rounded-lg bg-white px-5 font-bold text-bg-primary ring ring-white hover:bg-white/90"
          >
            Sign In
          </a>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[75rem] flex-1 flex-col justify-center px-5 pb-16 pt-8">
        <h1 className="mx-auto whitespace-nowrap text-center text-[3.5rem] leading-tight">
          Copy the traders who <span className="text-green-500">win.</span>
        </h1>
        <p className="mx-auto mt-4 whitespace-nowrap text-center text-[1.375rem] text-white/70">
          Watch winning wallets live and copy their trades right now.
        </p>
        <div className="mt-8 flex flex-nowrap justify-center gap-2">
          <a
            href="#signup"
            className="inline-flex h-12 items-center rounded-lg bg-green-500 px-6 text-lg font-bold text-white ring ring-green-500 hover:bg-green-500/90"
          >
            Sign up
          </a>
          <a
            href="#signin"
            className="inline-flex h-12 items-center rounded-lg bg-white px-6 text-lg font-bold text-bg-primary ring ring-white hover:bg-white/90"
          >
            Sign In
          </a>
        </div>
        <div className="mx-auto mt-8 w-full overflow-hidden rounded-[25px] border border-[#cbd0eb]/10 bg-[#090B0D]">
          <div className="relative aspect-video">
            {/* Replace this placeholder with the demo <video> */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="grid size-16 place-items-center rounded-full bg-white/10 ring ring-white/15">
                <Play size={28} className="ml-0.5 text-white/70" />
              </div>
              <p className="text-sm text-white/45">Demo video</p>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 min-[50rem]:gap-6">
          <div className="flex flex-col items-start gap-3 min-[50rem]:flex-row min-[50rem]:gap-6">
            {top.map((item) => (
              <Bucket key={item.title} {...item} />
            ))}
          </div>
          <div className="flex flex-col items-start gap-3 min-[50rem]:flex-row min-[50rem]:gap-6">
            {bottom.map((item) => (
              <Bucket key={item.title} {...item} />
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
