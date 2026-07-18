import type { AssetCapabilitySource } from "./asset-capability-source";
import type { CollectionCapabilitySource } from "./collection-capability-source";

export type GateCapabilitySources = {
  assets?: AssetCapabilitySource;
  collections?: CollectionCapabilitySource;
};
