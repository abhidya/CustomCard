import { render, screen, waitFor } from "@testing-library/react-native";
import React from "react";

import { ToastProvider, useToast, type ToastTone } from "../Toast";

function Trigger({ message, tone }: { message: string; tone?: ToastTone }) {
  const { show } = useToast();
  React.useEffect(() => {
    show(message, tone);
  }, [show, message, tone]);
  return null;
}

describe("Toast", () => {
  it("shows a message published through useToast", async () => {
    await render(
      <ToastProvider>
        <Trigger message="Memory approved" tone="success" />
      </ToastProvider>
    );
    expect(await screen.findByText("Memory approved")).toBeTruthy();
  });

  it("redacts sensitive content before displaying", async () => {
    await render(
      <ToastProvider>
        <Trigger message="Bearer super-secret-token rejected" tone="error" />
      </ToastProvider>
    );
    await waitFor(() => expect(screen.getByText(/Bearer \[redacted\]/)).toBeTruthy());
    expect(screen.queryByText(/super-secret-token/)).toBeNull();
  });

  it("is a no-op (no throw) when used without a provider", () => {
    function Lonely() {
      const { show } = useToast();
      show("no provider here");
      return null;
    }
    expect(() => render(<Lonely />)).not.toThrow();
  });
});
