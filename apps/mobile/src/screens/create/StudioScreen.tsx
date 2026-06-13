import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { CardGenerateRequest, CardGenerateResponse } from "../../lib/api/types";
import { hasErrors, optionalText, requireText, type FieldErrors } from "../../forms/validation";
import { colors, minTouchTarget, radius, spacing, typography } from "../../theme";

const OCCASIONS = ["birthday", "anniversary", "thank you", "congratulations", "thinking of you"];
const TONES = ["warm", "playful", "heartfelt", "formal"];
const STYLES = ["botanical", "minimal", "bold", "classic"];
const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "es-US", label: "Español (US)" },
  { code: "ur-PK", label: "اردو" },
  { code: "ar-EG", label: "العربية" }
];

type Field = "sender" | "recipient" | "relationship" | "personalNote";

export function StudioScreen() {
  const api = useApi();
  const navigation = useNavigation();
  const toast = useToast();

  const [sender, setSender] = useState("");
  const [recipient, setRecipient] = useState("");
  const [relationship, setRelationship] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0] ?? "birthday");
  const [tone, setTone] = useState(TONES[0] ?? "warm");
  const [style, setStyle] = useState(STYLES[0] ?? "botanical");
  const [language, setLanguage] = useState("en-US");
  const [personalNote, setPersonalNote] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [result, setResult] = useState<CardGenerateResponse | null>(null);
  const [hydratedFromDraft, setHydratedFromDraft] = useState(false);

  // Resume the latest server-side draft so the browser/app stays stateless.
  const draft = useQuery({
    queryKey: ["draft-state"],
    queryFn: () => api.getCurrentDraftState()
  });

  useEffect(() => {
    if (hydratedFromDraft || !draft.data?.draftState) return;
    const input = draft.data.draftState.draftInput;
    if (input.sender) setSender(input.sender);
    if (input.recipient) setRecipient(input.recipient);
    if (input.relationship) setRelationship(input.relationship);
    if (input.occasion && OCCASIONS.includes(input.occasion)) setOccasion(input.occasion);
    if (input.tone && TONES.includes(input.tone)) setTone(input.tone);
    if (input.style && STYLES.includes(input.style)) setStyle(input.style);
    if (input.personalNote) setPersonalNote(input.personalNote);
    setHydratedFromDraft(true);
  }, [draft.data, hydratedFromDraft]);

  const saveDraft = useMutation({
    mutationFn: () =>
      api.saveDraftState({
        draftInput: {
          sender: sender.trim(),
          recipient: recipient.trim(),
          relationship: relationship.trim(),
          occasion,
          tone,
          style,
          language,
          personalNote: personalNote.trim()
        },
        status: "in-progress",
        localeCode: language
      })
  });

  const generate = useMutation({
    mutationFn: (body: CardGenerateRequest) => api.generateCard(body),
    onSuccess: (response) => {
      setResult(response);
      toast.show("Draft ready to review", "success");
    },
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  function submit() {
    const errors: FieldErrors<Field> = {
      sender: requireText(sender, "Your name", 100),
      recipient: requireText(recipient, "Recipient name", 100),
      relationship: requireText(relationship, "Relationship", 100),
      personalNote: optionalText(personalNote, "Personal note", 500)
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    setResult(null);
    // Persist the draft server-side, then generate; draft failures should not
    // block generation.
    saveDraft.mutate();
    generate.mutate({
      sender: sender.trim(),
      recipient: recipient.trim(),
      relationship: relationship.trim(),
      occasion,
      tone,
      style,
      language,
      personal_note: personalNote.trim() || undefined
    });
  }

  return (
    <Screen>
      <SectionHeading
        title="Design a card"
        detail="Copy and artwork are drafted for your review — nothing is printed or ordered automatically."
      />

      <Card>
        <FormField
          label="Your name"
          value={sender}
          onChangeText={setSender}
          autoCapitalize="words"
          error={fieldErrors.sender}
          testID="studio-sender"
        />
        <FormField
          label="Recipient"
          value={recipient}
          onChangeText={setRecipient}
          autoCapitalize="words"
          error={fieldErrors.recipient}
          testID="studio-recipient"
        />
        <FormField
          label="Relationship"
          value={relationship}
          onChangeText={setRelationship}
          placeholder="Best friend, sister, mentor…"
          error={fieldErrors.relationship}
          testID="studio-relationship"
        />
        <ChipPicker
          label="Occasion"
          options={OCCASIONS}
          selected={occasion}
          onSelect={setOccasion}
        />
        <ChipPicker label="Tone" options={TONES} selected={tone} onSelect={setTone} />
        <ChipPicker label="Style" options={STYLES} selected={style} onSelect={setStyle} />
        <ChipPicker
          label="Card language"
          options={LANGUAGES.map((entry) => entry.code)}
          labels={Object.fromEntries(LANGUAGES.map((entry) => [entry.code, entry.label]))}
          selected={language}
          onSelect={setLanguage}
        />
        <FormField
          label="Personal note (optional)"
          value={personalNote}
          onChangeText={setPersonalNote}
          placeholder="Something only you two would know"
          multiline
          error={fieldErrors.personalNote}
          testID="studio-note"
        />
        <AppButton label="Draft my card" onPress={submit} loading={generate.isPending} />
        {generate.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(generate.error)} />
        ) : null}
        {saveDraft.isError ? (
          <InlineNotice tone="warn" text="Draft autosave failed — your card was still generated." />
        ) : null}
      </Card>

      {result ? (
        <GeneratedCardPreview
          result={result}
          onContinue={() => navigation.navigate("MainTabs", { screen: "Print" })}
        />
      ) : null}
    </Screen>
  );
}

function GeneratedCardPreview({
  result,
  onContinue
}: {
  result: CardGenerateResponse;
  onContinue: () => void;
}) {
  const theme = result.card_copy.theme_guide;
  return (
    <>
      <SectionHeading title="Your draft card" detail={`Theme: ${theme.theme_title}`} />
      <View style={previewStyles.paletteRow}>
        {theme.palette.map((swatch) => (
          <Pill key={swatch} label={swatch} />
        ))}
      </View>
      {result.card_copy.panels.map((panel) => (
        <Card key={panel.id}>
          <Text style={typography.eyebrow}>{panelLabel(panel.id)}</Text>
          {panel.headline ? <Text style={previewStyles.headline}>{panel.headline}</Text> : null}
          {panel.body ? <Text style={typography.body}>{panel.body}</Text> : null}
          {panel.art_direction ? (
            <Text style={previewStyles.artNote}>Artwork: {panel.art_direction}</Text>
          ) : null}
        </Card>
      ))}
      {result.card_copy.memory_citations.length > 0 ? (
        <InlineNotice
          text={`Uses approved memories: ${result.card_copy.memory_citations.join("; ")}`}
        />
      ) : null}
      <InlineNotice text="Review every panel. Printing unlocks only after you approve the proof." />
      <AppButton label="Continue to proof & print" onPress={onContinue} />
    </>
  );
}

function panelLabel(id: string): string {
  const labels: Record<string, string> = {
    front: "Front",
    "inside-left": "Inside left",
    "inside-right": "Inside right",
    back: "Back"
  };
  return labels[id] ?? id;
}

function ChipPicker({
  label,
  options,
  labels,
  selected,
  onSelect
}: {
  label: string;
  options: string[];
  labels?: Record<string, string>;
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <View style={chipStyles.container}>
      <Text style={chipStyles.label}>{label}</Text>
      <View style={chipStyles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map((option) => {
          const active = option === selected;
          return (
            <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityLabel={labels?.[option] ?? option}
              accessibilityState={{ selected: active }}
              onPress={() => onSelect(option)}
              style={[chipStyles.chip, active && chipStyles.chipActive]}
            >
              <Text style={[chipStyles.chipText, active && chipStyles.chipTextActive]}>
                {labels?.[option] ?? option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const previewStyles = StyleSheet.create({
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  headline: { ...typography.heading, fontSize: 20 },
  artNote: { ...typography.body, fontStyle: "italic", fontSize: 13 }
});

const chipStyles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: { ...typography.label, color: colors.ink },
  row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  chip: {
    minHeight: minTouchTarget,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface
  },
  chipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  chipText: { fontSize: 14, fontWeight: "700", color: colors.inkMuted },
  chipTextActive: { color: colors.textOnBrand }
});
