# Hosted Papa Opportunity Grade

Target requested: `ai-mqb3yo04-papa`

Visible evidence source: Chrome tab on `https://customcard-three.vercel.app/?view=opportunities`, then visible Studio result after selecting the Papa opportunity.

## What Was Visible

- Opportunity list showed: `Papa's birthday`, `For Papa's`, `2027-05-02`, `From Google Calendar`, `88% match`.
- The clicked action was: `Make a card for Papa's`.
- The resulting hosted Studio showed generic draft data:
  - Headline: `Card for Someone important`
  - Body: `Confident type, warm color blocking, no clutter.`
  - Art direction: `Large editorial type with calm spacing`
  - Recipient field: empty
  - Sender: `Bender Bot`
  - Relationship: `Friends`
  - Occasion field: empty

## Grade

Score: 22/100

Tier: F

Hard failure: cap below 50 because the recipient and occasion were materially lost. The visible hosted result is not a Papa birthday card.

## Findings

The hosted opportunity card itself has the right signal, but the transition into Studio loses the meaningful calendar data and falls back to the placeholder draft. I did not inspect browser storage or cookies; this grade uses only visible UI state.

Current local source already has regression coverage for this path:

- `tests/frontend-architecture.test.ts` verifies `Papa's birthday` becomes recipient `Papa`, occasion `birthday`, and title `Birthday card for Papa`.
- `src/appStateOrchestrator.test.ts` verifies the workspace save path preserves the Papa calendar draft instead of wiping it back to placeholder values.

Targeted local tests passed on 2026-06-12. This makes the hosted failure look like a stale deployment or hosted-state issue rather than an unfixed local source defect.
