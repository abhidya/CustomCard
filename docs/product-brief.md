# Product Brief: CustomCard

## Problem

People often need thoughtful cards for weddings, birthdays, anniversaries, showers,
graduations, funerals, holidays, and other social events. Buying a generic card is
fast but impersonal. Writing a personal one is meaningful but often happens under
time pressure. Retail print workflows can produce nice cards, but users still have
to create the design, write the message, format the assets, and place the order.

## Product

CustomCard is a personal relationship CRM for greeting cards. Users connect email
and calendar accounts. The service detects upcoming invitations and important
events, asks a few context-aware questions, generates personalized card panels, and
prepares print-ready files for local pickup or delivery.

## Core User Flow

1. User signs up and connects Gmail and Google Calendar.
2. The system scans permitted email and calendar sources for invitations and life
   events.
3. The system extracts event metadata: type, date, location, people, urgency,
   recipient names, and relationship clues.
4. If there is enough lead time, the user receives a notification:
   "You were invited to Sara and Ahmed's wedding on Saturday. I can make a
   personalized wedding card for pickup near you."
5. The system asks a short adaptive questionnaire:
   - Who is the card from?
   - What is your relationship to the recipient?
   - What tone should it have?
   - Are there stories, family names, inside jokes, cultural details, or religious
     elements to include?
   - Should it include another language or right-to-left script?
   - What visual style should it use?
6. The system generates card copy and visual design directions.
7. The system generates front, inside-left, inside-right, and back panels.
8. The system validates names, spelling, layout, print size, safe zones, cultural
   sensitivity, religious phrases, and multilingual text.
9. The user previews, edits, regenerates, or approves.
10. The system prepares downloadable assets or a vendor handoff.
11. The system records approved card history and relationship memories for future
    personalization.

## MVP Scope

The smallest useful version should focus on a single end-to-end happy path:

1. Gmail and Google Calendar connection.
2. Event and invitation detection for weddings, birthdays, and anniversaries.
3. User notification for events with enough lead time.
4. Guided card interview.
5. Copy generation and visual prompt generation.
6. Print-ready 5x7 export for flat and folded cards.
7. Manual download or vendor upload handoff.
8. Card history and editable memory records.

## Not In V1

1. Fully automated card ordering.
2. Browser automation against retail sites.
3. Broad vendor API integration.
4. Signed native mobile releases. The repo can include a thin iOS/Android shell
   boundary, but store-ready binaries and signing are outside v1.
5. Fully autonomous memory creation without user visibility.
6. Background scanning across all email history by default.
7. Payment handling, refunds, or cancellation workflows.
8. Cards for highly sensitive situations without explicit review prompts.

## Primary Personas

1. Busy adult managing family social obligations.
2. Parent or caregiver who wants help writing appropriate cards.
3. Person in a multilingual or multicultural family.
4. Frequent event attendee who wants cards to feel personal over time.
5. Last-minute user who needs a printable card today.

## Product Principles

1. Be helpful without being creepy.
2. Ask only the questions that improve the card.
3. Let users inspect and edit memories.
4. Never order or send without explicit approval.
5. Treat names, relationships, religion, culture, and grief as high-care content.
6. Prefer deterministic validation for layout, sizing, and ordering constraints.
7. Use AI for interpretation and creativity, not hidden irreversible decisions.

## Hard Risks

1. Email prompt injection and untrusted invitation content.
2. False event detection or awkward notifications.
3. Hallucinated religious, cultural, or relationship claims.
4. Print assets with bad dimensions, margins, or text legibility.
5. Vendor terms-of-service limits.
6. OAuth scope, retention, and privacy expectations.
7. Multilingual and right-to-left typography quality.
