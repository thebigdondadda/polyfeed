const STAKE_KEY = "polyfeed-stake-v1";
const DEFAULT_STAKE = "10";

export function loadStake() {
  try {
    const raw = localStorage.getItem(STAKE_KEY);
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount >= 1) return String(amount);
  } catch {
    /* keep default */
  }
  return DEFAULT_STAKE;
}

export function rememberStake(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 1) return;
  localStorage.setItem(STAKE_KEY, String(amount));
}
