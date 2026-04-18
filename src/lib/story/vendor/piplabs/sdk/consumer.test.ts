import { describe, expect, test } from "bun:test";
import { encodeAbiParameters, encodeEventTopics, type Hex } from "viem";

import { dkgAbi, contractAddresses } from "../contracts";
import { Consumer } from "./consumer";

const DKG_ADDRESS = contractAddresses.testnet.dkg;
const REGISTERED_EVENT = dkgAbi.find((item) => item.type === "event" && item.name === "Registered");

if (!REGISTERED_EVENT || REGISTERED_EVENT.type !== "event") {
  throw new Error("Registered event ABI is missing");
}

const REGISTERED_NON_INDEXED_INPUTS = REGISTERED_EVENT.inputs.filter((input) => !input.indexed);

function makeRegisteredLog(params: {
  validatorAddr: Hex;
  enclaveCommKey: Hex;
  blockNumber: bigint;
}) {
  return {
    address: DKG_ADDRESS,
    blockHash: `0x${"11".repeat(32)}` as Hex,
    blockNumber: params.blockNumber,
    data: encodeAbiParameters(REGISTERED_NON_INDEXED_INPUTS, [
      "0x",
      7,
      `0x${"00".repeat(32)}`,
      params.enclaveCommKey,
      "0x",
      `0x${"00".repeat(32)}`,
      0n,
      `0x${"00".repeat(32)}`,
      "0x",
    ]),
    logIndex: 0,
    removed: false,
    topics: encodeEventTopics({
      abi: dkgAbi,
      eventName: "Registered",
      args: {
        validatorAddr: params.validatorAddr,
      },
    }),
    transactionHash: `0x${"22".repeat(32)}` as Hex,
    transactionIndex: 0,
  };
}

function createConsumerWithDkgLogs(params: {
  latestBlock: bigint;
  registrationBlock: bigint;
  validatorAddr: Hex;
  enclaveCommKey: Hex;
  onGetLogs?: (range: { fromBlock: bigint; toBlock: bigint }) => void;
}) {
  const publicClient = {
    getBlockNumber: async () => params.latestBlock,
    getLogs: async ({
      address,
      fromBlock,
      toBlock,
    }: {
      address: Hex;
      fromBlock: bigint;
      toBlock: bigint;
    }) => {
      params.onGetLogs?.({ fromBlock, toBlock });
      if (
        address === DKG_ADDRESS &&
        fromBlock <= params.registrationBlock &&
        params.registrationBlock <= toBlock
      ) {
        return [
          makeRegisteredLog({
            validatorAddr: params.validatorAddr,
            enclaveCommKey: params.enclaveCommKey,
            blockNumber: params.registrationBlock,
          }),
        ];
      }
      return [];
    },
  } as const;

  return new Consumer({
    network: "testnet",
    publicClient: publicClient as never,
    walletClient: {} as never,
  });
}

describe("Consumer DKG registration lookback", () => {
  test("finds validator registrations more than 50k blocks behind the tip", async () => {
    const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
    const validatorAddr = "0x1234567890abcdef1234567890abcdef12345678" as Hex;
    const enclaveCommKey = "0x01020304" as Hex;
    const latestBlock = 17_070_000n;
    const registrationBlock = 16_954_084n;
    const consumer = createConsumerWithDkgLogs({
      latestBlock,
      registrationBlock,
      validatorAddr,
      enclaveCommKey,
      onGetLogs: (range) => ranges.push(range),
    });

    const map = await (consumer as unknown as {
      getCommPubKeyMap(): Promise<Map<string, Uint8Array[]>>;
    }).getCommPubKeyMap();

    expect(ranges.length).toBeGreaterThan(0);
    expect(ranges.every((range) => range.toBlock - range.fromBlock + 1n <= 10_000n)).toBe(true);
    expect(ranges.some((range) => range.fromBlock <= registrationBlock && registrationBlock <= range.toBlock)).toBe(true);
    expect(ranges.some((range) => range.fromBlock === 0n)).toBe(false);

    const commPubKeys = map.get(validatorAddr.toLowerCase());
    expect(commPubKeys).toBeDefined();
    expect(commPubKeys?.length).toBe(1);
    expect(Array.from(commPubKeys?.[0] ?? [])).toEqual([1, 2, 3, 4]);
  });

  test("falls back to a genesis scan when the default lookback finds no registrations", async () => {
    const ranges: Array<{ fromBlock: bigint; toBlock: bigint }> = [];
    const validatorAddr = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd" as Hex;
    const enclaveCommKey = "0x0a0b0c0d" as Hex;
    const latestBlock = 250_000n;
    const registrationBlock = 1_000n;
    const consumer = createConsumerWithDkgLogs({
      latestBlock,
      registrationBlock,
      validatorAddr,
      enclaveCommKey,
      onGetLogs: (range) => ranges.push(range),
    });

    const map = await (consumer as unknown as {
      getCommPubKeyMap(): Promise<Map<string, Uint8Array[]>>;
    }).getCommPubKeyMap();

    expect(ranges.some((range) => range.fromBlock === 50_000n)).toBe(true);
    expect(ranges.some((range) => range.fromBlock === 0n)).toBe(true);

    const commPubKeys = map.get(validatorAddr.toLowerCase());
    expect(commPubKeys).toBeDefined();
    expect(commPubKeys?.length).toBe(1);
    expect(Array.from(commPubKeys?.[0] ?? [])).toEqual([10, 11, 12, 13]);
  });
});
