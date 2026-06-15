import { useMutation, useQuery } from "@tanstack/react-query";
import { Platform } from "react-native";
import { useState } from "react";

import { useApi } from "../../lib/api/ApiProvider";
import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import type {
  CreateCardProjectResponse,
  ImportedOpportunity,
  RenderPacketResponse
} from "../../lib/api/types";

/**
 * Owns the proof-first print pipeline state and mutations so the screen stays a
 * thin layout. Selecting an event or rebuilding resets downstream steps, which
 * keeps the "you must approve the proof before checkout" invariant honest.
 */
export function usePrintPipeline({ enabled = true }: { enabled?: boolean } = {}) {
  const api = useApi();
  const toast = useToast();

  const [selectedOpportunity, setSelectedOpportunity] = useState<ImportedOpportunity | null>(null);
  const [project, setProject] = useState<CreateCardProjectResponse | null>(null);
  const [renderPacket, setRenderPacket] = useState<RenderPacketResponse | null>(null);
  const [proofApproved, setProofApproved] = useState(false);

  const connections = useQuery({
    queryKey: ["connections"],
    queryFn: () => api.getConnections(),
    enabled
  });
  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS),
    enabled
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
    },
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  const createPacket = useMutation({
    mutationFn: (projectId: string) => api.createRenderPacket(projectId),
    onSuccess: (response) => setRenderPacket(response),
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  function selectOpportunity(opportunity: ImportedOpportunity) {
    setSelectedOpportunity(opportunity);
    setProject(null);
    setRenderPacket(null);
    setProofApproved(false);
  }

  function approveProof() {
    setProofApproved(true);
    toast.show("Proof approved — print options unlocked", "success");
  }

  return {
    connections,
    bootstrap,
    selectedOpportunity,
    project,
    renderPacket,
    proofApproved,
    createProject,
    createPacket,
    selectOpportunity,
    approveProof
  };
}

export type PrintPipeline = ReturnType<typeof usePrintPipeline>;
