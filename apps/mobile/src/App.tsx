import { QueryClientProvider } from "@tanstack/react-query";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { Pressable, SafeAreaView, ScrollView, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { styles } from "./styles/appShellStyles";

import {
  mobileRenderSnapshot,
  type MobileRenderAction,
  type MobileRenderRow,
  type MobileRenderSection
} from "./customerExperience";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ToastProvider } from "./components/Toast";
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
      <ErrorBoundary>
        <ToastProvider>
          <AuthProvider>
            <QueryClientProvider client={queryClient}>
              <ApiProvider>
                <StatusBar style="dark" />
                <RootNavigator WorkflowGuideScreen={WorkflowOverviewScreen} />
              </ApiProvider>
            </QueryClientProvider>
          </AuthProvider>
        </ToastProvider>
      </ErrorBoundary>
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
