import { useNavigation } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, Text, View } from "react-native";

import { AppButton, Card, FormField, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import { useAppSession } from "../../lib/auth/AuthProvider";
import type { MemoryReviewRequest, MemoryReviewResponse } from "../../lib/api/types";
import { hasErrors, requireText, type FieldErrors } from "../../forms/validation";
import { spacing, typography } from "../../theme";

type Field = "recipientName" | "text";

/**
 * Relationship memory review. Approving stores the reviewed note for reuse on
 * future cards; forgetting tombstones it so it is never used again.
 */
export function MemoriesScreen() {
  const api = useApi();
  const session = useAppSession();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const toast = useToast();
  const signedIn = session.status === "signedIn";

  const [recipientName, setRecipientName] = useState("");
  const [text, setText] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});
  const [lastResult, setLastResult] = useState<MemoryReviewResponse | null>(null);

  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS),
    enabled: signedIn
  });

  const review = useMutation({
    mutationFn: (body: MemoryReviewRequest) => api.reviewMemory(body),
    onSuccess: (response) => {
      setLastResult(response);
      setText("");
      toast.show(response.approved ? "Memory approved" : "Memory forgotten", "success");
      void queryClient.invalidateQueries({ queryKey: ["mobile-bootstrap"] });
    },
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  function run(decision: "approve" | "forget") {
    setLastResult(null);
    review.mutate({ recipientName: recipientName.trim(), text: text.trim(), decision });
  }

  function submit(decision: "approve" | "forget") {
    const errors: FieldErrors<Field> = {
      recipientName: requireText(recipientName, "Recipient name", 100),
      text: requireText(text, "Memory note", 500)
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    if (decision === "forget") {
      // Forgetting is irreversible — confirm before tombstoning the note.
      Alert.alert(
        "Forget this memory?",
        `"${text.trim()}" will never be used on a card. This can't be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Forget", style: "destructive", onPress: () => run("forget") }
        ]
      );
      return;
    }
    run("approve");
  }

  if (!signedIn) {
    return (
      <Screen>
        <SectionHeading
          title="People"
          detail="Save birthdays, preferences, and reviewed memories once you have an account."
        />
        <Card>
          <Text style={typography.heading}>No saved people yet</Text>
          <Text style={typography.body}>
            Start a card as a guest, then sign in when you're ready to save people and reuse
            approved notes.
          </Text>
          <AppButton label="Start a card" onPress={() => navigation.navigate("Studio")} />
          <AppButton
            label="Sign in to save people"
            variant="secondary"
            onPress={() => navigation.navigate("SignIn")}
          />
        </Card>
      </Screen>
    );
  }

  const pendingItems =
    bootstrap.data?.memoryReviewItems.filter((item) => item.customerVisible) ?? [];

  return (
    <Screen>
      <SectionHeading
        title="Memory review"
        detail="Only notes you approve here can appear on cards. Forgetting is permanent."
      />

      {pendingItems.length > 0 ? (
        <>
          {pendingItems.map((item) => (
            <Card key={item.id}>
              <View style={styles.rowBetween}>
                <Text style={styles.cardTitle}>{item.recipientLabel}</Text>
                <Pill label={item.usage} />
              </View>
              <Text style={typography.body}>{item.memoryLabel}</Text>
              <AppButton
                label="Review this note"
                variant="secondary"
                onPress={() => {
                  setRecipientName(item.recipientLabel);
                  setText(item.memoryLabel);
                }}
              />
            </Card>
          ))}
        </>
      ) : null}

      <Card>
        <Text style={typography.heading}>Review a memory note</Text>
        <FormField
          label="Recipient"
          value={recipientName}
          onChangeText={setRecipientName}
          placeholder="Maya"
          autoCapitalize="words"
          error={fieldErrors.recipientName}
          testID="memory-recipient"
        />
        <FormField
          label="Memory note"
          value={text}
          onChangeText={setText}
          placeholder="Loves hiking in autumn"
          multiline
          error={fieldErrors.text}
          testID="memory-text"
        />
        <View style={styles.actionRow}>
          <AppButton
            label="Approve for cards"
            onPress={() => submit("approve")}
            loading={review.isPending}
            style={styles.actionButton}
          />
          <AppButton
            label="Forget"
            variant="danger"
            onPress={() => submit("forget")}
            loading={review.isPending}
            style={styles.actionButton}
            accessibilityHint="Permanently blocks this note from being used on cards"
          />
        </View>
        {review.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(review.error)} />
        ) : null}
        {lastResult ? (
          <InlineNotice
            text={
              lastResult.approved
                ? `Approved. "${lastResult.recipientName}" notes can now appear on cards.`
                : "Forgotten. That note will never be used on a card."
            }
          />
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
  },
  actionRow: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 }
});
