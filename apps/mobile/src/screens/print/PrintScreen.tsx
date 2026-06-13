import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  Card,
  EmptyState,
  ErrorState,
  InlineNotice,
  LoadingState,
  Pill,
  SectionHeading
} from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type {
  CreateCardProjectResponse,
  ImportedOpportunity,
  RenderPacketResponse
} from "../../lib/api/types";
import { humanizeStatus } from "../../lib/format";
import { spacing, typography } from "../../theme";

/**
 * Proof-first print pipeline: pick an event, create the card project, build
 * the print-ready render packet, review the proof checks, then (and only
 * then) unlock print options and manual handoff.
 */
export function PrintScreen() {
  const api = useApi();
  const navigation = useNavigation();

  const [selectedOpportunity, setSelectedOpportunity] = useState<ImportedOpportunity | null>(null);
  const [project, setProject] = useState<CreateCardProjectResponse | null>(null);
  const [renderPacket, setRenderPacket] = useState<RenderPacketResponse | null>(null);
  const [proofApproved, setProofApproved] = useState(false);

  const connections = useQuery({ queryKey: ["connections"], queryFn: () => api.getConnections() });
  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS)
  });

  const createProject = useMutation({
    mutationFn: (opportunity: ImportedOpportunity) =>
      api.createCardProject({
        opportunityId: opportunity.opportunityId,
        recipientName: opportunity.recipientName
      }),
    onSuccess: (response) => {
      setProject(response);
      setRenderPacket(null);
      setProofApproved(false);
    }
  });

  const createPacket = useMutation({
    mutationFn: (projectId: string) => api.createRenderPacket(projectId),
    onSuccess: (response) => setRenderPacket(response)
  });

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

  const opportunities = connections.data.opportunities;
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
      <SectionHeading title="1 · Choose the event" detail="Which moment is this card for?" />
      {opportunities.length === 0 ? (
        <EmptyState
          title="No events to print for yet"
          detail="Import an invite first — the print workflow starts from an event."
        />
      ) : (
        opportunities.map((opportunity) => {
          const selected = selectedOpportunity?.opportunityId === opportunity.opportunityId;
          return (
            <Card key={opportunity.opportunityId}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{opportunity.title}</Text>
                {selected ? <Pill label="Selected" tone="good" /> : null}
              </View>
              <Text style={typography.body}>For {opportunity.recipientName}</Text>
              <AppButton
                label={selected ? "Selected" : "Use this event"}
                variant={selected ? "secondary" : "primary"}
                disabled={selected}
                onPress={() => {
                  setSelectedOpportunity(opportunity);
                  setProject(null);
                  setRenderPacket(null);
                  setProofApproved(false);
                }}
              />
            </Card>
          );
        })
      )}

      <SectionHeading title="2 · Create the card project" />
      <Card>
        {project ? (
          <>
            <Pill label={`Project ${project.projectId}`} tone="good" />
            <Text style={typography.body}>
              Category {humanizeStatus(project.category)} · {humanizeStatus(project.renderStatus)}
            </Text>
          </>
        ) : (
          <Text style={typography.body}>
            Locks in the recipient, occasion, and approved memories.
          </Text>
        )}
        <AppButton
          label={project ? "Project created" : "Create card project"}
          disabled={!selectedOpportunity || Boolean(project)}
          loading={createProject.isPending}
          onPress={() => selectedOpportunity && createProject.mutate(selectedOpportunity)}
        />
        {createProject.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(createProject.error)} />
        ) : null}
      </Card>

      <SectionHeading title="3 · Build the print proof" />
      <Card>
        {renderPacket ? (
          <>
            <Pill label={`Packet ${renderPacket.renderPacketId}`} tone="good" />
            <Text style={typography.body}>
              {renderPacket.artifactManifest.artifactCount} print files ·{" "}
              {renderPacket.artifactManifest.dpi} DPI ·{" "}
              {renderPacket.artifactManifest.safeZonePassed
                ? "safe zones passed"
                : "safe zone issues"}
            </Text>
          </>
        ) : (
          <Text style={typography.body}>
            Renders print-ready files with checksums and expiring signed links.
          </Text>
        )}
        <AppButton
          label={renderPacket ? "Proof built" : "Build print proof"}
          disabled={!project || Boolean(renderPacket)}
          loading={createPacket.isPending}
          onPress={() => project && createPacket.mutate(project.projectId)}
        />
        {createPacket.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(createPacket.error)} />
        ) : null}
      </Card>

      <SectionHeading title="4 · Print file checks" />
      {proofChecks.map((check) => (
        <Card key={check.id}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{check.label}</Text>
            <Pill
              label={check.passed ? "Passed" : "Review"}
              tone={check.passed ? "good" : "warn"}
            />
          </View>
          <Text style={typography.body}>{check.detail}</Text>
        </Card>
      ))}
      <Card>
        <Text style={typography.body}>
          Approving confirms you reviewed the copy, language, artwork, and the checks above.
        </Text>
        <AppButton
          label={proofApproved ? "Proof approved" : "Approve proof"}
          disabled={!renderPacket || proofApproved}
          onPress={() => setProofApproved(true)}
        />
      </Card>

      <SectionHeading title="5 · Print and finish" detail="Unlocked after proof approval." />
      <Card>
        <AppButton
          label="Compare print options"
          disabled={!proofApproved}
          onPress={() =>
            navigation.navigate("PrintOptions", { renderPacketId: renderPacket?.renderPacketId })
          }
        />
        <AppButton
          label="Finish manually at a print shop"
          variant="secondary"
          disabled={!proofApproved || !project || !renderPacket}
          onPress={() =>
            project &&
            renderPacket &&
            navigation.navigate("Handoff", {
              projectId: project.projectId,
              renderPacketId: renderPacket.renderPacketId
            })
          }
        />
        <AppButton
          label="Walgreens hosted checkout"
          variant="secondary"
          disabled={!proofApproved}
          onPress={() => navigation.navigate("Checkout")}
        />
        {!proofApproved ? (
          <InlineNotice text="Approve proof first — print estimates and checkout unlock after approval." />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  }
});
