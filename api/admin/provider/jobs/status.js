import { delegateApiRequest } from "../../../../scripts/vercel-api-delegate.mjs";

export default async function handler(request, response) {
  await delegateApiRequest(request, response);
}
