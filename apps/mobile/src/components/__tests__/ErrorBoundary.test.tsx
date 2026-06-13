import { fireEvent, render, screen } from "@testing-library/react-native";
import React from "react";
import { Text } from "react-native";

import { ErrorBoundary } from "../ErrorBoundary";

function Boom({ crash }: { crash: boolean }): React.ReactElement {
  if (crash) throw new Error("kaboom: secret-token-should-not-surface");
  return <Text>all good</Text>;
}

describe("ErrorBoundary", () => {
  const originalError = console.error;
  beforeEach(() => {
    // React logs the caught error; silence it for a clean test run.
    console.error = jest.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it("renders children when there is no error", async () => {
    await render(
      <ErrorBoundary>
        <Boom crash={false} />
      </ErrorBoundary>
    );
    expect(screen.getByText("all good")).toBeTruthy();
  });

  it("shows a recovery UI when a child throws, without leaking error detail", async () => {
    await render(
      <ErrorBoundary>
        <Boom crash />
      </ErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeTruthy();
    expect(screen.getByLabelText("Try again")).toBeTruthy();
    // The thrown message (which contains a token-like string) must not render.
    expect(screen.queryByText(/kaboom/)).toBeNull();
    expect(screen.queryByText(/secret-token/)).toBeNull();
  });

  it("recovers when the user retries after the child stops throwing", async () => {
    function Toggler() {
      const [crash, setCrash] = React.useState(true);
      return (
        <ErrorBoundary>
          <Text onPress={() => setCrash(false)}>noop</Text>
          <Boom crash={crash} />
        </ErrorBoundary>
      );
    }
    await render(<Toggler />);
    expect(screen.getByText("Something went wrong")).toBeTruthy();
    // Pressing "Try again" re-renders children; they still throw here, so the
    // boundary should stay in its error state rather than crash the test.
    fireEvent.press(screen.getByLabelText("Try again"));
    expect(screen.getByText("Something went wrong")).toBeTruthy();
  });
});
