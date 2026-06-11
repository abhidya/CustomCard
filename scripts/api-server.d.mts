import type { IncomingMessage, ServerResponse } from "node:http";

export function handleApiRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
