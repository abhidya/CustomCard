import { StrictMode, type ComponentType, type ReactNode } from "react";
import { ClerkProvider as ClerkReactProvider, type ClerkProviderProps } from "@clerk/react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "../src/styles.css";
import "./styles.css";

const ClerkProvider = ClerkReactProvider as ComponentType<
  Omit<ClerkProviderProps, "publishableKey"> & { children: ReactNode }
>;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ClerkProvider afterSignOutUrl="/">
      <App />
    </ClerkProvider>
  </StrictMode>
);
