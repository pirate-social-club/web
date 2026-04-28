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

console.log(`Vite env check passed for ${mode}: ${keys.join(", ")}`);
