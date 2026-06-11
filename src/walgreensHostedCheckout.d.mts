export declare const WALGREENS_SANDBOX_HOST: string;
export declare const WALGREENS_PRODUCTION_HOST: string;
export declare const walgreensCheckoutUploadRoute: string;
export declare const walgreensCheckoutSessionRoute: string;
export declare const walgreensCheckoutCallbackRoute: string;
export declare const WALGREENS_CHECKOUT_MAX_IMAGES: number;
export declare const WALGREENS_CHECKOUT_MAX_IMAGE_BYTES: number;
export declare const WALGREENS_CHECKOUT_IMAGE_EXPIRY_HOURS: number;
export declare const WALGREENS_CHECKOUT_WINDOW: { width: number; height: number };
export declare const WALGREENS_DEFAULT_LATITUDE: string;
export declare const WALGREENS_DEFAULT_LONGITUDE: string;

export interface WalgreensCheckoutConfig {
  mode: string;
  enabled: boolean;
  apiKey: string;
  affId: string;
  publisherId: string;
  appOrigin: string;
  baseUrl: string;
  callbackUrl: string;
  blockers: string[];
}

export interface WalgreensCheckoutCustomer {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

export interface WalgreensCustomerValidation {
  ok: boolean;
  errors: string[];
  customer: WalgreensCheckoutCustomer;
}

export interface WalgreensUploadResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  blockers?: string[];
  imageUrl?: string;
  imageName?: string;
  expiresAtIso?: string;
}

export interface WalgreensSessionResult {
  ok: boolean;
  statusCode: number;
  error?: string;
  blockers?: string[];
  checkoutUrl?: string;
  window?: { width: number; height: number };
  imageCount?: number;
  mode?: string;
}

export interface WalgreensHostedCheckoutService {
  config: WalgreensCheckoutConfig;
  uploadCardImage(imageBase64: string): Promise<WalgreensUploadResult>;
  createCheckoutSession(input: {
    customer: Partial<WalgreensCheckoutCustomer>;
    images: string[];
    lat?: string | number;
    lng?: string | number;
    affNotes?: string;
  }): Promise<WalgreensSessionResult>;
}

export declare function resolveWalgreensCheckoutConfig(env: Record<string, string | undefined>): WalgreensCheckoutConfig;
export declare function validateCheckoutCustomer(input: unknown): WalgreensCustomerValidation;
export declare function validateCheckoutCoordinates(lat: unknown, lng: unknown): { lat: string; lng: string };
export declare function decodeJpegBase64(imageBase64: string): { ok: boolean; error?: string; bytes?: Uint8Array };
export declare function isTrustedWalgreensImageUrl(url: string, affId: string): boolean;
export declare function buildWalgreensUploadTarget(
  sasKeyToken: string,
  affId: string,
  uuid: string
): { uploadUrl: string; imageName: string };
export declare function buildCheckoutUrl(landingUrl: string, token: string): string;
export declare function buildWalgreensCallbackHtml(appOrigin: string): string;
export declare function createWalgreensHostedCheckoutService(options: {
  env: Record<string, string | undefined>;
  fetchImpl: (url: string, init?: RequestInit) => Promise<Response>;
  now?: () => number;
  uuid?: () => string;
}): WalgreensHostedCheckoutService;
export declare function createWalgreensCheckoutDummyFetch(): ((url: string, init?: RequestInit) => Promise<Response>) & {
  calls: Array<{ url: string; init: RequestInit }>;
};
