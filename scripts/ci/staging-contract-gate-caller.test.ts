import { expect, test } from "bun:test"
import { readFile } from "node:fs/promises"

test("passes encrypted admin secret material to the reusable staging contract gate", async () => {
  const workflow = await readFile(
    new URL("../../.github/workflows/release.yml", import.meta.url),
    "utf8",
  )
  const gate = workflow.split("api-staging-contract-gate:")[1]?.split("hns-forwarder-negative-probe:")[0]

  expect(gate, "API staging contract gate job").toBeTruthy()
  expect(gate).toContain("PIRATE_ADMIN_TOKEN: ${{ secrets.PIRATE_ADMIN_TOKEN }}")
})
