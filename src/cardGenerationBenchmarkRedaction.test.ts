import { describe, expect, it } from "vitest";
import { redactHeaders, redactUrl, sanitizeForLog } from "../scripts/card-generation-benchmark.mjs";

const env = {
  CLOUDFLARE_ACCOUNT_ID: "1234567890abcdef1234567890abcdef",
  CLOUDFLARE_API_TOKEN: "cfat_fake_live_secret_token_value",
  CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN: "cfut_fake_image_secret_token_value",
  OBJECT_STORE_ACCESS_KEY_ID: "fake_access_key_id_value",
  OBJECT_STORE_SECRET_ACCESS_KEY: "fake_secret_access_key_value",
  OBJECT_STORE_SIGNING_SECRET: "fake_signing_secret_value_long_enough"
};

describe("card generation benchmark redaction", () => {
  it("redacts API tokens, S3 keys, account IDs, auth headers, signatures, and data URLs", () => {
    const sanitized = sanitizeForLog(
      {
        url: `https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/ai/run/model`,
        artifactUri: `https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/customcard-prod/file.png`,
        headers: {
          authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`,
          host: `${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`
        },
        body: {
          accessKey: env.OBJECT_STORE_ACCESS_KEY_ID,
          secretAccessKey: env.OBJECT_STORE_SECRET_ACCESS_KEY,
          signedDownload: {
            signature: env.OBJECT_STORE_SIGNING_SECRET
          },
          image: "data:image/png;base64,abc123"
        }
      },
      env
    );

    const serialized = JSON.stringify(sanitized);

    expect(serialized).toContain("<redacted>");
    expect(serialized).toContain("<redacted-account>");
    expect(serialized).toContain("<data-url");
    expect(serialized).not.toContain(env.CLOUDFLARE_ACCOUNT_ID);
    expect(serialized).not.toContain(env.CLOUDFLARE_API_TOKEN);
    expect(serialized).not.toContain(env.CLOUDFLARE_WORKERS_AI_IMAGE_API_TOKEN);
    expect(serialized).not.toContain(env.OBJECT_STORE_ACCESS_KEY_ID);
    expect(serialized).not.toContain(env.OBJECT_STORE_SECRET_ACCESS_KEY);
    expect(serialized).not.toContain(env.OBJECT_STORE_SIGNING_SECRET);
  });

  it("redacts account IDs from non-secret headers and URLs", () => {
    expect(redactHeaders({ host: `${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` }, env)).toEqual({
      host: "<redacted-account>.r2.cloudflarestorage.com"
    });
    expect(redactUrl(`https://${env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com/customcard-prod/file.png`, env)).toBe(
      "https://<redacted-account>.r2.cloudflarestorage.com/customcard-prod/file.png"
    );
  });
});
