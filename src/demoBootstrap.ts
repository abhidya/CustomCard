import type { LanguageChoice, MemoryItem, Tone, VendorId, VisualStyle } from "./freeMvp";

export interface DemoAuthForm {
  name: string;
  email: string;
}

export const demoWorkspaceKey = "customcard-free-workspace-v1";
export const demoReviewDate = new Date("2026-06-03T12:00:00.000Z");
export const demoInitialAuthForm: DemoAuthForm = { name: "Abdul", email: "abdul@customcard.local" };
export const demoInitialScanStatus = "Invite required";
export const demoInitialExportStatus = "Ready to export";
export const demoEmptyMemories: MemoryItem[] = [];

export const demoDraftOptions: {
  tones: Tone[];
  styles: VisualStyle[];
  languages: LanguageChoice[];
  vendors: VendorId[];
} = {
  tones: ["warm", "playful", "elegant", "reverent"],
  styles: ["botanical", "bold-type", "photo-note", "minimal"],
  languages: ["English", "Spanish", "Urdu", "Arabic"],
  vendors: ["walgreens", "cvs", "fedex", "walmart", "staples", "office-depot", "local-print-shop"]
};
