#!/usr/bin/env node
import { loadEnv } from "vite";

const [, , mode = "production", ...requiredKeys] = process.argv;
const keys = requiredKeys.length > 0
  ? requiredKeys
  : ["VITE_PRIVY_APP_ID", "VITE_PRIVY_CLIENT_ID"];

const env = loadEnv(mode, process.cwd(), "");
const missing = keys.filter((key) => {
  const value = env[key];
  return typeof value !== "string" || value.trim().length === 0;
});

if (missing.length > 0) {
  console.error(
    `Missing required Vite env for ${mode}: ${missing.join(", ")}.\n`
    + "Set these before building; VITE_* values are baked into the client bundle.",
  );
  process.exit(1);
}

if (mode === "production") {
  const productionMainnetRequirements = {
    VITE_BASE_NETWORK: "base-mainnet",
    VITE_EFP_ENVIRONMENT: "mainnet",
  };
  const mismatched = Object.entries(productionMainnetRequirements).filter(([key, expected]) => {
    return String(env[key] ?? "").trim() !== expected;
  });

  if (mismatched.length > 0) {
    console.error(
      "Production Vite env must target mainnet: "
      + mismatched.map(([key, expected]) => `${key}=${expected}`).join(", "),
    );
    process.exit(1);
  }
}

console.log(`Vite env check passed for ${mode}: ${keys.join(", ")}`);
