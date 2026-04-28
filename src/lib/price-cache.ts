type CachedPrices = {
  prices: Record<string, number>;
  fetchedAt: number;
};

let cache: CachedPrices | null = null;

const TTL_MS = 60_000;

function getApiKey(): string | null {
  const value = import.meta.env.VITE_COINGECKO_API_KEY;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function clearPriceCache(): void {
  cache = null;
}

export async function fetchCachedPrices(
  priceIds: string[],
): Promise<Record<string, number>> {
  const now = Date.now();

  if (cache && now - cache.fetchedAt < TTL_MS) {
    return cache.prices;
  }

  const params = new URLSearchParams({
    ids: priceIds.join(","),
    vs_currencies: "usd",
  });

  const apiKey = getApiKey();
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["x-cg-demo-api-key"] = apiKey;
  }

  const response = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`,
    { headers },
  );

  if (!response.ok) {
    throw new Error(`CoinGecko price request failed with ${response.status}`);
  }

  const json = (await response.json()) as Record<string, unknown>;
  const prices: Record<string, number> = {};

  for (const id of priceIds) {
    const coin = json[id];
    if (!coin || typeof coin !== "object") continue;
    const usd = (coin as Record<string, unknown>).usd;
    if (typeof usd === "number" && Number.isFinite(usd)) {
      prices[id] = usd;
    }
  }

  cache = { prices, fetchedAt: now };
  return prices;
}
