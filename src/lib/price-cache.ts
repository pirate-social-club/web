type CachedPrice = {
  price: number;
  fetchedAt: number;
};

const cache = new Map<string, CachedPrice>();

const TTL_MS = 60_000;

export function clearPriceCache(): void {
  cache.clear();
}

export async function fetchCachedPrices(
  priceIds: string[],
): Promise<Record<string, number>> {
  const now = Date.now();

  const uniqueIds = [...new Set(priceIds)];
  const missingIds = uniqueIds.filter((id) => {
    const cached = cache.get(id);
    return !cached || now - cached.fetchedAt >= TTL_MS;
  });

  if (missingIds.length > 0) {
    const params = new URLSearchParams({
      ids: missingIds.join(","),
      vs_currencies: "usd",
    });

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(`CoinGecko price request failed with ${response.status}`);
    }

    const json = (await response.json()) as Record<string, unknown>;

    for (const id of missingIds) {
      const coin = json[id];
      if (!coin || typeof coin !== "object") continue;
      const usd = (coin as Record<string, unknown>).usd;
      if (typeof usd === "number" && Number.isFinite(usd)) {
        cache.set(id, { fetchedAt: now, price: usd });
      }
    }
  }

  const prices: Record<string, number> = {};
  for (const id of uniqueIds) {
    const cached = cache.get(id);
    if (cached) {
      prices[id] = cached.price;
    }
  }
  return prices;
}
