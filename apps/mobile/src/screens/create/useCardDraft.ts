import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import { useAppSession } from "../../lib/auth/AuthProvider";
import type { CardGenerateResponse } from "../../lib/api/types";
import { hasErrors, optionalText, requireText, type FieldErrors } from "../../forms/validation";
import { OCCASIONS, STYLES, TONES } from "./cardOptions";

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
    if (hydratedFromDraft || !draft.data?.draftState) return;
    const input = draft.data.draftState.draftInput;
    setForm((current) => ({
      ...current,
      sender: input.sender ?? current.sender,
      recipient: input.recipient ?? current.recipient,
      relationship: input.relationship ?? current.relationship,
      occasion:
        input.occasion && OCCASIONS.includes(input.occasion) ? input.occasion : current.occasion,
      tone: input.tone && TONES.includes(input.tone) ? input.tone : current.tone,
      style: input.style && STYLES.includes(input.style) ? input.style : current.style,
      personalNote: input.personalNote ?? current.personalNote
    }));
    setHydratedFromDraft(true);
  }, [draft.data, hydratedFromDraft]);

  const saveDraft = useMutation({
    mutationFn: () =>
      api.saveDraftState({
        draftInput: {
          sender: form.sender.trim(),
          recipient: form.recipient.trim(),
          relationship: form.relationship.trim(),
          occasion: form.occasion,
          tone: form.tone,
          style: form.style,
          language: form.language,
          personalNote: form.personalNote.trim()
        },
        status: "in-progress",
        localeCode: form.language
      })
  });

  const generate = useMutation({
    mutationFn: () =>
      api.generateCard({
        sender: form.sender.trim(),
        recipient: form.recipient.trim(),
        relationship: form.relationship.trim(),
        occasion: form.occasion,
        tone: form.tone,
        style: form.style,
        language: form.language,
        personal_note: form.personalNote.trim() || undefined
      }),
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
    // Persist the draft, then generate; a draft autosave failure must not block
    // generation.
    saveDraft.mutate();
    generate.mutate();
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
