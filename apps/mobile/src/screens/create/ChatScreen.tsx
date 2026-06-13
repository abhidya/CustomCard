import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { AppButton, InlineNotice } from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { RootStackParamList } from "../../navigation/types";
import { colors, minTouchTarget, radius, spacing, typography } from "../../theme";

interface ChatEntry {
  speaker: "you" | "assistant";
  text: string;
}

export function ChatScreen() {
  const api = useApi();
  const route = useRoute<RouteProp<RootStackParamList, "Chat">>();
  const recipientName = route.params?.recipientName;

  const [draft, setDraft] = useState("");
  const [transcript, setTranscript] = useState<ChatEntry[]>([
    {
      speaker: "assistant",
      text: recipientName
        ? `I can help shape a card for ${recipientName}. Ask about wording, memories, artwork, or printing.`
        : "I can help with card wording, approved memories, artwork, and what happens before checkout."
    }
  ]);
  const scrollRef = useRef<ScrollView>(null);

  const send = useMutation({
    mutationFn: (message: string) =>
      api.chatRespond({ customer_message: message, recipient_name: recipientName }),
    onSuccess: (response) => {
      setTranscript((current) => [
        ...current,
        { speaker: "assistant", text: response.assistant_message }
      ]);
    }
  });

  function submit() {
    const message = draft.trim();
    if (!message || send.isPending) return;
    setTranscript((current) => [...current, { speaker: "you", text: message }]);
    setDraft("");
    send.mutate(message);
  }

  return (
    <Screen scroll={false}>
      <ScrollView
        ref={scrollRef}
        style={styles.transcript}
        contentContainerStyle={styles.transcriptContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {transcript.map((entry, index) => (
          <View
            key={`${entry.speaker}-${index}`}
            style={[
              styles.bubble,
              entry.speaker === "you" ? styles.bubbleYou : styles.bubbleAssistant
            ]}
            accessibilityLabel={`${entry.speaker === "you" ? "You" : "Assistant"}: ${entry.text}`}
          >
            <Text style={styles.bubbleSpeaker}>
              {entry.speaker === "you" ? "You" : "Assistant"}
            </Text>
            <Text style={typography.body}>{entry.text}</Text>
          </View>
        ))}
        {send.isPending ? (
          <View style={[styles.bubble, styles.bubbleAssistant]}>
            <Text style={typography.body}>Thinking…</Text>
          </View>
        ) : null}
        {send.isError ? <InlineNotice tone="warn" text={userMessageForError(send.error)} /> : null}
      </ScrollView>

      <View style={styles.composer}>
        <TextInput
          accessibilityLabel="Message the card assistant"
          style={styles.input}
          value={draft}
          onChangeText={setDraft}
          placeholder="Ask about wording, memories, printing…"
          placeholderTextColor={colors.inkSubtle}
          multiline
          testID="chat-input"
        />
        <AppButton
          label="Send"
          onPress={submit}
          disabled={!draft.trim()}
          loading={send.isPending}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  transcript: { flex: 1 },
  transcriptContent: { gap: spacing.sm, paddingBottom: spacing.md },
  bubble: { borderRadius: radius.md, padding: spacing.md, gap: 2, maxWidth: "88%" },
  bubbleAssistant: { backgroundColor: colors.surfaceMuted, alignSelf: "flex-start" },
  bubbleYou: { backgroundColor: colors.brandSoft, alignSelf: "flex-end" },
  bubbleSpeaker: { ...typography.label, color: colors.brandInkOnSoft, textTransform: "uppercase" },
  composer: { flexDirection: "row", gap: spacing.sm, alignItems: "flex-end" },
  input: {
    flex: 1,
    minHeight: minTouchTarget,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 16,
    color: colors.ink,
    backgroundColor: colors.surface
  }
});
