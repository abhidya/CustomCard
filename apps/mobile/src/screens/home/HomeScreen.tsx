import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { Image, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  Card,
  EmptyState,
  ErrorState,
  InlineNotice,
  Pill,
  SectionHeading
} from "../../components";
import { Screen } from "../../components/Screen";
import { SkeletonCard } from "../../components/Skeleton";
import { useApi } from "../../lib/api/ApiProvider";
import { useAppSession } from "../../lib/auth/AuthProvider";
import { formatShortDate, humanizeStatus } from "../../lib/format";
import { colors, elevation, spacing, typography } from "../../theme";

const landingHeroProduct = require("../../../../../public/generated/landing-hero-product.webp");

export function HomeScreen() {
  const api = useApi();
  const navigation = useNavigation();
  const session = useAppSession();
  const accountReady = session.status === "signedIn";

  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS),
    enabled: accountReady
  });

  if (!accountReady) {
    return <GuestHome />;
  }

  if (bootstrap.isPending) {
    return (
      <Screen scroll={false}>
        <View
          accessibilityRole="progressbar"
          accessibilityLabel="Loading your cards…"
          style={styles.skeletonGroup}
        >
          <SkeletonCard lines={2} />
          <SkeletonCard lines={3} />
          <SkeletonCard lines={2} />
        </View>
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
          <Pressable
            key={item.id}
            accessibilityRole="button"
            accessibilityLabel={`${item.recipientLabel}, ${item.eventLabel}. ${item.nextAction}`}
            accessibilityHint="Opens the proof and print workflow"
            onPress={() => navigation.navigate("MainTabs", { screen: "Print" })}
            style={({ pressed }) => pressed && styles.cardPressed}
          >
            <Card>
              <View style={styles.rowBetween}>
                <Text style={styles.queueTitle}>
                  {item.recipientLabel} · {item.eventLabel}
                </Text>
                <Pill label={humanizeStatus(item.status)} />
              </View>
              <Text style={typography.body}>
                Due {formatShortDate(item.dueIso)} · from {item.source}
              </Text>
              <Text style={typography.body}>Next: {item.nextAction}</Text>
            </Card>
          </Pressable>
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

function GuestHome() {
  const navigation = useNavigation();

  return (
    <Screen>
      <View style={styles.landingHero}>
        <Image
          accessibilityLabel="Folded greeting card beside an envelope"
          source={landingHeroProduct}
          resizeMode="cover"
          style={styles.heroImage}
        />
        <Text style={styles.heroCaption}>5 x 7 folded card · print-ready at 300 DPI</Text>
      </View>

      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLine} />
        <Text style={styles.landingEyebrow}>Thoughtful cards, without the blank page.</Text>
      </View>

      <Text style={styles.landingTitle}>Make the card you meant to send.</Text>
      <Text style={styles.landingCopy}>
        Start with a name, occasion, messy note, invite, or calendar event. CustomCard helps turn it
        into a personal 5 x 7 card you can edit, review, and print through your preferred print
        shop.
      </Text>

      <View style={styles.landingActions}>
        <AppButton label="Make my card now" onPress={() => navigation.navigate("Studio")} />
        <AppButton
          label="Start from invite or calendar"
          variant="secondary"
          onPress={() => navigation.navigate("ImportEvent")}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="See example cards"
          onPress={() => navigation.navigate("MainTabs", { screen: "Print" })}
          style={({ pressed }) => [styles.exampleLink, pressed && styles.cardPressed]}
        >
          <Text style={styles.exampleLinkText}>See example cards</Text>
        </Pressable>
      </View>

      <Text style={styles.safetyCopy}>
        No auto-sending. No surprise checkout. You approve every word before printing.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  landingHero: {
    gap: spacing.xs,
    marginTop: spacing.md,
    ...elevation.card
  },
  heroImage: {
    width: "100%",
    height: 188,
    borderRadius: 12,
    backgroundColor: colors.surfaceMuted
  },
  heroCaption: {
    textAlign: "center",
    color: colors.inkFaint,
    fontSize: 13
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.md
  },
  eyebrowLine: {
    width: 20,
    height: 1,
    backgroundColor: colors.brand
  },
  landingEyebrow: {
    ...typography.eyebrow,
    flex: 1,
    color: colors.brand,
    letterSpacing: 1.2
  },
  landingTitle: {
    ...typography.title,
    fontSize: 36,
    lineHeight: 41,
    color: colors.ink
  },
  landingCopy: {
    ...typography.body,
    fontSize: 17,
    lineHeight: 25
  },
  landingActions: {
    gap: spacing.md,
    marginTop: spacing.md
  },
  exampleLink: {
    alignSelf: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  exampleLinkText: {
    fontSize: 16,
    fontWeight: "800",
    color: colors.inkMuted,
    textDecorationLine: "underline"
  },
  safetyCopy: {
    ...typography.body,
    textAlign: "center",
    marginTop: spacing.sm
  },
  todayTitle: { ...typography.title, fontSize: 22 },
  queueTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  cardPressed: { opacity: 0.85 },
  skeletonGroup: { gap: spacing.md },
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
