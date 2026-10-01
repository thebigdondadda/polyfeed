import type { LegalPageId } from "../lib/pages";
import { Logo } from "./Logo";
import { SiteFooter } from "./SiteFooter";

type LegalPageProps = {
  page: LegalPageId;
  signedIn: boolean;
  onBack: () => void;
};

const copy: Record<
  LegalPageId,
  { title: string; updated: string; sections: { heading: string; body: string }[] }
> = {
  overview: {
    title: "Overview",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "What Polyfeed is",
        body: "Polyfeed shows profitable Polymarket wallets as they trade. You watch the tape, Quick buy a fill, and sell by hand from Active bets.",
      },
      {
        heading: "Who it is for",
        body: "Anyone who wants to follow wallets that are already winning, instead of scanning every market by hand.",
      },
      {
        heading: "What you get",
        body: "A live trader list, a live trade feed, one-click Quick buy, and a book of open bets you sell yourself.",
      },
    ],
  },
  faq: {
    title: "FAQ",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "How often does the feed update?",
        body: "Trader ranks, fills, and prices refresh every 5 seconds.",
      },
      {
        heading: "How do I buy?",
        body: "Use Quick buy on a fill in the tape. That places a live Polymarket order at the amount in the $ box.",
      },
      {
        heading: "What size is a copy?",
        body: "The default stake is $10. Change it on a trade row and Polyfeed remembers that amount for the next buy.",
      },
      {
        heading: "When does a bet close?",
        body: "Only when you hit Sell. Open bets stay open until you close them.",
      },
      {
        heading: "Is this affiliated with Polymarket?",
        body: "No. Polyfeed is independent. Market data comes from public Polymarket APIs.",
      },
    ],
  },
  risk: {
    title: "Risk",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Not financial advice",
        body: "Nothing on Polyfeed is investment, trading, or legal advice. A wallet that has been winning can lose on the next trade.",
      },
      {
        heading: "Prices move",
        body: "Live percentages follow public last-trade and midpoint prices. Those feeds can lag, gap, or fail.",
      },
      {
        heading: "Copying is not guaranteed",
        body: "A wallet that has been winning can lose on the next fill. Quick buy copies that trade into your book; it is not a promise of profit.",
      },
      {
        heading: "You stay in control",
        body: "Open bets stay in your book until you sell. Review every position before you add size.",
      },
    ],
  },
  support: {
    title: "Support",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Email",
        body: "Write to hello@poly-feed.com for account help, product questions, or a bug report.",
      },
      {
        heading: "What to include",
        body: "Your account email, the page you were on, and what you expected to happen. Screenshots help.",
      },
      {
        heading: "Response time",
        body: "We read every message. Most replies go out within two business days.",
      },
    ],
  },
  traders: {
    title: "Live traders",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Who shows up",
        body: "The left column is wallets that are winning on Polymarket right now. Filter by period and category to narrow the list.",
      },
      {
        heading: "What you see",
        body: "Each trader shows their recent results so you can decide who to follow before you copy a fill.",
      },
      {
        heading: "Follow a wallet",
        body: "Pick a trader and the feed focuses on their buys and sells as they happen.",
      },
    ],
  },
  copy: {
    title: "Copy trades",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "One click",
        body: "Quick buy copies a fill from the live feed into your book at the last amount you typed, starting at $10.",
      },
      {
        heading: "Your size",
        body: "Set an amount on the trade row if you want a different stake. That amount is reused on every row.",
      },
      {
        heading: "Held",
        body: "Once a market is in Active bets, Quick buy on that row turns into Held so you do not stack the same contract by accident.",
      },
    ],
  },
  autosell: {
    title: "Sell",
    updated: "September 29, 2026",
    sections: [
      {
        heading: "Manual only",
        body: "Nothing auto-sells. A bet stays open until you hit Sell on that row in Active bets.",
      },
      {
        heading: "Instant close",
        body: "Sell removes the row and credits Balance immediately. If Polymarket rejects the order, the bet comes back and you see an error.",
      },
      {
        heading: "Live mark",
        body: "Each open bet tracks the live price so you can see profit and loss before you sell.",
      },
    ],
  },
  bets: {
    title: "Active bets",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Your book",
        body: "Active bets live in their own column: market, side, size, and live profit.",
      },
      {
        heading: "Sell anytime",
        body: "Close a position from the book whenever you want. Positions never close on their own.",
      },
      {
        heading: "Empty book",
        body: "If you have no open bets, the column stays clear so you can see that at a glance.",
      },
    ],
  },
  how: {
    title: "How it works",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Watch",
        body: "Sign in and the dashboard loads winning wallets and their latest fills. The list refreshes every 5 seconds.",
      },
      {
        heading: "Pick",
        body: "Follow a trader you like, then Quick buy the fills you want. Nothing is copied until you click.",
      },
      {
        heading: "Copy",
        body: "Buy in one click or set your own size. The bet lands in Active bets and stays there until you sell.",
      },
      {
        heading: "Manage",
        body: "Watch live profit on each open bet and sell when you want out.",
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "The product",
        body: "Polyfeed shows public Polymarket trader activity and can send real CLOB orders from a wallet you connect. Site accounts are email/password sign-ins. Deposits and withdrawals stay on Polymarket.",
      },
      {
        heading: "Real trading",
        body: "Connect the wallet that holds your Polymarket cash. Quick buy and Sell then place live orders on the Polymarket CLOB. Those fills spend real money.",
      },
      {
        heading: "Acceptable use",
        body: "Use Polyfeed for personal, non-commercial exploration. Do not treat copy signals as advice, and do not attempt to misuse public APIs through this app.",
      },
      {
        heading: "Changes",
        body: "These terms can change as the demo changes. Continued use after an update means you accept the new terms.",
      },
    ],
  },
  privacy: {
    title: "Privacy Policy",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "What we store",
        body: "Email and password are stored by Supabase Auth when you sign up. Wallet signatures stay in your browser. We never ask for or store your private key.",
      },
      {
        heading: "Market data",
        body: "Trader boards, fills, and prices are requested from Polymarket’s public APIs. Those requests go from your browser through this app’s local proxy.",
      },
      {
        heading: "Cookies",
        body: "This demo does not set advertising or analytics cookies. See the Cookie Policy for how local storage is used instead.",
      },
    ],
  },
  cookies: {
    title: "Cookie Policy",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Cookies",
        body: "Polyfeed does not use tracking, advertising, or analytics cookies.",
      },
      {
        heading: "Local storage",
        body: "Your browser may keep a sign-in session and short-lived CLOB API credentials for the connected wallet. Those stay on this device.",
      },
      {
        heading: "Clearing it",
        body: "Sign out clears the sign-in session. Clearing site data in your browser also drops stored CLOB credentials.",
      },
    ],
  },
  disclaimer: {
    title: "Disclaimer",
    updated: "September 24, 2026",
    sections: [
      {
        heading: "Not financial advice",
        body: "Nothing on Polyfeed is investment, trading, or legal advice. Profitable-trader lists and copy actions are for demonstration only.",
      },
      {
        heading: "Real money",
        body: "Quick buy and Sell place live Polymarket orders when a wallet is connected. Live percentages follow public CLOB midpoints. You can lose the money you spend.",
      },
      {
        heading: "Affiliation",
        body: "Polyfeed is an independent demo. It is not affiliated with, endorsed by, or an official product of Polymarket.",
      },
      {
        heading: "Data accuracy",
        body: "Public APIs can lag, fail, or return incomplete tape. Do not rely on this dashboard for real-money decisions.",
      },
    ],
  },
};

export function LegalPage({ page, signedIn, onBack }: LegalPageProps) {
  const doc = copy[page];

  return (
    <div className="flex h-svh flex-col overflow-y-auto bg-bg-primary">
      <header className="flex items-center justify-between px-5 py-4">
        <Logo wordmark href="#home" />
        {signedIn ? (
          <button
            type="button"
            onClick={onBack}
            className="h-10 rounded-lg bg-white px-5 font-bold text-bg-primary ring ring-white hover:bg-white/90"
          >
            Dashboard
          </button>
        ) : (
          <a
            href="#signin"
            className="inline-flex h-10 items-center rounded-lg bg-white px-5 font-bold text-bg-primary ring ring-white hover:bg-white/90"
          >
            Sign In
          </a>
        )}
      </header>

      <main className="mx-auto w-full max-w-3xl px-5 py-10">
        <p className="text-sm text-white/45">Updated {doc.updated}</p>
        <h1 className="mt-2 text-4xl">{doc.title}</h1>
        <div className="mt-8 flex flex-col gap-8">
          {doc.sections.map((section) => (
            <section key={section.heading}>
              <h2 className="text-xl">{section.heading}</h2>
              <p className="mt-2 text-white/70">{section.body}</p>
            </section>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
