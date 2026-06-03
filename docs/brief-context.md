# Brief Context

This document is the source-of-truth intake for the CustomCard repo. It preserves
the seed brief, separates evidence from inference, and records what the repo is
trying to prove.

## Recovered Seed

The original prompt was recovered from local Codex attachment history:

- `/Users/abdulrehmanbhidya/.codex/attachments/5c7c2630-e202-45fb-9bd2-f46941d884c8/pasted-text.txt`
- `/Users/abdulrehmanbhidya/.codex/attachments/9e212c08-c6fa-4081-bb7c-8cdef95ecc8f/pasted-text.txt`

The two attachment files are byte-identical. The repo does not copy the entire
transcript because the source history also contains a deidentification request
for personal card content. The product-driving prompt excerpts below are
preserved verbatim except that no private card message content is included.

```text
Hello. So today I was invited to a wedding and last minute I decided to generate a custom wedding card for them because my mom was struggling to write a card and to, um, find the card. So she went to buy one, and while we're at CVS, I said, why don't we generate a card with ChatGPT and print it? And we did, and it worked out great. What we did was we generated four images for CVS's front and inside left, inside right, and back, five by seven double sided card print on paper stock. Can you design a system design prompt for this difficult. The required features needed for this, and we're gonna use this to eventually do a system design generation with pros and cons and alternatives and with, finally, AI agentic implementation of the service, which will provide, basically, a CRM. So whenever you sign up for the service, you connect your email. Whenever you're invited to a vet with enough go time before the event, the system notifies you that we can generate a card. It, like, asks you questions about the person to write the right message and style and design and theme, like, religious wedding or funny birthday or something more personal. And if there's, like, thin cards generated before, then, like, we can collect those ideas and be like, hey. You've said ten anniversary cards for the past decade. Here's an idea for the eleventh. Do you have any new stories you wanna add? And, basically, it orders the cards with delivery or pickup from, like, whatever's cheapest, CVS or Walgreens.
```

```text
Hello. So let's talk about requirements. I want you to ensure that the system is built to be cross platform when we're thinking about iPhone or Android or website. We want to think about proper design development, deployment, dev test prod. We want to think about developer onboarding docs included, proper code, proper packages, separation. We want to think about how it's supposed to be set up for proper regulatory requirements in different regions, different countries, different continents. We need to think about other functional requirements are, uh, multiple languages. We want to think about user paths all the way, everything that could happen for each pathway, for example, um, a user connects to the service. They connect their email. They import their events. The AI gives them the option to generate cards. The user rejects them or approves them. Everything... thing that could happen after that, like, the order gets canceled, the event gets canceled, the event gets moved up. Solutions, like, um, offer a new order with one hour pickup rather shipping or, let's say, they order it to the wrong place, like, what did they do then? Um, we want to think about this as a scalable service built to be production ready, deployed in a cheap way for the amount of customers. So, for example, we could easily deploy it on a five dollar DigitalOcean instance or if we wanted to scale up, it would deploy as a cloud native application that has proper system design tenants to be scalable and, uh, properly doing the correct trade offs between consistency and availability to ensure it's doing the best work without dropping anything or lying about stuff, like being super consistent with financial transactions, being super, um, available and persistent with any long running tasks, like uploading pictures, reviewing them, uh, sending them back from review, like, all that kind of stuff. We wanna make sure we're using the right architecture. Everything is built with correct unit test using the correct best practices and implementation, like, let's think about operational readiness review and application security, like, we need secrets management, correct plumbing so that dev test and prod have different, uh, databases, like, that can be a local SQL lite. need to think about having coverage as a goal. We need to think about how, like, we're setting up databases, making sure that we're being as cost efficient as possible with our architecture, making sure we're doing it the correct way, like, using one client, pooling connections. Just, you know, we want this to be amazing and perfect. Like, the idea is I have this awesome experience with generating and having Walker and Sprint a card from my mom. And I was thinking how great would it be to never have to go to the store and pick out a crappy, unpersonalized card instead I could have really custom ones printed with awesome messages and decides relevant to me and the person's relationship celebrating that. So foreverything i mentioned extract it as a storyboard and identify the chapter it bleongs in and start wiorking on adding allthe mising toryboards and filling details for evedry thing i mentioned, the end result should be me leaving u working all night and u use mutli agent and full act no blockers to work on building me this vibecoded service, it should follow best praxtices and be configurable in a cheap way for deployment as a small 5$ digital ocean droplet or as a millions of image generations a day saas cloud ai bussiness, i also want to include more infor for context for the repo,
```

## Real Job To Be Done

The job is to turn a last-minute successful card-printing hack into a credible
software/service repository. A reviewer should be able to see the product wedge,
the safety boundaries, the implementation contracts, and the remaining gaps
without reading the chat history.

## Explicit Requirements

- Support a relationship-aware card concierge, not only one-off AI greeting-card generation.
- Detect card opportunities from connected email and calendar sources.
- Ask short, context-aware questions before generating card content.
- Reuse approved relationship memory and prior-card history.
- Generate front, inside-left, inside-right, and back panels for 5x7 cards.
- Validate print size, safe areas, layout, spelling, names, multilingual text, and high-care phrases.
- Compare or route fulfillment through retail print workflows such as CVS, Walgreens, FedEx Office, local shops, or mail vendors.
- Support web, iPhone, and Android product surfaces through shared contracts.
- Model user paths beyond the happy path: rejection, approval, cancellation, event changes, wrong-store recovery, and urgent pickup.
- Support cheap single-host deployment and a cloud-native scale path.
- Separate dev, test, and production configuration, secrets, data stores, and operational readiness checks.
- Keep real ordering disabled until tests, kill switches, vendor dry runs, and physical print certification pass.

## Inferences

- Vite/React/TypeScript is acceptable for the current reviewable workbench because the repo already uses it and tests cover it.
- The current stage should be contract-first: executable domain/service skeleton plus deployment scaffolding, not live OAuth, payment, or vendor ordering.
- The safest first vertical slice is metadata-only provider import, approved memory, deterministic render contracts, order lifecycle state machine, regional policy checks, and hard-gated fulfillment.
- A thin mobile shell is sufficient at this stage if it proves shared API/config boundaries without claiming signed native apps.

## Assumptions

- Gmail and Google Calendar are the first real provider targets.
- Manual export or user-assisted vendor handoff comes before direct ordering.
- Structured relationship memory comes before vector memory.
- Postgres is the production database target; local/dev may use cheaper or simpler modes only when clearly labeled.
- External competitive notes in the recovered transcript are historical context and were not revalidated in this delivery pass.

## Unknowns

- No OAuth credentials, vendor API credentials, sandbox access, or physical print certification evidence were provided.
- No final submission format, deployment target, or production launch date was specified.
- No current legal review exists for vendor terms, privacy obligations, or regional processor boundaries.
- No real payment, refund, cancellation, or vendor order-confirmation path has been certified.
