import { useNavigation } from "@react-navigation/native";
import React from "react";

import { AppButton, Card, FormField, InlineNotice, SectionHeading } from "../../components";
import { ChipPicker } from "../../components/ChipPicker";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { LANGUAGE_CODES, LANGUAGE_LABELS, OCCASIONS, STYLES, TONES } from "./cardOptions";
import { GeneratedCardPreview } from "./GeneratedCardPreview";
import { useCardDraft } from "./useCardDraft";

export function StudioScreen() {
  const navigation = useNavigation();
  const { form, setField, fieldErrors, result, generate, saveDraft, submit } = useCardDraft();

  return (
    <Screen>
      <SectionHeading
        title="Design a card"
        detail="Copy and artwork are drafted for your review — nothing is printed or ordered automatically."
      />

      <Card>
        <FormField
          label="Your name"
          value={form.sender}
          onChangeText={(value) => setField("sender", value)}
          autoCapitalize="words"
          error={fieldErrors.sender}
          testID="studio-sender"
        />
        <FormField
          label="Recipient"
          value={form.recipient}
          onChangeText={(value) => setField("recipient", value)}
          autoCapitalize="words"
          error={fieldErrors.recipient}
          testID="studio-recipient"
        />
        <FormField
          label="Relationship"
          value={form.relationship}
          onChangeText={(value) => setField("relationship", value)}
          placeholder="Best friend, sister, mentor…"
          error={fieldErrors.relationship}
          testID="studio-relationship"
        />
        <ChipPicker
          label="Occasion"
          options={OCCASIONS}
          selected={form.occasion}
          onSelect={(value) => setField("occasion", value)}
        />
        <ChipPicker
          label="Tone"
          options={TONES}
          selected={form.tone}
          onSelect={(value) => setField("tone", value)}
        />
        <ChipPicker
          label="Style"
          options={STYLES}
          selected={form.style}
          onSelect={(value) => setField("style", value)}
        />
        <ChipPicker
          label="Card language"
          options={LANGUAGE_CODES}
          labels={LANGUAGE_LABELS}
          selected={form.language}
          onSelect={(value) => setField("language", value)}
        />
        <FormField
          label="Personal note (optional)"
          value={form.personalNote}
          onChangeText={(value) => setField("personalNote", value)}
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
