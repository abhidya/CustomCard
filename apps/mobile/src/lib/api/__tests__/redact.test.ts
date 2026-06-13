import { redactText, redactValue } from "../redact";

describe("redaction", () => {
  it("redacts bearer tokens and JWT-shaped strings from text", () => {
    const jwt = "eyJhbGciOi.eyJzdWIiOiIx.SflKxwRJSMeKKF2QT4";
    expect(redactText(`Authorization: Bearer ${jwt}`)).not.toContain(jwt);
    expect(redactText(`token=${jwt}`)).toContain("[redacted-jwt]");
  });

  it("redacts sensitive keys in nested objects", () => {
    const value = redactValue({
      user: { email: "person@example.com", name: "Person" },
      headers: { Authorization: "Bearer abc" },
      imageBase64: "AAAA",
      safe: "keep-me"
    }) as Record<string, unknown>;

    expect((value.user as Record<string, unknown>).email).toBe("[redacted]");
    expect((value.user as Record<string, unknown>).name).toBe("Person");
    expect((value.headers as Record<string, unknown>).Authorization).toBe("[redacted]");
    expect(value.imageBase64).toBe("[redacted]");
    expect(value.safe).toBe("keep-me");
  });
});
