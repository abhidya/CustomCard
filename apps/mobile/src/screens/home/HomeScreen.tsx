import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React from "react";
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
import { useApi } from "../../lib/api/ApiProvider";
import { colors, spacing, typography } from "../../theme";

export function HomeScreen() {
  const api = useApi();
  const navigation = useNavigation();

  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS)
  });

  if (bootstrap.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your cards…" />
      </Screen>
    );
  }

  if (bootstrap.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState error={bootstrap.error} onRetry={() => void bootstrap.refetch()} />
      </Screen>
    );
  }

  const data = bootstrap.data;
  const visibleQueue = data.queueItems.filter((item) => item.customerVisible);

  return (
    <Screen refreshing={bootstrap.isRefetching} onRefresh={() => void bootstrap.refetch()}>
      <InlineNotice tone="warn" text={`${data.safetyBanner.label}: ${data.safetyBanner.detail}`} />

      {data.todaySummary.customerVisible ? (
        <Card>
          <Text style={typography.eyebrow}>Today's card</Text>
          <Text style={styles.todayTitle}>
            {data.todaySummary.recipientLabel} · {data.todaySummary.eventLabel}
          </Text>
          <Text style={typography.body}>{data.todaySummary.dueLabel}</Text>
          <View style={styles.row}>
            <Pill label={data.todaySummary.riskBadge} />
            <Pill label={`${data.todaySummary.panelCount} panels`} tone="good" />
          </View>
          <AppButton
            label={`Review ${data.todaySummary.recipientLabel}'s card`}
            onPress={() => navigation.navigate("MainTabs", { screen: "Print" })}
            accessibilityHint="Opens the proof and print workflow"
          />
        </Card>
      ) : null}

      <SectionHeading
        title="Cards to review"
        detail="Upcoming candidates from your imported events."
      />
      {visibleQueue.length === 0 ? (
        <EmptyState
          title="No cards in your queue yet"
          detail="Import an invite or calendar event to get a first card candidate."
        />
      ) : (
        visibleQueue.map((item) => (
          <Card key={item.id}>
            <View style={styles.rowBetween}>
              <Text style={styles.queueTitle}>
                {item.recipientLabel} · {item.eventLabel}
              </Text>
              <Pill label={item.status} />
            </View>
            <Text style={typography.body}>
              Due {formatDue(item.dueIso)} · from {item.source}
            </Text>
            <Text style={typography.body}>Next: {item.nextAction}</Text>
          </Card>
        ))
      )}

      <SectionHeading title="Start with an event" />
      <Card>
        <AppButton label="Import an invite" onPress={() => navigation.navigate("ImportEvent")} />
        <AppButton
          label="Review calendar options"
          variant="secondary"
          onPress={() => navigation.navigate("CalendarConnect")}
        />
      </Card>

      <SectionHeading
        title="Card assistant"
        detail="Ask about events, memories, artwork, and checkout."
      />
      <Card>
        {data.chatTranscript.slice(0, 2).map((message, index) => (
          <View
            key={`${message.speaker}-${index}`}
            style={[
              styles.chatBubble,
              message.speaker === "Customer" ? styles.customerBubble : null
            ]}
          >
            <Text style={styles.chatSpeaker}>{message.speaker}</Text>
            <Text style={typography.body}>{message.text}</Text>
          </View>
        ))}
        <AppButton
          label="Open chat"
          variant="secondary"
          onPress={() => navigation.navigate("Chat")}
        />
      </Card>

      <SectionHeading
        title="Memory review"
        detail="Only approved notes are ever reused on cards."
      />
      <Card>
        {data.memoryReviewItems
          .filter((item) => item.customerVisible)
          .slice(0, 2)
          .map((item) => (
            <Text key={item.id} style={typography.body}>
              {item.recipientLabel}: {item.memoryLabel}
            </Text>
          ))}
        <AppButton
          label="Review memories"
          variant="secondary"
          onPress={() => navigation.navigate("Memories")}
        />
      </Card>
    </Screen>
  );
}

function formatDue(dueIso: string): string {
  const date = new Date(dueIso);
  if (Number.isNaN(date.getTime())) return dueIso;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const styles = StyleSheet.create({
  todayTitle: { ...typography.title, fontSize: 22 },
  queueTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  row: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  },
  chatBubble: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 8,
    padding: spacing.md,
    gap: 2
  },
  customerBubble: { backgroundColor: colors.background },
  chatSpeaker: { ...typography.label, color: colors.brandInkOnSoft, textTransform: "uppercase" }
});
