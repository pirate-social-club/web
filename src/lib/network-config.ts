"use client";

import type { Address } from "viem";
import {
  base,
  baseSepolia,
  mainnet,
  optimism,
  optimismSepolia,
  sepolia,
  type Chain,
} from "viem/chains";

import { readViteEnv } from "@/lib/vite-env";

export type PirateAppEnvironment = "dev" | "staging" | "prod";
export type PirateBaseNetwork = "base-sepolia" | "base-mainnet";
export type PirateStoryNetwork = "story-aeneid" | "story-mainnet";
export type PirateEfpEnvironment = "testnet" | "mainnet";
type NetworkEnvReader = (name: string) => string | null;
type NetworkMetaEnv = {
  DEV?: boolean;
  MODE?: string;
};

const PUBLIC_RPC_FALLBACKS = {
  storyMainnet: "https://mainnet.storyrpc.io",
  storyAeneid: "https://aeneid.storyrpc.io",
  tempoModerato: "https://rpc.moderato.tempo.xyz",
} as const;

const PUBLIC_API_FALLBACKS = {
  efp: "https://api.ethfollow.xyz/api/v1",
} as const;

interface PirateChainConfig {
  chainId: number;
  explorerUrl: string;
  label: string;
  rpcUrl: string;
}

interface PirateEfpDeploymentConfig {
  accountMetadata: Address;
  apiUrl: string;
  environment: PirateEfpEnvironment;
  listMinter: Address;
  listRecordsByChain: Record<number, Address>;
  listRegistry: Address;
  primaryListChainId: number;
  rpcUrlsByChainId: Record<number, string>;
}

export interface PirateNetworkConfig {
  appEnvironment: PirateAppEnvironment;
  base: PirateChainConfig & { network: PirateBaseNetwork };
  story: PirateChainConfig & { network: PirateStoryNetwork };
  tempo: PirateChainConfig & { network: "tempo-moderato" };
  efp: PirateEfpDeploymentConfig;
  operators: {
    chipotleAllowed: boolean;
    keystoneRequired: boolean;
  };
}

function resolveAppEnvironment(readEnv: NetworkEnvReader, metaEnv: NetworkMetaEnv): PirateAppEnvironment {
  const explicit = readEnv("VITE_PIRATE_APP_ENV")?.toLowerCase();
  if (explicit === "dev" || explicit === "development" || explicit === "local") {
    return "dev";
  }
  if (explicit === "staging" || explicit === "stage" || explicit === "preprod") {
    return "staging";
  }
  if (explicit === "prod" || explicit === "production") {
    return "prod";
  }

  const mode = String(metaEnv.MODE ?? "").toLowerCase();
  if (mode === "staging") {
    return "staging";
  }
  if (mode === "development") {
    return "dev";
  }

  return metaEnv.DEV ? "dev" : "prod";
}

function withRpcOverride(chain: Chain, envVarName: string, readEnv: NetworkEnvReader): string {
  return readEnv(envVarName) ?? chain.rpcUrls.default.http[0];
}

function rejectMainnetOutsideProduction(appEnvironment: PirateAppEnvironment, envVarName: string, networkLabel: string): never {
  throw new Error(`${envVarName} cannot select ${networkLabel} unless VITE_PIRATE_APP_ENV=prod.`);
}

function resolveBaseNetwork(appEnvironment: PirateAppEnvironment, readEnv: NetworkEnvReader): PirateBaseNetwork {
  const explicit = readEnv("VITE_BASE_NETWORK")?.toLowerCase();
  if (explicit === "base-mainnet" || explicit === "base") {
    if (appEnvironment !== "prod") {
      rejectMainnetOutsideProduction(appEnvironment, "VITE_BASE_NETWORK", "Base Mainnet");
    }
    return "base-mainnet";
  }
  if (explicit === "base-sepolia" || explicit === "bases" || explicit === "base-testnet") {
    return "base-sepolia";
  }

  return appEnvironment === "prod" ? "base-mainnet" : "base-sepolia";
}

function resolveStoryNetwork(appEnvironment: PirateAppEnvironment, readEnv: NetworkEnvReader): PirateStoryNetwork {
  const explicit = readEnv("VITE_STORY_NETWORK")?.toLowerCase();
  if (explicit === "story-mainnet" || explicit === "story") {
    if (appEnvironment !== "prod") {
      rejectMainnetOutsideProduction(appEnvironment, "VITE_STORY_NETWORK", "Story Mainnet");
    }
    return "story-mainnet";
  }
  if (explicit === "story-aeneid" || explicit === "aeneid") {
    return "story-aeneid";
  }

  return appEnvironment === "prod" ? "story-aeneid" : "story-aeneid";
}

function resolveEfpEnvironment(
  appEnvironment: PirateAppEnvironment,
  baseNetwork: PirateBaseNetwork,
  readEnv: NetworkEnvReader,
): PirateEfpEnvironment {
  const explicit = readEnv("VITE_EFP_ENVIRONMENT")?.toLowerCase();
  if (explicit === "mainnet") {
    if (appEnvironment !== "prod") {
      rejectMainnetOutsideProduction(appEnvironment, "VITE_EFP_ENVIRONMENT", "EFP Mainnet");
    }
    return "mainnet";
  }
  if (explicit === "testnet") {
    return "testnet";
  }

  return baseNetwork === "base-mainnet" ? "mainnet" : "testnet";
}

function resolveBaseConfig(baseNetwork: PirateBaseNetwork, readEnv: NetworkEnvReader): PirateNetworkConfig["base"] {
  if (baseNetwork === "base-mainnet") {
    return {
      network: baseNetwork,
      chainId: base.id,
      explorerUrl: "https://basescan.org",
      label: "Base Mainnet",
      rpcUrl: withRpcOverride(base, "VITE_BASE_MAINNET_RPC_URL", readEnv),
    };
  }

  return {
    network: baseNetwork,
    chainId: baseSepolia.id,
    explorerUrl: "https://sepolia.basescan.org",
    label: "Base Sepolia",
    rpcUrl: withRpcOverride(baseSepolia, "VITE_BASE_SEPOLIA_RPC_URL", readEnv),
  };
}

function resolveStoryConfig(storyNetwork: PirateStoryNetwork, readEnv: NetworkEnvReader): PirateNetworkConfig["story"] {
  if (storyNetwork === "story-mainnet") {
    return {
      network: storyNetwork,
      chainId: 1514,
      explorerUrl: "https://www.storyscan.io",
      label: "Story Mainnet",
      rpcUrl: readEnv("VITE_STORY_MAINNET_RPC_URL") ?? PUBLIC_RPC_FALLBACKS.storyMainnet,
    };
  }

  return {
    network: storyNetwork,
    chainId: 1315,
    explorerUrl: "https://aeneid.storyscan.io",
    label: "Story Aeneid",
    rpcUrl: readEnv("VITE_STORY_AENEID_RPC_URL") ?? PUBLIC_RPC_FALLBACKS.storyAeneid,
  };
}

function resolveTempoConfig(readEnv: NetworkEnvReader): PirateNetworkConfig["tempo"] {
  return {
    network: "tempo-moderato",
    chainId: 42431,
    explorerUrl: "https://explore.tempo.xyz",
    label: "Tempo Moderato",
    rpcUrl: readEnv("VITE_TEMPO_MODERATO_RPC_URL") ?? PUBLIC_RPC_FALLBACKS.tempoModerato,
  };
}

function resolveEfpConfig(
  efpEnvironment: PirateEfpEnvironment,
  readEnv: NetworkEnvReader,
): PirateNetworkConfig["efp"] {
  if (efpEnvironment === "mainnet") {
    return {
      accountMetadata: "0x5289fE5daBC021D02FDDf23d4a4DF96F4E0F17EF",
      apiUrl: readEnv("VITE_EFP_API_URL") ?? PUBLIC_API_FALLBACKS.efp,
      environment: efpEnvironment,
      listRegistry: "0x0E688f5DCa4a0a4729946ACbC44C792341714e08",
      listMinter: "0xDb17Bfc64aBf7B7F080a49f0Bbbf799dDbb48Ce5",
      primaryListChainId: base.id,
      listRecordsByChain: {
        [base.id]: "0x41Aa48Ef3c0446b46a5b1cc6337FF3d3716E2A33",
        [optimism.id]: "0x4Ca00413d850DcFa3516E14d21DAE2772F2aCb85",
        [mainnet.id]: "0x5289fE5daBC021D02FDDf23d4a4DF96F4E0F17EF",
      },
      rpcUrlsByChainId: {
        [base.id]: withRpcOverride(base, "VITE_BASE_MAINNET_RPC_URL", readEnv),
        [optimism.id]: withRpcOverride(optimism, "VITE_OP_MAINNET_RPC_URL", readEnv),
        [mainnet.id]: withRpcOverride(mainnet, "VITE_ETH_MAINNET_RPC_URL", readEnv),
      },
    };
  }

  return {
    accountMetadata: "0xDAf8088C4DCC8113F49192336cd594300464af8D",
    apiUrl: readEnv("VITE_EFP_API_URL") ?? PUBLIC_API_FALLBACKS.efp,
    environment: efpEnvironment,
    listRegistry: "0xDdD39d838909bdFF7b067a5A42DC92Ad4823a26d",
    listMinter: "0x0c3301561B8e132fe18d97E69d95F5f1F2849f9b",
    primaryListChainId: baseSepolia.id,
    listRecordsByChain: {
      [baseSepolia.id]: "0x63B4e2Bb1E9b9D02AEF3Dc473c5B4b590219FA5e",
      [optimismSepolia.id]: "0x2f644bfec9C8E9ad822744E17d9Bf27A42e039fE",
      [sepolia.id]: "0xf8c6aa2a83799d0f984CA501F85f9e634F97FEf2",
    },
    rpcUrlsByChainId: {
      [baseSepolia.id]: withRpcOverride(baseSepolia, "VITE_BASE_SEPOLIA_RPC_URL", readEnv),
      [optimismSepolia.id]: withRpcOverride(optimismSepolia, "VITE_OP_SEPOLIA_RPC_URL", readEnv),
      [sepolia.id]: withRpcOverride(sepolia, "VITE_ETH_SEPOLIA_RPC_URL", readEnv),
    },
  };
}

export function resolvePirateNetworkConfig(
  readEnv: NetworkEnvReader,
  metaEnv: NetworkMetaEnv = {},
): PirateNetworkConfig {
  const appEnvironment = resolveAppEnvironment(readEnv, metaEnv);
  const baseNetwork = resolveBaseNetwork(appEnvironment, readEnv);
  const storyNetwork = resolveStoryNetwork(appEnvironment, readEnv);
  const efpEnvironment = resolveEfpEnvironment(appEnvironment, baseNetwork, readEnv);

  return {
    appEnvironment,
    base: resolveBaseConfig(baseNetwork, readEnv),
    story: resolveStoryConfig(storyNetwork, readEnv),
    tempo: resolveTempoConfig(readEnv),
    efp: resolveEfpConfig(efpEnvironment, readEnv),
    operators: {
      chipotleAllowed: appEnvironment !== "dev",
      keystoneRequired: appEnvironment === "prod",
    },
  };
}

export function getPirateNetworkConfig(): PirateNetworkConfig {
  return resolvePirateNetworkConfig(readViteEnv, import.meta.env);
}
