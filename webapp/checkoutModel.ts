export interface CheckoutCustomerDefaults {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
}

export interface CheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export type CheckoutCustomerField = keyof CheckoutCustomer;

export function splitCheckoutName(name = ""): Pick<CheckoutCustomer, "firstName" | "lastName"> {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" ") || parts[0] || ""
  };
}

export function normalizeCheckoutPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits.slice(0, 10);
}

export function buildCheckoutCustomer(defaults?: CheckoutCustomerDefaults): CheckoutCustomer {
  const split = splitCheckoutName(defaults?.name);
  return {
    firstName: defaults?.firstName || split.firstName,
    lastName: defaults?.lastName || split.lastName,
    email: defaults?.email ?? "",
    phone: normalizeCheckoutPhone(defaults?.phone ?? "")
  };
}

export function mergeCheckoutCustomerDefaults(
  current: CheckoutCustomer,
  defaults?: CheckoutCustomerDefaults
): CheckoutCustomer {
  const nextDefaults = buildCheckoutCustomer(defaults);
  return {
    firstName: current.firstName || nextDefaults.firstName,
    lastName: current.lastName || nextDefaults.lastName,
    email: current.email || nextDefaults.email,
    phone: current.phone || nextDefaults.phone
  };
}

export function updateCheckoutCustomerField(
  current: CheckoutCustomer,
  field: CheckoutCustomerField,
  value: string
): CheckoutCustomer {
  return {
    ...current,
    [field]: field === "phone" ? normalizeCheckoutPhone(value) : value
  };
}
