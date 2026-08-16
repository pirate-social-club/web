import { describe, expect, test } from "bun:test";

const { dehydrate } = await import("@tanstack/query-core");
const { QueryClient } = await import("../../node_modules/@tanstack/solid-query/src/QueryClient");
const { createHydrationCoordinator } = await import(
  "../../node_modules/@tanstack/solid-query/src/hydrationChannel",
);

const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe("Solid Query stream hydration", () => {
  test("keeps a streamed query pending until its entry is applied", async () => {
    const queryKey = ["hydration-race", "streamed"];
    const sourceClient = new QueryClient();
    sourceClient.setQueryData(queryKey, "streamed data");
    const [entry] = dehydrate(sourceClient).queries;
    const client = new QueryClient();
    const coordinator = createHydrationCoordinator(() => client);
    let primed = false;
    coordinator.whenQueryPrimed(entry.queryHash, () => {
      primed = true;
    });

    await settle();
    expect(primed).toBe(false);
    expect(coordinator.isQueryPrimed(entry.queryHash)).toBe(false);

    coordinator.applyYield({ entries: [entry], done: true });
    await settle();
    expect(primed).toBe(true);
    expect(coordinator.isQueryPrimed(entry.queryHash)).toBe(true);
    expect(client.getQueryData(queryKey)).toBe("streamed data");
  });

  test("releases a primed query and completes a client-only coordinator", async () => {
    const sourceClient = new QueryClient();
    const primedKey = ["hydration-race", "primed"];
    sourceClient.setQueryData(primedKey, "primed data");
    const client = new QueryClient();
    const coordinator = createHydrationCoordinator(() => client);
    const [primedEntry] = dehydrate(sourceClient).queries;
    coordinator.applyYield({ entries: [primedEntry], done: false });
    expect(coordinator.isQueryPrimed(primedEntry.queryHash)).toBe(true);

    let completed = false;
    const clientOnlyHash = JSON.stringify(["hydration-race", "client-only"]);
    coordinator.whenQueryPrimed(clientOnlyHash, () => {
      completed = true;
    });
    coordinator.applyYield({ entries: [], done: true });
    await settle();
    expect(completed).toBe(true);
  });
});
