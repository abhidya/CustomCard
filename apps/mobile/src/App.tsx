import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { mobileRenderSnapshot, type MobileRenderRow, type MobileRenderSection } from "./customerExperience";

export default function App() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{mobileRenderSnapshot.hero.eyebrow}</Text>
          <Text style={styles.title}>{mobileRenderSnapshot.hero.title}</Text>
          <Text style={styles.subtitle}>{mobileRenderSnapshot.hero.subtitle}</Text>
          <View style={styles.heroAction}>
            <View style={styles.compactCopy}>
              <Text style={styles.compactTitle}>{mobileRenderSnapshot.hero.primaryAction.label}</Text>
              <Text style={styles.cardCopy}>{mobileRenderSnapshot.hero.primaryAction.detail}</Text>
            </View>
            <Text style={styles.modePill}>{mobileRenderSnapshot.hero.primaryAction.modeLabel}</Text>
          </View>
        </View>

        <View style={styles.statusBand}>
          <Text style={styles.statusLabel}>{mobileRenderSnapshot.safetyBand.label}</Text>
          <Text style={styles.statusCopy}>{mobileRenderSnapshot.safetyBand.detail}</Text>
          <View style={styles.summaryRow}>
            {mobileRenderSnapshot.safetyBand.metrics.map((metric) => (
              <View key={metric.label} style={styles.summaryItem}>
                <Text style={styles.summaryValue}>{metric.value}</Text>
                <Text style={styles.summaryLabel}>{metric.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {mobileRenderSnapshot.sections.map((section) =>
          section.id === "next-action" ? <NextActionSection key={section.id} section={section} /> : <StandardSection key={section.id} section={section} />
        )}

        <View style={styles.group}>
          {mobileRenderSnapshot.footerSafetyMessages.map((message) => (
            <Text key={message} style={styles.smallMeta}>
              {message}
            </Text>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function NextActionSection({ section }: { section: MobileRenderSection }) {
  const row = section.rows[0];

  return (
    <View style={styles.todayCard}>
      <View style={styles.cardTop}>
        <Text style={styles.groupEyebrow}>{section.title}</Text>
        <Text style={styles.warningPill}>{row.modeLabel}</Text>
      </View>
      <Text style={styles.todayTitle}>{row.title}</Text>
      <Text style={styles.todayMeta}>{row.detail}</Text>
    </View>
  );
}

function StandardSection({ section }: { section: MobileRenderSection }) {
  const sectionStyle = section.id === "card-assistant" ? [styles.group, styles.chatGroup] : styles.group;

  return (
    <View style={sectionStyle}>
      <Text style={styles.groupTitle}>{section.title}</Text>
      {section.rows.map((row) => (
        <SectionRow key={`${section.id}-${row.title}-${row.modeLabel}`} row={row} chat={section.id === "card-assistant"} />
      ))}
    </View>
  );
}

function SectionRow({ row, chat }: { row: MobileRenderRow; chat?: boolean }) {
  if (chat) {
    return (
      <View style={[styles.chatBubble, row.modeLabel === "Customer" ? styles.customerBubble : styles.assistantBubble]}>
        <Text style={styles.chatSpeaker}>{row.title}</Text>
        <Text style={styles.chatCopy}>{row.detail}</Text>
      </View>
    );
  }

  return (
    <View style={styles.compactRow}>
      <View style={styles.compactCopy}>
        <Text style={styles.compactTitle}>{row.title}</Text>
        <Text style={styles.cardCopy}>{row.detail}</Text>
      </View>
      <Text style={styles.modePill}>{row.modeLabel}</Text>
    </View>
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
  heroAction: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff"
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
  group: {
    gap: 10,
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#ffffff",
    borderColor: "#d5dee0",
    borderWidth: 1
  },
  chatGroup: {
    backgroundColor: "#fbfcfc"
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
    fontWeight: "900"
  },
  smallMeta: {
    color: "#5d6c72",
    fontSize: 12,
    lineHeight: 18
  }
});
