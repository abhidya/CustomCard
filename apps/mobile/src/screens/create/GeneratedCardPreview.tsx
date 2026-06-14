import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppButton, Card, InlineNotice, Pill, SectionHeading } from "../../components";
import type { CardGenerateResponse } from "../../lib/api/types";
import { typography } from "../../theme";
import { panelLabel } from "./cardOptions";

export function GeneratedCardPreview({
  result,
  onContinue
}: {
  result: CardGenerateResponse;
  onContinue: () => void;
}) {
  const theme = result.card_copy.theme_guide;
  return (
    <>
      <SectionHeading title="Your draft card" detail={`Theme: ${theme.theme_title}`} />
      <View style={styles.paletteRow}>
        {theme.palette.map((swatch) => (
          <Pill key={swatch} label={swatch} />
        ))}
      </View>
      {result.card_copy.panels.map((panel) => (
        <Card key={panel.id}>
          <Text style={typography.eyebrow}>{panelLabel(panel.id)}</Text>
          {panel.headline ? <Text style={styles.headline}>{panel.headline}</Text> : null}
          {panel.body ? <Text style={typography.body}>{panel.body}</Text> : null}
          {panel.art_direction ? (
            <Text style={styles.artNote}>Artwork: {panel.art_direction}</Text>
          ) : null}
        </Card>
      ))}
      {result.card_copy.memory_citations.length > 0 ? (
        <InlineNotice
          text={`Uses approved memories: ${result.card_copy.memory_citations.join("; ")}`}
        />
      ) : null}
      <InlineNotice text="Review every panel. Printing unlocks only after you approve the proof." />
      <AppButton label="Continue to proof & print" onPress={onContinue} />
    </>
  );
}

const styles = StyleSheet.create({
  paletteRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  headline: { ...typography.heading, fontSize: 20 },
  artNote: { ...typography.body, fontStyle: "italic", fontSize: 13 }
});
