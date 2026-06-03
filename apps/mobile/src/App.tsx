import React from "react";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const customerSections = [
  {
    title: "Card queue",
    detail: "Sara and Ahmed anniversary card is ready from pasted ICS data.",
    status: "Ready"
  },
  {
    title: "Memory review",
    detail: "Only approved relationship notes are eligible for reuse.",
    status: "Approved"
  },
  {
    title: "Customer chat",
    detail: "Local scripted assistant explains event, memory, render, and handoff state.",
    status: "Local"
  },
  {
    title: "Image/render",
    detail: "Browser SVG renderer is the free path; AI image providers require admin credentials.",
    status: "Free"
  },
  {
    title: "Handoff",
    detail: "Manual upload stays active while Walgreens, CVS, and FedEx live orders are blocked.",
    status: "Manual"
  }
];

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
          <Text style={styles.statusLabel}>Real orders disabled</Text>
          <Text style={styles.statusCopy}>Live provider, payment, and vendor APIs stay behind admin gates.</Text>
        </View>

        <View style={styles.sectionList}>
          {customerSections.map((section) => (
            <View key={section.title} style={styles.card}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle}>{section.title}</Text>
                <Text style={styles.pill}>{section.status}</Text>
              </View>
              <Text style={styles.cardCopy}>{section.detail}</Text>
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
  }
});
