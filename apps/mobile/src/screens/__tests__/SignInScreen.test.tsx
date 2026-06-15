import { render, screen, userEvent, waitFor } from "@testing-library/react-native";
import React from "react";

import { SignInScreen } from "../auth/SignInScreen";

const mockSetActiveFromSso = jest.fn();
const mockStartSSOFlow = jest.fn();
const mockSignInCreate = jest.fn();
const mockSignUpCreate = jest.fn();
const mockPrepareEmailAddressVerification = jest.fn();
const mockAttemptFirstFactor = jest.fn();
const mockAttemptEmailAddressVerification = jest.fn();

jest.mock("@clerk/clerk-expo", () => ({
  useSSO: () => ({
    startSSOFlow: mockStartSSOFlow
  }),
  useSignIn: () => ({
    isLoaded: true,
    signIn: {
      create: mockSignInCreate,
      attemptFirstFactor: mockAttemptFirstFactor
    },
    setActive: jest.fn()
  }),
  useSignUp: () => ({
    isLoaded: true,
    signUp: {
      create: mockSignUpCreate,
      prepareEmailAddressVerification: mockPrepareEmailAddressVerification,
      attemptEmailAddressVerification: mockAttemptEmailAddressVerification
    },
    setActive: jest.fn()
  })
}));

describe("SignInScreen", () => {
  beforeEach(() => {
    mockSetActiveFromSso.mockReset();
    mockStartSSOFlow.mockReset();
    mockSignInCreate.mockReset();
    mockSignUpCreate.mockReset();
    mockPrepareEmailAddressVerification.mockReset();
    mockAttemptFirstFactor.mockReset();
    mockAttemptEmailAddressVerification.mockReset();
  });

  it("offers Clerk OAuth and email code sign-in without a customer session token gate", async () => {
    mockStartSSOFlow.mockResolvedValue({
      createdSessionId: "sess_google",
      setActive: mockSetActiveFromSso
    });
    const user = userEvent.setup();

    await render(<SignInScreen />);

    expect(screen.getByText("CustomCard")).toBeTruthy();
    expect(screen.getByLabelText("Continue with Google")).toBeTruthy();
    expect(screen.getByLabelText("Continue with Apple")).toBeTruthy();
    expect(screen.getByText("Email sign-in")).toBeTruthy();
    expect(screen.queryByText(/customer session token/i)).toBeNull();

    await user.press(screen.getByLabelText("Continue with Google"));

    await waitFor(() => {
      expect(mockStartSSOFlow).toHaveBeenCalledWith({
        strategy: "oauth_google",
        redirectUrl: "customcard://sso-callback"
      });
    });
    await waitFor(() => {
      expect(mockSetActiveFromSso).toHaveBeenCalledWith({ session: "sess_google" });
    });
  });
});
