import { useQuery, useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { Text } from "react-native";

import {
  AppButton,
  Card,
  FormField,
  InlineNotice,
  LoadingState,
  Pill,
  SectionHeading
} from "../../components";
import { Screen } from "../../components/Screen";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import {
  hasErrors,
  requireEmail,
  requirePhone,
  requireText,
  type FieldErrors
} from "../../forms/validation";
import { typography } from "../../theme";

type Field = "firstName" | "lastName" | "email" | "phone";

/**
 * Walgreens hosted checkout. The app checks server-side readiness, then sends
 * contact details once to pre-fill the Walgreens-hosted checkout page, which
 * opens in the browser. Payment and ordering happen entirely on Walgreens'
 * site; nothing is stored on the device.
 */
export function CheckoutScreen() {
  const api = useApi();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<Field>>({});

  const status = useQuery({
    queryKey: ["walgreens-status"],
    queryFn: () => api.getWalgreensCheckoutStatus()
  });

  const createSession = useMutation({
    mutationFn: () =>
      api.createWalgreensCheckoutSession({
        customer: {
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim()
        },
        images: []
      }),
    onSuccess: async (response) => {
      if (response.ok && response.checkoutUrl) {
        await WebBrowser.openBrowserAsync(response.checkoutUrl);
      }
    }
  });

  function submit() {
    const errors: FieldErrors<Field> = {
      firstName: requireText(firstName, "First name", 80),
      lastName: requireText(lastName, "Last name", 80),
      email: requireEmail(email),
      phone: requirePhone(phone)
    };
    setFieldErrors(errors);
    if (hasErrors(errors)) return;
    createSession.mutate();
  }

  if (status.isPending) {
    return (
      <Screen scroll={false}>
        <LoadingState label="Checking checkout availability…" />
      </Screen>
    );
  }

  const enabled = status.data?.enabled === true && status.data.ok === true;

  return (
    <Screen>
      <SectionHeading
        title="Walgreens hosted checkout"
        detail="Checkout, payment, and pickup happen on Walgreens' own site."
      />

      <Card>
        <Pill label={enabled ? "Available" : "Not available"} tone={enabled ? "good" : "warn"} />
        {!enabled ? (
          <>
            <Text style={typography.body}>
              Hosted checkout isn't enabled on this deployment yet
              {status.data?.blockers?.length ? ` (${status.data.blockers[0]})` : ""}. Use "Finish at
              a print shop" to download files and order directly instead.
            </Text>
            <AppButton
              label="Re-check availability"
              variant="secondary"
              onPress={() => void status.refetch()}
            />
          </>
        ) : (
          <Text style={typography.body}>
            Your name, email, and phone are sent once to pre-fill Walgreens checkout and are not
            stored by CustomCard or on this device.
          </Text>
        )}
      </Card>

      {enabled ? (
        <Card>
          <FormField
            label="First name"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
            error={fieldErrors.firstName}
          />
          <FormField
            label="Last name"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
            error={fieldErrors.lastName}
          />
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            error={fieldErrors.email}
          />
          <FormField
            label="Phone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            error={fieldErrors.phone}
          />
          <AppButton
            label="Continue on Walgreens"
            onPress={submit}
            loading={createSession.isPending}
            accessibilityHint="Opens Walgreens checkout in your browser"
          />
          {createSession.isError ? (
            <InlineNotice tone="warn" text={userMessageForError(createSession.error)} />
          ) : null}
          {createSession.data && !createSession.data.ok ? (
            <InlineNotice
              tone="warn"
              text={createSession.data.error ?? "Walgreens checkout could not start."}
            />
          ) : null}
        </Card>
      ) : null}

      <InlineNotice text="Confirm price, pickup window, and payment on the Walgreens page before placing the order." />
    </Screen>
  );
}
