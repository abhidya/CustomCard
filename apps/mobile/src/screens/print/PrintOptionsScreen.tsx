import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation, useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  Card,
  ErrorState,
  InlineNotice,
  LoadingState,
  Pill,
  SectionHeading
} from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { RetailOperationStartResponse } from "../../lib/api/types";
import type { RootStackParamList } from "../../navigation/types";
import { formatCents } from "../../lib/format";
import { spacing, typography } from "../../theme";

/**
 * Print options: server-published pricing estimates and fulfillment
 * recommendations. Prices are estimates until confirmed in the printer's own
 * cart — the app never places orders.
 */
export function PrintOptionsScreen() {
  const api = useApi();
  const route = useRoute<RouteProp<RootStackParamList, "PrintOptions">>();
  const renderPacketId = route.params?.renderPacketId;
  const [operationResult, setOperationResult] = useState<RetailOperationStartResponse | null>(null);

  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS)
  });

  const startOperation = useMutation({
    mutationFn: (vendorId: string) =>
      api.startRetailOperation({
        vendorId,
        operation: "fetch-price",
        renderPacketId
      }),
    onSuccess: (response) => setOperationResult(response)
  });

  if (bootstrap.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Comparing print options…" />
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
  const recommendations = data.fulfillmentRecommendations.filter((entry) => entry.customerVisible);

  return (
    <Screen refreshing={bootstrap.isRefetching} onRefresh={() => void bootstrap.refetch()}>
      <InlineNotice
        tone="warn"
        text="Prices are estimates. Confirm price, pickup, and payment on the print shop's own site before ordering."
      />

      <SectionHeading title="Recommended options" />
      {recommendations.map((recommendation) => (
        <Card key={`${recommendation.kind}-${recommendation.vendorName}`}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{recommendation.label}</Text>
            <Pill label={formatCents(recommendation.totalCents)} tone="good" />
          </View>
          <Text style={typography.body}>
            {recommendation.vendorName} · {recommendation.etaLabel}
          </Text>
          <Text style={typography.body}>{recommendation.confirmationCopy}</Text>
          <Pill label={recommendation.priceProofLabel} />
        </Card>
      ))}

      <SectionHeading title="All current estimates" />
      {data.pricingPreviews.map((preview) => (
        <Card key={`${preview.vendor}-${preview.product}`}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>{preview.vendor}</Text>
            <Pill label={formatCents(preview.estimatedTotalCents)} />
          </View>
          <Text style={typography.body}>{preview.product}</Text>
          <AppButton
            label="Check current price packet"
            variant="secondary"
            loading={
              startOperation.isPending && startOperation.variables === vendorIdFor(preview.vendor)
            }
            onPress={() => startOperation.mutate(vendorIdFor(preview.vendor))}
          />
        </Card>
      ))}
      {startOperation.isError ? (
        <InlineNotice tone="warn" text={userMessageForError(startOperation.error)} />
      ) : null}
      {operationResult ? (
        <InlineNotice
          text={`${operationResult.startPacket.vendorName}: ${operationResult.startPacket.productName}. ${
            operationResult.blockers?.[0] ?? "Confirm the final price in the shop's own cart."
          }`}
        />
      ) : null}
    </Screen>
  );
}

function vendorIdFor(vendorLabel: string): string {
  const map: Record<string, string> = {
    "Walgreens Photo": "walgreens",
    Walgreens: "walgreens",
    "CVS Photo": "cvs",
    "Walmart Photo": "walmart",
    "FedEx Office": "fedex-office",
    Staples: "staples"
  };
  return map[vendorLabel] ?? vendorLabel.toLowerCase().replace(/\s+/g, "-");
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
