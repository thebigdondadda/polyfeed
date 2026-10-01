export type ToastItem = {
  id: string;
  kind: "buy" | "sell" | "error";
  title: string;
  detail: string;
};

const labels: Record<ToastItem["kind"], string> = {
  buy: "BUY",
  sell: "SELL",
  error: "ERROR",
};

export function Toasts({ toasts }: { toasts: ToastItem[] }) {
  return (
    <div className="pointer-events-none fixed right-5 bottom-5 z-50 flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg bg-bg-secondary px-4 py-3 ring ring-bg-tertiary"
        >
          <p
            className={`text-sm ${toast.kind === "buy" ? "text-green-500" : "text-red-500"}`}
          >
            {labels[toast.kind]}
          </p>
          <p className="truncate">{toast.title}</p>
          <p className="text-sm text-white/55">{toast.detail}</p>
        </div>
      ))}
    </div>
  );
}
