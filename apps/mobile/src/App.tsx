import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import {
  mobileRenderSnapshot,
  type MobileRenderAction,
  type MobileRenderRow,
  type MobileRenderSection
} from "./customerExperience";
import { resolveAppConfig, ConfigError } from "./config/env";
import { ApiProvider } from "./lib/api/ApiProvider";
import { AuthProvider } from "./lib/auth/AuthProvider";
import { createAppQueryClient } from "./lib/query/queryClient";
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  const [queryClient] = useState(createAppQueryClient);

  let configError: string | null = null;
  try {
    resolveAppConfig();
  } catch (error) {
    configError = error instanceof ConfigError ? error.message : "App configuration failed.";
  }

  if (configError) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.configErrorBox}>
          <Text style={styles.title}>CustomCard</Text>
          <Text style={styles.subtitle}>{configError}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <ApiProvider>
            <StatusBar style="dark" />
            <RootNavigator WorkflowGuideScreen={WorkflowOverviewScreen} />
          </ApiProvider>
        </QueryClientProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

/**
 * Offline-safe workflow guide rendered from the deterministic customer
 * snapshot in `customerExperience.ts`. This screen mirrors the web customer
 * flow stages and is the contract surface checked by the repo doctors.
 */
export function WorkflowOverviewScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{mobileRenderSnapshot.hero.eyebrow}</Text>
          <Text style={styles.title}>{mobileRenderSnapshot.hero.title}</Text>
          <Text style={styles.subtitle}>{mobileRenderSnapshot.hero.subtitle}</Text>
          <ActionSurface action={mobileRenderSnapshot.hero.primaryAction} />
          <View style={styles.heroSecondaryActions}>
            {mobileRenderSnapshot.hero.secondaryActions.map((action) => (
              <ActionSurface key={action.label} action={action} compact />
            ))}
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
          section.id === "next-action" ? (
            <NextActionSection key={section.id} section={section} />
          ) : (
            <StandardSection key={section.id} section={section} />
          )
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
      <Text style={styles.groupEyebrow}>{section.title}</Text>
      <ActionSurface row={row} featured />
    </View>
  );
}

function StandardSection({ section }: { section: MobileRenderSection }) {
  const sectionStyle =
    section.id === "card-assistant" ? [styles.group, styles.chatGroup] : styles.group;

  return (
    <View style={sectionStyle}>
      <Text style={styles.groupTitle}>{section.title}</Text>
      {section.rows.map((row) => (
        <SectionRow
          key={`${section.id}-${row.title}-${row.modeLabel}`}
          row={row}
          chat={section.id === "card-assistant"}
        />
      ))}
    </View>
  );
}

function SectionRow({ row, chat }: { row: MobileRenderRow; chat?: boolean }) {
  if (chat) {
    return (
      <View
        style={[
          styles.chatBubble,
          row.modeLabel === "Customer" ? styles.customerBubble : styles.assistantBubble
        ]}
      >
        <Text style={styles.chatSpeaker}>{row.title}</Text>
        <Text style={styles.chatCopy}>{row.detail}</Text>
      </View>
    );
  }

  return <ActionSurface row={row} compact />;
}

function ActionSurface({
  action,
  row,
  compact,
  featured
}: {
  action?: MobileRenderAction;
  row?: MobileRenderRow;
  compact?: boolean;
  featured?: boolean;
}) {
  const title = action?.label ?? row?.title ?? "";
  const detail = action?.detail ?? row?.detail ?? "";
  const modeLabel = action?.modeLabel ?? row?.modeLabel ?? "";
  const presentation = action?.presentation ?? row?.presentation ?? "status";
  const disabled = action?.disabled ?? row?.disabled ?? false;
  const accessibilityLabel = action?.accessibilityLabel ?? row?.accessibilityLabel ?? title;
  const isButton = presentation !== "status";
  const surfaceStyle = [
    styles.actionSurface,
    compact && styles.compactActionSurface,
    featured && styles.featuredActionSurface,
    presentation === "primary" && styles.primaryActionSurface,
    presentation === "secondary" && styles.secondaryActionSurface,
    presentation === "inline" && styles.inlineActionSurface,
    presentation === "locked" && styles.lockedActionSurface,
    disabled && styles.disabledActionSurface
  ];
  const content = (
    <>
      <View style={styles.compactCopy}>
        <Text style={[styles.compactTitle, featured && styles.todayTitle]}>{title}</Text>
        <Text style={[styles.cardCopy, featured && styles.todayMeta]}>{detail}</Text>
      </View>
      <Text style={[styles.modePill, disabled && styles.disabledModePill]}>{modeLabel}</Text>
    </>
  );

  if (!isButton) {
    return <View style={surfaceStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => undefined}
      style={surfaceStyle}
    >
      {content}
    </Pressable>
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
  configErrorBox: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: "#172927"
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
  heroSecondaryActions: {
    gap: 8,
    marginTop: 8
  },
  actionSurface: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#ffffff"
  },
  compactActionSurface: {
    padding: 10
  },
  featuredActionSurface: {
    marginTop: 10,
    padding: 0,
    backgroundColor: "transparent"
  },
  primaryActionSurface: {
    backgroundColor: "#ffffff"
  },
  secondaryActionSurface: {
    backgroundColor: "#edf6f3"
  },
  inlineActionSurface: {
    borderTopColor: "#e5ebed",
    borderTopWidth: 1
  },
  lockedActionSurface: {
    backgroundColor: "#f4f0ec"
  },
  disabledActionSurface: {
    opacity: 0.72
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
  groupEyebrow: {
    color: "#42615f",
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase"
  },
  todayTitle: {
    color: "#172124",
    fontSize: 25,
    fontWeight: "900"
  },
  todayMeta: {
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
  disabledModePill: {
    color: "#6d251b",
    backgroundColor: "#fff1ee"
  },
  smallMeta: {
    color: "#5d6c72",
    fontSize: 12,
    lineHeight: 18
  }
});
