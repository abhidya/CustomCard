import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import { useAppSession } from "../../lib/auth/AuthProvider";
import type {
  AiJobStatusResponse,
  CardGenerateRequest,
  CardGenerateResponse,
  CardGenerateResult,
  QueuedAiJobResponse,
  SaveDraftStateRequest
} from "../../lib/api/types";
import { hasErrors, optionalText, requireText, type FieldErrors } from "../../forms/validation";
import { cardLanguageForCode, codeForCardLanguage, OCCASIONS, STYLES, TONES } from "./cardOptions";

export type CardField =
  | "sender"
  | "recipient"
  | "relationship"
  | "occasion"
  | "tone"
  | "style"
  | "language"
  | "personalNote";

export type CardForm = Record<CardField, string>;

const initialForm: CardForm = {
  sender: "",
  recipient: "",
  relationship: "",
  occasion: OCCASIONS[0] ?? "birthday",
  tone: TONES[0] ?? "warm",
  style: STYLES[0] ?? "botanical",
  language: "en-US",
  personalNote: ""
};

const DRAFT_AUTOSAVE_DELAY_MS = 700;
const AI_JOB_MAX_POLLS = 60;
const AI_JOB_FALLBACK_RETRY_SECONDS = 2;

/**
 * Owns the card studio form: server-draft resume, autosave, validation, and
 * generation. Keeps the screen a thin layout over a single form object.
 */
export function useCardDraft() {
  const api = useApi();
  const session = useAppSession();
  const toast = useToast();
  const signedIn = session.status === "signedIn";

  const [form, setForm] = useState<CardForm>(initialForm);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<CardField>>({});
  const [result, setResult] = useState<CardGenerateResponse | null>(null);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);
  const draftSaveRequest = useMemo(() => buildDraftSaveRequest(form), [form]);
  const draftSaveSnapshot = useMemo(() => JSON.stringify(draftSaveRequest), [draftSaveRequest]);
  const lastAutosaveSnapshot = useRef("");

  const setField = (field: CardField, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  // Resume the latest server-side draft so the app stays stateless.
  const draft = useQuery({
    queryKey: ["draft-state"],
    queryFn: () => api.getCurrentDraftState(),
    enabled: signedIn
  });

  useEffect(() => {
    if (!signedIn) {
      setHydratedFromDraft(false);
      lastAutosaveSnapshot.current = "";
      return;
    }
    if (hydratedFromDraft || !draft.isSuccess) return;
    const saved = draft.data?.draftState;
    if (saved) {
      const input = saved.draftInput;
      setForm((current) => ({
        ...current,
        sender: input.sender ?? current.sender,
        recipient: input.recipient ?? current.recipient,
        relationship: input.relationship ?? current.relationship,
        occasion:
          input.occasion && OCCASIONS.includes(input.occasion) ? input.occasion : current.occasion,
        tone: input.tone && TONES.includes(input.tone) ? input.tone : current.tone,
        style: input.style && STYLES.includes(input.style) ? input.style : current.style,
        language: codeForCardLanguage(input.language, saved.localeCode),
        personalNote: input.personalNote ?? current.personalNote
      }));
    }
    setHydratedFromDraft(true);
  }, [draft.data, draft.isSuccess, hydratedFromDraft, signedIn]);

  const saveDraft = useMutation({
    mutationFn: (request: SaveDraftStateRequest) => api.saveDraftState(request)
  });

  useEffect(() => {
    if (!signedIn || !hydratedFromDraft || !hasMeaningfulDraftProgress(form)) return;
    if (lastAutosaveSnapshot.current === draftSaveSnapshot) return;
    const timer = setTimeout(() => {
      lastAutosaveSnapshot.current = draftSaveSnapshot;
      saveDraft.mutate(draftSaveRequest, {
        onError: () => {
          lastAutosaveSnapshot.current = "";
        }
      });
    }, DRAFT_AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [draftSaveRequest, draftSaveSnapshot, form, hydratedFromDraft, saveDraft, signedIn]);

  const generate = useMutation({
    mutationFn: async (snapshot: CardForm) =>
      resolveGeneratedCard(await api.generateCard(buildCardGenerateRequest(snapshot)), api),
    onSuccess: (response) => {
      setResult(response);
      toast.show("Draft ready to review", "success");
    },
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  function submit() {
    const errors: FieldErrors<CardField> = {
      sender: requireText(form.sender, "Your name", 100),
      recipient: requireText(form.recipient, "Recipient name", 100),
      relationship: requireText(form.relationship, "Relationship", 100),
      personalNote: optionalText(form.personalNote, "Personal note", 500)
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    if (!signedIn) {
      toast.show("Sign in to generate and save this card.", "error");
      return;
    }
    setResult(null);
    const request = buildDraftSaveRequest(form);
    lastAutosaveSnapshot.current = JSON.stringify(request);
    saveDraft.mutate(request, {
      onError: () => {
        lastAutosaveSnapshot.current = "";
      }
    });
    generate.mutate(form);
  }

  return {
    form,
    setField,
    fieldErrors,
    result,
    generate,
    saveDraft,
    submit,
    requiresSignIn: !signedIn
  };
}

function buildDraftSaveRequest(form: CardForm): SaveDraftStateRequest {
  return {
    draftInput: {
      sender: form.sender.trim(),
      recipient: form.recipient.trim(),
      relationship: form.relationship.trim(),
      occasion: form.occasion,
      tone: form.tone,
      style: form.style,
      language: cardLanguageForCode(form.language),
      personalNote: form.personalNote.trim()
    },
    status: "in-progress",
    localeCode: form.language
  };
}

function buildCardGenerateRequest(form: CardForm): CardGenerateRequest {
  return {
    sender: form.sender.trim(),
    recipient: form.recipient.trim(),
    relationship: form.relationship.trim(),
    occasion: form.occasion,
    tone: form.tone,
    style: form.style,
    language: cardLanguageForCode(form.language),
    personal_note: form.personalNote.trim() || undefined
  };
}

function hasMeaningfulDraftProgress(form: CardForm): boolean {
  return [form.sender, form.recipient, form.relationship, form.personalNote].some(
    (value) => value.trim().length > 0
  );
}

async function resolveGeneratedCard(
  initial: CardGenerateResult,
  api: { getAiJobStatus(jobId: string): Promise<AiJobStatusResponse> }
): Promise<CardGenerateResponse> {
  if (isCardGenerateResponse(initial)) return initial;
  if (!isQueuedAiJob(initial))
    throw new Error("AI card generation returned an unexpected response.");

  const jobId = String(initial.job_id ?? "").trim();
  if (!jobId) throw new Error("AI card generation queued without a job id.");

  let retryAfterSeconds = readRetryAfterSeconds(initial.retry_after_seconds);
  for (let attempt = 0; attempt < AI_JOB_MAX_POLLS; attempt += 1) {
    if (attempt > 0) {
      await wait(Math.min(10, retryAfterSeconds) * 1000);
    }
    const status = await api.getAiJobStatus(jobId);
    const completed = readCompletedCard(status);
    if (completed) return completed;
    if (status.queue_status === "dead_lettered") {
      throw new Error(status.last_error || "AI card generation failed after retries.");
    }
    retryAfterSeconds = readRetryAfterSeconds(status.retry_after_seconds);
  }

  throw new Error("AI card generation is still queued. Please try again in a moment.");
}

function isQueuedAiJob(value: CardGenerateResult): value is QueuedAiJobResponse {
  const candidate = value as Partial<QueuedAiJobResponse>;
  return (
    candidate.status === "queued" ||
    candidate.queue_status === "queued" ||
    Boolean(candidate.job_id)
  );
}

function readCompletedCard(status: AiJobStatusResponse): CardGenerateResponse | null {
  if (status.result_available !== true) return null;
  const candidate = status.result?.payload ?? status.result;
  return isCardGenerateResponse(candidate) ? withDefaultService(candidate) : null;
}

function isCardGenerateResponse(value: unknown): value is CardGenerateResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<CardGenerateResponse>;
  return Array.isArray(candidate.card_copy?.panels);
}

function withDefaultService(value: CardGenerateResponse): CardGenerateResponse {
  return { ...value, service: value.service || "customcard-api" };
}

function readRetryAfterSeconds(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.max(1, Math.round(parsed))
    : AI_JOB_FALLBACK_RETRY_SECONDS;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
