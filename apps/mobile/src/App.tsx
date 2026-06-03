import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  mobileChatTranscript,
  mobileExperienceSections,
  mobileHandoffSteps,
  mobileLocaleOptions,
  mobileRenderChoices,
  mobileSafetyBanner,
  summarizeMobileExperience
} from "./customerExperience";

const experienceSummary = summarizeMobileExperience();

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>Customer mobile panel</Text>
          <Text style={styles.title}>CustomCard</Text>
          <Text style={styles.subtitle}>
            Event-aware card creation, memory review, local chat, SVG render, and manual pickup handoff share the web
            service contracts.
          </Text>
        </View>

        <View style={styles.statusBand}>
          <Text style={styles.statusLabel}>{mobileSafetyBanner.label}</Text>
          <Text style={styles.statusCopy}>{mobileSafetyBanner.detail}</Text>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{experienceSummary.customerVisibleSections}</Text>
              <Text style={styles.summaryLabel}>sections</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{experienceSummary.localChatMessages}</Text>
              <Text style={styles.summaryLabel}>local replies</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{experienceSummary.freeRenderChoices}</Text>
              <Text style={styles.summaryLabel}>free renderer</Text>
            </View>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryValue}>{experienceSummary.localeOptions}</Text>
              <Text style={styles.summaryLabel}>locales</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionList}>
          {mobileExperienceSections.map((section) => (
            <View key={section.title} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.pill}>{section.status}</Text>
              </View>
              <Text style={styles.cardCopy}>{section.detail}</Text>
            </View>
          ))}
        </View>

        <View style={styles.group}>
          <Text style={styles.groupTitle}>Text interface</Text>
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
          <Text style={styles.groupTitle}>Render choices</Text>
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
          <Text style={styles.groupTitle}>Manual handoff</Text>
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
          <Text style={styles.groupTitle}>Locale readiness</Text>
          {mobileLocaleOptions.map((locale) => (
            <View key={locale.locale} style={styles.compactRow}>
              <View style={styles.compactCopy}>
                <Text style={styles.compactTitle}>{locale.label}</Text>
                <Text style={styles.cardCopy}>{locale.cardLanguage} card copy</Text>
              </View>
              <Text style={styles.modePill}>{locale.copyReviewRequired ? "Review" : locale.writingDirection}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
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
  sectionList: {
    gap: 10
  },
  card: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#d5dee0",
    borderWidth: 1
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10
  },
  cardTitle: {
    flex: 1,
    color: "#172124",
    fontSize: 17,
    fontWeight: "900"
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    color: "#123a32",
    backgroundColor: "#cde9df",
    fontSize: 12,
    fontWeight: "900"
  },
  cardCopy: {
    marginTop: 8,
    color: "#4d5c61",
    lineHeight: 21
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
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    overflow: "hidden",
    color: "#123a32",
    backgroundColor: "#cde9df",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "capitalize"
  }
});
