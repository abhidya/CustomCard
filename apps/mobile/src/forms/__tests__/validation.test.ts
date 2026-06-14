import {
  firstError,
  hasErrors,
  optionalText,
  requireEmail,
  requireFutureOrTodayDate,
  requirePhone,
  requireText
} from "../validation";

describe("form validation", () => {
  it("requires non-empty trimmed text within the length limit", () => {
    expect(requireText("", "Name")).toBe("Name is required.");
    expect(requireText("   ", "Name")).toBe("Name is required.");
    expect(requireText("x".repeat(201), "Name")).toContain("200 characters");
    expect(requireText("Maya", "Name")).toBeUndefined();
  });

  it("allows empty optional text but enforces the limit", () => {
    expect(optionalText("", "Note")).toBeUndefined();
    expect(optionalText("x".repeat(2001), "Note")).toContain("2000 characters");
  });

  it("validates email addresses", () => {
    expect(requireEmail("")).toBe("Email is required.");
    expect(requireEmail("not-an-email")).toBe("Enter a valid email address.");
    expect(requireEmail("person@example.com")).toBeUndefined();
  });

  it("validates phone numbers by digit count", () => {
    expect(requirePhone("")).toBe("Phone number is required.");
    expect(requirePhone("123")).toBe("Enter a valid phone number.");
    expect(requirePhone("(555) 010-2030")).toBeUndefined();
  });

  it("validates dates", () => {
    expect(requireFutureOrTodayDate("", "Event date")).toBe("Event date is required.");
    expect(requireFutureOrTodayDate("not-a-date", "Event date")).toContain("valid date");
    expect(requireFutureOrTodayDate("2026-07-01", "Event date")).toBeUndefined();
  });

  it("summarizes field error maps", () => {
    expect(hasErrors({ a: undefined })).toBe(false);
    expect(firstError({ a: undefined, b: "Broken" })).toBe("Broken");
    expect(hasErrors({ b: "Broken" })).toBe(true);
  });
});
