import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer, DefaultTheme, type LinkingOptions } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";

import { colors } from "../theme";
import { ChatScreen } from "../screens/create/ChatScreen";
import { StudioScreen } from "../screens/create/StudioScreen";
import { CalendarConnectScreen } from "../screens/events/CalendarConnectScreen";
import { ImportEventScreen } from "../screens/events/ImportEventScreen";
import { HomeScreen } from "../screens/home/HomeScreen";
import { MemoriesScreen } from "../screens/memories/MemoriesScreen";
import { CheckoutScreen } from "../screens/print/CheckoutScreen";
import { HandoffScreen } from "../screens/print/HandoffScreen";
import { PrintOptionsScreen } from "../screens/print/PrintOptionsScreen";
import { PrintScreen } from "../screens/print/PrintScreen";
import { SignInScreen } from "../screens/auth/SignInScreen";
import { PrivacyScreen } from "../screens/settings/PrivacyScreen";
import { SettingsScreen } from "../screens/settings/SettingsScreen";
import type { MainTabParamList, RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tabs = createBottomTabNavigator<MainTabParamList>();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.brand,
    background: colors.background,
    card: colors.surface,
    text: colors.ink,
    border: colors.border
  }
};

const tabIcons: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Home: "create",
  Print: "albums",
  People: "people",
  Settings: "settings"
};

export const customCardLinking: LinkingOptions<RootStackParamList> = {
  prefixes: ["customcard://", "customcard:///"],
  config: {
    screens: {
      MainTabs: {
        path: "",
        screens: {
          Home: "",
          Print: "cards",
          People: "people",
          Settings: "settings"
        }
      },
      Studio: "studio",
      ImportEvent: "import",
      CalendarConnect: "calendar",
      Chat: "chat",
      Memories: "memories",
      PrintOptions: "print-options",
      Checkout: "checkout",
      Handoff: "handoff",
      Privacy: "privacy",
      WorkflowGuide: "guide/:focus?"
    }
  }
};

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerTitleStyle: { fontWeight: "900" },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkSubtle,
        tabBarIcon: ({ color, size }) => (
          <Ionicons
            name={tabIcons[route.name as keyof MainTabParamList]}
            color={color}
            size={size}
          />
        )
      })}
    >
      <Tabs.Screen name="Home" component={HomeScreen} options={{ title: "Create" }} />
      <Tabs.Screen name="Print" component={PrintScreen} options={{ title: "My cards" }} />
      <Tabs.Screen name="People" component={MemoriesScreen} options={{ title: "People" }} />
      <Tabs.Screen name="Settings" component={SettingsScreen} options={{ title: "Settings" }} />
    </Tabs.Navigator>
  );
}

export function RootNavigator({
  WorkflowGuideScreen
}: {
  WorkflowGuideScreen: React.ComponentType;
}) {
  return (
    <NavigationContainer theme={navTheme} linking={customCardLinking}>
      <Stack.Navigator screenOptions={{ headerTitleStyle: { fontWeight: "900" } }}>
        <Stack.Screen name="MainTabs" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="SignIn" component={SignInScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Studio" component={StudioScreen} options={{ title: "Design" }} />
        <Stack.Screen
          name="ImportEvent"
          component={ImportEventScreen}
          options={{ title: "Import an event" }}
        />
        <Stack.Screen
          name="CalendarConnect"
          component={CalendarConnectScreen}
          options={{ title: "Calendar options" }}
        />
        <Stack.Screen name="Chat" component={ChatScreen} options={{ title: "Card assistant" }} />
        <Stack.Screen
          name="Memories"
          component={MemoriesScreen}
          options={{ title: "Memory review" }}
        />
        <Stack.Screen
          name="PrintOptions"
          component={PrintOptionsScreen}
          options={{ title: "Print options" }}
        />
        <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ title: "Checkout" }} />
        <Stack.Screen
          name="Handoff"
          component={HandoffScreen}
          options={{ title: "Finish at a print shop" }}
        />
        <Stack.Screen
          name="Privacy"
          component={PrivacyScreen}
          options={{ title: "Privacy & data" }}
        />
        <Stack.Screen
          name="WorkflowGuide"
          component={WorkflowGuideScreen}
          options={{ title: "How it works" }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
