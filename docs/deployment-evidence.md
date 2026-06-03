# Deployment Evidence

Date: 2026-06-03.

## Vercel

The repository was linked and deployed with the authenticated Vercel CLI account
`abhidya`.

Deployment:

- Project: `world-prize-s-projects/customcard`
- Deployment ID: `dpl_Gh1VhQEDsYh5wf7o3Pz27vJHFwy4`
- Deployment URL: `https://customcard-r7y10p8k9-world-prize-s-projects.vercel.app`
- Aliases:
  - `https://customcard-three.vercel.app`
  - `https://customcard-world-prize-s-projects.vercel.app`
  - `https://customcard-abhidya-world-prize-s-projects.vercel.app`
- Status from `vercel inspect`: `Ready`
- Target from `vercel inspect`: `production`
- Serverless function from `vercel inspect`: `api/[...path]`

Verification:

- Vercel build ran `npm run build` successfully.
- Public `GET /` returned HTTP 401 from Vercel deployment protection.
- Public `GET /api/health` returned HTTP 401 from Vercel deployment protection.
- `vercel env ls` reported no environment variables for the project.

Conclusion:

The Vercel static/serverless deployment exists, but public route proof and
DB-backed API access are not yet complete. The production launch gate remains
evidence-missing until Vercel env vars include `CUSTOMCARD_API_RUNTIME=postgres`,
`DATABASE_URL`, customer/admin session tokens, deployment protection is bypassed
or disabled for verification, and a hosted DB doctor run is captured.
