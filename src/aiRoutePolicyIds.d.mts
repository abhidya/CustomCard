import type { AiFlowId } from "./aiFlowConfigData.mjs";

export type AiRoutePolicyId = "card-copy-route-v1" | "card-image-route-v1";

export const aiRoutePolicyIdsByFlowId: Partial<Record<AiFlowId, AiRoutePolicyId>>;
