import React from "react";
import { Text } from "react-native";
import { useNavigation } from "@react-navigation/native";

import { AppButton, Card, ErrorState, LoadingState, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { useAppSession } from "../../lib/auth/AuthProvider";
import { typography } from "../../theme";
import { ChecksStep, EventStep, FinishStep, ProjectStep, ProofStep } from "./printSteps";
import { usePrintPipeline } from "./usePrintPipeline";

/**
 * Proof-first print pipeline. The state/mutations live in usePrintPipeline and
 * each numbered step is its own component; this screen only wires guards and
 * order.
 */
export function PrintScreen() {
  const session = useAppSession();
  const accountReady = session.status === "signedIn";
  const pipeline = usePrintPipeline({ enabled: accountReady });
  const { connections, bootstrap } = pipeline;

  if (!accountReady) {
    return <GuestMyCards />;
  }

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

function GuestMyCards() {
  const navigation = useNavigation();

  return (
    <Screen>
      <SectionHeading title="Your cards" />
      <Card>
        <Text style={typography.body}>
          No cards yet. Start with a card, an invite, or a saved person.
        </Text>
        <AppButton label="Start a card" onPress={() => navigation.navigate("Studio")} />
        <AppButton
          label="Sign in to save cards"
          variant="secondary"
          onPress={() => navigation.navigate("SignIn")}
        />
      </Card>
    </Screen>
  );
}
