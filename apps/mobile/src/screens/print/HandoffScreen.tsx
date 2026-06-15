import { useRoute, type RouteProp } from "@react-navigation/native";
import { useMutation } from "@tanstack/react-query";
import * as WebBrowser from "expo-web-browser";
import React, { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppButton, Card, InlineNotice, Pill, SectionHeading } from "../../components";
import { Screen } from "../../components/Screen";
import { SelectableOption } from "../../components/SelectableOption";
import { useToast } from "../../components/Toast";
import { userMessageForError } from "../../lib/api/errors";
import { useApi } from "../../lib/api/ApiProvider";
import type { VendorHandoffResponse } from "../../lib/api/types";
import type { RootStackParamList } from "../../navigation/types";
import { colors, spacing, typography } from "../../theme";

const VENDORS = [
  { id: "walgreens", label: "Walgreens Photo" },
  { id: "cvs", label: "CVS Photo" },
  { id: "fedex-office", label: "FedEx Office" }
];

/**
 * Customer-controlled print package: explicit consent to share rendered card
 * files, then a checklist plus expiring signed download links. No order is
 * placed by the app.
 */
export function HandoffScreen() {
  const api = useApi();
  const toast = useToast();
  const route = useRoute<RouteProp<RootStackParamList, "Handoff">>();
  const { projectId, renderPacketId } = route.params;

  const [vendorId, setVendorId] = useState(VENDORS[0]?.id ?? "walgreens");
  const [shareApproved, setShareApproved] = useState(false);
  const [result, setResult] = useState<VendorHandoffResponse | null>(null);

  const handoff = useMutation({
    mutationFn: () =>
      api.manualVendorHandoff({
        projectId,
        renderPacketId,
        vendorId,
        externalShareApproval: shareApproved
      }),
    onSuccess: (response) => {
      setResult(response);
      toast.show(
        response.handoffStatus === "vendor_handoff_ready"
          ? "Print package ready"
          : "Print package is blocked — check the details",
        response.handoffStatus === "vendor_handoff_ready" ? "success" : "error"
      );
    },
    onError: (error) => toast.show(userMessageForError(error), "error")
  });

  return (
    <Screen>
      <SectionHeading
        title="Finish at a print shop"
        detail="Download your print files and upload them to the print shop yourself. You stay in control of payment and ordering."
      />

      <Card>
        <Text style={typography.heading}>Choose a print shop</Text>
        <View style={styles.optionGroup} accessibilityRole="radiogroup">
          {VENDORS.map((vendor) => (
            <SelectableOption
              key={vendor.id}
              label={vendor.label}
              selected={vendorId === vendor.id}
              onPress={() => setVendorId(vendor.id)}
            />
          ))}
        </View>
      </Card>

      <Card>
        <View style={styles.consentRow}>
          <View style={styles.consentCopy}>
            <Text style={typography.heading}>Share files externally</Text>
            <Text style={typography.body}>
              I approve sharing this card's print files with the selected print shop.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Approve sharing print files with the selected print shop"
            value={shareApproved}
            onValueChange={setShareApproved}
            trackColor={{ true: colors.brand, false: colors.border }}
          />
        </View>
        <AppButton
          label="Prepare print package"
          disabled={!shareApproved}
          loading={handoff.isPending}
          onPress={() => handoff.mutate()}
        />
        {handoff.isError ? (
          <InlineNotice tone="warn" text={userMessageForError(handoff.error)} />
        ) : null}
      </Card>

      {result ? (
        <>
          <SectionHeading title="Print checklist" />
          <Card>
            <Pill
              label={result.handoffStatus === "vendor_handoff_ready" ? "Ready" : "Blocked"}
              tone={result.handoffStatus === "vendor_handoff_ready" ? "good" : "warn"}
            />
            {result.handoffChecklist.map((step, index) => (
              <Text key={step} style={typography.body}>
                {index + 1}. {step}
              </Text>
            ))}
          </Card>
          {result.signedArtifactUrls.map((artifact) => (
            <Card key={artifact.url}>
              <Text style={typography.body}>
                Download link (expires in {artifact.expiresInMinutes} minutes)
              </Text>
              <AppButton
                label="Open download"
                variant="secondary"
                disabled={
                  !artifact.url.startsWith("https://") && !artifact.url.startsWith("http://")
                }
                onPress={() => void WebBrowser.openBrowserAsync(artifact.url)}
              />
            </Card>
          ))}
          {result.disabledReasons.map((reason) => (
            <InlineNotice key={reason} text={reason} />
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  optionGroup: { gap: spacing.sm },
  consentRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  consentCopy: { flex: 1, gap: spacing.xs }
});
