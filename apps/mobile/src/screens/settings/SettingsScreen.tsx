import { useNavigation } from "@react-navigation/native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useState } from "react";
import { Platform, Text } from "react-native";

import { AppButton, Card, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { appConfig } from "../../config/env";
import { useApi } from "../../lib/api/ApiProvider";
import { useAppSession } from "../../lib/auth/AuthProvider";
import { typography } from "../../theme";

export function SettingsScreen() {
  const session = useAppSession();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const api = useApi();
  const config = appConfig();
  const [signingOut, setSigningOut] = useState(false);

  const bootstrap = useQuery({
    queryKey: ["mobile-bootstrap"],
    queryFn: () => api.getMobileBootstrap(Platform.OS)
  });

  async function signOut() {
    setSigningOut(true);
    try {
      // Secure logout: drop all cached customer data before ending the
      // session so nothing user-specific survives in memory.
      queryClient.clear();
      await session.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen>
      <SectionHeading title="Account" />
      <Card>
        <Text style={typography.heading}>{session.userLabel ?? "Signed in"}</Text>
        <Text style={typography.body}>
          {session.mode === "clerk"
            ? "Signed in with your CustomCard account."
            : "Local development session."}
        </Text>
        <AppButton
          label="Sign out"
          variant="danger"
          loading={signingOut}
          onPress={() => void signOut()}
        />
      </Card>

      <SectionHeading title="Privacy & data" />
      <Card>
        <Text style={typography.body}>
          Export or delete your CustomCard data, and see exactly what is stored.
        </Text>
        <AppButton label="Privacy & data requests" onPress={() => navigation.navigate("Privacy")} />
      </Card>

      <SectionHeading title="Card languages" />
      <Card>
        {(bootstrap.data?.localeOptions ?? [])
          .filter((option) => option.customerVisible)
          .map((option) => (
            <Text key={option.locale} style={typography.body}>
              {option.label} · {option.cardLanguage}
              {option.copyReviewRequired ? " (copy review required)" : ""}
            </Text>
          ))}
        {bootstrap.isError ? <InlineNotice text="Language options unavailable offline." /> : null}
      </Card>

      <SectionHeading title="About" />
      <Card>
        <Text style={typography.heading}>How CustomCard works</Text>
        <Text style={typography.body}>
          A guided look at the workflow from imported event to printed card.
        </Text>
        <AppButton
          label="Open the guide"
          variant="secondary"
          onPress={() => navigation.navigate("WorkflowGuide")}
        />
      </Card>
      <Card>
        <Pill label={`Environment: ${config.appEnv}`} />
        <Text style={typography.body}>
          No automatic orders: every print purchase is confirmed by you on the print shop's own
          site.
        </Text>
      </Card>
    </Screen>
  );
}
