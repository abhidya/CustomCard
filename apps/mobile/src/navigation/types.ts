import type { NavigatorScreenParams } from "@react-navigation/native";

export type MainTabParamList = {
  Home: undefined;
  Print: undefined;
  People: undefined;
  Settings: undefined;
};

export type RootStackParamList = {
  SignIn: undefined;
  MainTabs: NavigatorScreenParams<MainTabParamList>;
  Studio: undefined;
  ImportEvent: undefined;
  CalendarConnect: undefined;
  Chat: { recipientName?: string } | undefined;
  Memories: { recipientName?: string } | undefined;
  PrintOptions: { renderPacketId?: string } | undefined;
  Handoff: { projectId: string; renderPacketId: string };
  Privacy: undefined;
  WorkflowGuide: { focus?: "print-proof" } | undefined;
};

declare global {
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
