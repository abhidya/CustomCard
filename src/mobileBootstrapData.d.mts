import type { MobileExperienceModel } from "../apps/mobile/src/customerExperience.ts";

export type MobileBootstrapPayload = MobileExperienceModel & {
  service: "customcard-api";
  realOrdersEnabled: false;
};

export const mobileBootstrap: MobileBootstrapPayload;
