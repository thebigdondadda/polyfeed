type ConnectPolymarketProps = {
  open: boolean;
  busy?: boolean;
  error?: string | null;
  onClose: () => void;
  onConnect: () => Promise<void>;
};

export function ConnectPolymarket({
  open,
  busy = false,
  error = null,
  onClose,
  onConnect,
}: ConnectPolymarketProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-5">
      <button type="button" className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-sm rounded-lg bg-bg-secondary p-5 ring ring-bg-tertiary">
        <h2 className="text-xl">Connect Polymarket</h2>
        <p className="mt-2 text-sm text-white/70">
          Connect the same wallet as{" "}
          <a
            href="https://polymarket.com/settings"
            target="_blank"
            rel="noreferrer"
            className="text-white underline"
          >
            polymarket.com/settings
          </a>
          . Use Phantom’s EVM account on Polygon.
        </p>
        <p className="mt-2 text-sm text-white/70">
          The first prompt is a signature, not a send or deploy transaction. Approve the sign request and stop if
          Phantom asks you to pay gas.
        </p>
        <p className="mt-2 text-sm text-white/70">
          If you log in with email on Polymarket, export that wallet from{" "}
          <a
            href="https://reveal.magic.link/polymarket"
            target="_blank"
            rel="noreferrer"
            className="text-white underline"
          >
            reveal.magic.link/polymarket
          </a>{" "}
          into Phantom or MetaMask, then connect it here.
        </p>
        {error ? <p className="mt-3 text-sm text-red-500">{error}</p> : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void onConnect()}
          className="mt-4 h-12 w-full rounded-lg bg-green-600 text-sm font-bold text-white ring ring-green-600 hover:bg-green-600/90 disabled:opacity-50"
        >
          {busy ? "Connecting…" : "Connect and trade"}
        </button>
      </div>
    </div>
  );
}
