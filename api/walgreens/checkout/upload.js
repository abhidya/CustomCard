import { handleApiRequest } from "../../../scripts/api-server.mjs";

export default async function handler(request, response) {
  await handleApiRequest(request, response);
}
