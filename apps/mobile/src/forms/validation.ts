// Small dependency-free form validation helpers shared by the screens.

export type FieldErrors<T extends string> = Partial<Record<T, string>>;

export function requireText(value: string, label: string, maxLength = 200): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  if (trimmed.length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
  return undefined;
}

export function optionalText(value: string, label: string, maxLength = 2000): string | undefined {
  if (value.trim().length > maxLength) return `${label} must be ${maxLength} characters or fewer.`;
  return undefined;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function requireEmail(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email is required.";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address.";
  return undefined;
}

export function requirePhone(value: string): string | undefined {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return "Phone number is required.";
  if (digits.length < 10 || digits.length > 15) return "Enter a valid phone number.";
  return undefined;
}

export function requireFutureOrTodayDate(value: string, label: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return `${label} is required.`;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return `${label} must be a valid date (YYYY-MM-DD).`;
  return undefined;
}

export function firstError<T extends string>(errors: FieldErrors<T>): string | undefined {
  for (const value of Object.values(errors) as (string | undefined)[]) {
    if (value) return value;
  }
  return undefined;
}

export function hasErrors<T extends string>(errors: FieldErrors<T>): boolean {
  return firstError(errors) !== undefined;
}
