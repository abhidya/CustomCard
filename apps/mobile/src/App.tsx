import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  mobileAccountOptions,
  mobileApprovalActions,
  mobileCardQueueItems,
  mobileChatTranscript,
  mobileFulfillmentRecommendations,
  mobileHandoffSteps,
  mobileImportActions,
  mobileMemoryReviewItems,
  mobilePrintProofChecks,
  mobileRenderChoices,
  mobileSafetyBanner,
  mobileSyncState,
  mobileTodaySummary
} from "./customerExperience";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Customer mobile panel</Text>
          <Text style={styles.title}>CustomCard</Text>
          <Text style={styles.subtitle}>
            Create a local workspace, paste an invite or ICS event, approve a card, and prepare manual handoff.
          </Text>
        </View>

        <View style={styles.statusBand}>
          <Text style={styles.statusLabel}>{mobileSafetyBanner.label}</Text>
          <Text style={styles.statusCopy}>{mobileSafetyBanner.detail}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{mobileCardQueueItems.length}</Text>
              <Text style={styles.summaryLabel}>cards</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{mobileTodaySummary.panelCount}</Text>
              <Text style={styles.summaryLabel}>panels</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{mobileApprovalActions.length}</Text>
              <Text style={styles.summaryLabel}>actions</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>Off</Text>
              <Text style={styles.summaryLabel}>orders</Text>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Sign in and import</Text>
          {mobileAccountOptions.map((option) => (
            <View key={option.provider} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{option.label}</Text>
                <Text style={styles.cardCopy}>{option.detail}</Text>
              </View>
              <Text style={styles.modePill}>{option.provider === "Apple" ? "Manual" : "OAuth off"}</Text>
            </View>
          ))}
          {mobileImportActions.map((action) => (
            <View key={action.kind} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{action.label}</Text>
                <Text style={styles.cardCopy}>{action.detail}</Text>
              </View>
              <Text style={styles.modePill}>{action.sourceMode === "local-paste" ? "Local" : "Future"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.todayCard}>
          <View style={styles.cardTop}>
            <Text style={styles.groupEyebrow}>Next action</Text>
            <Text style={styles.warningPill}>{mobileTodaySummary.riskBadge}</Text>
          </View>
          <Text style={styles.todayTitle}>{mobileTodaySummary.recipientLabel}</Text>
          <Text style={styles.todayMeta}>
            {mobileTodaySummary.eventLabel} - {mobileTodaySummary.dueLabel}
          </Text>
          <View style={styles.metricRow}>
            <View style={styles.miniMetric}>
              <Text style={styles.miniMetricValue}>{mobileTodaySummary.panelCount}</Text>
              <Text style={styles.miniMetricLabel}>panels</Text>
            </View>
            <View style={styles.miniMetric}>
              <Text style={styles.miniMetricValue}>{mobileTodaySummary.offlineReady ? "On" : "Off"}</Text>
              <Text style={styles.miniMetricLabel}>offline queue</Text>
            </View>
            <View style={styles.miniMetric}>
              <Text style={styles.miniMetricValue}>{mobileTodaySummary.realOrdersEnabled ? "On" : "Off"}</Text>
              <Text style={styles.miniMetricLabel}>real orders</Text>
            </View>
          </View>
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Card queue</Text>
          {mobileCardQueueItems.map((item) => (
            <View key={item.id} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{item.recipientLabel}</Text>
                <Text style={styles.cardCopy}>
                  {item.eventLabel} due {item.dueIso.slice(0, 10)} from {item.source}; {item.panelCount} panels ready.
                </Text>
              </View>
              <Text style={styles.modePill}>{queueStatusLabel(item.status)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Memory review</Text>
          {mobileMemoryReviewItems.map((item) => (
            <View key={item.id} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{item.recipientLabel}</Text>
                <Text style={styles.cardCopy}>{item.memoryLabel}</Text>
              </View>
              <Text style={styles.modePill}>{memoryUsageLabel(item.usage)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Approval controls</Text>
          {mobileApprovalActions.map((action) => (
            <View key={action.kind} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{action.label}</Text>
                <Text style={styles.cardCopy}>{action.detail}</Text>
              </View>
              <Text style={styles.modePill}>{action.networkMode === "local-only" ? "Local" : "Queued"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Card assistant</Text>
          {mobileChatTranscript.map((message, index) => (
            <View
              key={`${message.speaker}-${index}`}
              style={[styles.chatBubble, message.speaker === "customer" ? styles.customerBubble : styles.assistantBubble]}
            >
              <Text style={styles.chatSpeaker}>{message.speaker}</Text>
              <Text style={styles.chatCopy}>{message.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Card proof path</Text>
          {mobileRenderChoices.map((choice) => (
            <View key={choice.label} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{choice.label}</Text>
                <Text style={styles.cardCopy}>{choice.detail}</Text>
              </View>
              <Text style={styles.modePill}>{choice.mode === "free-local" ? "Free" : "Gated"}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Best available options</Text>
          {mobileFulfillmentRecommendations.map((recommendation) => (
            <View key={recommendation.kind} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{recommendation.label}</Text>
                <Text style={styles.cardCopy}>
                  ${(recommendation.totalCents / 100).toFixed(2)} at {recommendation.vendorName};{" "}
                  {recommendation.etaLabel}. {recommendation.confirmationCopy}
                </Text>
              </View>
              <Text style={styles.modePill}>Confirm</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Print proof</Text>
          {mobilePrintProofChecks.map((check) => (
            <View key={check.id} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{check.label}</Text>
                <Text style={styles.cardCopy}>{check.detail}</Text>
              </View>
              <Text style={styles.modePill}>{proofStatusLabel(check.passed)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Checkout confirmation</Text>
          {mobileHandoffSteps.map((step) => (
            <View key={step.label} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{step.label}</Text>
                <Text style={styles.cardCopy}>{step.detail}</Text>
              </View>
              <Text style={styles.modePill}>{step.realOrderState}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Offline sync</Text>
          <View style={styles.compactRow}>
            <View style={styles.compactCopy}>
              <Text style={styles.compactTitle}>Customer session</Text>
              <Text style={styles.cardCopy}>
                Customer actions stay queued offline and replay safely when your session is available.
              </Text>
            </View>
            <Text style={styles.modePill}>{mobileSyncState.offlineQueueEnabled ? "Queued" : "Off"}</Text>
          </View>
          <Text style={styles.smallMeta}>
            No automatic order, charge, or raw memory upload can run from this mobile shell.
          </Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

function queueStatusLabel(status: string): string {
  if (status === "needs-approval") return "Review";
  if (status === "ready-for-handoff") return "Handoff";
  return "Approved";
}

function memoryUsageLabel(usage: string): string {
  return usage === "approved" ? "Approved" : "Review";
}

function proofStatusLabel(passed: boolean): string {
  return passed ? "Passed" : "Check";
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f6f7"
  },
  content: {
    padding: 18,
    gap: 14
  },
  header: {
    gap: 8,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#172927"
  },
  eyebrow: {
    color: "#cde9df",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  title: {
    color: "#ffffff",
    fontSize: 34,
    fontWeight: "900"
  },
  subtitle: {
    color: "#d8e7e4",
    fontSize: 15,
    lineHeight: 22
  },
  statusBand: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#fff1ee"
  },
  statusLabel: {
    color: "#6d251b",
    fontSize: 16,
    fontWeight: "900"
  },
  statusCopy: {
    marginTop: 4,
    color: "#7d3a30",
    lineHeight: 21
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12
  },
  summaryItem: {
    flex: 1,
    padding: 10,
    borderRadius: 7,
    backgroundColor: "#ffffff"
  },
  summaryValue: {
    color: "#172124",
    fontSize: 18,
    fontWeight: "900"
  },
  summaryLabel: {
    marginTop: 2,
    color: "#6f5550",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  todayCard: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#c9d7d5",
    borderWidth: 1
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  groupEyebrow: {
    color: "#42615f",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  warningPill: {
    flexShrink: 1,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    color: "#6d251b",
    backgroundColor: "#fff1ee",
    fontSize: 12,
    fontWeight: "900",
    textAlign: "right"
  },
  todayTitle: {
    marginTop: 10,
    color: "#172124",
    fontSize: 25,
    fontWeight: "900"
  },
  todayMeta: {
    marginTop: 4,
    color: "#4d5c61",
    fontSize: 15,
    lineHeight: 21
  },
  cardCopy: {
    marginTop: 8,
    color: "#4d5c61",
    lineHeight: 21
  },
  metricRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 13
  },
  miniMetric: {
    flex: 1,
    padding: 10,
    borderRadius: 7,
    backgroundColor: "#eef5f3"
  },
  miniMetricValue: {
    color: "#172124",
    fontSize: 16,
    fontWeight: "900"
  },
  miniMetricLabel: {
    marginTop: 2,
    color: "#42615f",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase"
  },
  group: {
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#d5dee0",
    borderWidth: 1
  },
  groupTitle: {
    color: "#172124",
    fontSize: 18,
    fontWeight: "900"
  },
  chatBubble: {
    padding: 12,
    borderRadius: 8
  },
  assistantBubble: {
    backgroundColor: "#e8f3f0"
  },
  customerBubble: {
    backgroundColor: "#eef0f4"
  },
  chatSpeaker: {
    color: "#26373b",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  chatCopy: {
    marginTop: 5,
    color: "#30434a",
    lineHeight: 20
  },
  compactRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingTop: 10,
    borderTopColor: "#e5ebed",
    borderTopWidth: 1
  },
  compactCopy: {
    flex: 1
  },
  compactTitle: {
    color: "#172124",
    fontSize: 15,
    fontWeight: "900"
  },
  modePill: {
    maxWidth: 92,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    overflow: "hidden",
    color: "#123a32",
    backgroundColor: "#cde9df",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize"
  },
  smallMeta: {
    color: "#5d6c72",
    fontSize: 12,
    lineHeight: 18
  }
});
