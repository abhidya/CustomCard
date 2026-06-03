export const requiredMobileCapabilities = [
  "card-queue",
  "memory-review",
  "text-chat",
  "image-render",
  "handoff"
] as const;

export type MobileExperienceCapability = (typeof requiredMobileCapabilities)[number];
export type MobileExperienceStatus = "Ready" | "Approved" | "Local" | "Free" | "Manual";

export interface MobileExperienceSection {
  id: MobileExperienceCapability;
  title: string;
  detail: string;
  status: MobileExperienceStatus;
  customerVisible: boolean;
}

export interface MobileChatMessage {
  speaker: "assistant" | "customer";
  text: string;
  source: "local-script" | "customer-approval";
}

export interface MobileRenderChoice {
  label: string;
  detail: string;
  mode: "free-local" | "credential-gated";
}

export interface MobileHandoffStep {
  label: string;
  detail: string;
  realOrderState: "manual" | "disabled";
}

export interface MobileSafetyBanner {
  label: string;
  detail: string;
}

export interface MobileExperienceModel {
  safetyBanner: MobileSafetyBanner;
  sections: MobileExperienceSection[];
  chatTranscript: MobileChatMessage[];
  renderChoices: MobileRenderChoice[];
  handoffSteps: MobileHandoffStep[];
}

export const mobileSafetyBanner = {
  label: "Real orders disabled",
  detail: "Live provider, payment, and vendor APIs stay behind admin gates."
} as const;

export const mobileExperienceSections: MobileExperienceSection[] = [
  {
    id: "card-queue",
    title: "Card queue",
    detail: "Sara and Ahmed anniversary card is ready from pasted ICS data.",
    status: "Ready",
    customerVisible: true
  },
  {
    id: "memory-review",
    title: "Memory review",
    detail: "Only approved relationship notes are eligible for reuse.",
    status: "Approved",
    customerVisible: true
  },
  {
    id: "text-chat",
    title: "Customer chat",
    detail: "Local scripted assistant explains event, memory, render, and handoff state.",
    status: "Local",
    customerVisible: true
  },
  {
    id: "image-render",
    title: "Image/render",
    detail: "Browser SVG renderer is the free path; AI image providers require admin credentials.",
    status: "Free",
    customerVisible: true
  },
  {
    id: "handoff",
    title: "Handoff",
    detail: "Manual upload stays active while retail print live orders are blocked.",
    status: "Manual",
    customerVisible: true
  }
];

export const mobileChatTranscript: MobileChatMessage[] = [
  {
    speaker: "assistant",
    source: "local-script",
    text: "I found one anniversary card candidate from your pasted invite."
  },
  {
    speaker: "customer",
    source: "customer-approval",
    text: "Use the approved memory about their first apartment, but keep it short."
  },
  {
    speaker: "assistant",
    source: "local-script",
    text: "Local scripted assistant can draft and explain the card before any live model is connected."
  },
  {
    speaker: "assistant",
    source: "local-script",
    text: "Live AI and vendor orders stay off until admin credentials and certification gates pass."
  }
];

export const mobileRenderChoices: MobileRenderChoice[] = [
  {
    label: "Browser SVG renderer",
    detail: "Free 5x7 panel rendering mirrors the web customer path.",
    mode: "free-local"
  },
  {
    label: "AI image providers",
    detail: "OpenAI, Gemini, Stability, Hugging Face, Replicate, Together, Ideogram, and Leonardo remain credential-gated.",
    mode: "credential-gated"
  }
];

export const mobileHandoffSteps: MobileHandoffStep[] = [
  {
    label: "Download SVG set",
    detail: "Customer can export four panels for manual vendor upload.",
    realOrderState: "manual"
  },
  {
    label: "Confirm pickup manually",
    detail: "Walgreens, CVS, FedEx, Walmart, Staples, and Office Depot live order APIs are blocked in this shell.",
    realOrderState: "disabled"
  }
];

export const mobileExperience: MobileExperienceModel = {
  safetyBanner: mobileSafetyBanner,
  sections: mobileExperienceSections,
  chatTranscript: mobileChatTranscript,
  renderChoices: mobileRenderChoices,
  handoffSteps: mobileHandoffSteps
};

export function summarizeMobileExperience(model: MobileExperienceModel = mobileExperience) {
  return {
    capabilityCount: new Set(model.sections.map((section) => section.id)).size,
    customerVisibleSections: model.sections.filter((section) => section.customerVisible).length,
    localChatMessages: model.chatTranscript.filter((message) => message.source === "local-script").length,
    freeRenderChoices: model.renderChoices.filter((choice) => choice.mode === "free-local").length,
    disabledHandoffSteps: model.handoffSteps.filter((step) => step.realOrderState === "disabled").length
  };
}

export function validateMobileExperience(model: MobileExperienceModel = mobileExperience): string[] {
  const issues: string[] = [];
  const sectionIds = new Set(model.sections.map((section) => section.id));

  for (const capability of requiredMobileCapabilities) {
    if (!sectionIds.has(capability)) {
      issues.push(`Missing mobile customer capability: ${capability}`);
    }
  }

  if (model.sections.some((section) => !section.customerVisible)) {
    issues.push("Every mobile experience section must be customer-visible.");
  }

  if (model.sections.length < requiredMobileCapabilities.length) {
    issues.push("Mobile experience does not expose enough customer sections.");
  }

  if (!model.chatTranscript.some((message) => message.text.includes("Local scripted assistant"))) {
    issues.push("Mobile chat must identify the local scripted assistant path.");
  }

  if (!model.chatTranscript.some((message) => message.text.includes("Live AI and vendor orders stay off"))) {
    issues.push("Mobile chat must disclose that live AI and vendor orders are off.");
  }

  if (!model.renderChoices.some((choice) => choice.mode === "free-local" && choice.label === "Browser SVG renderer")) {
    issues.push("Mobile render choices must include the free browser SVG renderer.");
  }

  if (!model.renderChoices.some((choice) => choice.mode === "credential-gated")) {
    issues.push("Mobile render choices must keep AI image providers credential-gated.");
  }

  if (!model.handoffSteps.some((step) => step.realOrderState === "manual")) {
    issues.push("Mobile handoff must keep a manual upload path.");
  }

  if (!model.handoffSteps.every((step) => step.realOrderState !== "disabled" || step.detail.includes("blocked"))) {
    issues.push("Disabled mobile handoff steps must explain blocked live order APIs.");
  }

  if (model.safetyBanner.label !== "Real orders disabled") {
    issues.push("Mobile safety banner must keep real orders disabled.");
  }

  for (const phrase of collectMobileExperienceText(model)) {
    if (/\b(live order ready|real orders enabled|payment active|vendor api connected|paid ai active)\b/i.test(phrase)) {
      issues.push(`Unsafe mobile live-provider claim: ${phrase}`);
    }
  }

  return issues;
}

function collectMobileExperienceText(model: MobileExperienceModel): string[] {
  return [
    model.safetyBanner.label,
    model.safetyBanner.detail,
    ...model.sections.flatMap((section) => [section.title, section.detail, section.status]),
    ...model.chatTranscript.map((message) => message.text),
    ...model.renderChoices.flatMap((choice) => [choice.label, choice.detail, choice.mode]),
    ...model.handoffSteps.flatMap((step) => [step.label, step.detail, step.realOrderState])
  ];
}
