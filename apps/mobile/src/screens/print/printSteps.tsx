import { useNavigation } from "@react-navigation/native";
import React from "react";
import { Text } from "react-native";

import {
  AppButton,
  Card,
  CardRow,
  EmptyState,
  InlineNotice,
  Pill,
  SectionHeading
} from "../../components";
import { userMessageForError } from "../../lib/api/errors";
import type { MobilePrintProofCheck } from "../../lib/api/types";
import { humanizeStatus } from "../../lib/format";
import { typography } from "../../theme";
import type { PrintPipeline } from "./usePrintPipeline";

export function EventStep({ pipeline }: { pipeline: PrintPipeline }) {
  const opportunities = pipeline.connections.data?.opportunities ?? [];
  return (
    <>
      <SectionHeading title="1 · Choose the event" detail="Which moment is this card for?" />
      {opportunities.length === 0 ? (
        <EmptyState
          title="No events to print for yet"
          detail="Import an invite first — the print workflow starts from an event."
        />
      ) : (
        opportunities.map((opportunity) => {
          const selected =
            pipeline.selectedOpportunity?.opportunityId === opportunity.opportunityId;
          return (
            <Card key={opportunity.opportunityId}>
              <CardRow
                title={opportunity.title}
                trailing={selected ? <Pill label="Selected" tone="good" /> : null}
              />
              <Text style={typography.body}>For {opportunity.recipientName}</Text>
              <AppButton
                label={selected ? "Selected" : "Use this event"}
                variant={selected ? "secondary" : "primary"}
                disabled={selected}
                onPress={() => pipeline.selectOpportunity(opportunity)}
              />
            </Card>
          );
        })
      )}
    </>
  );
}

export function ProjectStep({ pipeline }: { pipeline: PrintPipeline }) {
  const { project, selectedOpportunity, createProject } = pipeline;
  return (
    <>
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
    </>
  );
}

export function ProofStep({ pipeline }: { pipeline: PrintPipeline }) {
  const { project, renderPacket, createPacket } = pipeline;
  const manifest = renderPacket?.artifactManifest;
  return (
    <>
      <SectionHeading title="3 · Build the print proof" />
      <Card>
        {manifest ? (
          <>
            <Pill label={`Packet ${renderPacket.renderPacketId}`} tone="good" />
            <Text style={typography.body}>
              {manifest.artifactCount} print files · {manifest.dpi} DPI ·{" "}
              {manifest.safeZonePassed ? "safe zones passed" : "safe zone issues"}
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
    </>
  );
}

export function ChecksStep({
  pipeline,
  checks
}: {
  pipeline: PrintPipeline;
  checks: MobilePrintProofCheck[];
}) {
  return (
    <>
      <SectionHeading title="4 · Print file checks" />
      {checks.map((check) => (
        <Card key={check.id}>
          <CardRow
            title={check.label}
            trailing={
              <Pill
                label={check.passed ? "Passed" : "Review"}
                tone={check.passed ? "good" : "warn"}
              />
            }
          />
          <Text style={typography.body}>{check.detail}</Text>
        </Card>
      ))}
      <Card>
        <Text style={typography.body}>
          Approving confirms you reviewed the copy, language, artwork, and the checks above.
        </Text>
        <AppButton
          label={pipeline.proofApproved ? "Proof approved" : "Approve proof"}
          disabled={!pipeline.renderPacket || pipeline.proofApproved}
          onPress={pipeline.approveProof}
        />
      </Card>
    </>
  );
}

export function FinishStep({ pipeline }: { pipeline: PrintPipeline }) {
  const navigation = useNavigation();
  const { proofApproved, project, renderPacket } = pipeline;
  return (
    <>
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
          label="Finish at a print shop"
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
    </>
  );
}
