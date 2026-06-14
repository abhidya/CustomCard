import { useNavigation } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Text } from "react-native";

import { AppButton, Card, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import { typography } from "../../theme";

/**
 * Calendar connection options. The server owns all OAuth state: this screen
 * only asks for a start packet and opens the returned consent URL (if the
 * deployment has Google OAuth configured). No provider credentials, tokens,
 * or raw calendar content ever pass through or persist on the device.
 */
export function CalendarConnectScreen() {
  const api = useApi();
  const navigation = useNavigation();
  const [blockedDetail, setBlockedDetail] = useState<string | null>(null);

  const startGoogle = useMutation({
    mutationFn: () => api.startCalendarConnection("google-calendar-events"),
    onSuccess: async (response) => {
      setBlockedDetail(null);
      if (response.providerRequestUrl) {
        // Authorization Code + PKCE flow prepared server-side; the device
        // only opens the Google consent page in a secure browser session.
        await WebBrowser.openAuthSessionAsync(response.providerRequestUrl);
        return;
      }
      setBlockedDetail(
        response.blockers?.[0] ??
          "Google Calendar isn't connected for this deployment yet. Paste an invite instead — it works today."
      );
    }
  });

  return (
    <Screen>
      <SectionHeading
        title="Calendar options"
        detail="Choose how events reach CustomCard. Imports keep metadata only."
      />

      <Card>
        <Pill label="Works now" tone="good" />
        <Text style={typography.heading}>Paste invite or ICS</Text>
        <Text style={typography.body}>
          Copy an invitation email or export an .ics file and paste it. Nothing else is collected.
        </Text>
        <AppButton label="Import an invite" onPress={() => navigation.navigate("ImportEvent")} />
      </Card>

      <Card>
        <Pill label={startGoogle.data?.providerRequestUrl ? "Ready" : "Server-gated"} />
        <Text style={typography.heading}>Google Calendar</Text>
        <Text style={typography.body}>
          Read-only event metadata via Google's consent screen. The connection is prepared and
          stored by the server — this app never sees your Google credentials.
        </Text>
        <AppButton
          label="Review Google connection"
          variant="secondary"
          loading={startGoogle.isPending}
          onPress={() => startGoogle.mutate()}
        />
        {startGoogle.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(startGoogle.error)} />
        ) : null}
        {blockedDetail ? <InlineNotice text={blockedDetail} /> : null}
      </Card>

      <Card>
        <Pill label="Manual" />
        <Text style={typography.heading}>Apple Calendar</Text>
        <Text style={typography.body}>
          Export the event as an .ics file from Apple Calendar, then paste it here. CustomCard never
          asks for your Apple ID or calendar credentials.
        </Text>
        <AppButton
          label="Paste an ICS export"
          variant="secondary"
          onPress={() => navigation.navigate("ImportEvent")}
        />
      </Card>
    </Screen>
  );
}
