import { buildHmacSignature } from "@polymarket/client";
import { createPublicClient, createWalletClient, custom, erc20Abi, fallback, formatUnits, getAddress, http } from "viem";
import { polygon } from "viem/chains";
import { fetchOnchainCash, fetchPublicProfile, serviceOrigin } from "./polymarket";

export type TradingClient = {
  account: { wallet: string };
  credentials: { key: string; secret: string; passphrase: string };
  signer: `0x${string}`;
  funder?: `0x${string}`;
};

type ApiCreds = { key: string; secret: string; passphrase: string };

const CREDS_PREFIX = "polyfeed-clob-creds:";
const USDC = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
const USDC_E = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
const POLYGON_CHAIN = {
  chainId: "0x89",
  chainName: "Polygon",
  nativeCurrency: { name: "POL", symbol: "POL", decimals: 18 },
  rpcUrls: ["https://polygon-rpc.com"],
  blockExplorerUrls: ["https://polygonscan.com"],
};

export function getEthereum(): EthereumProvider {
  const injected = window.ethereum;
  if (!injected) {
    throw new Error("Install Phantom or MetaMask to trade.");
  }
  const list = injected.providers?.length ? injected.providers : [injected];
  return list.find((provider) => provider.isPhantom) ?? list[0];
}

async function ensurePolygon(eth: EthereumProvider) {
  const chainId = String(await eth.request({ method: "eth_chainId" }));
  if (chainId === POLYGON_CHAIN.chainId) return;
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: POLYGON_CHAIN.chainId }],
    });
  } catch (error) {
    const code = typeof error === "object" && error && "code" in error ? Number(error.code) : 0;
    if (code !== 4902) throw error;
    await eth.request({
      method: "wallet_addEthereumChain",
      params: [POLYGON_CHAIN],
    });
  }
}

export async function requestAddress(): Promise<`0x${string}`> {
  const eth = getEthereum();
  await ensurePolygon(eth);
  const accounts = (await eth.request({ method: "eth_requestAccounts" })) as string[];
  const address = accounts[0]?.toLowerCase();
  if (!address) throw new Error("No wallet account selected.");
  return address as `0x${string}`;
}

export async function peekAddress(): Promise<`0x${string}` | null> {
  if (!window.ethereum) return null;
  try {
    const eth = getEthereum();
    const accounts = (await eth.request({ method: "eth_accounts" })) as string[];
    const address = accounts[0]?.toLowerCase();
    return address ? (address as `0x${string}`) : null;
  } catch {
    return null;
  }
}

function loadCreds(address: string) {
  try {
    const raw = sessionStorage.getItem(`${CREDS_PREFIX}${address.toLowerCase()}`);
    return raw ? (JSON.parse(raw) as ApiCreds) : undefined;
  } catch {
    return undefined;
  }
}

export function hasStoredCreds(address: string) {
  return Boolean(loadCreds(address));
}

export function getStoredCreds(address: string) {
  return loadCreds(address);
}

function saveCreds(address: string, credentials: ApiCreds) {
  sessionStorage.setItem(`${CREDS_PREFIX}${address.toLowerCase()}`, JSON.stringify(credentials));
}

export function clearCreds(address?: string) {
  if (address) {
    sessionStorage.removeItem(`${CREDS_PREFIX}${address.toLowerCase()}`);
    sdkBySigner.delete(address.toLowerCase());
    return;
  }
  const keys: string[] = [];
  for (let i = 0; i < sessionStorage.length; i += 1) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(CREDS_PREFIX)) keys.push(key);
  }
  for (const key of keys) sessionStorage.removeItem(key);
  sdkBySigner.clear();
}

function asCreds(payload: unknown): ApiCreds | null {
  if (!payload || typeof payload !== "object") return null;
  const row = payload as Record<string, unknown>;
  const key = String(row.apiKey ?? row.key ?? "");
  const secret = String(row.secret ?? "");
  const passphrase = String(row.passphrase ?? "");
  if (!key || !secret || !passphrase) return null;
  return { key, secret, passphrase };
}

async function signClobAuth(address: `0x${string}`) {
  const eth = getEthereum();
  await ensurePolygon(eth);
  const account = getAddress(address);
  const walletClient = createWalletClient({
    account,
    chain: polygon,
    transport: custom(eth),
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await walletClient.signTypedData({
    account,
    domain: {
      name: "ClobAuthDomain",
      version: "1",
      chainId: 137,
    },
    types: {
      ClobAuth: [
        { name: "address", type: "address" },
        { name: "timestamp", type: "string" },
        { name: "nonce", type: "uint256" },
        { name: "message", type: "string" },
      ],
    },
    primaryType: "ClobAuth",
    message: {
      address: account,
      timestamp,
      nonce: 0n,
      message: "This message attests that I control the given wallet",
    },
  });
  return { address: account, timestamp, nonce: "0", signature };
}

async function clobAuth(path: string, method: "GET" | "POST", auth: Awaited<ReturnType<typeof signClobAuth>>) {
  const response = await fetch(`${serviceOrigin("clob")}${path}`, {
    method,
    headers: {
      accept: "application/json",
      POLY_ADDRESS: auth.address,
      POLY_SIGNATURE: auth.signature,
      POLY_TIMESTAMP: auth.timestamp,
      POLY_NONCE: auth.nonce,
    },
  });
  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const row = payload && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new Error(String(row.error ?? row.message ?? `Auth failed (${response.status})`));
  }
  return payload;
}

async function deriveCreds(address: `0x${string}`): Promise<ApiCreds> {
  const stored = loadCreds(address);
  if (stored) return stored;
  const auth = await signClobAuth(address);
  let creds = asCreds(await clobAuth("/auth/derive-api-key", "GET", auth).catch(() => null));
  if (!creds) creds = asCreds(await clobAuth("/auth/api-key", "POST", auth));
  if (!creds) throw new Error("Polymarket did not return API credentials.");
  saveCreds(address, creds);
  return creds;
}

function makerBlocked(message: string) {
  return /maker address not allowed|deposit wallet flow/i.test(message);
}

function tradingEnvironment() {
  return import("@polymarket/client").then(({ forkEnvironmentConfig }) =>
    forkEnvironmentConfig({
      name: "polyfeed",
      rpc: import.meta.env.DEV ? `${window.location.origin}/polygon-rpc` : "https://1rpc.io/matic",
      clob: { rest: serviceOrigin("clob") },
      data: { rest: serviceOrigin("api") },
      gamma: { rest: serviceOrigin("gamma") },
    }),
  );
}

type SecureSdk = Awaited<ReturnType<typeof import("@polymarket/client")["createSecureClient"]>>;
const sdkBySigner = new Map<string, SecureSdk>();

async function createSigner(address: `0x${string}`) {
  const { signerFrom } = await import("@polymarket/client/viem");
  const eth = getEthereum();
  await ensurePolygon(eth);
  return signerFrom(
    createWalletClient({
      account: getAddress(address),
      chain: polygon,
      transport: custom(eth),
    }),
  );
}

async function createSdk(address: `0x${string}`, creds: ApiCreds, wallet?: string) {
  const [{ createSecureClient }, environment, signer] = await Promise.all([
    import("@polymarket/client"),
    tradingEnvironment(),
    createSigner(address),
  ]);
  return createSecureClient({
    environment,
    signer,
    credentials: creds as never,
    ...(wallet ? { wallet } : {}),
  });
}

async function tradingSdk(client: TradingClient): Promise<SecureSdk> {
  const key = client.signer.toLowerCase();
  const cached = sdkBySigner.get(key);
  if (cached) return cached;

  const { WalletType } = await import("@polymarket/client");
  let sdk: SecureSdk;
  try {
    sdk = await createSdk(client.signer, client.credentials);
  } catch (error) {
    if (!client.funder) throw error;
    sdk = await createSdk(client.signer, client.credentials, client.funder);
  }
  if (sdk.account.walletType === WalletType.EOA && client.funder) {
    sdk = await createSdk(client.signer, client.credentials, client.funder);
  }
  sdkBySigner.set(key, sdk);
  client.account.wallet = String(sdk.account.wallet).toLowerCase();
  return sdk;
}

async function submitMarketOrder(
  client: TradingClient,
  request: { assetId: string; amount?: number; shares?: number; side: "BUY" | "SELL" },
): Promise<{ ok: true; taking: number; making: number } | { ok: false; message: string }> {
  if (!client.signer) {
    return { ok: false, message: "Disconnect, then Connect again so buys use your deposit wallet." };
  }
  const { OrderSide, WalletType } = await import("@polymarket/client");
  const payload =
    request.side === "BUY"
      ? { assetId: request.assetId, amount: request.amount ?? 0, side: OrderSide.BUY }
      : { assetId: request.assetId, shares: request.shares ?? 0, side: OrderSide.SELL };

  const run = async (sdk: SecureSdk) => {
    try {
      return await sdk.placeMarketOrder(payload);
    } catch (error) {
      return { ok: false as const, message: orderError(error) };
    }
  };

  let sdk = await tradingSdk(client);
  let response = await run(sdk);
  if (!response.ok && makerBlocked(response.message) && sdk.account.walletType === WalletType.EOA) {
    sdkBySigner.delete(client.signer.toLowerCase());
    sdk = await createSdk(client.signer, client.credentials);
    sdkBySigner.set(client.signer.toLowerCase(), sdk);
    client.account.wallet = String(sdk.account.wallet).toLowerCase();
    response = await run(sdk);
  }
  if (response.ok) {
    return {
      ok: true as const,
      taking: Number(response.takingAmount || 0),
      making: Number(response.makingAmount || 0),
    };
  }
  return {
    ok: false as const,
    message: makerBlocked(response.message)
      ? "Polymarket needs the deposit wallet for this order. Disconnect, connect again, and approve the signature prompt."
      : response.message,
  };
}

export async function connectTradingClient(address: `0x${string}`): Promise<TradingClient> {
  sdkBySigner.delete(address.toLowerCase());
  const creds = await deriveCreds(address);
  const profile = await fetchPublicProfile(address);
  const book = (profile?.wallet || address).toLowerCase();
  const funder = book !== address.toLowerCase() ? (getAddress(book) as `0x${string}`) : undefined;
  return {
    account: { wallet: book },
    credentials: creds,
    signer: address,
    funder,
  };
}

const PUSD = "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB";
const COLLATERAL = [PUSD, USDC, USDC_E] as const;
const SIGNATURE_TYPES = [2, 1, 0, 3] as const;
const signatureTypeBySigner = new Map<string, number>();
const polygonClient = createPublicClient({
  chain: polygon,
  transport: fallback([
    ...(import.meta.env.DEV ? [http("/polygon-rpc")] : []),
    http("https://1rpc.io/matic"),
    http("https://polygon.drpc.org"),
    http("https://rpc-mainnet.matic.quiknode.pro"),
    http("https://polygon-bor-rpc.publicnode.com"),
  ]),
});

async function tokenBalance(owner: `0x${string}`, token: `0x${string}`): Promise<number> {
  const raw = await polygonClient
    .readContract({ address: token, abi: erc20Abi, functionName: "balanceOf", args: [owner] })
    .catch(() => 0n);
  return Number(formatUnits(raw, 6));
}

function asUsd(raw: unknown): number {
  const text = String(raw ?? "0");
  if (!text || text === "0") return 0;
  if (text.includes(".")) {
    const value = Number(text);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  try {
    return Number(BigInt(text)) / 1_000_000;
  } catch {
    return 0;
  }
}

async function clobSigned(
  path: string,
  method: "GET" | "POST",
  creds: ApiCreds,
  address: string,
  body = "",
  query = "",
) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = await buildHmacSignature(creds.secret, timestamp, method, path, body || undefined);
  const headers: Record<string, string> = {
    accept: "application/json",
    POLY_ADDRESS: getAddress(address),
    POLY_SIGNATURE: signature,
    POLY_TIMESTAMP: String(timestamp),
    POLY_API_KEY: creds.key,
    POLY_PASSPHRASE: creds.passphrase,
    POLY_NONCE: "0",
  };
  if (body) headers["content-type"] = "application/json";
  return fetch(`${serviceOrigin("clob")}${path}${query}`, {
    method,
    headers,
    body: body || undefined,
  });
}

async function readClobBalance(address: string, creds: ApiCreds, signatureType: number): Promise<number> {
  const query = `?asset_type=COLLATERAL&signature_type=${signatureType}`;
  const first = await clobSigned("/balance-allowance", "GET", creds, address, "", query);
  const payload = (await first.json().catch(() => ({}))) as Record<string, unknown>;
  const cash = first.ok ? asUsd(payload.balance) : 0;
  if (cash > 0) return cash;
  const body = JSON.stringify({ asset_type: "COLLATERAL", signature_type: signatureType });
  await clobSigned("/balance-allowance/update", "POST", creds, address, body).catch(() => null);
  await clobSigned("/balance-allowance/update", "GET", creds, address, "", query).catch(() => null);
  const response = await clobSigned("/balance-allowance", "GET", creds, address, "", query);
  const next = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) return 0;
  return asUsd(next.balance);
}

async function fetchClobCash(address: string, creds: ApiCreds): Promise<number> {
  const signer = address.toLowerCase();
  const known = signatureTypeBySigner.get(signer);
  const types = known === undefined ? SIGNATURE_TYPES : [known, ...SIGNATURE_TYPES.filter((type) => type !== known)];
  for (const signatureType of types) {
    const cash = await readClobBalance(address, creds, signatureType).catch(() => 0);
    if (cash > 0) {
      signatureTypeBySigner.set(signer, signatureType);
      return cash;
    }
  }
  return 0;
}

export async function fetchWalletCash(
  wallets: string | string[],
  creds?: ApiCreds,
  signer?: string,
): Promise<number> {
  const owners = [
    ...new Set((Array.isArray(wallets) ? wallets : [wallets]).map((row) => row.toLowerCase()).filter(Boolean)),
  ];
  const chain = Promise.all([
    fetchOnchainCash(owners).catch(() => 0),
    Promise.all(owners.flatMap((owner) => COLLATERAL.map((token) => tokenBalance(owner as `0x${string}`, token))))
      .then((rows) => rows.reduce((sum, value) => sum + value, 0))
      .catch(() => 0),
  ]).then(([proxied, onchain]) => Math.max(proxied, onchain));
  const clob =
    creds && signer
      ? Promise.race([
          fetchClobCash(signer, creds).catch(() => 0),
          new Promise<number>((resolve) => window.setTimeout(() => resolve(0), 1200)),
        ])
      : Promise.resolve(0);
  const [chainTotal, clobTotal] = await Promise.all([chain, clob]);
  return Math.max(chainTotal, clobTotal);
}

export async function placeBuy(client: TradingClient, tokenId: string, amount: number) {
  return submitMarketOrder(client, {
    assetId: tokenId,
    amount,
    side: "BUY",
  });
}

export async function placeSell(client: TradingClient, tokenId: string, shares: number) {
  return submitMarketOrder(client, {
    assetId: tokenId,
    shares,
    side: "SELL",
  });
}

export function orderError(error: unknown): string {
  if (error && typeof error === "object") {
    const row = error as {
      message?: string;
      shortMessage?: string;
      details?: string;
      cause?: { message?: string; shortMessage?: string };
    };
    const text = row.shortMessage || row.cause?.shortMessage || row.message || row.cause?.message || "";
    if (/simulat/i.test(text)) {
      return "Phantom tried to send a Polygon transaction. Approve the signature prompt instead — connect does not send a transaction.";
    }
    if (text) return text;
  }
  return error instanceof Error ? error.message : "Order failed.";
}
