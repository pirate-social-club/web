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

  test("starts the reusable workflow before staging so its HNS probe fails fast", () => {
    const contractGate = releaseWorkflow
      .split("api-hns-verifier-contract:")[1]
      ?.split("api-staging-contract-gate:")[0]

    expect(contractGate, "HNS verifier contract job").toBeTruthy()
    expect(contractGate).toContain("needs: [release-inputs]")
    expect(contractGate).toContain("hns-verifier-contract-gate.yml@main")
    expect(contractGate).not.toContain("needs: [release-inputs, staging]")
  })

  test("makes the fast verifier gate release-blocking", () => {
    const freshness = releaseWorkflow
      .split("production-freshness:")[1]
      ?.split("production:")[0]
    const production = releaseWorkflow
      .split("production:\n")[1]
      ?.split("\n  # The production deploy lane")[0]

    expect(freshness, "production freshness job").toBeTruthy()
    expect(production, "production job").toBeTruthy()
    expect(freshness).toContain("api-hns-verifier-contract")
    expect(production).toContain("api-hns-verifier-contract")
  })
})
