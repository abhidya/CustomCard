import { useNavigation } from "@react-navigation/native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { ImportPreviewRequest, ImportPreviewResponse } from "../../lib/api/types";
import {
  firstError,
  hasErrors,
  requireFutureOrTodayDate,
  requireText,
  type FieldErrors
} from "../../forms/validation";
import { spacing, typography } from "../../theme";

type ManualField = "title" | "recipientName" | "startsAt";

export function ImportEventScreen() {
  const api = useApi();
  const navigation = useNavigation();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<"paste" | "manual">("paste");
  const [rawText, setRawText] = useState("");
  const [title, setTitle] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ManualField | "rawText">>({});
  const [result, setResult] = useState<ImportPreviewResponse | null>(null);

  const importMutation = useMutation({
    mutationFn: (body: ImportPreviewRequest) => api.importPreview(body),
    onSuccess: (response) => {
      setResult(response);
      void queryClient.invalidateQueries({ queryKey: ["connections"] });
      void queryClient.invalidateQueries({ queryKey: ["mobile-bootstrap"] });
    }
  });

  function submit() {
    setResult(null);
    if (mode === "paste") {
      const errors: FieldErrors<"rawText"> = {
        rawText: requireText(rawText, "Invite or ICS text", 20_000)
      };
      setFieldErrors(errors);
      if (hasErrors(errors)) return;
      const looksLikeIcs = /BEGIN:VCALENDAR/i.test(rawText);
      importMutation.mutate(
        looksLikeIcs
          ? { sourceKind: "ics-text", rawIcsText: rawText }
          : { sourceKind: "invite-text", rawInviteText: rawText }
      );
      return;
    }

    const errors: FieldErrors<ManualField> = {
      title: requireText(title, "Event title"),
      recipientName: requireText(recipientName, "Recipient name", 100),
      startsAt: requireFutureOrTodayDate(startsAt, "Event date")
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    importMutation.mutate({
      sourceKind: "manual-paste",
      metadataOnlyPayload: {
        title: title.trim(),
        recipientName: recipientName.trim(),
        startsAt: new Date(startsAt.trim()).toISOString()
      }
    });
  }

  return (
    <Screen>
      <SectionHeading
        title="Import an event"
        detail="Only event metadata is kept. Raw invite text is parsed and discarded — never stored."
      />

      <View style={styles.modeRow}>
        <AppButton
          label="Paste invite / ICS"
          variant={mode === "paste" ? "primary" : "secondary"}
          onPress={() => setMode("paste")}
          style={styles.modeButton}
        />
        <AppButton
          label="Type details"
          variant={mode === "manual" ? "primary" : "secondary"}
          onPress={() => setMode("manual")}
          style={styles.modeButton}
        />
      </View>

      <Card>
        {mode === "paste" ? (
          <FormField
            label="Invite or calendar (ICS) text"
            value={rawText}
            onChangeText={setRawText}
            placeholder="Paste the invitation email or exported .ics contents"
            multiline
            error={fieldErrors.rawText}
            testID="import-raw-text"
          />
        ) : (
          <>
            <FormField
              label="Event title"
              value={title}
              onChangeText={setTitle}
              placeholder="Maya's birthday dinner"
              error={fieldErrors.title}
              testID="import-title"
            />
            <FormField
              label="Who is the card for?"
              value={recipientName}
              onChangeText={setRecipientName}
              placeholder="Maya"
              autoCapitalize="words"
              error={fieldErrors.recipientName}
              testID="import-recipient"
            />
            <FormField
              label="Event date"
              value={startsAt}
              onChangeText={setStartsAt}
              placeholder="2026-07-01"
              autoCapitalize="none"
              error={fieldErrors.startsAt}
              testID="import-date"
            />
          </>
        )}
        <AppButton
          label="Preview card opportunities"
          onPress={submit}
          loading={importMutation.isPending}
        />
        {importMutation.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(importMutation.error)} />
        ) : null}
        {firstError(fieldErrors) && !importMutation.isPending ? null : null}
      </Card>

      {result ? (
        <>
          <SectionHeading title="Found opportunities" />
          {result.opportunities.length === 0 ? (
            <InlineNotice text="No card opportunities were found in that text. Try adding a recipient and a date." />
          ) : (
            result.opportunities.map((opportunity) => (
              <Card key={opportunity.opportunityId}>
                <View style={styles.rowBetween}>
                  <Text style={styles.cardTitle}>{opportunity.title}</Text>
                  <Pill label={opportunity.decision} tone="good" />
                </View>
                <Text style={typography.body}>
                  For {opportunity.recipientName} ·{" "}
                  {new Date(opportunity.startsAt).toLocaleDateString(undefined, {
                    month: "long",
                    day: "numeric"
                  })}
                </Text>
              </Card>
            ))
          )}
          {result.warnings.map((warning) => (
            <InlineNotice key={warning} tone="warn" text={warning} />
          ))}
          <AppButton label="Done" variant="secondary" onPress={() => navigation.goBack()} />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  modeRow: { flexDirection: "row", gap: spacing.sm },
  modeButton: { flex: 1 },
  cardTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  }
});
