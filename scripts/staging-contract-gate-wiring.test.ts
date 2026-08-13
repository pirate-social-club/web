import { describe, expect, test } from "bun:test"
import { readFileSync } from "node:fs"

const releaseWorkflow = readFileSync(
  new URL("../.github/workflows/release.yml", import.meta.url),
  "utf8",
)

describe("staging contract gate wiring", () => {
  test("passes the scoped operator credential declared by the reusable API workflow", () => {
    const contractGate = releaseWorkflow
      .split("api-staging-contract-gate:")[1]
      ?.split("hns-forwarder-negative-probe:")[0]

    expect(contractGate, "API staging contract gate job").toBeTruthy()
    expect(contractGate).toContain(
      "PIRATE_ADMIN_OPERATOR_CREDENTIAL: ${{ format('opc_admin_automation.{0}', secrets.PIRATE_ADMIN_TOKEN) }}",
    )
    expect(contractGate).not.toContain("PIRATE_ADMIN_TOKEN: ${{ secrets.PIRATE_ADMIN_TOKEN }}")
  })
})
