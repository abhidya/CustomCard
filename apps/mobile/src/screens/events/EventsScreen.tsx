import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  Pill,
  SectionHeading
} from "../../components";
import { Screen } from "../../components/Screen";
import { useApi } from "../../lib/api/ApiProvider";
import { formatLongDate, humanizeStatus } from "../../lib/format";
import { spacing, typography } from "../../theme";

export function EventsScreen() {
  const api = useApi();
  const navigation = useNavigation();

  const connections = useQuery({
    queryKey: ["connections"],
    queryFn: () => api.getConnections()
  });

  if (connections.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Loading your events…" />
      </Screen>
    );
  }

  if (connections.isError) {
    return (
      <Screen scroll={false}>
        <ErrorState error={connections.error} onRetry={() => void connections.refetch()} />
      </Screen>
    );
  }

  const { opportunities, connections: providerConnections } = connections.data;

  return (
    <Screen refreshing={connections.isRefetching} onRefresh={() => void connections.refetch()}>
      <SectionHeading
        title="Card opportunities"
        detail="Events you've imported, ranked by how ready they are for a card."
      />
      {opportunities.length === 0 ? (
        <EmptyState
          title="No imported events yet"
          detail="Paste an invite or ICS text to find your first card moment."
        />
      ) : (
        opportunities.map((opportunity) => (
          <Card key={opportunity.opportunityId}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{opportunity.title}</Text>
              <Pill label={humanizeStatus(opportunity.decision)} />
            </View>
            <Text style={typography.body}>
              For {opportunity.recipientName} · {formatLongDate(opportunity.startsAt)}
            </Text>
            <Text style={typography.body}>
              Confidence {(opportunity.confidence * 100).toFixed(0)}%
            </Text>
          </Card>
        ))
      )}

      <Card>
        <AppButton label="Import an invite" onPress={() => navigation.navigate("ImportEvent")} />
      </Card>

      <SectionHeading
        title="Connected sources"
        detail="Connections never store your raw calendar content — metadata only."
      />
      {providerConnections.length === 0 ? (
        <EmptyState title="No sources connected" />
      ) : (
        providerConnections.map((connection) => (
          <Card key={connection.provider}>
            <View style={styles.rowBetween}>
              <Text style={styles.cardTitle}>{labelForProvider(connection.provider)}</Text>
              <Pill
                label={humanizeStatus(connection.status)}
                tone={connection.status === "connected" ? "good" : "neutral"}
              />
            </View>
            <Text style={typography.body}>
              {connection.importedEventCount} events · {connection.opportunityCount} card
              opportunities
            </Text>
          </Card>
        ))
      )}

      <Card>
        <AppButton
          label="Review calendar options"
          variant="secondary"
          onPress={() => navigation.navigate("CalendarConnect")}
        />
      </Card>
    </Screen>
  );
}

function labelForProvider(provider: string): string {
  const labels: Record<string, string> = {
    google_calendar: "Google Calendar",
    manual_paste: "Pasted invites",
    icloud_ics: "Apple Calendar (ICS export)"
  };
  return labels[provider] ?? provider;
}

const styles = StyleSheet.create({
  cardTitle: { ...typography.heading, fontSize: 16, flexShrink: 1 },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm
  }
});
