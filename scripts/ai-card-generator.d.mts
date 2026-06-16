export const aiCardGenerateRoute: "/api/ai/card/generate";
export const aiChatRespondRoute: "/api/ai/chat/respond";

export interface AiHttpResult {
  statusCode: number;
  payload: unknown;
}

export interface AiRequestContext {
  rateKey?: string;
  idempotencyKey?: string;
  trustRequestAiFlowConfig?: boolean;
  aiFlowAdminConfig?: unknown;
  authContext?: {
    userId?: string;
    sessionId?: string;
    role?: string;
  };
}

export interface AiService {
  generateCard(body: Record<string, unknown>, requestContext?: AiRequestContext): Promise<AiHttpResult>;
  respondChat(body: Record<string, unknown>, requestContext?: AiRequestContext): Promise<AiHttpResult>;
}

export function loadLocalAiEnvFiles(options?: {
  cwd?: string;
  target?: Record<string, string | undefined>;
}): Record<string, string | undefined>;

export function createAiCardGenerationService(options?: {
  env?: Record<string, string | undefined>;
  fetchImpl?: typeof fetch;
  costGate?: unknown;
  aiFlowAdminConfig?: unknown;
}): AiService;

export function describeAiCardGenerationAdapters(): {
  text: string[];
  image: string[];
};

export function assertSafeGeneratedImageDownloadUrl(
  imageUrl: string,
  env?: Record<string, string | undefined>
): Promise<string>;

export function isPrivateGeneratedImageAddress(address: string): boolean;
