# System Design Prompt

Use this prompt to generate a full architecture, tradeoff analysis, and agentic
implementation plan for CustomCard.

```text
You are a senior staff-level systems architect and AI product engineer. Design a
production-ready system for an AI-powered personalized greeting card CRM and
fulfillment service.

Product idea:
A user signs up and connects email and calendar accounts. The service detects
upcoming life events and invitations, such as weddings, birthdays, baby showers,
anniversaries, graduations, religious holidays, funerals, housewarmings, and other
important social events. When there is enough lead time before the event, the
system proactively notifies the user that it can help generate, print, and
optionally order a personalized card.

The service behaves like a relationship-aware CRM for personal events. It learns
from prior cards, prior messages, user preferences, relationship history, and event
context. For example, if the user has made anniversary cards for the same couple
for ten years, the system can say: "You've made cards for them for the last ten
anniversaries. Here's a thoughtful direction for this year's card. Do you have any
new stories or updates you want to add?"

The system must support custom generated cards for retail print workflows such as
CVS, Walgreens, FedEx Office, local print shops, or mail-delivery card vendors. It
should support formats like 5x7 flat photo cards and folded cards with front cover,
inside-left, inside-right, and back cover panels. Generated assets must be
print-ready, correctly sized, high resolution, and safe for upload to retail
photo-printing services.

Core user flow:
1. User signs up and connects Gmail, Google Calendar, Outlook, iCloud Calendar, or
   other event/email sources.
2. The system scans emails and calendar events for invitations and upcoming events.
3. The system identifies event type, date, location, people involved, urgency,
   relationship context, and card opportunity.
4. The system decides whether there is enough lead time to generate and order a
   card.
5. The user receives a notification such as: "You were invited to Sara and Ahmed's
   wedding on Saturday. I can make a personalized wedding card for pickup near you.
   Want to do that?"
6. The system asks a short adaptive questionnaire:
   - Who is the card from?
   - What is your relationship to the recipient?
   - Should the tone be formal, religious, funny, sentimental, romantic,
     family-oriented, short, poetic, or casual?
   - Are there any stories, inside jokes, family names, cultural details, or
     religious elements to include?
   - Should the card include Arabic, Urdu, Hindi, Hebrew, Spanish, or another
     language?
   - Should the design be luxury, minimalist, floral, Islamic wedding, South Asian
     wedding, modern, cute, funny, elegant, or something else?
7. The system generates card copy and visual designs.
8. The system validates text, layout, print size, bleed, safe areas, spelling,
   names, religious phrases, and multilingual text.
9. The system previews front, inside-left, inside-right, and back panels.
10. The user can approve, edit, regenerate, or request variants.
11. The system compares fulfillment options by price, pickup time, shipping time,
    card format, print quality, and availability.
12. The system places the order through supported APIs, deep-links the user to an
    upload/order flow, or prepares downloadable print-ready files.
13. The system stores card history and relationship/event memory for future
    personalization.

Required sections:

1. Product requirements
   - Functional requirements
   - Non-functional requirements
   - User personas
   - MVP scope
   - Future scope
   - Explicitly state what the system should not do in v1

2. Event detection and CRM layer
   - How to ingest emails and calendar events
   - How to detect invitations and important events
   - How to extract event metadata
   - How to identify recipients and relationships
   - How to handle ambiguous or incomplete information
   - How to avoid creepy or overreaching behavior
   - How to rank events by importance and urgency
   - How to decide when to notify the user

3. Personalization and memory
   - Relationship graph design
   - Event history model
   - Prior-card memory model
   - User preference model
   - Recipient preference model
   - Privacy-preserving memory design
   - How to let users edit, delete, or suppress memories
   - How to prevent over-personalization or accidental sensitive disclosures

4. AI agent workflow
   Describe the main agents or modules:
   - Email/calendar ingestion agent
   - Event understanding agent
   - Relationship context agent
   - User interview/questionnaire agent
   - Copywriting agent
   - Visual design prompt agent
   - Image generation agent
   - Print layout agent
   - Quality assurance agent
   - Fulfillment shopping agent
   - Order placement or handoff agent

   For each agent, define inputs, outputs, tools, failure modes, and JSON contracts.
   Explain which steps should be deterministic services versus LLM-driven agents.
   Include human-in-the-loop approval points.

5. Card generation system
   - Support 5x7 flat cards and folded cards
   - Support front cover, inside-left, inside-right, and back cover panels
   - Explain how to generate print-ready images at correct DPI
   - Explain safe zones, bleed, trim, margins, and text legibility
   - Explain how to avoid shadows, fake mockup backgrounds, unwanted fold
     instructions, and layout misalignment
   - Explain how to handle multilingual text, especially Arabic or right-to-left
     scripts
   - Explain how to validate religious or cultural phrases without hallucinating
   - Explain how to generate multiple design variants
   - Explain how to preserve a consistent visual theme across panels
   - Explain how to export final assets for retail photo-card upload

6. Fulfillment and vendor integration
   Compare integration options:
   - Direct retail APIs
   - Browser automation
   - Deep links with prepared assets
   - Manual user upload
   - Marketplace/print API aggregators

   Evaluate CVS, Walgreens, FedEx Office, Shutterfly, local print shops, and generic
   print-on-demand vendors as possible fulfillment channels.
   Discuss how to compare price, pickup time, shipping time, distance,
   availability, and card format.
   Explain how to handle vendors without public APIs.
   Explain how to handle order confirmation, cancellation, refunds, and failed
   uploads.
   Include legal and terms-of-service concerns.

7. Data model
   Provide database schema or entity models for:
   - User
   - ConnectedAccount
   - Contact
   - Relationship
   - Event
   - Invitation
   - CardProject
   - CardPanel
   - GeneratedAsset
   - CardMessage
   - VendorOption
   - FulfillmentOrder
   - Notification
   - UserPreference
   - MemoryRecord
   - AuditLog

   Include key fields, indexes, retention policy, and access patterns.

8. System architecture
   - Provide a high-level architecture diagram in text
   - Include services, queues, workers, object storage, database, vector store,
     notification service, AI gateway, and vendor integration layer
   - Explain synchronous versus asynchronous flows
   - Explain retry strategy, idempotency, failure handling, and observability
   - Explain how the system scales from MVP to production

9. Security and privacy
   - OAuth scope minimization
   - Email and calendar data handling
   - Encryption at rest and in transit
   - Secrets management
   - PII handling
   - Data retention and deletion
   - User consent
   - Audit logs
   - Abuse prevention
   - Prompt injection risks from emails and calendar invites
   - Vendor data sharing boundaries

10. AI safety and quality
    - Hallucination prevention
    - Text validation
    - Name spelling validation
    - Cultural and religious sensitivity checks
    - Multilingual validation
    - Image moderation
    - Copyright and trademark issues
    - Avoiding generated text that claims false relationships or facts
    - User approval before ordering
    - Regression testing for layouts

11. Notification and timing logic
    - When to notify users
    - How much lead time is needed by event type
    - How to avoid notification spam
    - How to handle last-minute events
    - How to escalate urgent card opportunities
    - How to schedule reminders if the user does not respond

12. MVP proposal
    - Define the smallest usable version
    - Assume Gmail and Google Calendar first
    - Assume manual export or deep-link fulfillment first
    - Include a realistic development plan
    - Include what can be built with no vendor API access
    - Include a staged rollout plan

13. Alternatives and tradeoffs
    Compare:
    - Fully automated ordering vs user-assisted upload
    - LLM-first event extraction vs rules-first extraction
    - Relational DB vs document DB
    - Vector memory vs structured memory
    - Vendor API integration vs browser automation
    - Native mobile app vs web app
    - Proactive notifications vs user-initiated creation

    For each, provide pros, cons, risks, and recommendation.

14. Agentic implementation plan
    Break the system into implementation milestones. For each milestone, provide:
    - Goal
    - Components
    - APIs
    - Data models
    - Agent prompts
    - Test cases
    - Failure cases
    - Acceptance criteria

    Include specific prompts for the agents and examples of tool calls and JSON
    contracts between agents.

15. Example walkthrough
    Walk through a concrete example:
    - User receives a wedding invitation by email.
    - The system detects it.
    - The system asks the user a few questions.
    - The user says it is for a Muslim wedding from "Fouzia aunty and family."
    - The system creates a luxury 5x7 card with front, inside-left, inside-right,
      and back panels.
    - The system checks Arabic text and quote accuracy.
    - The system exports print-ready files.
    - The system suggests CVS or Walgreens pickup.

    Include expected data records created at each step.

16. Final recommendation
    - Recommend the best architecture for v1
    - Recommend the best architecture for v2
    - Identify the hardest technical risks
```
