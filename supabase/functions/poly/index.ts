const HOSTS: Record<string, string> = {
  api: "https://data-api.polymarket.com",
  gamma: "https://gamma-api.polymarket.com",
  clob: "https://clob.polymarket.com",
};

const COLLATERAL = [
  "0xC011a7E12a19f7B1f670d46F03B03f3342E82DFB",
  "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
];

const POLYGON_RPCS = [
  "https://1rpc.io/matic",
  "https://polygon.drpc.org",
  "https://rpc-mainnet.matic.quiknode.pro",
  "https://polygon-bor-rpc.publicnode.com",
];

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

async function ethCall(to: string, data: string): Promise<bigint> {
  let last = "RPC failed";
  for (const rpc of POLYGON_RPCS) {
    try {
      const response = await fetch(rpc, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_call",
          params: [{ to, data }, "latest"],
        }),
      });
      const payload = (await response.json()) as { result?: string; error?: { message?: string } };
      if (typeof payload.result === "string") return BigInt(payload.result);
      last = payload.error?.message ?? `HTTP ${response.status}`;
    } catch (error) {
      last = error instanceof Error ? error.message : "RPC failed";
    }
  }
  throw new Error(last);
}

async function chainBalances(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const owners = [...new Set(
    url.searchParams.getAll("address").map((row) => row.toLowerCase()).filter((row) => /^0x[a-f0-9]{40}$/.test(row)),
  )];
  if (!owners.length) return json({ balance: 0 });
  const amounts = await Promise.all(
    owners.flatMap((owner) =>
      COLLATERAL.map(async (token) => {
        const data = `0x70a08231${owner.slice(2).padStart(64, "0")}`;
        const raw = await ethCall(token, data).catch(() => 0n);
        return Number(raw) / 1_000_000;
      }),
    ),
  );
  return json({ balance: amounts.reduce((sum, value) => sum + value, 0) });
}

const CANONICAL: Record<string, string> = {
  poly_address: "POLY_ADDRESS",
  "poly-address": "POLY_ADDRESS",
  poly_signature: "POLY_SIGNATURE",
  "poly-signature": "POLY_SIGNATURE",
  poly_timestamp: "POLY_TIMESTAMP",
  "poly-timestamp": "POLY_TIMESTAMP",
  poly_nonce: "POLY_NONCE",
  "poly-nonce": "POLY_NONCE",
  poly_api_key: "POLY_API_KEY",
  "poly-api-key": "POLY_API_KEY",
  poly_passphrase: "POLY_PASSPHRASE",
  "poly-passphrase": "POLY_PASSPHRASE",
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,DELETE,PATCH,OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, poly_address, poly_signature, poly_timestamp, poly_nonce, poly_api_key, poly_passphrase, POLY_ADDRESS, POLY_SIGNATURE, POLY_TIMESTAMP, POLY_NONCE, POLY_API_KEY, POLY_PASSPHRASE",
};

function pickHeaders(req: Request): Headers {
  const headers = new Headers({ accept: "application/json" });
  const contentType = req.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  for (const [name, value] of req.headers.entries()) {
    const key = name.toLowerCase();
    if (key === "authorization") headers.set("authorization", value);
    const canonical = CANONICAL[key] ?? (key.startsWith("poly") ? name : null);
    if (canonical) headers.set(canonical, value);
  }
  return headers;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }
  if (!["GET", "POST", "DELETE", "PATCH"].includes(req.method)) {
    return new Response("Method not allowed", { status: 405, headers: cors });
  }

  const url = new URL(req.url);
  if (/\/chain\/balances\/?$/.test(url.pathname)) {
    try {
      return await chainBalances(req);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : "Balance lookup failed" }, 502);
    }
  }
  const match = url.pathname.match(/\/(api|gamma|clob)(\/.*)?$/);
  if (!match) {
    return new Response("Not found", { status: 404, headers: cors });
  }

  const host = HOSTS[match[1]];
  const path = match[2] ?? "/";
  const target = `${host}${path}${url.search}`;
  const headers = pickHeaders(req);
  const body = req.method === "GET" ? undefined : await req.arrayBuffer();
  const upstream = await fetch(target, { method: req.method, headers, body });
  const responseBody = await upstream.arrayBuffer();

  return new Response(responseBody, {
    status: upstream.status,
    headers: {
      ...cors,
      "Content-Type": upstream.headers.get("Content-Type") ?? "application/json",
    },
  });
});
