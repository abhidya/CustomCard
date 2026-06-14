import React from "react";

import { ErrorState, LoadingState } from "../../components";
import { Screen } from "../../components/Screen";
import { ChecksStep, EventStep, FinishStep, ProjectStep, ProofStep } from "./printSteps";
import { usePrintPipeline } from "./usePrintPipeline";

/**
 * Proof-first print pipeline. The state/mutations live in usePrintPipeline and
 * each numbered step is its own component; this screen only wires guards and
 * order.
 */
export function PrintScreen() {
  const pipeline = usePrintPipeline();
  const { connections, bootstrap } = pipeline;

  if (connections.isPending || bootstrap.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Preparing print workflow…" />
      </Screen>
    );
  }

  if (connections.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />
      </Screen>
    );
  }

  const proofChecks =
    bootstrap.data?.printProofChecks.filter((check) => check.customerVisible) ?? [];

  return (
    <Screen
      refreshing={connections.isRefetching}
      onRefresh={() => {
        void connections.refetch();
        void bootstrap.refetch();
      }}
    >
      <EventStep pipeline={pipeline} />
      <ProjectStep pipeline={pipeline} />
      <ProofStep pipeline={pipeline} />
      <ChecksStep pipeline={pipeline} checks={proofChecks} />
      <FinishStep pipeline={pipeline} />
    </Screen>
  );
}
