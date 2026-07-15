import { describe, expect, test } from "bun:test"

import {
  classifiedMigrations,
  newlyAddedMigrations,
  unclassifiedMigrations,
} from "./community-migration-classification-ratchet.mjs"

describe("community migration classification ratchet", () => {
  test("accepts exactly one unconditional, feature, or deferred classification", () => {
    const classified = classifiedMigrations({
      unconditional: ["1127_asset_story_metadata_refs.sql"],
      features: {
        rewards: { migrations: ["1126_reward_qualification_outbox.sql"] },
      },
      deferred: {
        "1128_future_table.sql": { rationale: "API code does not consume this schema yet" },
      },
    })

    expect(Object.fromEntries(classified)).toEqual({
      "1127_asset_story_metadata_refs.sql": "unconditional",
      "1126_reward_qualification_outbox.sql": "feature:rewards",
      "1128_future_table.sql": "deferred",
    })
  })

  test("rejects duplicate classifications", () => {
    expect(() => classifiedMigrations({
      unconditional: ["1127_asset_story_metadata_refs.sql"],
      features: { story: { migrations: ["1127_asset_story_metadata_refs.sql"] } },
    })).toThrow("classified more than once")
  })

  test("rejects deferred migrations without a rationale", () => {
    expect(() => classifiedMigrations({
      unconditional: [],
      deferred: { "1128_future_table.sql": { rationale: "" } },
    })).toThrow("deferred without a non-empty rationale")
  })

  test("finds newly added migrations and reports only unclassified additions", () => {
    const added = newlyAddedMigrations(
      ["1126_reward_qualification_outbox.sql"],
      [
        "1126_reward_qualification_outbox.sql",
        "1127_asset_story_metadata_refs.sql",
        "1128_future_table.sql",
      ],
    )
    const classified = classifiedMigrations({
      unconditional: ["1127_asset_story_metadata_refs.sql"],
    })

    expect(added).toEqual([
      "1127_asset_story_metadata_refs.sql",
      "1128_future_table.sql",
    ])
    expect(unclassifiedMigrations(added, classified)).toEqual(["1128_future_table.sql"])
  })
})
