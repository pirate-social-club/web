import { describe, expect, test } from "bun:test";

import {
  assertCapacityBeforeAllocation,
  assertNoAllocation,
  assertOneBindingBudget,
  assertResumeBudget,
  assertSingleAllocation,
  type PoolCapacity,
} from "./manual-staging-community-provisioning";

const capacity = (overrides: Partial<PoolCapacity> = {}): PoolCapacity => ({
  allocated: 204,
  free: 20,
  healthy: true,
  quarantined: 0,
  threshold: 8,
  total: 224,
  ...overrides,
});

describe("manual staging community provisioning guards", () => {
  test("accepts only a one-binding budget", () => {
    expect(assertOneBindingBudget("1")).toBe(1);
    expect(() => assertOneBindingBudget("2")).toThrow("exactly 1");
    expect(() => assertOneBindingBudget(undefined)).toThrow("exactly 1");
  });

  test("requires a zero budget when resuming a consumed fixture", () => {
    expect(assertResumeBudget("0")).toBe(0);
    expect(() => assertResumeBudget("1")).toThrow("exactly 0");
  });

  test("preserves the configured free-capacity threshold", () => {
    expect(() => assertCapacityBeforeAllocation(capacity(), 1)).not.toThrow();
    expect(() => assertCapacityBeforeAllocation(capacity({ free: 9 }), 1)).not.toThrow();
    expect(() => assertCapacityBeforeAllocation(capacity({ free: 8 }), 1)).toThrow("cross the safety threshold");
    expect(() => assertCapacityBeforeAllocation(capacity({ healthy: false }), 1)).toThrow("unhealthy");
  });

  test("requires exactly one pool allocation", () => {
    expect(() => assertSingleAllocation(capacity(), capacity({ allocated: 205, free: 19 }))).not.toThrow();
    expect(() => assertSingleAllocation(capacity(), capacity())).toThrow("exactly one allocation");
    expect(() => assertSingleAllocation(capacity(), capacity({ allocated: 206, free: 18 }))).toThrow("exactly one allocation");
    expect(() => assertSingleAllocation(capacity(), capacity({ allocated: 205, free: 19, total: 225 }))).toThrow("total changed");
  });

  test("requires a resumed verification to leave capacity unchanged", () => {
    expect(() => assertNoAllocation(capacity(), capacity())).not.toThrow();
    expect(() => assertNoAllocation(capacity(), capacity({ allocated: 205, free: 19 }))).toThrow("unexpectedly changed");
  });
});
