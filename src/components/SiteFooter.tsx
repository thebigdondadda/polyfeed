import { Logo } from "./Logo";

const about = [
  { href: "#overview", label: "Overview" },
  { href: "#faq", label: "FAQ" },
  { href: "#risk", label: "Risk" },
  { href: "#support", label: "Support" },
] as const;

const product = [
  { href: "#traders", label: "Live traders" },
  { href: "#copy", label: "Copy trades" },
  { href: "#autosell", label: "Sell" },
  { href: "#bets", label: "Active bets" },
] as const;

const legal = [
  { href: "#privacy", label: "Privacy Policy" },
  { href: "#terms", label: "Terms of Service" },
  { href: "#cookies", label: "Cookie Policy" },
  { href: "#disclaimer", label: "Disclaimer" },
] as const;

const linkClass = "block text-white/75 hover:text-white";

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: readonly { href: string; label: string }[];
}) {
  return (
    <div>
      <h2 className="text-sm text-white/45">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2 text-sm">
        {links.map(({ href, label }) => (
          <li key={label}>
            <a href={href} className={linkClass}>
              {label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto">
      <div className="mx-auto flex w-full max-w-[75rem] flex-col gap-10 px-5 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-[22rem]">
          <Logo wordmark href="#home" />
          <p className="mt-3 text-sm text-white/55">
            Copy the traders who win. Watch winning wallets live and copy their trades right now.
          </p>
        </div>

        <div className="flex shrink-0 gap-16">
          <FooterCol title="About" links={about} />
          <FooterCol title="Product" links={product} />
          <FooterCol title="Legal" links={legal} />
        </div>
      </div>
    </footer>
  );
}
