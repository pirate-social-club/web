import { describe, expect, test } from "bun:test";
import type { AssetAccessResponse } from "@pirate/api-contracts";

import {
  downloadGenericAsset,
  GenericAssetDownloadIntegrityError,
  type GenericAssetDownloadTelemetryEvent,
} from "./generic-asset-download";

const ABC_SHA256 = "0xba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

function access(overrides: Partial<AssetAccessResponse> = {}): AssetAccessResponse {
  return {
    access_granted: true,
    access_mode: "locked",
    asset: "asset_1",
    community: "com_1",
    decision_reason: "purchase_entitlement",
    delivery_kind: "primary_content_ref",
    delivery_ref: "/communities/com_1/assets/asset_1/content",
    locked_delivery_status: "ready",
    payload: {
      content_hash: ABC_SHA256,
      delivery_behavior: "download",
      display_filename: "verified.txt",
      mime_type: "text/plain",
      payload_format: "opaque_file_v1",
      size_bytes: 3,
    },
    source_post: "post_1",
    source_post_status: "published",
    story_cdr_access: null,
    story_status: "published",
    ...overrides,
  };
}

function harness(response: AssetAccessResponse) {
  const telemetry: Array<{ event: GenericAssetDownloadTelemetryEvent; context: Record<string, unknown> }> = [];
  const fetchCalls: Array<{ init?: RequestInit; url: string }> = [];
  const saved: Array<{ blob: Blob; filename: string }> = [];
  const cdrCalls: NonNullable<AssetAccessResponse["story_cdr_access"]>[] = [];

  return {
    cdrCalls,
    fetchCalls,
    input: {
      accessToken: "access-token",
      assetId: "asset_1",
      communityId: "com_1",
      fetchContent: async (url: string, init?: RequestInit) => {
        fetchCalls.push({ init, url });
        return new Response("abc", { headers: { "content-type": "text/plain" } });
      },
      readStoryCdr: async (storyAccess: NonNullable<AssetAccessResponse["story_cdr_access"]>) => {
        cdrCalls.push(storyAccess);
        return new Blob(["abc"], { type: "text/plain" });
      },
      reportTelemetry: (event: GenericAssetDownloadTelemetryEvent, context: Record<string, unknown>) => {
        telemetry.push({ event, context });
      },
      resolveAccess: async () => response,
      resolveContentUrl: (deliveryRef: string) => `https://api.test${deliveryRef}`,
      saveBlob: (blob: Blob, filename: string) => saved.push({ blob, filename }),
      titleText: "Fallback title",
    },
    saved,
    telemetry,
  };
}

describe("generic asset download", () => {
  test("fails closed and reports telemetry when integrity metadata is missing", async () => {
    const state = harness(access({ payload: { ...access().payload!, content_hash: "" } }));

    await expect(downloadGenericAsset(state.input)).rejects.toMatchObject<GenericAssetDownloadIntegrityError>({
      code: "missing_hash",
    });
    expect(state.telemetry).toEqual([{
      event: "generic_asset_download_missing_hash",
      context: { assetId: "asset_1", communityId: "com_1" },
    }]);
    expect(state.fetchCalls).toHaveLength(0);
    expect(state.saved).toHaveLength(0);
  });

  test("rejects mismatched bytes and reports both hashes", async () => {
    const state = harness(access({ payload: { ...access().payload!, content_hash: `0x${"f".repeat(64)}` } }));

    await expect(downloadGenericAsset(state.input)).rejects.toMatchObject<GenericAssetDownloadIntegrityError>({
      code: "hash_mismatch",
    });
    expect(state.telemetry[0]).toMatchObject({
      event: "generic_asset_download_hash_mismatch",
      context: { actualHash: ABC_SHA256, assetId: "asset_1", communityId: "com_1" },
    });
    expect(state.saved).toHaveLength(0);
  });

  test("uses bearer authentication for proxy delivery and saves verified bytes", async () => {
    const state = harness(access());

    await expect(downloadGenericAsset(state.input)).resolves.toEqual({ kind: "downloaded" });
    expect(state.fetchCalls).toEqual([{
      init: { headers: { Authorization: "Bearer access-token" } },
      url: "https://api.test/communities/com_1/assets/asset_1/content",
    }]);
    expect(state.saved).toHaveLength(1);
    expect(state.saved[0]?.filename).toBe("verified.txt");
    expect(await state.saved[0]?.blob.text()).toBe("abc");
  });

  test("uses CDR delivery without calling the content proxy", async () => {
    const storyAccess = {
      access_aux_data_hex: "0x01",
      access_proof: { signature: "e2e" },
      access_ref: "story:asset:1",
      access_scope: "asset.owner" as const,
      cdr_contract_address: `0x${"1".repeat(40)}`,
      chain_id: 1315,
      cipher_algorithm: "AES-GCM",
      cipher_iv_b64: "aXY=",
      ciphertext_ref: "/ciphertext",
      mime_type: "text/plain",
      namespace: "pirate.e2e",
      read_condition_address: `0x${"2".repeat(40)}`,
      rpc_url: "https://rpc.test",
      vault_uuid: 1,
    } satisfies NonNullable<AssetAccessResponse["story_cdr_access"]>;
    const state = harness(access({
      delivery_kind: "story_cdr_ref",
      delivery_ref: "/ciphertext",
      story_cdr_access: storyAccess,
    }));

    await expect(downloadGenericAsset(state.input)).resolves.toEqual({ kind: "downloaded" });
    expect(state.cdrCalls).toEqual([storyAccess]);
    expect(state.fetchCalls).toHaveLength(0);
    expect(state.saved).toHaveLength(1);
  });

  test("returns a denied result before attempting delivery", async () => {
    const state = harness(access({
      access_granted: false,
      decision_reason: "purchase_required",
      delivery_kind: null,
      delivery_ref: null,
      story_cdr_access: null,
    }));

    await expect(downloadGenericAsset(state.input)).resolves.toEqual({
      kind: "access_denied",
      decisionReason: "purchase_required",
    });
    expect(state.fetchCalls).toHaveLength(0);
    expect(state.saved).toHaveLength(0);
  });
});
