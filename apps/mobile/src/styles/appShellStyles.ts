// Styles for the offline workflow guide (extracted from App.tsx to keep the
// entrypoint focused on bootstrap + the snapshot renderer).
import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
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
