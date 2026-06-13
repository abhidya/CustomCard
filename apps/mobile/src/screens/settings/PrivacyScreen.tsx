import { useMutation } from "@tanstack/react-query";
import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppButton, Card, InlineNotice, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { SelectableOption } from "../../components/SelectableOption";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { DataRequestRequest, DataRequestResponse } from "../../lib/api/types";
import { colors, spacing, typography } from "../../theme";

const REGIONS = [
  { id: "us-ca", label: "California (CCPA)" },
  { id: "us-other", label: "Other US state" },
  { id: "eu", label: "EU/EEA (GDPR)" },
  { id: "other", label: "Somewhere else" }
];

/** Privacy controls: audited export/delete requests plus a data inventory. */
export function PrivacyScreen() {
  const api = useApi();

  const [region, setRegion] = useState(REGIONS[0]?.id ?? "us-ca");
  const [consentGranted, setConsentGranted] = useState(false);
  const [result, setResult] = useState<DataRequestResponse | null>(null);

  const submitRequest = useMutation({
    mutationFn: (body: DataRequestRequest) => api.submitDataRequest(body),
    onSuccess: (response) => setResult(response)
  });

  function submit(requestType: "export" | "delete") {
    setResult(null);
    submitRequest.mutate({ requestType, region, consentGranted });
  }

  return (
    <Screen>
      <SectionHeading
        title="Your data at CustomCard"
        detail="What we keep, why, and how to take it with you or remove it."
      />

      <Card>
        <Text style={typography.heading}>What is stored</Text>
        <Text style={typography.body}>• Account email and sign-in identity (via Clerk).</Text>
        <Text style={typography.body}>
          • Event metadata you import (title, recipient, date) — never raw invites.
        </Text>
        <Text style={typography.body}>• Memory notes you explicitly approve.</Text>
        <Text style={typography.body}>• Card drafts, projects, and print files you create.</Text>
        <Text style={typography.heading}>What is never stored</Text>
        <Text style={typography.body}>
          • Raw calendar/invite content, provider passwords, or payment details.
        </Text>
        <Text style={typography.body}>• Nothing is sold or used for advertising.</Text>
      </Card>

      <SectionHeading title="Export or delete" />
      <Card>
        <Text style={typography.label}>Where do you live?</Text>
        <View style={styles.optionGroup} accessibilityRole="radiogroup" accessibilityLabel="Region">
          {REGIONS.map((entry) => (
            <SelectableOption
              key={entry.id}
              label={entry.label}
              selected={region === entry.id}
              onPress={() => setRegion(entry.id)}
            />
          ))}
        </View>
        <View style={styles.consentRow}>
          <Text style={[typography.body, styles.consentText]}>
            I confirm I'm making this request for my own account.
          </Text>
          <Switch
            accessibilityLabel="Confirm this request is for your own account"
            value={consentGranted}
            onValueChange={setConsentGranted}
            trackColor={{ true: colors.brand, false: colors.border }}
          />
        </View>
        <AppButton
          label="Request my data (export)"
          disabled={!consentGranted}
          loading={submitRequest.isPending}
          onPress={() => submit("export")}
        />
        <AppButton
          label="Request deletion"
          variant="danger"
          disabled={!consentGranted}
          loading={submitRequest.isPending}
          onPress={() => submit("delete")}
          accessibilityHint="Starts a verified deletion of your CustomCard data"
        />
        {submitRequest.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(submitRequest.error)} />
        ) : null}
        {result ? (
          <InlineNotice
            text={`Request received (${result.requestType}). Status: ${result.requestStatus}. We'll verify it and respond by ${new Date(result.dueAt).toLocaleDateString()}.`}
          />
        ) : null}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  optionGroup: { gap: spacing.sm },
  consentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm
  },
  consentText: { flex: 1 }
});
